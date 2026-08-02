// @key com.lanerc.yzx
// @label 囧源·柚子星
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·柚子星 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 yzx.js，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {};
// ============================================================
//  __JB 桥 shim —— 把囧次元脚本用的桥函数映射到 EasyBangumi 的 Java 桥
//  对齐 JsBuiltinFunctions.java 的语义，让 14 个原始源脚本几乎原样运行。
// ============================================================
var JB64 = Packages.android.util.Base64;
var okhttpHelper = Inject_OkhttpHelper;

// ---------- 常量 ----------
var B64U = JB64.URL_SAFE | JB64.NO_WRAP | JB64.NO_PADDING;

// ---------- opts 归一化：源脚本可能传 JS 对象，也可能传 JSON 字符串 ----------
function normOpts(o) {
    if (o == null) return {};
    if (typeof o === "object") return o;
    try { return parseJson(String(o)) || {}; } catch (e) { return {}; }
}

// ---------- HTTP ----------
function httpDo(url, method, body, opts) {
    var o = normOpts(opts);
    var headers = o.headers || {};
    var timeout = o.timeout || 20000;
    var cs = String(o.charset || 'utf-8').toLowerCase();
    var isLatin1 = (cs === 'iso-8859-1' || cs === 'latin1');
    var b = new Request.Builder().url(url);
    for (var k in headers) if (headers.hasOwnProperty(k)) b.header(k, String(headers[k]));
    if (method === "POST") {
        if (body == null) body = "";
        var mt = "text/plain; charset=utf-8";
        if (headers["Content-Type"]) mt = headers["Content-Type"];
        var bodyBytes = isLatin1
            ? new java.lang.String(body).getBytes("ISO-8859-1")
            : new java.lang.String(body).getBytes("UTF-8");
        b.post(RequestBody.create(bodyBytes, MediaType.parse(mt)));
    } else {
        b.get();
    }
    var resp = okhttpHelper.client.newCall(b.build()).execute();
    var out;
    try {
        if (isLatin1 && typeof resp.body().bytes === 'function') {
            // 二进制/字节透传：每个字节 → 一个 char(0-255)，避免 UTF-8 损坏
            var bytes = resp.body().bytes();
            var sb = new StringBuilder();
            for (var i = 0; i < bytes.length; i++) sb.append(String.fromCharCode(bytes[i] & 0xff));
            out = String(sb.toString());
        } else {
            out = String(resp.body().string());
        }
    } finally { resp.close(); }
    return out;
}

function request(u, o)  { return httpDo(String(u), "GET", null, o); }
function get(u, o)      { return httpDo(String(u), "GET", null, o); }
function post(u, b2, o) { return httpDo(String(u), "POST", b2 == null ? "" : String(b2), o); }

var http = {
    request:  function (u, o) { return request(u, o); },
    get:      function (u, o) { return get(u, o); },
    post:     function (u, b2, o) { return post(u, b2, o); },
    request2: function (u, o) { return request(u, o); },
    post2:    function (u, b2, o) { return post(u, b2, o); },
    resolveRedirect: function (u, o) { return request(u, o); },
    setCookies:   function (host, cookies) {},
    getCookies:   function (host) { return "{}"; },
    clearCookies: function (host) {}
};

// ---------- 摘要 ----------
function digestHex(algo, s) {
    var md = java.security.MessageDigest.getInstance(algo);
    var d = md.digest(new java.lang.String(s == null ? "" : String(s)).getBytes("UTF-8"));
    var sb = new StringBuilder();
    for (var i = 0; i < d.length; i++) {
        var x = d[i] & 0xff;
        if (x < 16) sb.append("0");
        sb.append(Integer.toHexString(x));
    }
    return String(sb.toString().toLowerCase());
}
function md5(s)    { return digestHex("MD5", s); }
function sha1(s)   { return digestHex("SHA-1", s); }
function sha256(s) { return digestHex("SHA-256", s); }
function sha512(s) { return digestHex("SHA-512", s); }

// ---------- base64 / hex ----------
function base64Encode(s) {
    var b = new java.lang.String(s == null ? "" : String(s)).getBytes("UTF-8");
    return String(JB64.encodeToString(b, JB64.NO_WRAP));
}
function base64Decode(s) {
    var raw = JB64.decode(String(s == null ? "" : s), JB64.DEFAULT);
    return String(new java.lang.String(raw, "UTF-8"));
}
function hexEncode(s) {
    var b = new java.lang.String(String(s)).getBytes("UTF-8");
    var sb = new StringBuilder();
    for (var i = 0; i < b.length; i++) { var x = b[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); }
    return String(sb.toString());
}
function hexDecode(s) {
    var str = String(s); var out = new java.io.ByteArrayOutputStream();
    for (var i = 0; i + 1 < str.length; i += 2) out.write(parseInt(str.substr(i, 2), 16) & 0xff);
    return String(new java.lang.String(out.toByteArray(), "UTF-8"));
}

