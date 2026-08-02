// @key com.lanerc.lanerc
// @label 囧源·LANERC
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·LANERC 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 lanerc.js，经 __JB 桥适配运行。免登录 / 免广告。
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

 
























var _LANERC_DISCOVERY = 'https://anime999x-1366475786.cos.ap-guangzhou.myqcloud.com/apis.json';
var _LANERC_FALLBACK_HOST = 'http://lol.jngaoke.cn/';
 
var _LANERC_PROBE_TIMEOUT_MS = 3000;
 
var _LANERC_WARNING_PLAYLIST_TIMEOUT_MS = 3000;
var _LANERC_STALE_HOST = 'https://server.jngaoke.cn/';
var _LANERC_AUTH_FALLBACK = 'com.clggjv.xcjfmd.ffo';
var _LANERC_DECRYPT_KEY = '8f81c2519e3b661834219e7142000093';
 
var _LANERC_BUILD_SIGNATURE = '74322D4D62B9F4A986DFA8973EE70EBC034E74551B8715C755EDD9ED18E6820B';
 
var _LANERC_QUERY_SIGN_SECRET = '7d3cb4d6e7fbc7c9';


var _LANERC_API_UA = 'Dart/3.5 (dart:io)';
var _lanercExt = typeof ext === 'object' && ext ? ext : {};
var _lanercHost = '';
var _lanercHome = null;
var _lanercRuntime = null;


var _lanercLastDetail = null;



function _legacyTrim(value) {
    return value === null || value === undefined ? '' : String(value).replace(/^\s+|\s+$/g, '');
}



function _legacyIsArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
}



function _legacyOwn(object, key) {
    return object !== null && object !== undefined &&
        Object.prototype.hasOwnProperty.call(object, key);
}



function _lanercLog(message) {
    try {
        log('[Lanerc旧版源] ' + message);
    } catch (error) {
        
    }
}



function _normalizeHost(host) {
    var value = _legacyTrim(host);
    if (!value) return '';
    return value.replace(/\/+$/, '') + '/';
}



function _isStaleLanercHost(host) {
    return _normalizeHost(host).toLowerCase() === _LANERC_STALE_HOST;
}



function _safeParse(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        var parsed = parseJson(String(value));
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
        return fallback;
    }
}



function _decryptOptions() {
    var config = _lanercExt.decrypt;
    if (typeof config === 'string') config = _safeParse(config, {});
    if (!config || typeof config !== 'object') return {};
    return config;
}



