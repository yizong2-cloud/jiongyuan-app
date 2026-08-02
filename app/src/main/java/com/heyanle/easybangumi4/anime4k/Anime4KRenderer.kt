package com.heyanle.easybangumi4.anime4k

import android.opengl.GLES30
import android.util.Log
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram
import java.nio.FloatBuffer

/**
 * Anime4K 链渲染器：一个 GlShaderProgram 内跑完整 pass 链。
 *
 * - [configure] 在 GL 线程执行链模拟（WHEN 过滤 + 尺寸推导），输出尺寸 =
 *   链最终 pass 的输出（缩放策略见 [A4KChain.scaleFor]，WHEN 的 OUTPUT 引用 =
 *   输入 × scale，等价 mpv 的窗口尺寸语义）；
 * - 中间纹理全部为自建 FBO（16F 优先，fallback 8bit），带活跃引用回收
 *   （与 mpv 一致，避免 4x 链的显存爆炸）；
 * - 最后一个 pass 渲染进 Media3 输出池纹理（BaseGlShaderProgram 约定）。
 *
 * 所有方法都在 GL 线程调用（Media3 管线保证）。
 */
@OptIn(UnstableApi::class)
internal class Anime4KRenderer(
    useHighPrecision: Boolean,
    private val passes: List<A4KPass>,
) : BaseGlShaderProgram(useHighPrecision, /* texturePoolCapacity = */ 1) {

    companion object {
        private const val TAG = "Anime4K"

        /** 调试用透传链：三种偏移写法对照（R=浮点字面量 G=整数表达式 B=float() 转型） */
        private const val PASSTHROUGH_SRC = """
//!DESC f1
//!HOOK MAIN
//!BIND MAIN
//!SAVE STATSMAX

#define KERNELHALFSIZE 2
float get_luma(vec4 rgba) {
	return dot(vec4(0.299, 0.587, 0.114, 0.0), rgba);
}
vec4 hook() {
	float a = get_luma(MAIN_texOff(vec2(0.0, 0.0)));
	float b = get_luma(MAIN_texOff(vec2(2 - KERNELHALFSIZE, 0)));
	float c = get_luma(MAIN_texOff(vec2(float(2 - KERNELHALFSIZE), 0.0)));
	return vec4(a, b, c, 1.0);
}

//!DESC f2
//!HOOK MAIN
//!BIND HOOKED
//!BIND STATSMAX
//!SAVE MAIN

vec4 hook() {
    return vec4(STATSMAX_tex(HOOKED_pos).rgb, 1.0);
}
"""
    }

    private class Fbo(val texId: Int, val fboId: Int, val w: Int, val h: Int)

    private class PassInfo(
        val pass: A4KPass,
        /** (绑定名, 该纹理当时的尺寸 w, h) —— 运行时解析实际 texId */
        val binds: List<Triple<String, Int, Int>>,
        val outW: Int,
        val outH: Int,
    )

    private class SimResult(
        val infos: List<PassInfo>,
        val outW: Int,
        val outH: Int,
        /** active 索引 → 该 pass 结束后应删除其 FBO 的 active 索引列表 */
        val deleteAfter: Map<Int, List<Int>>,
        val lastActive: Int,
    )

    private var inputW = -1
    private var inputH = -1
    private var sim: SimResult? = null
    private val programs = HashMap<Int, Anime4KProgram>()
    private val fbos = HashMap<Int, Fbo>()
    private var vertexShaderId = 0
    private var quadVao = 0
    private var quadVbo = 0

    // 输出尺寸（configure 结果；输出 FBO 由基类 queueInputFrame 聚焦，
    // drawFrame 内通过 GL_FRAMEBUFFER_BINDING 读取）
    private var outputW = 0
    private var outputH = 0

    override fun configure(inputWidth: Int, inputHeight: Int): Size {
        inputW = inputWidth
        inputH = inputHeight
        val scale = A4KChain.scaleFor(inputHeight)
        // WHEN 的 OUTPUT 引用 = 目标输出尺寸（等价 mpv 窗口尺寸）
        val outputRef = Pair(inputWidth * scale, inputHeight * scale)
        val result = simulate(passes, inputWidth, inputHeight, outputRef)
        releaseGl()
        sim = result
        outputW = result.outW
        outputH = result.outH
        initQuad()
        for ((i, info) in result.infos.withIndex()) {
            val program = Anime4KProgram(info.pass, vertexShaderId)
            if (program.compile()) {
                programs[i] = program
            } else {
                Log.e(TAG, "Anime4K pass compile failed, drop: ${info.pass.desc}")
            }
            if (i < result.lastActive) {
                fbos[i] = createFbo(info.outW, info.outH)
            }
        }
        Log.d(
            TAG,
            "Anime4K chain: in=${inputWidth}x$inputHeight scale=$scale " +
                "passes=${result.infos.size} out=${result.outW}x${result.outH}"
        )
        return Size(outputW, outputH)
    }

    // ---------- 链模拟（尺寸 / WHEN / 绑定 / 活跃回收） ----------

    private fun simulate(
        passList: List<A4KPass>,
        inW: Int,
        inH: Int,
        outputRef: Pair<Int, Int>,
    ): SimResult {
        val nsSize = HashMap<String, Pair<Int, Int>>()
        val nsGen = HashMap<String, Int>()
        nsSize["NATIVE"] = inW to inH
        nsGen["NATIVE"] = -1
        nsSize["MAIN"] = inW to inH
        nsGen["MAIN"] = -1

        val infos = ArrayList<PassInfo>()
        val lastUse = HashMap<Int, Int>() // gen → 最后一次被绑定的 active 索引（-1 = 从未）
        var genCounter = 0

        for (p in passList) {
            val sizeOf: (String) -> Pair<Float, Float>? = { name ->
                when (name) {
                    "OUTPUT" -> outputRef.first.toFloat() to outputRef.second.toFloat()
                    "HOOKED" -> (nsSize[p.hookTarget] ?: nsSize["MAIN"] ?: (inW to inH))
                        .let { it.first.toFloat() to it.second.toFloat() }
                    else -> nsSize[name]?.let { it.first.toFloat() to it.second.toFloat() }
                }
            }
            // WHEN 条件
            if (p.whenExpr != null && p.whenExpr.isNotEmpty()) {
                val v = A4KRpn.eval(p.whenExpr, sizeOf, { null }) ?: 0f
                if (v == 0f) continue // 条件不满足 → 跳过
            }
            // 输出尺寸（缺省 = hook 目标尺寸）
            val base = nsSize[p.hookTarget] ?: nsSize["MAIN"] ?: (inW to inH)
            var w = base.first
            var h = base.second
            if (p.widthExpr.isNotEmpty()) {
                val v = A4KRpn.eval(p.widthExpr, sizeOf, { null })
                if (v == null) {
                    Log.e(TAG, "Anime4K WIDTH eval fail: ${p.widthExpr} (${p.desc}), drop pass")
                    continue
                }
                w = v.toInt().coerceAtLeast(1)
            }
            if (p.heightExpr.isNotEmpty()) {
                val v = A4KRpn.eval(p.heightExpr, sizeOf, { null })
                if (v == null) {
                    Log.e(TAG, "Anime4K HEIGHT eval fail: ${p.heightExpr} (${p.desc}), drop pass")
                    continue
                }
                h = v.toInt().coerceAtLeast(1)
            }
            // 绑定解析（HOOKED → hook 目标；hook 目标隐式绑定）
            val activeIdx = infos.size
            val binds = ArrayList<Triple<String, Int, Int>>()
            val bindNames = LinkedHashSet<String>()
            bindNames.add(p.hookTarget)
            for (b in p.binds) {
                val n = if (b == "HOOKED") p.hookTarget else b
                if (!bindNames.contains(n)) bindNames.add(n)
            }
            var valid = true
            for (name in bindNames) {
                // 阶段名 hook 目标（如 PREKERNEL）不在命名空间 → 回退当前 MAIN
                val sz = nsSize[name] ?: if (name == p.hookTarget) nsSize["MAIN"] else null
                if (sz == null) {
                    valid = false
                    Log.e(TAG, "Anime4K bind missing: $name (${p.desc}), drop pass")
                    break
                }
                binds.add(Triple(name, sz.first, sz.second))
                val g = nsGen[name] ?: -1
                lastUse[g] = maxOf(lastUse[g] ?: -1, activeIdx)
            }
            if (!valid) continue
            // 绑定全部有效后才分配 gen（= 本 pass 输出纹理的代）
            val gen = genCounter++
            infos.add(PassInfo(p, binds, w, h))
            // 更新命名空间（新纹理代）
            val save = p.effectiveSave
            nsSize[save] = w to h
            nsGen[save] = gen
            lastUse[gen] = lastUse[gen] ?: activeIdx // 输出从未被绑定 → 创建即最后使用
        }

        val lastActive = infos.size - 1
        val final = if (lastActive >= 0) {
            val li = infos[lastActive]
            li.outW to li.outH
        } else inW to inH

        // 活跃回收表：active 索引 k 结束后删除 lastUse==k 的中间 FBO
        // （gen 按 active 索引顺序分配，gen==activeIdx；被最后一个 pass 绑定的不删，
        //   随 releaseGl 统一清理）
        val deleteAfter = HashMap<Int, MutableList<Int>>()
        for (p in 0 until lastActive) {
            val lu = lastUse[p] ?: -1
            if (lu >= 0 && lu != lastActive) {
                deleteAfter.getOrPut(lu) { ArrayList() }.add(p)
            }
        }
        return SimResult(infos, final.first, final.second, deleteAfter, lastActive)
    }

    // ---------- Media3 GlShaderProgram 契约 ----------
    // queueInputFrame 使用基类实现（其聚焦输出池纹理后调用 drawFrame）。
    // 注意：TexturePool 为包私有，无法在外部包访问，故输出 FBO 在 drawFrame 内
    // 通过 GL_FRAMEBUFFER_BINDING 读取（基类调用 drawFrame 前恰好聚焦输出纹理）。

    override fun drawFrame(inputTexId: Int, presentationTimeUs: Long) {
        try {
            val result = sim ?: return
            if (result.infos.isEmpty()) return
            // 输出 FBO：基类 queueInputFrame 在调用 drawFrame 前聚焦了输出池纹理。
            // 必须在绑定任何中间 FBO 之前读取（否则读到的是上一个 pass 的 FBO）。
            val outputFbo = IntArray(1)
            GLES30.glGetIntegerv(GLES30.GL_FRAMEBUFFER_BINDING, outputFbo, 0)
            val texIds = HashMap<String, Int>()
            texIds["NATIVE"] = inputTexId
            texIds["MAIN"] = inputTexId
            // 特殊阶段名（如 PREKERNEL）→ 当前 MAIN 纹理
            for ((i, info) in result.infos.withIndex()) {
                val program = programs[i] ?: continue
                val isLast = i == result.lastActive
                val outFbo: Int
                val outTex: Int
                val outW: Int
                val outH: Int
                if (isLast) {
                    outFbo = outputFbo[0]
                    outTex = 0 // 链尾输出无需登记命名空间
                    outW = outputW
                    outH = outputH
                } else {
                    val fbo = fbos[i] ?: continue
                    outFbo = fbo.fboId
                    outTex = fbo.texId
                    outW = fbo.w
                    outH = fbo.h
                }
                GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, outFbo)
                GLES30.glViewport(0, 0, outW, outH)
                program.use()
                var unit = 0
                for ((name, bw, bh) in info.binds) {
                    // 阶段名 hook 目标（如 PREKERNEL）→ 当前 MAIN 纹理
                    val resolved = texIds[name]
                        ?: (if (name == info.pass.hookTarget) texIds["MAIN"] else null)
                    val texId = resolved ?: continue
                    program.bindTexture(name, texId, bw, bh, unit)
                    unit++
                }
                GLES30.glBindVertexArray(quadVao)
                GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)
                GLES30.glBindVertexArray(0)
                GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, 0)
                // 更新命名空间（中间 pass 的输出纹理，供后续 pass 绑定）
                if (!isLast && outTex != 0) {
                    texIds[info.pass.effectiveSave] = outTex
                }
                // 活跃回收
                result.deleteAfter[i]?.let { list ->
                    for (gi in list) {
                        val fbo = fbos.remove(gi) ?: continue
                        GLES30.glDeleteFramebuffers(1, intArrayOf(fbo.fboId), 0)
                        GLES30.glDeleteTextures(1, intArrayOf(fbo.texId), 0)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Anime4K drawFrame failed", e)
            onError(e)
        }
    }

    override fun release() {
        super.release()
        releaseGl()
    }

    // ---------- GL 资源 ----------

    private fun initQuad() {
        if (quadVao != 0) return
        vertexShaderId = compileShader(GLES30.GL_VERTEX_SHADER, Anime4KProgram.VERTEX_SRC)
            ?: return
        val vbo = IntArray(1)
        val vao = IntArray(1)
        GLES30.glGenBuffers(1, vbo, 0)
        GLES30.glGenVertexArrays(1, vao, 0)
        val verts = FloatBuffer.wrap(
            floatArrayOf(
                -1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f
            )
        )
        GLES30.glBindVertexArray(vao[0])
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vbo[0])
        GLES30.glBufferData(GLES30.GL_ARRAY_BUFFER, 8 * 4, verts, GLES30.GL_STATIC_DRAW)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 2, GLES30.GL_FLOAT, false, 0, 0)
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, 0)
        GLES30.glBindVertexArray(0)
        quadVbo = vbo[0]
        quadVao = vao[0]
        // 防御性 GL 状态
        GLES30.glDisable(GLES30.GL_BLEND)
        GLES30.glDisable(GLES30.GL_DEPTH_TEST)
        GLES30.glDisable(GLES30.GL_SCISSOR_TEST)
        GLES30.glColorMask(true, true, true, true)
    }

    private fun createFbo(w: Int, h: Int): Fbo {
        var texId = createTexture(w, h, true)
        var fboId = createFboForTexture(texId)
        if (glCheckComplete(fboId)) return Fbo(texId, fboId, w, h)
        // 16F 不可渲染 → fallback 8bit
        GLES30.glDeleteFramebuffers(1, intArrayOf(fboId), 0)
        GLES30.glDeleteTextures(1, intArrayOf(texId), 0)
        Log.w(TAG, "Anime4K 16F FBO incomplete, fallback RGBA8 ($w x $h)")
        texId = createTexture(w, h, false)
        fboId = createFboForTexture(texId)
        return Fbo(texId, fboId, w, h)
    }

    private fun createTexture(w: Int, h: Int, highPrecision: Boolean): Int {
        val ids = IntArray(1)
        GLES30.glGenTextures(1, ids, 0)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, ids[0])
        GLES30.glTexImage2D(
            GLES30.GL_TEXTURE_2D, 0,
            if (highPrecision) GLES30.GL_RGBA16F else GLES30.GL_RGBA8,
            w, h, 0, GLES30.GL_RGBA,
            if (highPrecision) GLES30.GL_HALF_FLOAT else GLES30.GL_UNSIGNED_BYTE,
            null,
        )
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, 0)
        return ids[0]
    }

    private fun createFboForTexture(texId: Int): Int {
        val ids = IntArray(1)
        GLES30.glGenFramebuffers(1, ids, 0)
        GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, ids[0])
        GLES30.glFramebufferTexture2D(
            GLES30.GL_FRAMEBUFFER, GLES30.GL_COLOR_ATTACHMENT0,
            GLES30.GL_TEXTURE_2D, texId, 0,
        )
        GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, 0)
        return ids[0]
    }

    private fun glCheckComplete(fboId: Int): Boolean {
        GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, fboId)
        val status = GLES30.glCheckFramebufferStatus(GLES30.GL_FRAMEBUFFER)
        GLES30.glBindFramebuffer(GLES30.GL_FRAMEBUFFER, 0)
        return status == GLES30.GL_FRAMEBUFFER_COMPLETE
    }

    private fun compileShader(type: Int, source: String): Int? {
        val id = GLES30.glCreateShader(type)
        GLES30.glShaderSource(id, source)
        GLES30.glCompileShader(id)
        val status = IntArray(1)
        GLES30.glGetShaderiv(id, GLES30.GL_COMPILE_STATUS, status, 0)
        if (status[0] == 0) {
            Log.e(TAG, "Anime4K vertex shader compile failed: ${GLES30.glGetShaderInfoLog(id)}")
            GLES30.glDeleteShader(id)
            return null
        }
        return id
    }

    private fun releaseGl() {
        for (p in programs.values) p.release()
        programs.clear()
        for (fbo in fbos.values) {
            GLES30.glDeleteFramebuffers(1, intArrayOf(fbo.fboId), 0)
            GLES30.glDeleteTextures(1, intArrayOf(fbo.texId), 0)
        }
        fbos.clear()
        if (quadVao != 0) {
            GLES30.glDeleteVertexArrays(1, intArrayOf(quadVao), 0)
            quadVao = 0
        }
        if (quadVbo != 0) {
            GLES30.glDeleteBuffers(1, intArrayOf(quadVbo), 0)
            quadVbo = 0
        }
        if (vertexShaderId != 0) {
            GLES30.glDeleteShader(vertexShaderId)
            vertexShaderId = 0
        }
        sim = null
    }
}