// ---------- URI ----------
function encodeUri(s) { return encodeURIComponent(s == null ? "" : String(s)); }
function decodeUri(s) { return decodeURIComponent(s == null ? "" : String(s)); }

// ---------- 正则（对齐 Java Pattern）----------
function match(t, r, g) {
    t = t == null ? "" : String(t);
    var p = java.util.regex.Pattern.compile(String(r));
    var m = p.matcher(t);
    if (!m.find()) return "";
    try { return m.group(g == null ? 1 : g); } catch (e) { return m.group(); }
}
function matchAll(t, r) {
    t = t == null ? "" : String(t);
    var p = java.util.regex.Pattern.compile(String(r));
    var m = p.matcher(t);
    var arr = [];
    while (m.find()) {
        var grp = [];
        for (var i = 0; i <= m.groupCount(); i++) grp.push(m.group(i));
        arr.push(grp);
    }
    return JSON.stringify(arr);
}

// ---------- 其他 ----------
function timestamp() { return Date.now(); }  // 对齐原版 JsBuiltinFunctions: System.currentTimeMillis() 毫秒
function log(s) { JSLogUtils.i("JB", String(s)); }
function getItem(k, d) { return d == null ? "" : String(d); }
function setItem(k, v) {}
function removeItem(k) {}
function parseJson(s) {
    if (s != null && typeof s === 'object') {
        // 已包装字符串（java.lang.String / mock JavaString）→ 解包再解析
        if (typeof s.getBytes === 'function' || typeof s._s === 'string') {
            try { return JSON.parse(s.toString()); } catch (e) { return null; }
        }
        return s;  // 纯 JS 对象（crypto opts 等）直接用
    }
    try { return JSON.parse(String(s)); } catch (e) { return null; }
}
function toJson(o) { try { return JSON.stringify(o); } catch (e) { return ""; } }
function sniffMedia(u, o) { return { ok: false, url: "", error: "not supported" }; }
function sniffAll(u, o) { return { ok: false, list: [], error: "not supported" }; }

// ---------- crypto ----------
function hmacHex(algo, key, msg) {
    var mac = Mac.getInstance(algo);
    mac.init(new javax.crypto.spec.SecretKeySpec(new java.lang.String(key == null ? "" : String(key)).getBytes("UTF-8"), algo.replace("-", "")));
    var d = mac.doFinal(new java.lang.String(msg == null ? "" : String(msg)).getBytes("UTF-8"));
    var sb = new StringBuilder();
    for (var i = 0; i < d.length; i++) { var x = d[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); }
    return String(sb.toString().toLowerCase());
}
function aesDo(ciphertext, key, opts, encrypt) {
    var o = normOpts(opts);
    var mode = String(o.mode || "ECB").toUpperCase();
    var pad  = String(o.padding || "PKCS5");
    // 对齐 JsBuiltinFunctions.java：encrypt 默认 input=utf8/output=base64，decrypt 默认 input=base64/output=utf8
    var inF  = String(o.input || (encrypt ? "utf8" : "base64")).toLowerCase();
    var outF = String(o.output || (encrypt ? "base64" : "utf8")).toLowerCase();
    var keyStr = String(key == null ? "" : key);
    var keyBytes = (o.keyFormat && String(o.keyFormat).toLowerCase() === "hex")
        ? hexToBytes(keyStr) : new java.lang.String(keyStr).getBytes("UTF-8");
    var data;
    if (inF === "hex") data = hexToBytes(String(ciphertext));
    else if (inF === "utf8") data = new java.lang.String(ciphertext == null ? "" : String(ciphertext)).getBytes("UTF-8");
    else data = JB64.decode(String(ciphertext == null ? "" : ciphertext), JB64.DEFAULT);
    var jpad = (pad.toLowerCase() === "nopadding" || pad.toLowerCase() === "zero" || pad.toLowerCase() === "zeropadding") ? "NoPadding" : "PKCS5Padding";
    var ci = Cipher.getInstance("AES/" + mode + "/" + jpad);
    var spec = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
    if (mode === "ECB") {
        ci.init(encrypt ? Cipher.ENCRYPT_MODE : Cipher.DECRYPT_MODE, spec);
    } else {
        var ivBytes = (o.iv && String(o.ivFormat).toLowerCase() === "hex") ? hexToBytes(String(o.iv)) : new java.lang.String(String(o.iv || "")).getBytes("UTF-8");
        ci.init(encrypt ? Cipher.ENCRYPT_MODE : Cipher.DECRYPT_MODE, spec, new javax.crypto.spec.IvParameterSpec(ivBytes));
    }
    var out = ci.doFinal(data);
    if (outF === "hex") { var sb = new StringBuilder(); for (var i = 0; i < out.length; i++) { var x = out[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); } return String(sb.toString()); }
    if (outF === "base64") return String(JB64.encodeToString(out, JB64.NO_WRAP));
    return String(new java.lang.String(out, "UTF-8"));
}
function hexToBytes(s) {
    var str = String(s); var out = new java.io.ByteArrayOutputStream();
    for (var i = 0; i + 1 < str.length; i += 2) out.write(parseInt(str.substr(i, 2), 16) & 0xff);
    return out.toByteArray();
}
function inflateDecode(input) {
    var raw = JB64.decode(String(input), JB64.DEFAULT);
    var inf = new java.util.zip.Inflater();
    inf.setInput(raw);
    var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65536);
    var out = new java.io.ByteArrayOutputStream();
    while (!inf.finished()) { var n = inf.inflate(buf); if (n <= 0) break; out.write(buf, 0, n); }
    inf.end();
    return String(new java.lang.String(out.toByteArray(), "UTF-8"));
}