var _LANERC_AES_FALLBACK = (function () {
    var inverseSbox = [
        0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
        0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
        0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
        0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
        0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
        0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
        0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
        0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
        0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
        0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
        0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
        0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
        0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
        0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
        0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
        0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
    ];
    var sbox = [
        0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
        0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
        0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
        0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
        0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
        0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
        0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
        0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
        0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
        0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
        0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
        0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
        0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
        0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
        0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
        0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
    ];
    var roundConstants = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

     
    function _aesXtime(value) {
        return ((value << 1) ^ (((value >> 7) & 1) * 0x1b)) & 0xff;
    }

     
    function _aesExpandKey(key) {
        var keyWords = 8;
        var rounds = 14;
        var totalWords = 4 * (rounds + 1);
        var expanded = new Array(totalWords * 4);
        var index;
        for (index = 0; index < keyWords * 4; index += 1) expanded[index] = key[index];
        for (var word = keyWords; word < totalWords; word += 1) {
            var previous = (word - 1) * 4;
            var value = [expanded[previous], expanded[previous + 1], expanded[previous + 2], expanded[previous + 3]];
            if (word % keyWords === 0) {
                value = [
                    sbox[value[1]] ^ roundConstants[word / keyWords - 1],
                    sbox[value[2]],
                    sbox[value[3]],
                    sbox[value[0]]
                ];
            } else if (word % keyWords === 4) {
                value = [sbox[value[0]], sbox[value[1]], sbox[value[2]], sbox[value[3]]];
            }
            for (index = 0; index < 4; index += 1) {
                expanded[word * 4 + index] = expanded[(word - keyWords) * 4 + index] ^ value[index];
            }
        }
        return expanded;
    }

     
    function _aesInverseShiftAndSubstitute(state) {
        var shifted = [
            state[0], state[13], state[10], state[7],
            state[4], state[1], state[14], state[11],
            state[8], state[5], state[2], state[15],
            state[12], state[9], state[6], state[3]
        ];
        for (var index = 0; index < 16; index += 1) shifted[index] = inverseSbox[shifted[index]];
        return shifted;
    }

     
    function _aesInverseMixColumns(state) {
        for (var column = 0; column < 4; column += 1) {
            var offset = column * 4;
            var a = state[offset];
            var b = state[offset + 1];
            var c = state[offset + 2];
            var d = state[offset + 3];
            var a2 = _aesXtime(a), b2 = _aesXtime(b), c2 = _aesXtime(c), d2 = _aesXtime(d);
            var a4 = _aesXtime(a2), b4 = _aesXtime(b2), c4 = _aesXtime(c2), d4 = _aesXtime(d2);
            var a8 = _aesXtime(a4), b8 = _aesXtime(b4), c8 = _aesXtime(c4), d8 = _aesXtime(d4);
            var a14 = a2 ^ a4 ^ a8, b14 = b2 ^ b4 ^ b8, c14 = c2 ^ c4 ^ c8, d14 = d2 ^ d4 ^ d8;
            var a11 = a8 ^ a2 ^ a, b11 = b8 ^ b2 ^ b, c11 = c8 ^ c2 ^ c, d11 = d8 ^ d2 ^ d;
            var a13 = a8 ^ a4 ^ a, b13 = b8 ^ b4 ^ b, c13 = c8 ^ c4 ^ c, d13 = d8 ^ d4 ^ d;
            var a9 = a8 ^ a, b9 = b8 ^ b, c9 = c8 ^ c, d9 = d8 ^ d;
            state[offset] = (a14 ^ b11 ^ c13 ^ d9) & 0xff;
            state[offset + 1] = (a9 ^ b14 ^ c11 ^ d13) & 0xff;
            state[offset + 2] = (a13 ^ b9 ^ c14 ^ d11) & 0xff;
            state[offset + 3] = (a11 ^ b13 ^ c9 ^ d14) & 0xff;
        }
    }

     
    function _aesDecryptBlock(block, expanded) {
        var rounds = 14;
        var state = block.slice();
        var index;
        for (index = 0; index < 16; index += 1) state[index] ^= expanded[rounds * 16 + index];
        for (var round = rounds - 1; round >= 1; round -= 1) {
            state = _aesInverseShiftAndSubstitute(state);
            for (index = 0; index < 16; index += 1) state[index] ^= expanded[round * 16 + index];
            _aesInverseMixColumns(state);
        }
        state = _aesInverseShiftAndSubstitute(state);
        for (index = 0; index < 16; index += 1) state[index] ^= expanded[index];
        return state;
    }

     
    function _aesTextBytes(value) {
        var result = [];
        for (var index = 0; index < value.length; index += 1) result.push(value.charCodeAt(index) & 0xff);
        return result;
    }

     
    function _aesBase64Bytes(value) {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var lookup = {};
        var output = [];
        var index;
        for (index = 0; index < 64; index += 1) lookup[alphabet.charAt(index)] = index;
        var input = String(value || '').replace(/[^A-Za-z0-9+/=]/g, '');
        for (index = 0; index < input.length; index += 4) {
            var first = lookup[input.charAt(index)];
            var second = lookup[input.charAt(index + 1)];
            var thirdChar = input.charAt(index + 2);
            var fourthChar = input.charAt(index + 3);
            var third = thirdChar === '=' || thirdChar === '' ? -1 : lookup[thirdChar];
            var fourth = fourthChar === '=' || fourthChar === '' ? -1 : lookup[fourthChar];
            output.push(((first << 2) | (second >> 4)) & 0xff);
            if (third !== -1) output.push((((second & 0x0f) << 4) | (third >> 2)) & 0xff);
            if (fourth !== -1) output.push((((third & 0x03) << 6) | fourth) & 0xff);
        }
        return output;
    }

     
    function _aesUtf8Text(bytes, length) {
        var output = '';
        var index = 0;
        while (index < length) {
            var code = bytes[index++];
            if (code < 0x80) {
                output += String.fromCharCode(code);
            } else if (code < 0xe0) {
                output += String.fromCharCode(((code & 0x1f) << 6) | (bytes[index++] & 0x3f));
            } else if (code < 0xf0) {
                output += String.fromCharCode(
                    ((code & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f)
                );
            } else {
                var point = ((code & 0x07) << 18) | ((bytes[index++] & 0x3f) << 12) |
                    ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
                point -= 0x10000;
                output += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff));
            }
        }
        return output;
    }

    return {
         
        decryptBase64: function (base64, keyText) {
            var key = _aesTextBytes(String(keyText || ''));
            if (key.length !== 32) throw new Error('内置 AES-256 要求 32 字节密钥');
            var cipher = _aesBase64Bytes(base64);
            if (!cipher.length || cipher.length % 16 !== 0) throw new Error('AES 密文长度不是 16 的倍数');
            var expanded = _aesExpandKey(key);
            var plain = [];
            for (var offset = 0; offset < cipher.length; offset += 16) {
                var block = _aesDecryptBlock(cipher.slice(offset, offset + 16), expanded);
                for (var index = 0; index < 16; index += 1) plain.push(block[index]);
            }
            var padding = plain[plain.length - 1];
            if (padding < 1 || padding > 16) throw new Error('AES PKCS7 padding 无效');
            for (var padIndex = plain.length - padding; padIndex < plain.length; padIndex += 1) {
                if (plain[padIndex] !== padding) throw new Error('AES PKCS7 padding 不一致');
            }
            return _aesUtf8Text(plain, plain.length - padding);
        }
    };
})();



