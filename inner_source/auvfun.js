// @key com.lanerc.auvfun
// @label 囧源·AuvFun
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧源·AuvFun 内容源（EasyBangumi / 纯纯看番 扩展）
// 适配自 LANERC 系站点脚本，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {};
// ============================================================
//  __JB 桥 shim —— 把源脚本用的桥函数映射到 EasyBangumi 的 Java 桥
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







var BASE       = 'https://app.manshan.fun';
var LEGACY_BASE= 'http://85.209.230.191:8003';
var API_PREFIX = '/app';
var AES_KEY    = 'zhuhongleipeipei';     
var API_SECRET = "zhl's river app";       
var DEVICE_ID  = '4822e35123b5312b';
var UA_DART    = 'Dart/3.11 (dart:io)';
var CHROME_UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';


var HOSTS = (function () {
    var out = [], seen = {};
    
    pushHost(out, seen, BASE);
    try {
        if (typeof ext !== 'undefined' && ext) {
            if (typeof ext === 'string' && ext.indexOf('http') >= 0) {
                var arr = ext.split(',');
                for (var i = 0; i < arr.length; i++) pushHost(out, seen, arr[i]);
            }
            if (ext.hosts && ext.hosts.length) {
                for (var j = 0; j < ext.hosts.length; j++) pushHost(out, seen, ext.hosts[j]);
            }
            if (ext.host) pushHost(out, seen, ext.host);
        }
    } catch (e) {}
    
    pushHost(out, seen, LEGACY_BASE);
    return out.length ? out : [BASE, LEGACY_BASE];
})();


var FALLBACK_TABS = [
    { id: '3740c6fc9f992bd660303d2a23f6ebb5', title: '推荐', sort: 1 },
    { id: 'd1832ba165d0538f8c72ea09e84fd413', title: '日漫', sort: 2 },
    { id: 'b7cbe964263375d9d825e452deb16a61', title: '国漫', sort: 3 },
    { id: '6ee3bcd148d1dcb98550d00b93232f24', title: '4K',   sort: 4 }
];




function trim(s)   { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
function rstrip(s) { return trim(s).replace(/\/+$/, ''); }

function pushHost(list, seen, s) {
    var h = rstrip(s);
    if (!h || seen[h]) return;
    seen[h] = 1;
    list.push(h);
}
function clean(s) {
    if (s == null) return '';
    return trim(String(s)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); }));
}
function yearStr(y) { y = parseInt(y, 10); return (y && y > 1900) ? String(y) : ''; }
function typeOf(area) {
    area = area || '';
    if (/日本|日韩/.test(area)) return '日漫';
    if (/欧美|美国/.test(area)) return '欧美';
    return '国漫';
}
function guessType(u) {
    u = (u || '').toLowerCase();
    if (u.indexOf('.m3u8') >= 0) return 'm3u8';
    if (u.indexOf('.mp4')  >= 0) return 'mp4';
    if (u.indexOf('.flv')  >= 0) return 'flv';
    return 'auto';
}

function resName(raw) {
    switch (String(raw == null ? '' : raw).toLowerCase()) {
        case '8k':     return '8K';
        case '4k':
        case 'uhd':    return '4K';
        case '2k':     return '2K';
        case 'super':  return '超清';
        case 'fullhd': return '1080P';
        case 'high':   return '高清';
        case 'normal': return '标清';
        case 'low':    return '流畅';
        default:       return raw ? String(raw) : '默认';
    }
}