var crypto = {
    md5: function (s) { return md5(s); },
    sha1: function (s) { return sha1(s); },
    sha256: function (s) { return sha256(s); },
    sha512: function (s) { return sha512(s); },
    hash: function (algo, input, o) {
        var a = String(algo).toUpperCase().replace("-", "");
        if (a === "MD5") return md5(input);
        if (a === "SHA1") return sha1(input);
        if (a === "SHA256") return sha256(input);
        if (a === "SHA512") return sha512(input);
        return "";
    },
    hmac: function (algo, key, msg, o) {
        var a = String(algo).toUpperCase().replace("-", "");
        return hmacHex("Hmac" + a, key, msg);
    },
    aes: {
        encrypt: function (p, k, o) { return aesDo(p, k, o, true); },
        decrypt: function (c, k, o) { return aesDo(c, k, o, false); }
    },
    base: {
        encode: function (s, o) {
            var op = normOpts(o);
            var inF = String(op.input || "utf8").toLowerCase();
            var data = (inF === "hex") ? hexToBytes(String(s))
                     : (inF === "base64") ? JB64.decode(String(s == null ? "" : s), JB64.DEFAULT)
                     : new java.lang.String(s == null ? "" : String(s)).getBytes("UTF-8");
            return String(JB64.encodeToString(data, JB64.NO_WRAP));
        },
        decode: function (s, o) {
            var op = normOpts(o);
            var outF = String(op.output || "utf8").toLowerCase();
            var raw = JB64.decode(String(s == null ? "" : s), JB64.DEFAULT);
            if (outF === "hex") { var sb = new StringBuilder(); for (var i = 0; i < raw.length; i++) { var x = raw[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); } return String(sb.toString()); }
            return new java.lang.String(raw, "UTF-8");
        }
    },
    base64: {
        encode: function (s, o) { return crypto.base.encode(s, o); },
        decode: function (s, o) { return crypto.base.decode(s, o); }
    },
    hex: {
        encode: function (s, o) {
            var op = normOpts(o);
            var inF = String(op.input || "utf8").toLowerCase();
            var data = (inF === "hex") ? hexToBytes(String(s))
                     : (inF === "base64") ? JB64.decode(String(s == null ? "" : s), JB64.DEFAULT)
                     : new java.lang.String(s == null ? "" : String(s)).getBytes("UTF-8");
            var sb = new StringBuilder();
            for (var i = 0; i < data.length; i++) { var x = data[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); }
            return String(sb.toString());
        },
        decode: function (s, o) {
            var op = normOpts(o);
            var outF = String(op.output || "utf8").toLowerCase();
            var raw = hexToBytes(String(s == null ? "" : s));
            if (outF === "hex") { return hexEncode(new java.lang.String(raw, "UTF-8")); }
            if (outF === "base64") return String(JB64.encodeToString(raw, JB64.NO_WRAP));
            return new java.lang.String(raw, "UTF-8");
        }
    },
    inflate: function (input, o) { return inflateDecode(input); },
    gzip: { decode: function (input, o) { return inflateDecode(input); } },
    rsa: { encrypt: function (p, k, o) { return rsaDo(p, k, o, true); }, decrypt: function (c, k, o) { return rsaDo(c, k, o, false); } }
};
function rsaDo(input, keyStr, o, encrypt) {
    var opts = normOpts(o);
    var inF  = String(opts.input || (encrypt ? "utf8" : "base64")).toLowerCase();
    var outF = String(opts.output || (encrypt ? "base64" : "utf8")).toLowerCase();
    var data;
    if (inF === "hex") data = hexToBytes(String(input));
    else if (inF === "utf8") data = new java.lang.String(input == null ? "" : String(input)).getBytes("UTF-8");
    else data = JB64.decode(String(input == null ? "" : input), JB64.DEFAULT);
    var kf = java.security.KeyFactory.getInstance("RSA");
    var spec = encrypt
        ? new java.security.spec.X509EncodedKeySpec(JB64.decode(String(keyStr), JB64.DEFAULT))
        : new java.security.spec.PKCS8EncodedKeySpec(JB64.decode(String(keyStr), JB64.DEFAULT));
    var key = encrypt ? kf.generatePublic(spec) : kf.generatePrivate(spec);
    var ci = Cipher.getInstance("RSA/ECB/PKCS1Padding");
    ci.init(encrypt ? Cipher.ENCRYPT_MODE : Cipher.DECRYPT_MODE, key);
    var out = ci.doFinal(data);
    if (outF === "hex") { var sb = new StringBuilder(); for (var i = 0; i < out.length; i++) { var x = out[i] & 0xff; if (x < 16) sb.append("0"); sb.append(Integer.toHexString(x)); } return String(sb.toString()); }
    if (outF === "utf8") return String(new java.lang.String(out, "UTF-8"));
    return String(JB64.encodeToString(out, JB64.NO_WRAP));
}