function _restoreLanercAlphabet(ciphertext) {
    return String(ciphertext || '')
        .replace(/1/g, '!')
        .replace(/5/g, '@')
        .replace(/9/g, '#')
        .replace(/\//g, '*')
        .replace(/-/g, '&')
        .replace(/!/g, '9')
        .replace(/@/g, '1')
        .replace(/#/g, '5')
        .replace(/\*/g, '+')
        .replace(/&/g, '/');
}



function _decryptApiData(ciphertext) {
    var config = _decryptOptions();
    var key = _firstValue(config, ['key']) || _LANERC_DECRYPT_KEY;
    try {
        var input = String(ciphertext || '');
        var inputFormat = String(config.input || 'base64');
        if (inputFormat === 'base64') {
            input = _restoreLanercAlphabet(input);
            while (input.length % 4) input += '=';
        }
        var options = {
            mode: String(config.mode || 'ECB'),
            padding: String(config.padding || 'PKCS5'),
            input: inputFormat,
            output: String(config.output || 'utf8')
        };
        if (config.iv !== null && config.iv !== undefined && config.iv !== '') {
            options.iv = String(config.iv);
        }
        if (config.keyFormat) options.keyFormat = String(config.keyFormat);
        if (config.ivFormat) options.ivFormat = String(config.ivFormat);
        var plain;
        if (typeof crypto !== 'undefined' && crypto.aes && typeof crypto.aes.decrypt === 'function') {
            plain = crypto.aes.decrypt(input, String(key), options);
        } else {
            if (options.mode !== 'ECB' || options.input !== 'base64' || options.output !== 'utf8') {
                throw new Error('内置 AES 仅支持 ECB、Base64 输入和 UTF-8 输出');
            }
            plain = _LANERC_AES_FALLBACK.decryptBase64(input, String(key));
        }
        var parsed = _safeParse(plain, null);
        if (!parsed || typeof parsed !== 'object') {
            _lanercLog('接口解密结果不是 JSON 对象');
            return null;
        }
        return parsed;
    } catch (error) {
        _lanercLog('接口 AES 解密失败：' + String(error));
        return null;
    }
}



function _decodeApiResponse(value) {
    var response = value;
    if (!response || typeof response !== 'object' || _legacyIsArray(response)) return response;
    if (Number(response.code) === 201 && typeof response.data === 'string') {
        var decrypted = _decryptApiData(response.data);
        return decrypted || {};
    }
    return response;
}



function _lanercApiUserAgent() {
    var candidate = _legacyTrim(_lanercExt.userAgent);
    return /^Dart\//i.test(candidate) ? candidate : _LANERC_API_UA;
}



function _requestOptions(isPost, timeoutMs) {
    var headers = { Accept: 'application/json' };
    headers['User-Agent'] = _lanercApiUserAgent();
    if (isPost) headers['Content-Type'] = 'application/json';
    var options = { headers: headers };
    var timeout = Number(timeoutMs || _lanercExt.timeout || 0);
    if (timeout > 0 && isFinite(timeout)) options.timeout = timeout;
    return JSON.stringify(options);
}



function _requestJson(url, timeoutMs) {
    try {
        return _decodeApiResponse(_safeParse(request(url, _requestOptions(false, timeoutMs)), {}));
    } catch (error) {
        _lanercLog('GET失败：' + url + '；' + String(error));
        return {};
    }
}



function _postJson(url, body) {
    try {
        return _decodeApiResponse(_safeParse(post(url, JSON.stringify(body || {}), _requestOptions(true)), {}));
    } catch (error) {
        _lanercLog('POST失败：' + url + '；' + String(error));
        return {};
    }
}



function _findDeep(value, key, depth) {
    var level = depth || 0;
    if (!value || typeof value !== 'object' || level > 12) return '';
    if (_legacyOwn(value, key)) return value[key];
    for (var name in value) {
        if (!_legacyOwn(value, name)) continue;
        var found = _findDeep(value[name], key, level + 1);
        if (found !== '' && found !== null && found !== undefined) return found;
    }
    return '';
}



function _resolveHost() {
    if (_lanercHost) return _lanercHost;
    _lanercHost = _normalizeHost(_lanercExt.host);
    if (_lanercHost) return _lanercHost;

    var fallbackProbe = _payload(_requestJson(_LANERC_FALLBACK_HOST + 'app/home', _LANERC_PROBE_TIMEOUT_MS));
    if (fallbackProbe && typeof fallbackProbe === 'object' &&
        (_legacyOwn(fallbackProbe, 'vod_list') || _legacyOwn(fallbackProbe, 'banner') || _legacyOwn(fallbackProbe, 'hot_list'))) {
        _lanercHome = fallbackProbe;
        _lanercHost = _LANERC_FALLBACK_HOST;
        return _lanercHost;
    }

    _lanercLog('静态回退站探测失败，尝试在线域名发现');
    var configUrl = String(_lanercExt.configUrl || _LANERC_DISCOVERY);
    var discovery = _requestJson(configUrl, _LANERC_PROBE_TIMEOUT_MS);
    var discoveredHost = _normalizeHost(_findDeep(discovery, 'domain'));
    if (_isStaleLanercHost(discoveredHost)) {
        _lanercLog('在线配置仍为证书过期旧站点，改用静态回退地址');
        discoveredHost = '';
    }
    _lanercHost = discoveredHost;
    if (!_lanercHost) {
        _lanercLog('域名发现失败，使用静态回退地址');
        _lanercHost = _LANERC_FALLBACK_HOST;
    }
    return _lanercHost;
}



function _apiGet(path) {
    return _requestJson(_resolveHost() + String(path || '').replace(/^\/+/, ''));
}



function _lanercSignedApiPath(path, seconds, nonce) {
    var cleanPath = String(path || '').replace(/^\/+/, '');
    var timeValue = seconds === null || seconds === undefined
        ? Math.floor(Number(timestamp()) / 1000)
        : Math.floor(Number(seconds));
    var randomValue = nonce === null || nonce === undefined ? '' : String(nonce);
    var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    while (randomValue.length < 6) {
        randomValue += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    randomValue = randomValue.slice(0, 6);
    var digest = md5('/' + cleanPath + '@' + timeValue + '@' + randomValue + '@' + _LANERC_QUERY_SIGN_SECRET);
    return cleanPath + '?sign=' + timeValue + '-' + randomValue + '-' + String(digest).toLowerCase();
}



function _apiPost(path, body) {
    return _postJson(_resolveHost() + String(path || '').replace(/^\/+/, ''), body);
}



function _payload(value) {
    var current = value;
    var count = 0;
    while (
        current &&
        typeof current === 'object' &&
        !_legacyIsArray(current) &&
        _legacyOwn(current, 'data') &&
        current.data !== null &&
        current.data !== undefined &&
        count < 4
    ) {
        current = current.data;
        count += 1;
    }
    return current || {};
}


var _LANERC_PIC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';



function _lanercCoverPic(pic) {
    var url = String(pic || '');
    if (!url) return '';
    if (url.indexOf('@Referer=') !== -1 || url.indexOf('@User-Agent=') !== -1 || url.indexOf('@Headers=') !== -1) return url;
    if (url.indexOf('doubanio.com') === -1) return url;
    return url + '@Referer=https://movie.douban.com/@User-Agent=' + _LANERC_PIC_UA;
}



function _firstValue(object, keys) {
    var source = object || {};
    for (var index = 0; index < keys.length; index += 1) {
        var value = source[keys[index]];
        if (value !== null && value !== undefined && value !== '') return value;
    }
    return '';
}



function _cardRemarks(source) {
    var text = _legacyTrim(String(_firstValue(source, ['vod_remarks', 'vod_sub', 'vod_tag']) || ''));
    var flag = text === '0' || text === '1' ? text : String(_firstValue(source, ['vod_isend']));
    if (text === '' || text === '0' || text === '1') {
        if (flag === '1') return '已完结';
        if (flag === '0') return '连载中';
        return '';
    }
    return text;
}

 
function _sortName(value) {
    var key = String(value === null || value === undefined ? '' : value);
    if (!key) return '';
    var home = _getHome();
    var groups = _legacyIsArray(home.vod_list) ? home.vod_list : [];
    for (var index = 0; index < groups.length; index += 1) {
        var group = groups[index] || {};
        if (String(group.sort_id) === key) return String(group.sort_name || '');
    }
    return '';
}



function _typeText(source) {
    var value = _firstValue(source || {}, ['vod_class', 'vod_type']);
    var text = _legacyTrim(String(value === null || value === undefined ? '' : value));
    if (!text) return '';
    if (/^\d+$/.test(text)) return _sortName(text);
    return text;
}



function _card(item, sectionTitle) {
    var source = item || {};
    var id = _firstValue(source, ['id', 'vod_id']);
    var name = _firstValue(source, ['vod_name', 'name', 'title']);
    if (id === '' || name === '') return null;
    return {
        id: String(id),
        name: String(name),
        pic: _lanercCoverPic(_firstValue(source, ['vod_pic', 'pic', 'image', 'cover'])),
        type: String(sectionTitle || '') || _typeText(source),
        year: String(_firstValue(source, ['vod_year', 'year']) || ''),
        remarks: _cardRemarks(source),
        desc: String(_firstValue(source, ['vod_blurb', 'desc']) || '')
    };
}



function _cards(items, sectionTitle) {
    var list = _legacyIsArray(items) ? items : [];
    var result = [];
    for (var index = 0; index < list.length; index += 1) {
        var item = _card(list[index], sectionTitle);
        if (item) result.push(item);
    }
    return result;
}



function _optionText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        return _legacyTrim(_firstValue(value, ['n', 'name', 'title', 'v', 'value']) || '');
    }
    return _legacyTrim(value);
}



function _options(value) {
    var source = value;
    if (typeof source === 'string') {
        var textValue = _legacyTrim(source);
        var parsed = _safeParse(textValue, null);
        source = _legacyIsArray(parsed) ? parsed : (textValue ? textValue.split(/[,/]/) : []);
    }
    if (!_legacyIsArray(source)) source = source === null || source === undefined || source === '' ? [] : [source];

    var result = ['全部'];
    var seen = { '全部': true };
    for (var index = 0; index < source.length; index += 1) {
        var option = _optionText(source[index]);
        if (!option || seen[option]) continue;
        seen[option] = true;
        result.push(option);
    }
    return result;
}



function _filterOptions(value) {
    var options = _options(value);
    var result = [];
    for (var index = 0; index < options.length; index += 1) {
        var name = String(options[index]);
        result.push({ n: name, v: name === '全部' ? '' : name });
    }
    return result;
}



function _getHome() {
    if (_lanercHome !== null) return _lanercHome;
    _lanercHome = _payload(_apiGet('app/home'));
    if (!_lanercHome || typeof _lanercHome !== 'object') _lanercHome = {};
    return _lanercHome;
}



function _buildHomeSections() {
    var home = _getHome();
    var sections = [];
    var banner = _cards(home.banner, '推荐');
    var hot = _cards(home.hot_list, '热门');
    if (banner.length) sections.push({ title: '轮播', key: '__hero__', items: banner });
    if (hot.length) sections.push({ title: '热门', key: '', items: hot });

    var vodList = _legacyIsArray(home.vod_list) ? home.vod_list : [];
    for (var index = 0; index < vodList.length; index += 1) {
        var group = vodList[index] || {};
        var title = String(group.sort_name || '分类');
        var key = String(group.sort_id === null || group.sort_id === undefined ? title : group.sort_id);
        var items = _cards(group.vods, title);
        if (items.length) sections.push({ title: title, key: key, items: items });
    }
    return sections;
}



function _flattenHome() {
    var sections = _buildHomeSections();
    var ordered = [];
    var index;
    for (index = 0; index < sections.length; index += 1) {
        if (sections[index].title === '热门') ordered.push(sections[index]);
    }
    for (index = 0; index < sections.length; index += 1) {
        if (sections[index].title !== '热门' && sections[index].key !== '__hero__') ordered.push(sections[index]);
    }
    for (index = 0; index < sections.length; index += 1) {
        if (sections[index].key === '__hero__') ordered.push(sections[index]);
    }

    var cards = [];
    var seen = {};
    for (index = 0; index < ordered.length; index += 1) {
        var items = ordered[index].items || [];
        for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            var item = items[itemIndex];
            if (seen[item.id]) continue;
            seen[item.id] = true;
            cards.push(item);
        }
    }
    return cards;
}