var AES_DEC = (function () {
    var SI = [
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
    var SBOX = [
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
    var RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

    function xtime(a) { return ((a << 1) ^ (((a >> 7) & 1) * 0x1b)) & 0xff; }

    
    function expandKey(key) {
        var Nk = 4, Nr = 10, Nb = 4;
        var w = new Array(Nb * (Nr + 1) * 4);
        for (var i = 0; i < Nk * 4; i++) w[i] = key[i];
        for (var i = Nk; i < Nb * (Nr + 1); i++) {
            var t = [w[(i - 1) * 4], w[(i - 1) * 4 + 1], w[(i - 1) * 4 + 2], w[(i - 1) * 4 + 3]];
            if (i % Nk === 0) {
                t = [SBOX[t[1]] ^ RCON[i / Nk - 1], SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]];
            }
            for (var j = 0; j < 4; j++) w[i * 4 + j] = w[(i - Nk) * 4 + j] ^ t[j];
        }
        return w;
    }

    function decryptBlock(blk, rk) {
        var s = blk.slice();
        
        for (var i = 0; i < 16; i++) s[i] ^= rk[160 + i];

        for (var r = 9; r >= 1; r--) {
            
            var t = [
                s[0], s[13], s[10], s[7],
                s[4], s[1],  s[14], s[11],
                s[8], s[5],  s[2],  s[15],
                s[12],s[9],  s[6],  s[3]
            ];
            
            for (var i = 0; i < 16; i++) s[i] = SI[t[i]];
            
            for (var i = 0; i < 16; i++) s[i] ^= rk[r * 16 + i];
            
            for (var c = 0; c < 4; c++) {
                var a = s[c * 4], b = s[c * 4 + 1], cc = s[c * 4 + 2], d = s[c * 4 + 3];
                var a2 = xtime(a), b2 = xtime(b), c2 = xtime(cc), d2 = xtime(d);
                var a4 = xtime(a2), b4 = xtime(b2), c4 = xtime(c2), d4 = xtime(d2);
                var a8 = xtime(a4), b8 = xtime(b4), c8 = xtime(c4), d8 = xtime(d4);
                var ae = a2 ^ a4 ^ a8, be = b2 ^ b4 ^ b8, ce = c2 ^ c4 ^ c8, de = d2 ^ d4 ^ d8;
                var ab = a8 ^ a2 ^ a,  bb = b8 ^ b2 ^ b,  cb = c8 ^ c2 ^ cc, db = d8 ^ d2 ^ d;
                var ad = a8 ^ a4 ^ a,  bd = b8 ^ b4 ^ b,  cd = c8 ^ c4 ^ cc, dd = d8 ^ d4 ^ d;
                var a9 = a8 ^ a,       b9 = b8 ^ b,       c9 = c8 ^ cc,      d9 = d8 ^ d;
                s[c * 4]     = (ae ^ bb ^ cd ^ d9) & 0xff;
                s[c * 4 + 1] = (a9 ^ be ^ cb ^ dd) & 0xff;
                s[c * 4 + 2] = (ad ^ b9 ^ ce ^ db) & 0xff;
                s[c * 4 + 3] = (ab ^ bd ^ c9 ^ de) & 0xff;
            }
        }
        
        var t = [
            s[0], s[13], s[10], s[7],
            s[4], s[1],  s[14], s[11],
            s[8], s[5],  s[2],  s[15],
            s[12],s[9],  s[6],  s[3]
        ];
        for (var i = 0; i < 16; i++) s[i] = SI[t[i]] ^ rk[i];
        return s;
    }

    function str2bytes(s) {
        var b = []; for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff);
        return b;
    }
    function bytes2utf8(b, len) {
        var out = '', i = 0;
        while (i < len) {
            var c = b[i++];
            if (c < 0x80) { out += String.fromCharCode(c); }
            else if (c < 0xc0) {   }
            else if (c < 0xe0) { out += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f)); }
            else if (c < 0xf0) { out += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f)); }
            else {
                var cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
                cp -= 0x10000;
                out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
            }
        }
        return out;
    }
    function b64decode(s) {
        var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var lookup = {};
        for (var i = 0; i < 64; i++) lookup[alpha.charAt(i)] = i;
        s = String(s).replace(/[^A-Za-z0-9+/=]/g, '');
        var out = [];
        var L = s.length;
        for (var i = 0; i < L; i += 4) {
            var b1 = lookup[s.charAt(i)], b2 = lookup[s.charAt(i + 1)];
            var c3 = s.charAt(i + 2), c4 = s.charAt(i + 3);
            var b3 = (c3 === '=' || c3 === '') ? -1 : lookup[c3];
            var b4 = (c4 === '=' || c4 === '') ? -1 : lookup[c4];
            out.push(((b1 << 2) | (b2 >> 4)) & 0xff);
            if (b3 !== -1) out.push((((b2 & 0x0f) << 4) | (b3 >> 2)) & 0xff);
            if (b4 !== -1) out.push((((b3 & 0x03) << 6) | b4) & 0xff);
        }
        return out;
    }

    return {
        
        decryptBase64: function (b64, keyStr) {
            var key = str2bytes(keyStr || AES_KEY);
            var rk = expandKey(key);
            var cipher = b64decode(b64);
            if (cipher.length === 0 || cipher.length % 16 !== 0) {
                throw new Error('cipher length not multiple of 16: ' + cipher.length);
            }
            var out = [];
            for (var i = 0; i < cipher.length; i += 16) {
                var blk = decryptBlock(cipher.slice(i, i + 16), rk);
                for (var j = 0; j < 16; j++) out.push(blk[j]);
            }
            
            var pad = out[out.length - 1];
            if (pad < 1 || pad > 16) throw new Error('invalid PKCS7 pad: ' + pad);
            for (var k = out.length - pad; k < out.length; k++) {
                if (out[k] !== pad) throw new Error('PKCS7 pad mismatch');
            }
            return bytes2utf8(out, out.length - pad);
        }
    };
})();