// ---------- UA 预设 ----------
var UA = {
    chrome:  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    edge:    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.0.0",
    firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
    safari:  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    iphone:  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    ipad:    "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    android: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    mobile:  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    okhttp:  "okhttp/4.12.0"
};

/*
 * 云帧享（com.baiyunvideo.app）JS 源 —— 海阔小程序移植（仅动漫频道）
 * 明文 JSON 列表/搜索 + AES-256-GCM 详情解密 + vuk 签名取流（已用 Node 端到端验证 2026-07-10）
 * version: 1.0.0
 *
 * 只做「动漫」：分类固定频道=动漫，搜索结果过滤 typeName==动漫，其它频道（剧集/电影/综艺/少儿/纪录片）不显示。
 *
 * 机制：
 *   - 引导：GET https://ss.trgfd.cn/cache/index/com.baiyunvideo.app.json
 *           → app.textURL(接口host) / qudao[0].banben(播放要的 version)；有稳定默认值，失败/轮换才回源刷新。
 *   - 分类：GET host/cache/zhaopian/动漫/{剧情}/{地区}/{年份}/{排序}/{page}.json → 明文数组（每页 21，剧情段恒填「全部」）
 *   - 搜索：GET host/vc/api/search/{kw}/{page}.json → 明文数组（含全部频道，取 typeName==动漫；仅第 1 页有数据）
 *   - 详情：GET host/cache/videos/{floor(id/1000)}/{id}.json?version={ver}&baoming=com.baiyunvideo.app&channel=fenxiang
 *           → base64(iv12+cipher+tag16)，AES-256-GCM 解密（必须带上面 query，否则服务端返回旧 key 密文、新 key 解不开）
 *           key=UvsoWWyu3PM8GpEsaqm4VsBcJrDJy7i7（utf8 32B）→ {videoName,...,playUrlList:[{name,ji}]}
 *   - 取流：GET host/vc/api/video/playurl?sid={id}&ji={ji}&jiIndex={i}&t=0&y=0&isjiid=1&androidId={16}&version={ver}&baoming=com.baiyunvideo.app&channel=fenxiang
 *           header vuk=md5(id+key) → data.url（多为带签名 mp4 直链）
 */

var CHANNEL = '动漫';
var PKG = 'com.baiyunvideo.app';
var KEY = 'UvsoWWyu3PM8GpEsaqm4VsBcJrDJy7i7'; // AES-256 key（utf8 32 字节；2026-07 由 Zz4O… 轮换而来，详情解密 + 取流 vuk 签名共用）
var BOOT = 'https://ss.trgfd.cn/cache/index/' + PKG + '.json';
var HOST_DEFAULT = 'https://js.trgfd.cn';
var VER_DEFAULT = '2.5.0';
var UA_OK = (typeof UA !== 'undefined' && UA.okhttp) ? UA.okhttp : 'okhttp/3.12.0';
var TIMEOUT = 15000;