function homeSections() {
    try {
        return JSON.stringify(_buildHomeSections());
    } catch (error) {
        _lanercLog('首页分区转换失败：' + String(error));
        return '[]';
    }
}



function search(keyword, page) {
    try {
        var word = _legacyTrim(keyword);
        if (!word) return JSON.stringify(_flattenHome());
        if (_isCategoryKey(word)) return JSON.stringify(_filteredPage(word, {}, page || 1));
        var data = _payload(_apiGet('app/vod/search?keyword=' + encodeUri(word)));
        return JSON.stringify(_cards(data.search_vods, ''));
    } catch (error) {
        _lanercLog('搜索失败：' + String(error));
        return '[]';
    }
}



function categories() {
    try {
        var home = _getHome();
        var groups = _legacyIsArray(home.vod_list) ? home.vod_list : [];
        var result = [{ key: '', title: '推荐', name: '推荐' }];
        for (var index = 0; index < groups.length; index += 1) {
            var group = groups[index] || {};
            var title = String(group.sort_name || '分类');
            var key = String(group.sort_id === null || group.sort_id === undefined ? title : group.sort_id);
            result.push({
                key: key,
                title: title,
                name: title,
                filters: [
                    { key: 'class', name: '', value: _filterOptions(group.type_class) },
                    { key: 'year', name: '', value: _filterOptions(group.type_year) },
                    {
                        key: 'sort',
                        name: '',
                        value: [{ n: '按时间', v: '' }, { n: '按评分', v: 'vod_score' }]
                    }
                ]
            });
        }
        return JSON.stringify(result);
    } catch (error) {
        _lanercLog('分类转换失败：' + String(error));
        return '[]';
    }
}