function b64url(hexStr) {
    
    var bytes = '';
    for (var i = 0; i < hexStr.length; i += 2) {
        bytes += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
    }
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var out = '', i, l = bytes.length;
    for (i = 0; i + 3 <= l; i += 3) {
        var n = (bytes.charCodeAt(i) << 16) | (bytes.charCodeAt(i + 1) << 8) | bytes.charCodeAt(i + 2);
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63] + alpha[n & 63];
    }
    var rem = l - i;
    if (rem === 1) {
        var n = bytes.charCodeAt(i) << 16;
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63];
    } else if (rem === 2) {
        var n = (bytes.charCodeAt(i) << 16) | (bytes.charCodeAt(i + 1) << 8);
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63];
    }
    return out.substr(0, 22);
}

function sign(path, ts) {
    
    return b64url(md5(String(ts) + path + API_SECRET));
}

function hdr() {
    return { 'User-Agent': UA_DART };
}




var RESOLVED = '';
function host() {
    if (RESOLVED) return RESOLVED;
    for (var i = 0; i < HOSTS.length; i++) {
        var h = rstrip(HOSTS[i]); if (!h) continue;
        var ts = nowSec() + 60;
        var path = API_PREFIX + '/init/getServerTime';
        var url  = h + path + '?sign=' + sign(path, ts) + '&time=' + ts;
        var body = request(url, JSON.stringify({ headers: hdr(), timeout: 8000 })) || '';
        if (body && (body.charAt(0) === '{' || body.charAt(0) === '"')) {
            RESOLVED = h; return h;
        }
    }
    RESOLVED = rstrip(HOSTS[0] || BASE);
    return RESOLVED;
}

function nowSec() {
    if (typeof timestamp === 'function') return Math.floor(timestamp() / 1000);
    if (typeof Date !== 'undefined')     return Math.floor(new Date().getTime() / 1000);
    return 0;
}

function buildQuery(q) {
    var keys = []; for (var k in q) if (q.hasOwnProperty(k)) keys.push(k);
    keys.sort();
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i], v = q[k];
        if (v == null) continue;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    }
    return parts.join('&');
}

function callApi(path, query) {
    var ts = nowSec() + 60;
    var full = (path.indexOf('/app') === 0) ? path : (API_PREFIX + path);
    var qs = { };
    if (query) for (var k in query) if (query.hasOwnProperty(k) && query[k] != null) qs[k] = query[k];
    qs.sign = sign(full, ts);
    qs.time = ts;
    var url = host() + full + '?' + buildQuery(qs);
    var raw = request(url, JSON.stringify({ headers: hdr(), timeout: 15000 })) || '';
    return parseResp(raw);
}