// host / version 优先级：内存缓存 → 持久缓存(getItem) → 硬编码默认（当前有效）；请求失败时才回引导接口刷新并持久化。
var _host = '', _ver = '', _loaded = false;
function loadCfg() {
    if (_loaded) return;
    _loaded = true;
    try { _host = getItem('yzx_host', '') || ''; } catch (e) {}
    try { _ver = getItem('yzx_ver', '') || ''; } catch (e) {}
}
// 回引导接口重新取 host/version（默认失效/域名轮换时才走）
function freshCfg() {
    try {
        var j = parseJson(request(BOOT, JSON.stringify({ headers: { 'User-Agent': UA_OK }, timeout: TIMEOUT }))) || {};
        if (j.app && j.app.textURL) { _host = String(j.app.textURL).replace(/\/+$/, ''); try { setItem('yzx_host', _host); } catch (e) {} }
        if (j.qudao && j.qudao[0] && j.qudao[0].banben) { _ver = String(j.qudao[0].banben); try { setItem('yzx_ver', _ver); } catch (e2) {} }
    } catch (e) { log('[yzx] freshCfg err ' + e); }
}
function getHost() { loadCfg(); return (_host || HOST_DEFAULT).replace(/\/+$/, ''); }
function getVer() { loadCfg(); return _ver || VER_DEFAULT; }

function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
function clean(s) { if (!s) return ''; return trim(String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[\u3000]+/g, ' ')); }
function guessType(u) { var l = (u || '').toLowerCase(); if (l.indexOf('.m3u8') >= 0) return 'm3u8'; if (l.indexOf('.mp4') >= 0) return 'mp4'; return 'auto'; }
function nonce(n) { var c = 'abcdefghijklmnopqrstuvwxyz0123456789', r = ''; for (var i = 0; i < n; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r; }

function reqJson(url) {
    try { return parseJson(request(url, JSON.stringify({ headers: { 'User-Agent': UA_OK }, timeout: TIMEOUT }))); }
    catch (e) { log('[yzx] req err ' + e); return null; }
}

// AES-256-GCM：密文是 base64(iv12 + cipher + tag16)。引擎 GCM 要 iv 单独传，故先转 hex 拆出前 12 字节 iv，剩余（cipher+tag）作 input。
function gcmDec(b64) {
    try {
        var hex = crypto.base64.decode(b64, { output: 'hex' }) || '';
        if (hex.length < 24) return '';
        var ivHex = hex.substring(0, 24);
        var bodyHex = hex.substring(24);
        return crypto.aes.decrypt(bodyHex, KEY, {
            mode: 'GCM', padding: 'NoPadding', keyFormat: 'utf8',
            iv: ivHex, ivFormat: 'hex', input: 'hex', output: 'utf8', tagLen: 128
        }) || '';
    } catch (e) { log('[yzx] gcm err ' + e); return ''; }
}

function mapList(arr) {
    var out = [];
    if (!arr || !arr.length) return out;
    for (var i = 0; i < arr.length; i++) {
        var v = arr[i] || {};
        if (v.videoId == null) continue;
        out.push({
            id: String(v.videoId),
            name: trim(v.videoName),
            pic: v.fengmiantu || v.dahengtu || '',
            type: CHANNEL,
            year: v.year ? String(v.year) : '',
            remarks: trim(v.serialDesc || v.newchapter || v.remarks || ''),
            desc: clean(v.blurb || v.shortBlurb || '')
        });
    }
    return out;
}

// ───────────────────────── 契约入口 ─────────────────────────

// 只做动漫：一个「推荐」发现页 + 一个「全部」筛选页（地区/年份/排序，服务端落地）
var CAT_ALL = 'dm';
function categories() {
    return JSON.stringify([
        { key: '', title: '推荐' },
        {
            key: CAT_ALL, title: '全部', filters: [
                { key: 'area', name: '地区', value: [{ n: '全部', v: '' }, { n: '日本', v: '日本' }, { n: '大陆', v: '大陆' }, { n: '美国', v: '美国' }, { n: '其他', v: '其他' }] },
                { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' }, { n: '2021', v: '2021' }, { n: '2020', v: '2020' }, { n: '2019', v: '2019' }, { n: '2018', v: '2018' }, { n: '2017', v: '2017' }, { n: '2016', v: '2016' }, { n: '更早', v: '更早' }] },
                { key: 'sort', name: '排序', value: [{ n: '最新', v: '最新' }, { n: '最热', v: '最热' }, { n: '评分', v: '评分' }] }
            ]
        }
    ]);
}

// 分类列表：剧情段恒填「全部」（该段可选值不稳定，不做筛选维度）
function listPage(area, year, sort, page) {
    var url = getHost() + '/cache/zhaopian/' + encodeUri(CHANNEL) + '/' + encodeUri('全部') + '/' +
        encodeUri(area || '全部') + '/' + encodeUri(year || '全部') + '/' + encodeUri(sort || '最新') + '/' + (page || 1) + '.json';
    return mapList(reqJson(url));
}

function homeSections() {
    var out = [];
    var secs = [{ t: '最新动漫', s: '最新' }, { t: '人气热播', s: '最热' }, { t: '高分动漫', s: '评分' }];
    for (var i = 0; i < secs.length; i++) {
        var lst = listPage('全部', '全部', secs[i].s, 1);
        if (lst.length) out.push({ title: secs[i].t, key: CAT_ALL, items: lst.slice(0, 12) });
    }
    return JSON.stringify(out);
}

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword);
    // 分类 tab（''=推荐 / CAT_ALL=全部）→ 走列表；其余当搜索词
    if (!key || key === CAT_ALL || key === CHANNEL) return JSON.stringify(listPage('全部', '全部', '最新', page));
    if (page > 1) return '[]'; // 搜索接口只有第 1 页
    var arr = reqJson(getHost() + '/vc/api/search/' + encodeUri(key) + '/' + page + '.json') || [];
    var only = [];
    for (var i = 0; i < arr.length; i++) if (trim(arr[i] && arr[i].typeName) === CHANNEL) only.push(arr[i]);
    return JSON.stringify(mapList(only));
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    return JSON.stringify(listPage(f.area || '全部', f.year || '全部', f.sort || '最新', page || 1));
}