function _filterValue(value) {
    if (value === null || value === undefined || value === '全部') return '';
    return String(value);
}



function _isCategoryKey(value) {
    var key = String(value || '');
    var home = _getHome();
    var groups = _legacyIsArray(home.vod_list) ? home.vod_list : [];
    for (var index = 0; index < groups.length; index += 1) {
        var group = groups[index] || {};
        var groupKey = String(group.sort_id === null || group.sort_id === undefined ? '' : group.sort_id);
        if (groupKey === key) return true;
    }
    return false;
}



function _filteredPage(category, filters, page) {
    var source = filters || {};
    var classValue = _filterValue(source['class'] || source.type || '');
    var yearValue = _filterValue(source.year || '');
    var sortValue = _filterValue(source.sort || '');
    if (sortValue === '按评分') sortValue = 'vod_score';
    if (sortValue === '按时间') sortValue = '';
    var url = 'app/vod/filter?page=' + encodeUri(String(page || 1)) +
        '&class_id=' + encodeUri(_filterValue(category)) +
        '&vod_class=' + encodeUri(classValue) +
        '&year=' + encodeUri(yearValue) +
        '&sort_by=' + encodeUri(sortValue);
    var data = _payload(_apiGet(url));
    return _cards(data.filter_vods, '');
}