function parseResp(raw) {
    var s = (raw == null ? '' : String(raw)).replace(/^\s+|\s+$/g, '');
    if (!s) return null;
    if (s.charAt(0) === '{' || s.charAt(0) === '[') {
        return parseJson(s);
    }
    if (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
        var b64 = s.substr(1, s.length - 2);
        try {
            var plain = AES_DEC.decryptBase64(b64, AES_KEY);
            if (plain.charAt(0) === '{' || plain.charAt(0) === '[') {
                return parseJson(plain);
            }
            return plain;
        } catch (e) {
            return { _decrypt_error: String(e), _raw: s.substr(0, 200) };
        }
    }
    return { _raw: s.substr(0, 200) };
}




function mapVideoBrief(v) {
    if (!v) return null;
    var title = clean(v.title || v.douBanTitle || '');
    if (!title) return null;
    return {
        id:      String(v.id || ''),
        name:    title,
        pic:     trim(v.pic),                 
        type:    typeOf(v.area),
        year:    yearStr(v.year),
        remarks: clean(v.remarks || ''),
        desc:    clean(v.description || '')
    };
}


function mapList(arr) {
    var out = [], seen = {};
    if (!arr) return out;
    for (var i = 0; i < arr.length; i++) {
        var b = mapVideoBrief(arr[i]);
        if (!b || !b.id || seen[b.id]) continue;
        seen[b.id] = 1; out.push(b);
    }
    return out;
}



function mapListBanner(arr) {
    var out = [], seen = {};
    if (!arr) return out;
    for (var i = 0; i < arr.length; i++) {
        var v = arr[i]; if (!v) continue;
        var b = mapVideoBrief(v);
        if (!b || !b.id || seen[b.id]) continue;
        var t = trim(v.thumb);
        if (t) b.pic = t;
        seen[b.id] = 1; out.push(b);
    }
    return out;
}




var TABS_CACHE = null;
function fetchTabsCached() {
    if (TABS_CACHE) return TABS_CACHE;
    var tabs = [];
    try {
        var j = callApi('/tab/getList') || {};
        var arr = j.data || [];
        for (var i = 0; i < arr.length; i++) {
            var o = arr[i] || {};
            if (!o.id || !o.title) continue;
            tabs.push({ id: String(o.id), title: String(o.title), sort: o.sort || 0 });
        }
        tabs.sort(function (a, b) { return a.sort - b.sort; });
    } catch (e) {}
    TABS_CACHE = tabs.length ? tabs : FALLBACK_TABS;
    return TABS_CACHE;
}


function recommendId() {
    var tabs = fetchTabsCached();
    for (var i = 0; i < tabs.length; i++) if (tabs[i].title === '推荐') return tabs[i].id;
    return tabs.length ? tabs[0].id : '';
}


function flattenTab(tabId) {
    if (!tabId) return [];
    var j = callApi('/video/getList', { tabId: tabId }) || {};
    var data = j.data || [];
    var out = [], seen = {};
    for (var i = 0; i < data.length; i++) {
        var vl = (data[i] || {}).videoList || [];
        for (var k = 0; k < vl.length; k++) {
            var b = mapVideoBrief(vl[k]);
            if (!b || !b.id || seen[b.id]) continue;
            seen[b.id] = 1; out.push(b);
        }
    }
    return out;
}


function listByTab(tabId, page) {
    var all = flattenTab(tabId);
    page = page || 1;
    var size = 20;
    return all.slice((page - 1) * size, page * size);
}

function searchByKeyword(kw, page) {
    var size = 20;
    var j = callApi('/video/search', { keyWord: kw, page: page || 1, size: size }) || {};
    return mapList(j.data || []);
}






function categories() {
    var tabs = fetchTabsCached();
    var cats = [{ key: '', title: '推荐' }];
    for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        if (!t.id || !t.title || t.title === '推荐') continue;
        cats.push({ key: t.id, title: t.title });
    }
    return JSON.stringify(cats);
}