function detail(id) {
    var out = { id: id, name: '', pic: '', desc: '', type: CHANNEL, year: '', remarks: '', episodes: [] };
    var dir = Math.floor((parseInt(id, 10) || 0) / 1000);
    // 详情接口必须带鉴权 query，否则服务端返回旧 key 密文（新 key 解不开）；getVer 可能被 freshCfg 刷新，故每次现取
    function detUrl() { return getHost() + '/cache/videos/' + dir + '/' + id + '.json?version=' + getVer() + '&baoming=' + PKG + '&channel=fenxiang'; }
    var raw = '';
    try { raw = request(detUrl(), JSON.stringify({ headers: { 'User-Agent': UA_OK }, timeout: TIMEOUT })) || ''; } catch (e) {}
    if (raw && raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // 去 BOM
    var plain = gcmDec(trim(raw));
    if (!plain) { freshCfg(); try { raw = request(detUrl(), JSON.stringify({ headers: { 'User-Agent': UA_OK }, timeout: TIMEOUT })) || ''; } catch (e2) {} if (raw && raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); plain = gcmDec(trim(raw)); }
    var v = parseJson(plain);
    if (!v) return JSON.stringify(out);

    out.name = trim(v.videoName);
    out.pic = v.fengmiantu || v.dahengtu || '';
    out.year = v.year ? String(v.year) : '';
    out.remarks = trim(v.remarks || v.serialDesc || '');
    var extra = [];
    if (v.class) extra.push('类型：' + trim(v.class));
    if (v.region) extra.push('地区：' + trim(v.region));
    if (v.actor) extra.push('主演：' + trim(v.actor));
    out.desc = (extra.length ? extra.join('  ') + '\n' : '') + clean(v.blurb || v.shortBlurb || '');

    var eps = v.playUrlList || [];
    for (var i = 0; i < eps.length; i++) {
        var e = eps[i] || {};
        if (e.ji == null) continue;
        out.episodes.push({ name: trim(e.name) || ('第' + (i + 1) + '集'), url: id + '$' + e.ji + '$' + i });
    }
    return JSON.stringify(out);
}

function fetchPlay(id, ji, idx) {
    var url = getHost() + '/vc/api/video/playurl?sid=' + id + '&ji=' + ji + '&jiIndex=' + idx +
        '&t=0&y=0&isjiid=1&androidId=' + nonce(16) + '&version=' + getVer() + '&baoming=' + PKG + '&channel=fenxiang';
    try {
        return parseJson(request(url, JSON.stringify({ headers: { 'User-Agent': UA_OK, 'vuk': md5(id + KEY) }, timeout: TIMEOUT })));
    } catch (e) { log('[yzx] play err ' + e); return null; }
}

function play(flag) {
    var res = { url: '', type: 'auto', referer: '' };
    var seg = String(flag || '').split('$');
    if (seg.length < 3) return JSON.stringify(res);
    var id = seg[0], ji = seg[1], idx = seg[2];
    var r = fetchPlay(id, ji, idx);
    var u = r && r.data && r.data.url;
    if (!u) { freshCfg(); r = fetchPlay(id, ji, idx); u = r && r.data && r.data.url; }
    if (u) { res.url = u; res.type = guessType(u); }
    return JSON.stringify(res);
}

// ============================================================
//  通用组件壳 —— 把源脚本的标准输出映射成 EasyBangumi 组件
//  源脚本必须暴露: homeSections() / categories() / search() / detail() / play()
// ============================================================

// ---------- 字段归一化 ----------
function coverOf(it) {
    if (it == null) return null;
    var id = String(it.id != null ? it.id : (it.vod_id != null ? it.vod_id : ""));
    var name = String(it.name != null ? it.name : (it.title != null ? it.title : (it.vod_name != null ? it.vod_name : "")));
    var pic = String(it.pic != null ? it.pic : (it.cover != null ? it.cover : (it.vod_pic != null ? it.vod_pic : "")));
    var intro = String(it.desc != null ? it.desc : (it.intro != null ? it.intro : (it.remarks != null ? it.remarks : (it.vod_blurb != null ? it.vod_blurb : ""))));
    if (id.length == 0 || name.length == 0) return null;
    return { id: id, name: name, pic: pic, intro: intro };
}

function srcJson(fn, arg) {
    var raw;
    try { raw = arg === undefined ? fn() : fn(arg); } catch (e) { return null; }
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    try { return parseJson(String(raw)); } catch (e) { return null; }
}

function makeCard(it) {
    var c = coverOf(it);
    if (c == null) return null;
    return makeCartoonCover({
        id: c.id,
        source: source.key,
        url: c.id,
        title: c.name,
        cover: c.pic,
        intro: c.intro
    });
}

// ---------- 缓存 ----------
var S_HOME = null;
function getHomeSections() {
    if (S_HOME != null) return S_HOME;
    if (typeof homeSections !== "function") { S_HOME = []; return S_HOME; }
    var arr = srcJson(homeSections);
    S_HOME = Array.isArray(arr) ? arr : [];
    return S_HOME;
}
var S_CATS = null;
function getCats() {
    if (S_CATS != null) return S_CATS;
    var arr = srcJson(categories);
    S_CATS = Array.isArray(arr) ? arr : [];
    return S_CATS;
}

// ---------- Preference ----------
function PreferenceComponent_getPreference() {
    return new ArrayList();
}

// ---------- Page ----------
// getMainTabs 必须同步返回（EasyBangumi init 有 5s 超时），不能做网络请求。
// 因此首页固定一个"首页"标签，网络加载全部放到 getContent（有 50s 超时）。
function getHomeSectionsCached() { return S_HOME != null ? S_HOME : []; }
function getCatsCached() { return S_CATS != null ? S_CATS : []; }

function PageComponent_getMainTabs() {
    var res = new ArrayList();
    var seen = {};
    res.add(new MainTab("首页", MainTab.MAIN_TAB_WITH_COVER));
    seen["首页"] = 1;
    // 若已有缓存（之前加载过内容），再补充真实分区，纯读缓存不联网
    var secs = getHomeSectionsCached();
    for (var i = 0; i < secs.length; i++) {
        var t = String(secs[i].title != null ? secs[i].title : ("分区" + (i + 1)));
        if (!seen[t]) { seen[t] = 1; res.add(new MainTab(t, MainTab.MAIN_TAB_WITH_COVER)); }
    }
    var cats = getCatsCached();
    for (var j = 0; j < cats.length; j++) {
        var t2 = String(cats[j].title != null ? cats[j].title : "");
        if (t2.length > 0 && !seen[t2]) { seen[t2] = 1; res.add(new MainTab(t2, MainTab.MAIN_TAB_WITH_COVER)); }
    }
    return res;
}

function PageComponent_getSubTabs(mainTab) { return new ArrayList(); }

function PageComponent_getContent(mainTab, subTab, key) {
    var list = new ArrayList();
    var secs = getHomeSections();
    if (mainTab.label == "首页") {
        // 首页：展平所有分区的内容
        for (var i = 0; i < secs.length; i++) {
            var items = secs[i].items;
            if (Array.isArray(items)) {
                for (var k = 0; k < items.length; k++) { var c = makeCard(items[k]); if (c != null) list.add(c); }
            }
        }
        // 部分源没有 homeSections（guazi/sanqiu/shuangxing），首页从分类补内容
        if (list.size() == 0) {
            var cats = getCats();
            for (var j = 0; j < cats.length && list.size() < 50; j++) {
                var catKey = String(cats[j].key != null ? cats[j].key : "");
                if (catKey.length > 0 && typeof searchFiltered === "function") {
                    var items = srcJson(searchFiltered, catKey, "{}", 1);
                    if (Array.isArray(items)) {
                        for (var k = 0; k < items.length && list.size() < 50; k++) { var c = makeCard(items[k]); if (c != null) list.add(c); }
                    }
                }
            }
        }
        return new Pair(null, list);
    }
    // 分区 tab：找对应分区
    for (var i = 0; i < secs.length; i++) {
        var t = String(secs[i].title != null ? secs[i].title : ("分区" + (i + 1)));
        if (t == mainTab.label) {
            var items = secs[i].items;
            if (Array.isArray(items)) {
                for (var k = 0; k < items.length; k++) { var c = makeCard(items[k]); if (c != null) list.add(c); }
            }
            return new Pair(null, list);
        }
    }
    // 分类 tab → searchFiltered（若存在）
    var cats = getCats();
    var catKey = null;
    for (var j = 0; j < cats.length; j++) if (String(cats[j].title) == mainTab.label) { catKey = String(cats[j].key != null ? cats[j].key : ""); break; }
    if (catKey != null && typeof searchFiltered === "function") {
        var pg = key == null ? 1 : (key + 1);
        var items = srcJson(searchFiltered, catKey, "{}", pg);
        if (Array.isArray(items)) {
            for (var k = 0; k < items.length; k++) { var c = makeCard(items[k]); if (c != null) list.add(c); }
            return new Pair(items.length > 0 ? pg : null, list);
        }
    }
    return new Pair(null, list);
}

// ---------- Search ----------
function SearchComponent_search(page, keyword) {
    var items = srcJson(search, keyword, page || 1);
    var list = new ArrayList();
    if (Array.isArray(items)) {
        for (var i = 0; i < items.length; i++) { var c = makeCard(items[i]); if (c != null) list.add(c); }
    }
    return new Pair(list.size() > 0 ? (page + 1) : null, list);
}

// ---------- Detail ----------
function DetailedComponent_getDetailed(summary) {
    var d = srcJson(detail, summary.id);
    if (d == null) d = {};
    var info = d.video_play_info || d;
    var name = String(info.name != null ? info.name : (info.vod_name != null ? info.vod_name : (info.title != null ? info.title : "")));
    var pic = String(info.pic != null ? info.pic : (info.cover != null ? info.cover : (info.vod_pic != null ? info.vod_pic : "")));
    var desc = String(info.desc != null ? info.desc : (info.description != null ? info.description : (info.vod_blurb != null ? info.vod_blurb : "")));
    var cartoon = makeCartoon({
        id: summary.id,
        source: source.key,
        url: summary.id,
        title: name,
        cover: pic,
        intro: desc,
        description: desc,
        genre: "",
        status: Cartoon.STATUS_UNKNOWN,
        updateStrategy: Cartoon.UPDATE_STRATEGY_ALWAYS
    });
    var playLines = new ArrayList();
    var eps = d.episodes;
    if (Array.isArray(eps) && eps.length > 0) {
        var es = new ArrayList();
        for (var i = 0; i < eps.length; i++) {
            var e = eps[i] || {};
            var flag = String(e.url != null ? e.url : (e.vid != null ? e.vid : ""));
            if (flag.length == 0) continue;
            var ename = String(e.name != null ? e.name : ("第" + (i + 1) + "集"));
            es.add(new Episode(flag, ename, i));
        }
        if (es.size() > 0) playLines.add(new PlayLine("1", "在线播放", es));
    }
    return new Pair(cartoon, playLines);
}

// ---------- Play ----------
function PlayComponent_getPlayInfo(summary, playLine, episode) {
    var r = srcJson(play, episode.id);
    if (r == null) throw new ParserException("play parse failed");
    var url = String(r.url || "");
    if (url.length == 0) throw new ParserException("empty play url");
    var type = (String(r.type).toLowerCase() == "m3u8" || url.indexOf(".m3u8") > 0)
        ? PlayerInfo.DECODE_TYPE_HLS : PlayerInfo.DECODE_TYPE_OTHER;
    var info = new PlayerInfo(type, url);
    var hm = {};
    var hdrs = r.headers;
    if (hdrs) {
        if (typeof hdrs === "string") { try { hdrs = parseJson(hdrs) || {}; } catch (e) { hdrs = {}; } }
        if (hdrs && typeof hdrs === "object") for (var k in hdrs) if (hdrs.hasOwnProperty(k)) hm[k] = String(hdrs[k]);
    }
    // 兼容源里常见字段：userAgent / referer（guazi 的 CDN 防盗链、lmm85/dmbus 的 Referer）
    if (r.userAgent && String(r.userAgent).length > 0 && !hm["User-Agent"]) hm["User-Agent"] = String(r.userAgent);
    if (r.referer && String(r.referer).length > 0 && !hm["Referer"]) hm["Referer"] = String(r.referer);
    if (Object.keys(hm).length > 0) {
        var map = new HashMap();
        for (var k2 in hm) if (hm.hasOwnProperty(k2)) map.put(k2, String(hm[k2]));
        info.header = map;
    }
    return info;
}