function searchFiltered(category, filtersJson, page) {
    try {
        if (_filterValue(category) === '') return JSON.stringify(_flattenHome());
        var filters = _safeParse(filtersJson, {}) || {};
        return JSON.stringify(_filteredPage(category, filters, page || 1));
    } catch (error) {
        _lanercLog('分类筛选失败：' + String(error));
        return '[]';
    }
}



function _loadRuntimeConfig() {
    if (_lanercRuntime !== null) return _lanercRuntime;
    var data = _apiGet('app/config?platform=android');
    _lanercRuntime = {
        sign: String(_findDeep(data, 'sign') || ''),
        auth: String(_findDeep(data, 'auth') || '')
    };
    return _lanercRuntime;
}



function _runtimeValues(flagData) {
    var flag = flagData && typeof flagData === 'object' ? flagData : {};
    var config = _loadRuntimeConfig();
    var sign = _firstValue(flag, ['sign']);
    if (sign === '') sign = _firstValue(_lanercExt, ['sign']);
    if (sign === '') sign = _LANERC_BUILD_SIGNATURE;
    var auth = _firstValue(flag, ['auth']);
    if (auth === '') auth = _firstValue(_lanercExt, ['auth']);
    if (auth === '') auth = config.auth;
    if (auth === '') auth = _LANERC_AUTH_FALLBACK;
    return { sign: String(sign || ''), auth: String(auth) };
}