function homeSections() {
    var recId = recommendId();
    if (!recId) return '[]';
    var j = callApi('/video/getList', { tabId: recId }) || {};
    var data = j.data || [];

    var bannerItems = [], recentItems = [], rest = [];
    for (var i = 0; i < data.length; i++) {
        var sec = data[i] || {};
        var title = trim(sec.title);
        var isBanner = (sec.type === 1) || title.toLowerCase() === 'banner';
        if (isBanner && !bannerItems.length) {
            bannerItems = mapListBanner(sec.videoList);        
        } else if (title === '最近更新' && !recentItems.length) {
            recentItems = mapList(sec.videoList);              
        } else {
            rest.push({ title: title || '推荐', items: mapList(sec.videoList) });
        }
    }

    var out = [];
    
    var first = bannerItems.slice(0, 5).concat(recentItems);
    if (first.length) out.push({ title: '最近更新', key: '', items: first });
    
    
    for (var k = 0; k < rest.length; k++) {
        if (rest[k].items.length) out.push({ title: rest[k].title, key: '', items: rest[k].items.slice(0, 12) });
    }
    return JSON.stringify(out);
}

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword);
    if (!key) return JSON.stringify(listByTab(recommendId(), page));   
    if (/^[0-9a-f]{32}$/.test(key)) return JSON.stringify(listByTab(key, page)); 
    return JSON.stringify(searchByKeyword(key, page));                  
}

function searchFiltered(category, filtersJson, page) {
    var cat = trim(category);
    if (/^[0-9a-f]{32}$/.test(cat)) return JSON.stringify(listByTab(cat, page || 1));
    return search(cat, page);
}




function utf8ToB64url(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 0x80) {
            bytes.push(c);
        } else if (c < 0x800) {
            bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c < 0xd800 || c >= 0xe000) {
            bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        } else {
            i++;
            var cp = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff));
            bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
                       0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        }
    }
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var out = '', n, k;
    for (k = 0; k + 3 <= bytes.length; k += 3) {
        n = (bytes[k] << 16) | (bytes[k + 1] << 8) | bytes[k + 2];
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63] + alpha[n & 63];
    }
    var rem = bytes.length - k;
    if (rem === 1) {
        n = bytes[k] << 16;
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63];
    } else if (rem === 2) {
        n = (bytes[k] << 16) | (bytes[k + 1] << 8);
        out += alpha[(n >> 18) & 63] + alpha[(n >> 12) & 63] + alpha[(n >> 6) & 63];
    }
    return out;
}
function b64urlToUtf8(s) {
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var lookup = {};
    for (var i = 0; i < 64; i++) lookup[alpha.charAt(i)] = i;
    s = String(s).replace(/[^A-Za-z0-9_\-]/g, '');
    var bytes = [];
    for (var k = 0; k < s.length; k += 4) {
        var b1 = lookup[s.charAt(k)],     b2 = lookup[s.charAt(k + 1)];
        var c3 = s.charAt(k + 2),         c4 = s.charAt(k + 3);
        var b3 = c3 === '' ? -1 : lookup[c3];
        var b4 = c4 === '' ? -1 : lookup[c4];
        bytes.push(((b1 << 2) | (b2 >> 4)) & 0xff);
        if (b3 !== -1) bytes.push((((b2 & 0x0f) << 4) | (b3 >> 2)) & 0xff);
        if (b4 !== -1) bytes.push((((b3 & 0x03) << 6) | b4) & 0xff);
    }
    var out = '', i2 = 0;
    while (i2 < bytes.length) {
        var c = bytes[i2++];
        if (c < 0x80) { out += String.fromCharCode(c); }
        else if (c < 0xe0) { out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i2++] & 0x3f)); }
        else if (c < 0xf0) { out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i2++] & 0x3f) << 6) | (bytes[i2++] & 0x3f)); }
        else {
            var cp = ((c & 0x07) << 18) | ((bytes[i2++] & 0x3f) << 12) | ((bytes[i2++] & 0x3f) << 6) | (bytes[i2++] & 0x3f);
            cp -= 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
    }
    return out;
}

