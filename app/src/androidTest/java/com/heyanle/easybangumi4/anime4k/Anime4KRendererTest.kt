package com.heyanle.easybangumi4.anime4k

import android.graphics.Bitmap
import android.graphics.Color
import android.opengl.EGL14
import android.opengl.GLES30
import androidx.media3.common.GlTextureInfo
import androidx.media3.common.util.GlUtil
import androidx.media3.effect.DefaultGlObjectsProvider
import androidx.media3.effect.GlShaderProgram
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Anime4KRendererTest {

    @Test
    fun standardChain_preservesNonBlackVideoFrame() {
        val display = GlUtil.getDefaultEglDisplay()
        val provider = DefaultGlObjectsProvider()
        val context = provider.createEglContext(
            display,
            3,
            GlUtil.EGL_CONFIG_ATTRIBUTES_RGBA_8888,
        )
        val surface = provider.createFocusedPlaceholderEglSurface(context, display)
        var input: GlTextureInfo? = null
        var renderer: Anime4KRenderer? = null

        try {
            val appContext = ApplicationProvider.getApplicationContext<android.content.Context>()
            val passes = Anime4KSource.chainFor(
                appContext,
                A4KChain.DEFAULT_MODE,
                A4KChain.DEFAULT_QUALITY,
            )
            renderer = Anime4KRenderer(
                useHighPrecision = false,
                passes = passes,
                displayWidth = TEST_SIZE * 2,
            )

            val bitmap = Bitmap.createBitmap(TEST_SIZE, TEST_SIZE, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.rgb(224, 96, 32))
            val textureId = GlUtil.createTexture(bitmap)
            bitmap.recycle()
            input = GlTextureInfo(
                textureId,
                GlUtil.createFboForTexture(textureId),
                GlTextureInfo.UNSET.rboId,
                TEST_SIZE,
                TEST_SIZE,
            )

            var output: GlTextureInfo? = null
            renderer.setOutputListener(object : GlShaderProgram.OutputListener {
                override fun onOutputFrameAvailable(outputTexture: GlTextureInfo, presentationTimeUs: Long) {
                    output = outputTexture
                }
            })
            renderer.queueInputFrame(provider, input, 0L)

            val rendered = output
            assertNotNull("Anime4K did not produce an output texture", rendered)
            assertEquals(TEST_SIZE * 2, rendered!!.width)
            assertEquals(TEST_SIZE * 2, rendered.height)
            GlUtil.focusFramebufferUsingCurrentContext(
                rendered.fboId,
                rendered.width,
                rendered.height,
            )
            val pixels = ByteBuffer.allocateDirect(rendered.width * rendered.height * 4)
                .order(ByteOrder.nativeOrder())
            GLES30.glReadPixels(
                0,
                0,
                rendered.width,
                rendered.height,
                GLES30.GL_RGBA,
                GLES30.GL_UNSIGNED_BYTE,
                pixels,
            )
            GlUtil.checkGlError()

            var brightestRgb = 0
            for (offset in 0 until pixels.capacity() step 4) {
                val rgb = (pixels.get(offset).toInt() and 0xff) +
                    (pixels.get(offset + 1).toInt() and 0xff) +
                    (pixels.get(offset + 2).toInt() and 0xff)
                brightestRgb = maxOf(brightestRgb, rgb)
            }
            assertTrue(
                "Anime4K rendered an all-black frame (brightest RGB sum=$brightestRgb)",
                brightestRgb > 30,
            )
        } finally {
            renderer?.release()
            input?.release()
            GlUtil.destroyEglSurface(display, surface)
            GlUtil.destroyEglContext(display, context)
            EGL14.eglTerminate(display)
        }
    }

    private companion object {
        const val TEST_SIZE = 32
    }
}