function _videoItems(value) {
    if (_legacyIsArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    if (typeof value === 'string') {
        var parsed = _safeParse(value, null);
        if (_legacyIsArray(parsed)) return parsed;
        return String(value).split('#');
    }
    return [value];
}



function _episodePart(value, fallbackName) {
    if (value && typeof value === 'object') {
        var objectVid = _firstValue(value, ['vid', 'url', 'value']);
        return {
            name: String(_firstValue(value, ['name', 'title']) || fallbackName || ''),
            vid: String(objectVid || ''),
            raw: String(_firstValue(value, ['raw', 'url', 'vid', 'value']) || '')
        };
    }
    var raw = value === null || value === undefined ? '' : String(value);
    var parts = raw.split('$');
    return {
        name: String(parts[0] || fallbackName || ''),
        vid: String(parts.length > 1 ? parts[1] : raw),
        raw: raw
    };
}



function _sortPlayLines(left, right) {
    var leftSort = Number(left && left.sort);
    var rightSort = Number(right && right.sort);
    if (!isFinite(leftSort)) leftSort = 0;
    if (!isFinite(rightSort)) rightSort = 0;
    return leftSort - rightSort;
}

 
function _isMainLine(line) {
    var name = String((line && (line.name || line.title)) || '');
    return /LC\s*-?\s*Main/i.test(name);
}



function _episodes(playList, runtime) {
    var lines = _legacyIsArray(playList) ? playList.slice() : [];
    lines.sort(_sortPlayLines);
    
    
    
    var mainLines = [];
    var otherLines = [];
    for (var splitIndex = 0; splitIndex < lines.length; splitIndex += 1) {
        (_isMainLine(lines[splitIndex]) ? mainLines : otherLines).push(lines[splitIndex]);
    }
    lines = mainLines.concat(otherLines);
    var usedRouteNames = {};
    var result = [];
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        var line = lines[lineIndex] || {};
        
        
        var lineName = _legacyTrim(String(line.name || line.title || '').replace(/[\[【（(].*$/, ''));
        if (!lineName) lineName = '线路' + (lineIndex + 1);
        
        
        var usedCount = usedRouteNames[lineName] || 0;
        usedRouteNames[lineName] = usedCount + 1;
        if (usedCount > 0) lineName = lineName + ' ' + (usedCount + 1);
        var player = String(line.player || '');
        var videos = _videoItems(line.video);
        for (var videoIndex = 0; videoIndex < videos.length; videoIndex += 1) {
            var part = _episodePart(videos[videoIndex], '第' + (videoIndex + 1) + '集');
            if (!part.vid) continue;
            var flag = {
                raw: part.raw,
                vid: part.vid,
                player: player,
                sign: runtime.sign,
                auth: runtime.auth
            };
            result.push({ name: part.name, url: JSON.stringify(flag), route: lineName });
        }
    }
    return result;
}



function detail(id) {
    var contentId = id === null || id === undefined ? '' : String(id);
    try {
        var data = _payload(_apiGet('app/getvod/' + encodeUri(contentId)));
        var info = data.video_play_info && typeof data.video_play_info === 'object' ? data.video_play_info : data;
        var runtime = _runtimeValues({});
        
        _lanercLastDetail = { id: contentId, classId: _legacyTrim(String(_firstValue(info, ['vod_type']) || '')) };
        return JSON.stringify({
            id: String(_firstValue(info, ['id', 'vod_id']) || contentId),
            name: String(_firstValue(info, ['vod_name', 'name', 'title']) || ''),
            pic: _lanercCoverPic(_firstValue(info, ['vod_pic', 'pic', 'image', 'cover'])),
            desc: String(_firstValue(info, ['vod_blurb', 'desc', 'vod_content']) || ''),
            type: _typeText(info),
            year: String(_firstValue(info, ['vod_year', 'year']) || ''),
            remarks: String(_firstValue(info, ['vod_sub', 'vod_remarks']) || ''),
            score: String(_firstValue(info, ['vod_score', 'score']) || ''),
            episodes: _episodes(data.video_play_list, runtime)
        });
    } catch (error) {
        _lanercLog('详情转换失败：' + String(error));
        return JSON.stringify({ id: contentId, name: '', pic: '', desc: '', episodes: [] });
    }
}



function _resolveContentClass(contentId) {
    if (_lanercLastDetail && String(_lanercLastDetail.id) === contentId) return _lanercLastDetail.classId;
    var data = _payload(_apiGet('app/getvod/' + encodeUri(contentId)));
    var info = data.video_play_info && typeof data.video_play_info === 'object' ? data.video_play_info : data;
    return _legacyTrim(String(_firstValue(info, ['vod_type']) || ''));
}



function related(id) {
    var contentId = id === null || id === undefined ? '' : String(id);
    try {
        if (!contentId) return '[]';
        var classId = _resolveContentClass(contentId);
        if (!classId) return '[]';
        var cards = _filteredPage(classId, {}, 1);
        var out = [];
        for (var index = 0; index < cards.length; index += 1) {
            if (String(cards[index].id) === contentId) continue;
            out.push(cards[index]);
            if (out.length >= 20) break;
        }
        return JSON.stringify(out);
    } catch (error) {
        _lanercLog('相关推荐获取失败：' + String(error));
        return '[]';
    }
}



function _mediaType(url) {
    var value = String(url || '');
    if (/\.m3u8(?:$|[?#])/i.test(value)) return 'm3u8';
    if (/\.mp4(?:$|[?#])/i.test(value)) return 'mp4';
    return 'auto';
}



function _isLanercWarningPlaylist(url) {
    var value = String(url || '');
    if (!/^https?:\/\/file\.jngaoke\.cn\/.*\.m3u8(?:$|[?#])/i.test(value)) return false;
    try {
        var playlist = String(request(
            value,
            _requestOptions(false, _LANERC_WARNING_PLAYLIST_TIMEOUT_MS)
        ) || '');
        var pattern = /#EXTINF:\s*([0-9]+(?:\.[0-9]+)?)/ig;
        var count = 0;
        var duration = 0;
        var matched;
        while ((matched = pattern.exec(playlist)) !== null) {
            count += 1;
            duration += Number(matched[1]);
        }
        return count >= 10 && duration >= 179 && duration <= 181;
    } catch (error) {
        _lanercLog('防盗提示片检测失败：' + String(error));
        return false;
    }
}



function play(flag) {
    try {
        var parsed = _safeParse(flag, null);
        var flagData = parsed && typeof parsed === 'object' && !_legacyIsArray(parsed) ? parsed : {};
        var rawFlag = flag === null || flag === undefined ? '' : String(flag);
        var vid = _firstValue(flagData, ['vid']);
        if (vid === '') vid = rawFlag;
        var runtime = _runtimeValues(flagData);
        var body = {
            vid: String(vid || ''),
            player: String(_firstValue(flagData, ['player']) || ''),
            sign: runtime.sign,
            auth: runtime.auth
        };
        if (!body.vid) return JSON.stringify({ url: '', type: 'auto' });
        var response = _apiPost(_lanercSignedApiPath('app/proxyx3x'), body);
        var playUrl = String(_findDeep(response, 'play_url') || '');
        if (_isLanercWarningPlaylist(playUrl)) {
            _lanercLog('检测到 180 秒防盗提示片，重新签名请求一次');
            response = _apiPost(_lanercSignedApiPath('app/proxyx3x'), body);
            playUrl = String(_findDeep(response, 'play_url') || '');
            if (_isLanercWarningPlaylist(playUrl)) {
                _lanercLog('检测到 180 秒防盗提示片，已拦截播放');
                return JSON.stringify({ url: '', type: 'auto' });
            }
        }
        return JSON.stringify({ url: playUrl, type: _mediaType(playUrl) });
    } catch (error) {
        _lanercLog('播放解析失败：' + String(error));
        return JSON.stringify({ url: '', type: 'auto' });
    }
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

// 每源同步兜底分类（getMainTabs 不能联网，用此表保证首页有分类标签；内容由 getContent 按分区/分类加载）
var SOURCE_FALLBACK_TABS = {
    "com.lanerc.lanerc":     ["热门", "日漫", "剧场版", "推荐"],
    "com.lanerc.auvfun":     ["推荐", "日漫", "国漫", "4K"],
    "com.lanerc.jinpai":     ["推荐", "全部"],
    "com.lanerc.cycapp":     ["推荐", "TV动画", "剧场版", "4K专区", "国漫"],
    "com.lanerc.guazi":      ["日番", "国漫", "欧美"],
    "com.lanerc.shuangxing": ["推荐", "动漫", "剧场", "四月番剧", "七月新番"],
    "com.lanerc.shutiao":    ["推荐", "动漫"],
    "com.lanerc.yzx":        ["推荐", "全部"],
    "com.lanerc.xifanacg":   ["推荐", "连载新番"],
    "com.lanerc.sanqiu":     ["推荐", "全部"],
    "com.lanerc.akianime":   ["推荐", "日漫", "国漫"],
    "com.lanerc.lmm85":      ["推荐", "最近更新", "日本动漫", "国产动漫", "欧美动漫", "动态漫画", "动画电影", "热门"],
    "com.lanerc.gugu":       ["推荐", "番剧"],
    "com.lanerc.dmbus":      ["国漫", "日漫", "欧美", "电影"]
};

function PageComponent_getMainTabs() {
    var res = new ArrayList();
    var seen = {};
    res.add(new MainTab("首页", MainTab.MAIN_TAB_WITH_COVER));
    seen["首页"] = 1;
    // 同步兜底分类（不联网，保证首次进入就有分类标签）
    var fb = SOURCE_FALLBACK_TABS[source.key] || [];
    for (var i = 0; i < fb.length; i++) {
        if (!seen[fb[i]]) { seen[fb[i]] = 1; res.add(new MainTab(fb[i], MainTab.MAIN_TAB_WITH_COVER)); }
    }
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
    var r = srcJson(play, String(episode.id));  // episode.id 是 Kotlin 实体属性(Java String)，必须转 JS 字符串
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