function detail(id) {
    var out = { id: String(id), name: '', pic: '', desc: '', type: '', remarks: '', year: '',
                actor: '', director: '', episodes: [] };
    var j = callApi('/video/getDetail', { videoId: id }) || {};
    var d = (j.data) || {};
    var b = mapVideoBrief(d) || {};
    out.name    = b.name    || '';
    out.pic     = b.pic     || '';
    out.desc    = b.desc    || clean(d.description || '');
    out.remarks = b.remarks || '';
    out.year    = b.year    || '';
    out.type    = b.type    || typeOf(d.area);
    out.actor   = clean(d.actor || '');
    out.director= clean(d.director || '');

    var title = out.name || clean(d.title || d.douBanTitle || '');
    var titleEnc = utf8ToB64url(title);

    var eps = d.episodeList || [];
    for (var i = 0; i < eps.length; i++) {
        var e = eps[i] || {};
        var eid = trim(e.id); if (!eid) continue;
        var name = clean(e.title || ('第' + (i + 1) + '集'));
        out.episodes.push({
            name:  name,
            url:   String(id) + '@' + eid + '@' + titleEnc,   
            route: '在线播放'
        });
    }
    return JSON.stringify(out);
}

function play(flag) {
    var res = { url: '', type: 'auto' };
    var parts = String(flag || '').split('@');
    var vid   = trim(parts[0]);
    var eid   = trim(parts[1] || '');
    var title = parts[2] ? b64urlToUtf8(parts[2]) : '';
    if (!eid)   { res._note = 'missing episodeId in flag'; return JSON.stringify(res); }
    if (!title) { res._note = 'missing videoTitle in flag (re-open detail to re-encode)'; return JSON.stringify(res); }

    
    var j = callApi('/episode/jx', {
        videoTitle: title,
        episodeId:  eid,
        deviceId:   DEVICE_ID
    }) || {};

    var d = (j && j.data) || null;
    if (!d || j.code !== 200) {
        res._server_msg  = j && j.message ? String(j.message) : 'no data';
        res._server_code = j && (j.code != null) ? j.code : -1;
        return JSON.stringify(res);
    }

    
    
    
    var rs = d.resolutionList || [];
    var pick = null;
    var order = ['8k', '4k', 'uhd', '2k', 'super', 'fullHd', 'high', 'normal', 'low'];
    for (var oi = 0; oi < order.length && !pick; oi++) {
        for (var ri = 0; ri < rs.length; ri++) {
            if (rs[ri] && rs[ri].name === order[oi] && rs[ri].url) { pick = rs[ri]; break; }
        }
    }
    if (!pick && rs.length) pick = rs[0];
    var u = pick ? trim(pick.url || '') : '';
    if (!u) {
        res._server_msg = 'resolutionList empty';
        return JSON.stringify(res);
    }

    res.url  = u;
    res.type = guessType(u);

    
    var ph = d.playHeader || {};
    var hdrs = {
        'User-Agent': ph.UserAgent || ph['User-Agent'] || CHROME_UA,
        'Referer':    ph.Referer   || 'https://pan.quark.cn/',
        'Origin':     (ph.Referer ? ph.Referer.replace(/\/$/, '') : 'https://pan.quark.cn')
    };
    if (ph.Cookie) hdrs.Cookie = ph.Cookie;
    res.referer = hdrs.Referer;
    res.headers = JSON.stringify(hdrs);

    
    var resolutions = [], rseen = {};
    for (var qi = 0; qi < rs.length; qi++) {
        var q = rs[qi];
        if (!q || !q.url) continue;
        var qu = trim(q.url);
        if (!qu || rseen[qu]) continue;
        rseen[qu] = 1;
        resolutions.push({ name: resName(q.name), url: qu, type: guessType(qu) });
    }
    res.resolutions = resolutions;
    return JSON.stringify(res);
}




if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        categories: categories,
        homeSections: homeSections,
        search: search,
        searchFiltered: searchFiltered,
        detail: detail,
        play: play,
        _internal: {
            sign: sign,
            b64url: b64url,
            buildQuery: buildQuery,
            parseResp: parseResp,
            callApi: callApi,
            host: host,
            AES_DEC: AES_DEC,
            fetchTabsCached: fetchTabsCached,
            recommendId: recommendId,
            flattenTab: flattenTab,
            listByTab: listByTab,
            searchByKeyword: searchByKeyword
        }
    };
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

