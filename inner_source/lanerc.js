// @key com.lanerc.lanerc
// @label 囧源·LANERC
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧源·LANERC 内容源（EasyBangumi / 纯纯看番 扩展）
// 适配自 LANERC 系站点脚本，经 __JB 桥适配运行。免登录 / 免广告。
// 2026-08-13：同步源站 V2 接口（app/v2/vod + app/v2/play，protobuf），
// 源站已废弃老接口（app/getvod 返回占位「请升级到最新版本」）。
// 主体脚本来源：https://js.z1i.cn/js/lanerc.js（囧次元 App 热更新分发）
//
var ext = { coverSuffix: true, guestCredential: { credential: 'g1.BAbHIK79q070zh8IpfRmALnjgHpX-QXUrICjSEIydZrCYCpPkLjUvLuAoOB7rhB8lNXn2j4LNXiWKv-thJOBAztm79cZ1WZj3yAn2b6HzOUTp7n8pRe0E_x23W0fyFu2N0yVFeNytJOFzDSZ5ah85P1aGUTApAInqiqd5z4MERhKMqTxXZK7Yq9lgktQlxd17RG0DQ0kL6aMhhDq3zY6bCw', expiresAt: 1786605794, origin: 'https://lol.jngaoke.cn' } };
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
var _LANERC_DISCOVERY_DOMAIN = 'uminainfo.cc';
var _LANERC_DISCOVERY_PATH = 'api.json';
var _LANERC_DOH_NAMES = ['dohx.lanerc.moe', 'doh.lanercdns1.cc', 'doh.uminadns2.cc'];
var _LANERC_DOH_RESOLVERS = [
    'https://doh.pub/',
    'https://dns.alidns.com/',
    'https://doh.360.cn/',
    'https://1.12.12.12/',
    'https://223.5.5.5/',
    'https://dns.google/'
];
var _LANERC_DOH_DECRYPT_KEY = '2dd30ebfb8ed481a3317036eaf7ed3da';
var _LANERC_HEALTH_SECRET = '4x2g5efd84fb46a9';
var _LANERC_FALLBACK_HOST = 'https://lol.jngaoke.cn/';
var _LANERC_DIRECT_IP = '123.6.149.136';
var _LANERC_LEGACY_DIRECT_IP = '111.124.66.133';
var _LANERC_DIRECT_HOST = 'lol.jngaoke.cn';
var _LANERC_DIRECT_HOST_URL = 'http://' + _LANERC_DIRECT_IP + '/';
 
var _LANERC_PROBE_TIMEOUT_MS = 3000;

var _LANERC_WARNING_PLAYLIST_TIMEOUT_MS = 3000;
var _LANERC_BLOCK_WARNING_PLAYLIST = true;
var _LANERC_BROWSE_ONLY = false;
var _LANERC_STALE_HOST = 'https://server.jngaoke.cn/';
var _LANERC_AUTH_FALLBACK = 'com.clggjv.xcjfmd.ffo';
var _LANERC_DECRYPT_KEY = '8f81c2519e3b661834219e7142000093';
var _LANERC_RUNTIME_CONFIG_PATH = 'app/config';
var _LANERC_V2_DETAIL_PATH = 'app/v2/vod/';
var _LANERC_V2_PLAY_PATH = 'app/v2/play';
var _LANERC_GUEST_CAPTCHA_PATH = 'app/v2/guest/captcha';
var _LANERC_GUEST_CREDENTIAL_PATH = 'app/v2/guest/credential';
var _LANERC_GUEST_PLAY_PATH = 'app/v2/guest/play';
var _LANERC_GUEST_CREDENTIAL_STORAGE_KEY = 'lanerc_guest_credential_v1';
var _LANERC_PLAY_RESOLVE_KEY_HEX = '5a31fe3201838a69e8f9c135f7905db25208fbc6bc3f0a9b017fc5139a451108';
var _LANERC_PLAY_RESOLVE_PATH = 'app/proxyx4x';
var _LANERC_OFFICIAL_MEDIA_HOSTS = ['http://static.shangji.asia', 'https://file.shangji.asia'];
var _LANERC_OFFICIAL_MEDIA_BUCKETS = ['10', '13', '2'];
var _LANERC_LEGACY_MEDIA_BY_CONTENT = {
    '688': ['416c3fbe42da2d20d70f28e7709bc8f6']
};
var _LANERC_PLAY_RESOLVER = 'auto';
 
var _LANERC_BUILD_SIGNATURE = '74322D4D62B9F4A986DFA8973EE70EBC034E74551B8715C755EDD9ED18E6820B';
 
var _LANERC_QUERY_SIGN_SECRET = '4x2g5efd84fb46a9';

var _LANERC_API_UA = 'Dart/3.9.2';
var _LANERC_JSON_CONTENT_TYPE = 'application/json';
var _LANERC_GUEST_JSON_UA = 'Dart/3.9 (dart:io)';
var _LANERC_GUEST_JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
var _lanercExt = typeof ext === 'object' && ext ? ext : {};
var _lanercHost = '';
var _lanercHome = null;
var _lanercDirectUsed = false;
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



function _lanercBoolean(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    var normalized = String(value).toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    return fallback;
}



function config() {
    return JSON.stringify({
        browseOnly: _lanercBoolean(_lanercExt.browseOnly, _LANERC_BROWSE_ONLY)
    });
}



function _normalizeHost(host) {
    var value = _legacyTrim(host);
    if (!value) return '';
    if (/^Ahttps?:\/\//i.test(value)) value = value.slice(1);
    if (/^\/\//.test(value)) value = 'https:' + value;
    else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = 'https://' + value;
    else if (/^http:\/\//i.test(value) && !_lanercAllowHttpFallback()) value = 'https://' + value.slice(7);
    return value.replace(/\/+$/, '') + '/';
}

function _isLegacyLanercIpHost(host) {
    var value = _normalizeHost(host);
    return /^https?:\/\/(?:123\.6\.149\.136|111\.124\.66\.133)(?:\/|$)/i.test(value);
}



function _lanercAllowHttpFallback() {
    return _lanercBoolean(_lanercExt.allowHttpFallback, false) ||
        String(_lanercExt.apiScheme || '').toLowerCase() === 'http';
}


function _lanercDirectIp() {
    var supplied = _legacyTrim(_lanercExt.apiIp || _lanercExt.directIp || '');
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(supplied)) return supplied;
    return _LANERC_DIRECT_IP;
}


function _lanercDirectHostUrl() {
    return 'http://' + _lanercDirectIp() + '/';
}


function _lanercIsDirectApiUrl(url) {
    var value = String(url || '');
    var candidates = [_lanercDirectIp(), _LANERC_DIRECT_IP, _LANERC_LEGACY_DIRECT_IP];
    for (var index = 0; index < candidates.length; index += 1) {
        if (candidates[index] && new RegExp('^https?://' + String(candidates[index]).replace(/\./g, '\\.') + '(?:/|$)', 'i').test(value)) {
            return true;
        }
    }
    return false;
}



function _normalizeDiscoveredHost(host) {
    var value = _legacyTrim(host)
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/\\\//g, '/');
    if (!value) return '';
    if (/^Ahttps?:\/\//i.test(value)) value = value.slice(1);
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^\/\//.test(value)) {
        value = 'https://' + value;
    }
    var normalized = _normalizeHost(value);
    if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?\/$/i.test(normalized)) return '';
    return normalized;
}



function _isStaleLanercHost(host) {
    var value = _normalizeHost(host).toLowerCase();
    return /^https?:\/\/server\.jngaoke\.cn(?:\/|$)/i.test(value);
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

    function _aesMixColumns(state) {
        for (var column = 0; column < 4; column += 1) {
            var offset = column * 4;
            var a = state[offset];
            var b = state[offset + 1];
            var c = state[offset + 2];
            var d = state[offset + 3];
            var a2 = _aesXtime(a), b2 = _aesXtime(b), c2 = _aesXtime(c), d2 = _aesXtime(d);
            state[offset] = (a2 ^ (b2 ^ b) ^ c ^ d) & 0xff;
            state[offset + 1] = (a ^ b2 ^ (c2 ^ c) ^ d) & 0xff;
            state[offset + 2] = (a ^ b ^ c2 ^ (d2 ^ d)) & 0xff;
            state[offset + 3] = ((a2 ^ a) ^ b ^ c ^ d2) & 0xff;
        }
    }

    function _aesEncryptBlock(block, expanded) {
        var rounds = 14;
        var state = block.slice();
        var index;
        for (index = 0; index < 16; index += 1) state[index] ^= expanded[index];
        for (var round = 1; round < rounds; round += 1) {
            for (index = 0; index < 16; index += 1) state[index] = sbox[state[index]];
            state = [
                state[0], state[5], state[10], state[15],
                state[4], state[9], state[14], state[3],
                state[8], state[13], state[2], state[7],
                state[12], state[1], state[6], state[11]
            ];
            _aesMixColumns(state);
            for (index = 0; index < 16; index += 1) state[index] ^= expanded[round * 16 + index];
        }
        for (index = 0; index < 16; index += 1) state[index] = sbox[state[index]];
        state = [
            state[0], state[5], state[10], state[15],
            state[4], state[9], state[14], state[3],
            state[8], state[13], state[2], state[7],
            state[12], state[1], state[6], state[11]
        ];
        for (index = 0; index < 16; index += 1) state[index] ^= expanded[rounds * 16 + index];
        return state;
    }

    function _gcmXor(left, right) {
        var result = [];
        for (var index = 0; index < 16; index += 1) result[index] = left[index] ^ right[index];
        return result;
    }

    function _gcmMultiply(left, right) {
        var result = new Array(16).fill(0);
        var value = right.slice();
        for (var bitIndex = 0; bitIndex < 128; bitIndex += 1) {
            if ((left[bitIndex >> 3] & (0x80 >> (bitIndex & 7))) !== 0) {
                result = _gcmXor(result, value);
            }
            var lsb = value[15] & 1;
            for (var byteIndex = 15; byteIndex > 0; byteIndex -= 1) {
                value[byteIndex] = (value[byteIndex] >> 1) | ((value[byteIndex - 1] & 1) << 7);
            }
            value[0] = value[0] >> 1;
            if (lsb) value[0] ^= 0xe1;
        }
        return result;
    }

    function _gcmHash(ciphertext, hashSubkey) {
        var accumulator = new Array(16).fill(0);
        for (var offset = 0; offset < ciphertext.length; offset += 16) {
            var block = new Array(16).fill(0);
            for (var index = 0; index < 16 && offset + index < ciphertext.length; index += 1) {
                block[index] = ciphertext[offset + index];
            }
            accumulator = _gcmMultiply(_gcmXor(accumulator, block), hashSubkey);
        }
        var lengths = new Array(16).fill(0);
        var bitLength = ciphertext.length * 8;
        for (var bit = 0; bit < 8; bit += 1) {
            lengths[15 - bit] = (bitLength / Math.pow(2, bit * 8)) & 0xff;
        }
        accumulator = _gcmMultiply(_gcmXor(accumulator, lengths), hashSubkey);
        return accumulator;
    }

    function _gcmIncrement(counter) {
        var next = counter.slice();
        for (var index = 15; index >= 12; index -= 1) {
            next[index] = (next[index] + 1) & 0xff;
            if (next[index] !== 0) break;
        }
        return next;
    }

    function _aesHexBytes(value) {
        var text = String(value || '').replace(/[^0-9a-f]/gi, '');
        if (text.length % 2) text = '0' + text;
        var result = [];
        for (var index = 0; index < text.length; index += 2) result.push(parseInt(text.substr(index, 2), 16));
        return result;
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

    function _aesBase64Encode(bytes) {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var output = '';
        for (var index = 0; index < bytes.length; index += 3) {
            var first = bytes[index] & 0xff;
            var hasSecond = index + 1 < bytes.length;
            var hasThird = index + 2 < bytes.length;
            var second = hasSecond ? bytes[index + 1] & 0xff : 0;
            var third = hasThird ? bytes[index + 2] & 0xff : 0;
            output += alphabet.charAt(first >> 2);
            output += alphabet.charAt(((first & 3) << 4) | (second >> 4));
            output += hasSecond ? alphabet.charAt(((second & 15) << 2) | (third >> 6)) : '=';
            output += hasThird ? alphabet.charAt(third & 63) : '=';
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
        },
        decryptGcmBase64: function (ciphertextBase64, keyHex, ivBase64) {
            var key = _aesHexBytes(keyHex);
            var nonce = _aesBase64Bytes(ivBase64);
            var input = _aesBase64Bytes(ciphertextBase64);
            if (key.length !== 32 || nonce.length !== 12 || input.length < 16) {
                throw new Error('AES-GCM 参数长度非法');
            }
            var ciphertext = input.slice(0, input.length - 16);
            var tag = input.slice(input.length - 16);
            var expanded = _aesExpandKey(key);
            var zero = new Array(16).fill(0);
            var hashSubkey = _aesEncryptBlock(zero, expanded);
            var j0 = nonce.concat([0, 0, 0, 1]);
            var expectedTag = _gcmXor(_aesEncryptBlock(j0, expanded), _gcmHash(ciphertext, hashSubkey));
            var mismatch = 0;
            for (var tagIndex = 0; tagIndex < 16; tagIndex += 1) mismatch |= expectedTag[tagIndex] ^ tag[tagIndex];
            if (mismatch !== 0) throw new Error('AES-GCM authentication failed');
            var plain = [];
            var counter = _gcmIncrement(j0);
            for (var offset = 0; offset < ciphertext.length; offset += 16) {
                var stream = _aesEncryptBlock(counter, expanded);
                var blockLength = Math.min(16, ciphertext.length - offset);
                for (var blockIndex = 0; blockIndex < blockLength; blockIndex += 1) {
                    plain.push(ciphertext[offset + blockIndex] ^ stream[blockIndex]);
                }
                counter = _gcmIncrement(counter);
            }
            return _aesBase64Encode(plain);
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



function _decryptLanercStandardBase64(ciphertext, keyText) {
    var input = String(ciphertext || '').replace(/[\r\n\t ]/g, '');
    while (input.length % 4) input += '=';
    var key = String(keyText || '');
    if (!input || !key) return '';
    var nativeError = null;
    if (typeof crypto !== 'undefined' && crypto.aes && typeof crypto.aes.decrypt === 'function') {
        try {
            var nativePlain = crypto.aes.decrypt(input, key, {
                mode: 'ECB',
                padding: 'PKCS5',
                input: 'base64',
                output: 'utf8'
            });
            if (nativePlain !== null && nativePlain !== undefined && String(nativePlain) !== '') {
                return String(nativePlain);
            }
        } catch (error) {
            nativeError = error;
        }
    }
    try {
        return String(_LANERC_AES_FALLBACK.decryptBase64(input, key) || '');
    } catch (fallbackError) {
        if (nativeError) _lanercLog('动态配置 AES 解密失败：' + String(nativeError));
        return '';
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



function _isUsableApiResponse(value) {
    if (!value || typeof value !== 'object') return false;
    if (_legacyIsArray(value)) return value.length > 0;
    var code = value.code;
    if (typeof code === 'string' && /^-?\d+$/.test(_legacyTrim(code))) code = Number(code);
    if (typeof code === 'number' && (code < 0 || code >= 400)) return false;
    var status = value.status;
    if (typeof status === 'string' && /^-?\d+$/.test(_legacyTrim(status))) status = Number(status);
    if (typeof status === 'number' && status >= 400) return false;
    if (value.ok === false || value.error === true) return false;
    return Object.keys(value).length > 0;
}



function _lanercApiUserAgent() {
    var candidate = _legacyTrim(_lanercExt.userAgent);
    return /^Dart\//i.test(candidate) ? candidate : _LANERC_API_UA;
}



function _requestOptions(isPost, timeoutMs, url, extraHeaders, profile) {
    var guestJson = profile === 'guestJson';
    var userAgent = guestJson ? _LANERC_GUEST_JSON_UA : _lanercApiUserAgent();
    var headers = {
        'user-agent': userAgent,
        'content-type': guestJson ? _LANERC_GUEST_JSON_CONTENT_TYPE : _LANERC_JSON_CONTENT_TYPE,
        'accept-encoding': 'gzip'
    };
    var requestUrl = String(url || '');
    if (_lanercIsDirectApiUrl(requestUrl)) {
        headers.host = _LANERC_DIRECT_HOST;
    }
    var supplied = extraHeaders && typeof extraHeaders === 'object' ? extraHeaders : {};
    for (var suppliedName in supplied) {
        if (_legacyOwn(supplied, suppliedName) && supplied[suppliedName] !== null && supplied[suppliedName] !== undefined) {
            headers[String(suppliedName)] = String(supplied[suppliedName]);
        }
    }
    var options = { headers: headers, ua: userAgent };
    var timeout = Number(timeoutMs || _lanercExt.timeout || 0);
    if (timeout > 0 && isFinite(timeout)) options.timeout = timeout;
    return JSON.stringify(options);
}


function _lanercBinaryBytes(value) {
    if (value === null || value === undefined) return [];
    if (typeof value === 'string') {
        var textBytes = [];
        for (var textIndex = 0; textIndex < value.length; textIndex += 1) {
            textBytes.push(value.charCodeAt(textIndex) & 0xff);
        }
        return textBytes;
    }
    if (typeof value === 'object' && typeof value.length === 'number') {
        var arrayBytes = [];
        for (var arrayIndex = 0; arrayIndex < value.length; arrayIndex += 1) {
            arrayBytes.push(Number(value[arrayIndex]) & 0xff);
        }
        return arrayBytes;
    }
    return [];
}


function _lanercBytesToHex(bytes) {
    var output = '';
    for (var index = 0; index < bytes.length; index += 1) {
        var value = Number(bytes[index]) & 0xff;
        output += (value < 16 ? '0' : '') + value.toString(16);
    }
    return output;
}


function _lanercHexToBytes(value) {
    var text = String(value || '').replace(/[^0-9a-f]/gi, '');
    if (text.length % 2) text = '0' + text;
    var output = [];
    for (var index = 0; index < text.length; index += 2) output.push(parseInt(text.substr(index, 2), 16));
    return output;
}


function _lanercBytesToBase64(bytes) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var output = '';
    for (var index = 0; index < bytes.length; index += 3) {
        var first = Number(bytes[index]) & 0xff;
        var hasSecond = index + 1 < bytes.length;
        var hasThird = index + 2 < bytes.length;
        var second = hasSecond ? Number(bytes[index + 1]) & 0xff : 0;
        var third = hasThird ? Number(bytes[index + 2]) & 0xff : 0;
        output += alphabet.charAt(first >> 2);
        output += alphabet.charAt(((first & 3) << 4) | (second >> 4));
        output += hasSecond ? alphabet.charAt(((second & 15) << 2) | (third >> 6)) : '=';
        output += hasThird ? alphabet.charAt(third & 63) : '=';
    }
    return output;
}


function _lanercBase64ToBytes(value) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var input = String(value || '').replace(/[^A-Za-z0-9+/=]/g, '');
    var output = [];
    for (var index = 0; index < input.length; index += 4) {
        var first = alphabet.indexOf(input.charAt(index));
        var second = alphabet.indexOf(input.charAt(index + 1));
        if (first < 0 || second < 0) continue;
        var thirdChar = input.charAt(index + 2);
        var fourthChar = input.charAt(index + 3);
        var third = thirdChar === '=' || thirdChar === '' ? -1 : alphabet.indexOf(thirdChar);
        var fourth = fourthChar === '=' || fourthChar === '' ? -1 : alphabet.indexOf(fourthChar);
        output.push(((first << 2) | (second >> 4)) & 0xff);
        if (third >= 0) output.push((((second & 15) << 4) | (third >> 2)) & 0xff);
        if (fourth >= 0) output.push((((third & 3) << 6) | fourth) & 0xff);
    }
    return output;
}


function _lanercUtf8Decode(bytes) {
    var output = '';
    var index = 0;
    while (index < bytes.length) {
        var first = Number(bytes[index++]) & 0xff;
        if (first < 0x80) {
            output += String.fromCharCode(first);
        } else if (first < 0xe0 && index < bytes.length) {
            output += String.fromCharCode(((first & 0x1f) << 6) | (bytes[index++] & 0x3f));
        } else if (first < 0xf0 && index + 1 < bytes.length) {
            output += String.fromCharCode(
                ((first & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f)
            );
        } else if (index + 2 < bytes.length) {
            var point = ((first & 7) << 18) | ((bytes[index++] & 0x3f) << 12) |
                ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
            point -= 0x10000;
            output += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff));
        } else {
            output += '\ufffd';
        }
    }
    return output;
}


function _lanercProtoFields(value) {
    var bytes = _lanercBinaryBytes(value);
    var fields = {};
    var offset = 0;
    function readVarint() {
        var result = 0;
        var shift = 0;
        while (offset < bytes.length && shift < 56) {
            var current = bytes[offset++];
            result += (current & 0x7f) * Math.pow(2, shift);
            if ((current & 0x80) === 0) return result;
            shift += 7;
        }
        throw new Error('protobuf varint 非法');
    }
    while (offset < bytes.length) {
        var tag = readVarint();
        var fieldNumber = Math.floor(tag / 8);
        var wireType = tag & 7;
        if (!fieldNumber) throw new Error('protobuf field number 非法');
        var fieldValue;
        if (wireType === 0) {
            fieldValue = readVarint();
        } else if (wireType === 1) {
            if (offset + 8 > bytes.length) throw new Error('protobuf fixed64 截断');
            fieldValue = bytes.slice(offset, offset + 8);
            offset += 8;
        } else if (wireType === 2) {
            var length = readVarint();
            if (length < 0 || offset + length > bytes.length) throw new Error('protobuf length 截断');
            fieldValue = bytes.slice(offset, offset + length);
            offset += length;
        } else if (wireType === 5) {
            if (offset + 4 > bytes.length) throw new Error('protobuf fixed32 截断');
            fieldValue = bytes.slice(offset, offset + 4);
            offset += 4;
        } else {
            throw new Error('protobuf wire type 不支持：' + wireType);
        }
        if (!fields[fieldNumber]) fields[fieldNumber] = [];
        fields[fieldNumber].push({ wireType: wireType, value: fieldValue });
    }
    return fields;
}


function _lanercBinaryRequestOptions(url, timeoutMs) {
    var options = _safeParse(_requestOptions(true, timeoutMs, url, {
        accept: 'application/x-protobuf'
    }), {});
    options.charset = 'ISO-8859-1';
    if (!options.headers) options.headers = {};
    options.headers.accept = 'application/x-protobuf';
    options.headers['content-type'] = _LANERC_JSON_CONTENT_TYPE;
    return options;
}


function _postLanercProtobuf(url, body) {
    var primaryUrl = String(url || '');
    var payload = JSON.stringify(body || {});
    var timeout = Number(_lanercExt.timeout || 12000);
    var useHttpPost2 = typeof http !== 'undefined' && http && typeof http.post2 === 'function';
    function usablePayload(value) {
        if (_lanercBinaryBytes(value).length < 1) return false;
        try {
            return !!_playUrlFromProtobufResponse(value);
        } catch (error) {
            return false;
        }
    }
    function send(target) {
        var options = _lanercBinaryRequestOptions(target, timeout);
        if (useHttpPost2) {
            var response = http.post2(target, payload, JSON.stringify(options));
            if (response && typeof response === 'object' && response.body !== undefined) {
                var status = Number(response.status || 0);
                if (status >= 400) return null;
                return response.body;
            }
            return response;
        }
        if (typeof post !== 'function') return null;
        return post(target, payload, JSON.stringify(options));
    }
    try {
        var primary = send(primaryUrl);
        if (usablePayload(primary)) return primary;
        if (_lanercBinaryBytes(primary).length > 0) {
            _lanercLog('x4x 主节点返回非 protobuf 内容，准备尝试直连节点');
        }
    } catch (error) {
        _lanercLog('x4x 主节点失败：' + primaryUrl + '；' + String(error));
    }
    var directUrl = _lanercAllowHttpFallback() ? _lanercDirectUrl(primaryUrl) : '';
    if (directUrl && directUrl !== primaryUrl) {
        try {
            var direct = send(directUrl);
            if (usablePayload(direct)) {
                _lanercLog('x4x 自动切换直连节点：' + directUrl);
                _lanercDirectUsed = true;
                return direct;
            }
            if (_lanercBinaryBytes(direct).length > 0) {
                _lanercLog('x4x 直连节点返回非 protobuf 内容');
            }
        } catch (directError) {
            _lanercLog('x4x 直连节点失败：' + directUrl + '；' + String(directError));
        }
    }
    return null;
}


function _postLanercV2Play(resourceId) {
    return _postLanercProtobuf(_resolveHost() + _LANERC_V2_PLAY_PATH, {
        resource_id: String(resourceId || '')
    });
}


function guestCaptcha() {
    try {
        var response = _payload(_apiPost(_LANERC_GUEST_CAPTCHA_PATH, {}));
        var challengeId = _legacyTrim(_firstValue(response, ['challenge_id', 'challengeId']));
        var image = _legacyTrim(_firstValue(response, ['image', 'captcha', 'image_data', 'imageData']));
        var optionCount = Math.floor(Number(_firstValue(response, ['option_count', 'optionCount']) || 0));
        var expiresIn = Math.floor(Number(_firstValue(response, ['expires_in', 'expiresIn']) || 0));
        if (!challengeId || !image || optionCount < 1 || optionCount > 12) {
            return JSON.stringify({ ok: false, error: '验证码获取失败，请稍后重试' });
        }
        return JSON.stringify({
            ok: true,
            challengeId: challengeId,
            image: image,
            optionCount: optionCount,
            expiresIn: expiresIn > 0 ? expiresIn : 180
        });
    } catch (error) {
        return JSON.stringify({ ok: false, error: '验证码获取失败，请检查网络后重试' });
    }
}


function guestBind(challengeId, selected) {
    try {
        var challenge = _legacyTrim(challengeId);
        var choice = Number(selected);
        if (!challenge || !isFinite(choice) || Math.floor(choice) !== choice || choice < 1) {
            return JSON.stringify({ ok: false, error: '请选择正确的图片序号' });
        }
        var response = _payload(_apiPost(_LANERC_GUEST_CREDENTIAL_PATH, {
            challenge_id: challenge,
            selected: String(choice)
        }));
        var credential = _legacyTrim(_firstValue(response, ['credential', 'guest_credential', 'guestCredential']));
        var expiresAt = Math.floor(Number(_firstValue(response, ['expires_at', 'expiresAt']) || 0));
        if (!credential) {
            return JSON.stringify({ ok: false, error: '验证失败或验证码已过期，请换一张重试' });
        }
        if (typeof setItem !== 'function') {
            return JSON.stringify({ ok: false, error: '当前客户端不支持保存设备凭证' });
        }
        setItem(_LANERC_GUEST_CREDENTIAL_STORAGE_KEY, JSON.stringify({
            credential: credential,
            expiresAt: expiresAt,
            origin: _resolveHost()
        }));
        return JSON.stringify({ ok: true, expiresAt: expiresAt });
    } catch (error) {
        return JSON.stringify({ ok: false, error: '绑定失败，请换一张验证码重试' });
    }
}


function _lanercGuestCredentialRecord(flagData) {
    var flag = flagData && typeof flagData === 'object' ? flagData : {};
    var supplied = _firstValue(flag, ['guestCredential', 'guest_credential', 'guestCredentialRecord']);
    var shouldPersist = supplied !== '';
    if (supplied === '') {
        supplied = _firstValue(_lanercExt, ['guestCredential', 'guest_credential', 'guestCredentialRecord']);
        shouldPersist = supplied !== '';
    }
    if (supplied === '' && typeof getItem === 'function') {
        try {
            supplied = getItem(_LANERC_GUEST_CREDENTIAL_STORAGE_KEY, '') || '';
        } catch (storageReadError) {
            supplied = '';
        }
    }
    if (typeof supplied === 'string') {
        var decoded = _safeParse(supplied, null);
        if (decoded && typeof decoded === 'object' && !_legacyIsArray(decoded)) supplied = decoded;
    }
    var record = supplied && typeof supplied === 'object' && !_legacyIsArray(supplied) ? supplied : {};
    var credential = typeof supplied === 'string' ? _legacyTrim(supplied) : _legacyTrim(
        _firstValue(record, ['credential', 'guestCredential', 'guest_credential'])
    );
    var expiresAt = Number(_firstValue(record, ['expiresAt', 'expires_at', 'expiry', 'expires']) || 0);
    var originValue = _legacyTrim(_firstValue(record, ['origin', 'host']));
    var origin = '';
    if (originValue && /^https?:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(originValue)) {
        origin = _normalizeHost(originValue);
    }
    var now = Math.floor(Number(timestamp()) / 1000);
    var error = '';
    if (credential && expiresAt > 0 && expiresAt <= now) {
        error = '游客设备凭证已过期，请在自己的设备重新完成官方 App 游客验证';
    }
    if (shouldPersist && credential && !error && typeof setItem === 'function') {
        try {
            setItem(_LANERC_GUEST_CREDENTIAL_STORAGE_KEY, JSON.stringify({
                credential: credential,
                expiresAt: expiresAt,
                origin: origin
            }));
        } catch (storageWriteError) {
        }
    }
    return {
        credential: credential,
        expiresAt: expiresAt,
        origin: origin,
        error: error
    };
}


function _postLanercGuestPlay(resourceId, record) {
    var credential = record && record.credential ? String(record.credential) : '';
    if (!credential) return null;
    var host = record && record.origin ? record.origin : _resolveHost();
    return _postLanercProtobuf(host + _LANERC_GUEST_PLAY_PATH, {
        resource_id: String(resourceId || ''),
        guest_credential: credential
    });
}


function _decryptLanercPlayPayload(payload) {
    var bytes = _lanercBinaryBytes(payload);
    if (bytes.length < 12 + 16) throw new Error('x4x 密文长度非法：' + bytes.length);
    var nonce = bytes.slice(0, 12);
    var ciphertextAndTag = bytes.slice(12);
    var ciphertextBase64 = _lanercBytesToBase64(ciphertextAndTag);
    var nonceHex = _lanercBytesToHex(nonce);
    var plainBase64 = '';
    if (typeof crypto !== 'undefined' && crypto.aes && typeof crypto.aes.decrypt === 'function') {
        try {
            plainBase64 = crypto.aes.decrypt(ciphertextBase64, _LANERC_PLAY_RESOLVE_KEY_HEX, {
                mode: 'GCM',
                padding: 'NoPadding',
                keyFormat: 'hex',
                input: 'base64',
                output: 'base64',
                iv: nonceHex,
                ivFormat: 'hex'
            });
        } catch (nativeCryptoError) {
            _lanercLog('运行器 AES-GCM 失败，切换内置实现：' + String(nativeCryptoError));
        }
    }
    if (!plainBase64) {
        plainBase64 = _LANERC_AES_FALLBACK.decryptGcmBase64(
            ciphertextBase64, _LANERC_PLAY_RESOLVE_KEY_HEX, _lanercBytesToBase64(nonce)
        );
    }
    var plainBytes = _lanercBinaryBytes(plainBase64);
    if (typeof plainBase64 === 'string') plainBytes = _lanercBase64ToBytes(plainBase64);
    if (!plainBytes.length) throw new Error('x4x 明文为空');
    return plainBytes;
}


function _playUrlFromProtobufResponse(response) {
    var envelope = _lanercProtoFields(response);
    var encryptedField = envelope[4] && envelope[4][0];
    if (!encryptedField || encryptedField.wireType !== 2) return '';
    var plain = _decryptLanercPlayPayload(encryptedField.value);
    var resolved = _lanercProtoFields(plain);
    var urlField = resolved[1] && resolved[1][0];
    if (!urlField || urlField.wireType !== 2) return '';
    return _normalizePlayText(_lanercUtf8Decode(urlField.value));
}



function _requestJson(url, timeoutMs) {
    var primaryUrl = String(url || '');
    try {
        var primary = _decodeApiResponse(_safeParse(request(primaryUrl, _requestOptions(false, timeoutMs, primaryUrl)), {}));
        if (_isUsableApiResponse(primary)) {
            _lanercDirectUsed = false;
            return primary;
        }
    } catch (error) {
        _lanercLog('GET失败：' + primaryUrl + '；' + String(error));
    }
    var directUrl = _lanercAllowHttpFallback() ? _lanercDirectUrl(primaryUrl) : '';
    if (directUrl && directUrl !== primaryUrl) {
        try {
            var direct = _decodeApiResponse(_safeParse(request(directUrl, _requestOptions(false, timeoutMs, directUrl)), {}));
            if (_isUsableApiResponse(direct)) {
                _lanercLog('GET 自动切换直连节点：' + directUrl);
                _lanercDirectUsed = true;
                return direct;
            }
        } catch (directError) {
            _lanercLog('GET 直连节点失败：' + directUrl + '；' + String(directError));
        }
    }
    return {};
}



function _postJson(url, body, profile) {
    var primaryUrl = String(url || '');
    var payload = JSON.stringify(body || {});
    try {
        var primary = _decodeApiResponse(_safeParse(post(primaryUrl, payload, _requestOptions(true, 0, primaryUrl, null, profile)), {}));
        if (_isUsableApiResponse(primary)) {
            _lanercDirectUsed = false;
            return primary;
        }
    } catch (error) {
        _lanercLog('POST失败：' + primaryUrl + '；' + String(error));
    }
    var directUrl = _lanercAllowHttpFallback() ? _lanercDirectUrl(primaryUrl) : '';
    if (directUrl && directUrl !== primaryUrl) {
        try {
            var direct = _decodeApiResponse(_safeParse(post(directUrl, payload, _requestOptions(true, 0, directUrl, null, profile)), {}));
            if (_isUsableApiResponse(direct)) {
                _lanercLog('POST 自动切换直连节点：' + directUrl);
                _lanercDirectUsed = true;
                return direct;
            }
        } catch (directError) {
            _lanercLog('POST 直连节点失败：' + directUrl + '；' + String(directError));
        }
    }
    return {};
}



function _lanercDirectUrl(url) {
    var value = String(url || '');
    var hostPattern = new RegExp('^https?://' + _LANERC_DIRECT_HOST.replace(/\./g, '\\.') + '(?=/|$)', 'i');
    if (!hostPattern.test(value)) return '';
    return value.replace(hostPattern, _lanercDirectHostUrl().slice(0, -1));
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



function _findDeepAny(value, keys) {
    var names = _legacyIsArray(keys) ? keys : [];
    for (var index = 0; index < names.length; index += 1) {
        var found = _findDeep(value, String(names[index] || ''));
        if (found !== '' && found !== null && found !== undefined) return found;
    }
    return '';
}



function _normalizePlayText(value) {
    var text = _legacyTrim(value);
    if (!text) return '';
    text = text
        .replace(/\\\//g, '/')
        .replace(/\\u0026/gi, '&')
        .replace(/&amp;/gi, '&');
    if (/^https?%3a%2f%2f/i.test(text)) {
        try { text = decodeUri(text); } catch (error) { }
    }
    if (/^\/\//.test(text)) text = 'https:' + text;
    return text;
}



function _playUrlFromResponse(response) {
    var source = response;
    if (typeof source === 'string') {
        var parsedSource = _safeParse(source, source);
        if (parsedSource === source) return _normalizePlayText(source);
        source = parsedSource;
    }
    for (var depth = 0; depth < 3 && source && typeof source === 'object'; depth += 1) {
        if (typeof source.data !== 'string') break;
        var decoded = _safeParse(source.data, null);
        if (!decoded || typeof decoded !== 'object') break;
        source = decoded;
    }
    var value = _findDeepAny(source, [
        'play_url', 'playUrl', 'playurl', 'video_url', 'videoUrl',
        'm3u8_url', 'm3u8Url', 'url', 'src'
    ]);
    if (value && typeof value === 'object') {
        value = _findDeepAny(value, ['url', 'play_url', 'playUrl', 'src', 'value']);
    }
    return _normalizePlayText(value);
}



function _playHeadersFromResponse(response) {
    var source = response;
    if (typeof source === 'string') source = _safeParse(source, source);
    for (var depth = 0; depth < 3 && source && typeof source === 'object'; depth += 1) {
        if (typeof source.data !== 'string') break;
        var decoded = _safeParse(source.data, null);
        if (!decoded || typeof decoded !== 'object') break;
        source = decoded;
    }
    var value = _findDeepAny(source, [
        'play_header', 'playHeader', 'play_headers', 'playHeaders',
        'http_headers', 'httpHeaders', 'headers'
    ]);
    if (typeof value === 'string') value = _safeParse(value, null);
    if (!value || typeof value !== 'object' || _legacyIsArray(value)) return {};
    var result = {};
    for (var key in value) {
        if (_legacyOwn(value, key) && value[key] !== null && value[key] !== undefined) {
            result[String(key)] = String(value[key]);
        }
    }
    return result;
}



function _playResult(response, playUrl) {
    var result = { url: playUrl, type: _mediaType(playUrl) };
    var headers = _playHeadersFromResponse(response);
    var source = response;
    if (typeof source === 'string') source = _safeParse(source, source);
    if (result.type === 'auto') {
        var responseType = String(_findDeepAny(source, ['type', 'format', 'mime', 'mime_type']) || '').toLowerCase();
        if (responseType.indexOf('m3u8') !== -1 || responseType.indexOf('hls') !== -1) result.type = 'm3u8';
        else if (responseType.indexOf('mp4') !== -1) result.type = 'mp4';
    }
    var referer = _normalizePlayText(_findDeepAny(source, ['referer', 'referrer']));
    var userAgent = _normalizePlayText(_findDeepAny(source, ['user_agent', 'userAgent', 'ua']));

    if (Object.keys(headers).length) result.headers = headers;
    if (referer) result.referer = referer;
    if (userAgent) result.userAgent = userAgent;
    return result;
}



function _lanercStringList(value, fallback) {
    var source = value;
    if (typeof source === 'string') {
        var parsed = _safeParse(source, null);
        if (_legacyIsArray(parsed)) source = parsed;
        else source = String(source).split(',');
    }
    if (!_legacyIsArray(source)) source = fallback || [];
    var result = [];
    for (var index = 0; index < source.length; index += 1) {
        var item = _legacyTrim(source[index]);
        if (item) result.push(item);
    }
    return result;
}



function _lanercDiscoveryMode() {
    var mode = _legacyTrim(_lanercExt.discoveryMode).toLowerCase();
    if (mode === 'dynamic' || mode === 'fixed' || mode === 'auto') return mode;
    if (_lanercExt.dynamicDiscovery !== null && _lanercExt.dynamicDiscovery !== undefined &&
        _lanercExt.dynamicDiscovery !== '') {
        return _lanercBoolean(_lanercExt.dynamicDiscovery, true) ? 'dynamic' : 'fixed';
    }
    return 'auto';
}



function _lanercRandomToken(length) {
    var fixed = _legacyTrim(_lanercExt.discoveryPrefix);
    if (fixed) return fixed.replace(/[^a-z0-9]/gi, '').toLowerCase();
    var size = Number(length || _lanercExt.discoveryPrefixLength || 6);
    if (!isFinite(size) || size < 4 || size > 16) size = 6;
    var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    while (result.length < size) {
        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
}



function _lanercRawJsonGet(url, timeoutMs, extraHeaders) {
    var target = String(url || '');
    try {
        var raw = request(target, _requestOptions(false, timeoutMs, target, extraHeaders));
        var parsed = _safeParse(raw, null);
        if (!parsed || typeof parsed !== 'object') return {};
        return _decodeApiResponse(parsed);
    } catch (error) {
        _lanercLog('动态配置请求失败：' + target + '；' + String(error));
        return {};
    }
}



function _lanercDiscoveryUrls() {
    var supplied = _lanercStringList(_lanercExt.configUrl || _lanercExt.discoveryUrls, []);
    if (supplied.length) return supplied;
    var prefix = _lanercRandomToken();
    var domain = _legacyTrim(_lanercExt.discoveryDomain) || _LANERC_DISCOVERY_DOMAIN;
    var path = (_legacyTrim(_lanercExt.discoveryPath) || _LANERC_DISCOVERY_PATH).replace(/^\/+/, '');
    return [
        'https://' + prefix + '.' + domain + '/' + path,
        'http://' + prefix + '.' + domain + '/' + path,
        _LANERC_DISCOVERY
    ];
}



function _lanercConfigHost(value) {
    var source = value;
    if (typeof source === 'string') {
        var parsed = _safeParse(source, source);
        source = parsed;
    }
    var candidate = typeof source === 'string' ? source : _findDeepAny(source, [
        'domain', 'host', 'api', 'apiHost', 'baseUrl', 'base_url'
    ]);
    var host = _normalizeDiscoveredHost(candidate);
    if (_isStaleLanercHost(host)) return '';
    return host;
}



function _lanercDnsTxtData(response) {
    var answers = response && typeof response === 'object' ? _findDeep(response, 'Answer') : null;
    if (!answers) return '';
    if (!_legacyIsArray(answers)) answers = [answers];
    for (var index = 0; index < answers.length; index += 1) {
        var answer = answers[index];
        var data = answer && typeof answer === 'object' ? answer.data : answer;
        var text = _legacyTrim(data);
        if (!text) continue;
        text = text
            .replace(/^['"]+|['"]+$/g, '')
            .replace(/"\s+"/g, '')
            .replace(/\\"/g, '"')
            .replace(/[^A-Za-z0-9+\/=]/g, '');
        if (text) return text;
    }
    return '';
}



function _discoverLanercDnsHost() {
    var names = _lanercStringList(_lanercExt.dohNames, _LANERC_DOH_NAMES);
    var resolvers = _lanercStringList(_lanercExt.dohResolvers, _LANERC_DOH_RESOLVERS);
    var key = _legacyTrim(_lanercExt.dohKey) || _LANERC_DOH_DECRYPT_KEY;
    var timeout = Number(_lanercExt.dohTimeout || Math.min(_LANERC_PROBE_TIMEOUT_MS, 2200));
    for (var resolverIndex = 0; resolverIndex < resolvers.length; resolverIndex += 1) {
        var base = String(resolvers[resolverIndex] || '').replace(/\/+$/, '') + '/';
        for (var nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
            var url = base + 'resolve?name=' + encodeUri(names[nameIndex]) + '&type=txt';
            var response = _lanercRawJsonGet(url, timeout, { Accept: 'application/dns-json' });
            var ciphertext = _lanercDnsTxtData(response);
            if (!ciphertext) continue;
            var plain = _decryptLanercStandardBase64(ciphertext, key);
            var host = _normalizeDiscoveredHost(plain);
            if (host && !_isStaleLanercHost(host)) {
                _lanercLog('DNS TXT 已恢复 API 地址：' + host);
                return host;
            }
        }
    }
    return '';
}



function _discoverLanercHost() {
    var urls = _lanercDiscoveryUrls();
    for (var index = 0; index < urls.length; index += 1) {
        var discovery = _lanercRawJsonGet(urls[index], _LANERC_PROBE_TIMEOUT_MS, {
            Accept: 'application/json'
        });
        var host = _lanercConfigHost(discovery);
        if (host) {
            _lanercLog('在线配置已发现 API 地址：' + host);
            return host;
        }
    }
    return _discoverLanercDnsHost();
}



function _lanercHealthPath(seconds) {
    var timeValue = seconds === null || seconds === undefined
        ? Math.floor(Number(timestamp()) / 1000)
        : Math.floor(Number(seconds));
    var secret = _legacyTrim(_lanercExt.healthSecret) || _LANERC_HEALTH_SECRET;
    var digest = md5('/app/health@' + timeValue + '@' + secret);
    return 'app/health?sign=' + encodeUri(String(digest).toLowerCase());
}



function _lanercHealthOk(value) {
    var data = _payload(value);
    if (!data || typeof data !== 'object') return false;
    if (data.status === true || String(data.status).toLowerCase() === 'true') return true;
    if (data.ok === true || data.success === true) return true;
    var code = Number(data.code);
    return isFinite(code) && (code === 0 || code === 200);
}



function _lanercHostCandidates(host) {
    var normalized = _normalizeDiscoveredHost(host);
    if (!normalized) return [];
    var result = [];
    if (/^http:\/\//i.test(normalized)) {
        result.push(normalized.replace(/^http:/i, 'https:'));
        if (_lanercAllowHttpFallback()) result.push(normalized);
    } else {
        result.push(normalized);
        if (_lanercAllowHttpFallback()) result.push(normalized.replace(/^https:/i, 'http:'));
    }
    return result;
}



function _probeLanercHost(host) {
    var candidates = _lanercHostCandidates(host);
    for (var index = 0; index < candidates.length; index += 1) {
        var candidate = candidates[index];
        _lanercDirectUsed = false;
        var health = _requestJson(candidate + _lanercHealthPath(), _LANERC_PROBE_TIMEOUT_MS);
        if (_lanercHealthOk(health)) {
            return _lanercDirectUsed ? _lanercDirectHostUrl() : candidate;
        }
        var home = _payload(_requestJson(candidate + 'app/home', _LANERC_PROBE_TIMEOUT_MS));
        if (home && typeof home === 'object' &&
            (_legacyOwn(home, 'vod_list') || _legacyOwn(home, 'banner') || _legacyOwn(home, 'hot_list'))) {
            _lanercHome = home;
            return _lanercDirectUsed ? _lanercDirectHostUrl() : candidate;
        }
    }
    return '';
}



function _resolveHost() {
    if (_lanercHost) return _lanercHost;
    var discoveryMode = _lanercDiscoveryMode();
    _lanercHost = _normalizeHost(_lanercExt.host);
    if (_isLegacyLanercIpHost(_lanercHost) &&
        !_legacyTrim(_lanercExt.apiIp || _lanercExt.directIp)) {
        _lanercLog('忽略旧版 ext.host 直连 IP，恢复 lol.jngaoke.cn 域名/SNI 主链');
        _lanercHost = '';
    }
    if (_lanercHost && !_isStaleLanercHost(_lanercHost) && discoveryMode !== 'dynamic') return _lanercHost;
    if (_lanercHost) {
        _lanercLog((discoveryMode === 'dynamic' ? 'dynamic 模式忽略 ext.host：' :
            '运行器传入旧域名，忽略 ext.host：') + _lanercHost);
        _lanercHost = '';
    }
    if (discoveryMode === 'dynamic') {
        var forcedDynamicHost = _probeLanercHost(_discoverLanercHost());
        if (forcedDynamicHost) {
            _lanercHost = forcedDynamicHost;
            return _lanercHost;
        }
    }

    var fallbackUrl = _LANERC_FALLBACK_HOST + 'app/home';
    var fallbackProbe = _payload(_requestJson(fallbackUrl, _LANERC_PROBE_TIMEOUT_MS));
    if (fallbackProbe && typeof fallbackProbe === 'object' &&
        (_legacyOwn(fallbackProbe, 'vod_list') || _legacyOwn(fallbackProbe, 'banner') || _legacyOwn(fallbackProbe, 'hot_list'))) {
        _lanercHome = fallbackProbe;
        _lanercHost = (_lanercAllowHttpFallback() && _lanercDirectUsed)
            ? _lanercDirectHostUrl() : _LANERC_FALLBACK_HOST;
        return _lanercHost;
    }

    if (_lanercAllowHttpFallback()) {
        var directProbe = _payload(_requestJson(_lanercDirectHostUrl() + 'app/home', _LANERC_PROBE_TIMEOUT_MS));
        if (directProbe && typeof directProbe === 'object' &&
            (_legacyOwn(directProbe, 'vod_list') || _legacyOwn(directProbe, 'banner') || _legacyOwn(directProbe, 'hot_list'))) {
            _lanercHome = directProbe;
            _lanercHost = _lanercDirectHostUrl();
            _lanercLog('已切换显式兼容直连 API 节点：' + _lanercHost);
            return _lanercHost;
        }
    }

    if (discoveryMode !== 'fixed') {
        _lanercLog('静态回退站探测失败，尝试在线域名发现');
        var discoveredHost = _probeLanercHost(_discoverLanercHost());
        _lanercHost = discoveredHost;
    }
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
    var cleanPath = String(path || '').replace(/^\/+/, '');
    var signed = cleanPath === _LANERC_GUEST_CAPTCHA_PATH ||
        cleanPath === _LANERC_GUEST_CREDENTIAL_PATH;
    var requestPath = signed ? _lanercSignedApiPath(cleanPath) : cleanPath;
    return _postJson(_resolveHost() + requestPath, body, signed ? 'guestJson' : '');
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
    var configPath = _legacyTrim(_lanercExt.runtimeConfigPath) || _LANERC_RUNTIME_CONFIG_PATH;
    var data = _apiGet(configPath);
    _lanercRuntime = {
        sign: String(_findDeep(data, 'sign') || ''),
        auth: String(_findDeep(data, 'auth') || '')
    };
    return _lanercRuntime;
}



function _runtimeValues(flagData) {
    var flag = flagData && typeof flagData === 'object' ? flagData : {};
    var sign = _firstValue(flag, ['sign']);
    if (sign === '') sign = _firstValue(_lanercExt, ['sign']);
    var auth = _firstValue(flag, ['auth']);
    if (auth === '') auth = _firstValue(_lanercExt, ['auth']);
    if (sign !== '' && auth !== '') return { sign: String(sign), auth: String(auth) };
    var config = _loadRuntimeConfig();
    if (sign === '') sign = config.sign;
    if (sign === '') sign = _LANERC_BUILD_SIGNATURE;
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
        var objectVid = _firstValue(value, [
            'resource_id', 'resourceId', 'vid', 'video_id', 'videoId',
            'episode_id', 'episodeId', 'id', 'url', 'value'
        ]);
        return {
            name: String(_firstValue(value, ['name', 'title']) || fallbackName || ''),
            vid: String(objectVid || ''),
            raw: String(_firstValue(value, [
                'raw', 'url', 'resource_id', 'resourceId', 'vid', 'video_id',
                'videoId', 'episode_id', 'episodeId', 'id', 'value'
            ]) || ''),
            resourceId: String(_firstValue(value, ['resource_id', 'resourceId']) || ''),
            canPlayWithoutLogin: _lanercBoolean(
                _firstValue(value, ['can_play_without_login', 'canPlayWithoutLogin']), true
            )
        };
    }
    var raw = value === null || value === undefined ? '' : String(value);
    var parts = raw.split('$');
    var videoValue = parts.length > 1 ? parts[parts.length - 1] : raw;
    for (var partIndex = 1; partIndex < parts.length; partIndex += 1) {
        if (/^https?:\/\//i.test(_legacyTrim(parts[partIndex]))) {
            videoValue = parts[partIndex];
            break;
        }
    }
    return {
        name: String(parts[0] || fallbackName || ''),
        vid: String(videoValue || ''),
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



function _episodes(playList, runtime, contentId) {
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
            if (part.resourceId) {
                flag.resourceId = part.resourceId;
                flag.canPlayWithoutLogin = part.canPlayWithoutLogin;
                var knownLegacy = _LANERC_LEGACY_MEDIA_BY_CONTENT[String(contentId || '')];
                if (_legacyIsArray(knownLegacy) && knownLegacy[videoIndex]) {
                    flag.legacyVid = String(knownLegacy[videoIndex]);
                }
            }
            result.push({ name: part.name, url: JSON.stringify(flag), route: lineName });
        }
    }
    return result;
}



function detail(id) {
    var contentId = id === null || id === undefined ? '' : String(id);
    try {
        var data = _payload(_apiGet(_LANERC_V2_DETAIL_PATH + encodeUri(contentId)));
        var usedV2 = !!(data && typeof data === 'object' &&
            (data.video_play_info || data.video_play_list));
        if (!data || typeof data !== 'object' ||
            (!data.video_play_info && !data.video_play_list)) {
            data = _payload(_apiGet('app/getvod/' + encodeUri(contentId)));
        }
        var info = data.video_play_info && typeof data.video_play_info === 'object' ? data.video_play_info : data;
        var runtime = usedV2 ? { sign: '', auth: '' } : _runtimeValues({});
        
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
            episodes: _episodes(data.video_play_list, runtime, contentId)
        });
    } catch (error) {
        _lanercLog('详情转换失败：' + String(error));
        return JSON.stringify({ id: contentId, name: '', pic: '', desc: '', episodes: [] });
    }
}



function _resolveContentClass(contentId) {
    if (_lanercLastDetail && String(_lanercLastDetail.id) === contentId) return _lanercLastDetail.classId;
    var data = _payload(_apiGet(_LANERC_V2_DETAIL_PATH + encodeUri(contentId)));
    if (!data || typeof data !== 'object' || !data.video_play_info) {
        data = _payload(_apiGet('app/getvod/' + encodeUri(contentId)));
    }
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



function _shouldBlockLanercWarningPlaylist() {
    var value = _lanercExt.blockWarningPlaylist;
    if (value === null || value === undefined || value === '') return _LANERC_BLOCK_WARNING_PLAYLIST;
    return value === true || value === 1 || String(value).toLowerCase() === 'true';
}



function _inspectLanercPlaylist(url, headers) {
    var value = String(url || '');
    if (!/^https?:\/\//i.test(value)) return -1;
    if (!/\.m3u8(?:$|[?#])/i.test(value)) return 0;
    try {
        var playlist = String(request(
            value,
            _requestOptions(false, _LANERC_WARNING_PLAYLIST_TIMEOUT_MS, value, headers)
        ) || '');
        if (!/^#EXTM3U/m.test(playlist)) return -1;
        var pattern = /#EXTINF:\s*([0-9]+(?:\.[0-9]+)?)/ig;
        var count = 0;
        var duration = 0;
        var matched;
        while ((matched = pattern.exec(playlist)) !== null) {
            count += 1;
            duration += Number(matched[1]);
        }
        var lines = playlist.split(/\r?\n/);
        var segmentCount = 0;
        var disguisedSegmentCount = 0;
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            var line = _legacyTrim(lines[lineIndex]);
            if (!line || line.charAt(0) === '#') continue;
            segmentCount += 1;
            if (/\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i.test(line)) disguisedSegmentCount += 1;
        }
        if (segmentCount < 1) return -1;
        if (count >= 10 && duration >= 179 && duration <= 181) return 1;
        if (count >= 10 && duration >= 239 && duration <= 241 && disguisedSegmentCount > 0) return 1;
        if (count === 144 && segmentCount === 144 && disguisedSegmentCount === 144 &&
            duration >= 1199 && duration <= 1201) return 1;
        if (count === 173 && segmentCount === 173 && disguisedSegmentCount === 173 &&
            duration >= 1439 && duration <= 1441) return 1;
        return 0;
    } catch (error) {
        _lanercLog('防盗提示片检测失败：' + String(error));
        return -1;
    }
}



function _lanercOfficialMediaCandidates(vid) {
    var episodeId = _legacyTrim(vid).toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(episodeId)) return [];
    var hosts = _lanercStringList(_lanercExt.officialMediaHosts, _LANERC_OFFICIAL_MEDIA_HOSTS);
    var buckets = _lanercStringList(_lanercExt.officialMediaBuckets, _LANERC_OFFICIAL_MEDIA_BUCKETS);
    var list = [];
    for (var hostIndex = 0; hostIndex < hosts.length; hostIndex += 1) {
        var host = _legacyTrim(hosts[hostIndex]).replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(host)) continue;
        for (var bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
            var bucket = _legacyTrim(buckets[bucketIndex]).replace(/^\/+|\/+$/g, '');
            if (!bucket) continue;
            list.push(host + '/' + bucket + '/' + episodeId + '.m3u8');
        }
    }
    return list;
}



function _resolveLanercOfficialMedia(vid) {
    var candidates = _lanercOfficialMediaCandidates(vid);
    for (var index = 0; index < candidates.length; index += 1) {
        var url = candidates[index];
        if (_inspectLanercPlaylist(url, {}) === 0) {
            if (index > 0) _lanercLog('官方正片命中备用镜像：' + url);
            return url;
        }
    }
    return '';
}



function _isLanercWarningPlaylist(url, headers) {
    return _inspectLanercPlaylist(url, headers) === 1;
}



function _lanercPlayError(message, needBind) {
    var text = String(message || '未获取到播放地址');
    return JSON.stringify({
        url: '',
        type: 'auto',
        error: text,
        _server_msg: text,
        needBind: needBind === true
    });
}



function _resolveLanercPlay(body, forcedMode) {
    var resolverMode = _legacyTrim(forcedMode || _lanercExt.playResolver || _lanercExt.resolver || _LANERC_PLAY_RESOLVER).toLowerCase();
    if (resolverMode !== 'x3x' && resolverMode !== 'x4x' && resolverMode !== 'auto') resolverMode = 'auto';
    var useProtobuf = resolverMode !== 'x3x' &&
        _lanercBoolean(_lanercExt.playResolveProtobuf, true);
    if (useProtobuf) {
        try {
            var protobuf = _postLanercProtobuf(
                _resolveHost() + _lanercSignedApiPath(_LANERC_PLAY_RESOLVE_PATH), body
            );
            var protobufUrl = _playUrlFromProtobufResponse(protobuf);
            if (protobufUrl) {
                return {
                    url: protobufUrl,
                    response: { play_url: protobufUrl, resolver: 'proxyx4x' },
                    resolver: 'proxyx4x'
                };
            }
            _lanercLog('proxyx4x 未解出服务端 playUrl，不降级旧 proxyx3x');
        } catch (protobufError) {
            _lanercLog('proxyx4x 解码失败，不降级旧 proxyx3x：' + String(protobufError));
        }
        return { url: '', response: {}, resolver: 'proxyx4x' };
    }
    var response = _apiPost(_lanercSignedApiPath('app/proxyx3x'), body);
    return {
        url: _playUrlFromResponse(response),
        response: response,
        resolver: 'proxyx3x'
    };
}


function play(flag) {
    try {
        var parsed = _safeParse(flag, null);
        var flagData = parsed && typeof parsed === 'object' && !_legacyIsArray(parsed) ? parsed : {};
        var rawFlag = flag === null || flag === undefined ? '' : String(flag);
        var resourceId = _firstValue(flagData, ['resource_id', 'resourceId']);
        if (resourceId !== '') resourceId = _normalizePlayText(resourceId);
        if (resourceId) {
            var v2Response = _postLanercV2Play(resourceId);
            var v2Url = _playUrlFromProtobufResponse(v2Response);
            if (v2Url) {
                var v2Result = _playResult({ resolver: 'v2' }, v2Url);
                if (_shouldBlockLanercWarningPlaylist() &&
                    _inspectLanercPlaylist(v2Url, v2Result.headers || {}) === 1) {
                    return _lanercPlayError('检测到升级提示片，当前线路不可播放');
                }
                return JSON.stringify(v2Result);
            }
            var guestRecord = _lanercGuestCredentialRecord(flagData);
            if (guestRecord.error) return _lanercPlayError(guestRecord.error);
            if (guestRecord.credential) {
                var guestResponse = _postLanercGuestPlay(resourceId, guestRecord);
                var guestUrl = _playUrlFromProtobufResponse(guestResponse);
                if (guestUrl) {
                    var guestResult = _playResult({ resolver: 'guest-v2' }, guestUrl);
                    if (_shouldBlockLanercWarningPlaylist() &&
                        _inspectLanercPlaylist(guestUrl, guestResult.headers || {}) === 1) {
                        return _lanercPlayError('检测到升级提示片，当前游客线路不可播放');
                    }
                    return JSON.stringify(guestResult);
                }
            }
            var legacyVid = _normalizePlayText(_firstValue(flagData, ['legacyVid', 'legacy_vid']));
            if (legacyVid) {
                var legacyUrl = _resolveLanercOfficialMedia(legacyVid);
                if (legacyUrl) {
                    _lanercLog('v2 登录门槛命中已验证旧媒体映射：' + legacyUrl);
                    return JSON.stringify({ url: legacyUrl, type: 'm3u8' });
                }
            }
            if (_lanercBoolean(_firstValue(flagData, ['canPlayWithoutLogin', 'can_play_without_login']), true) === false) {
                if (guestRecord.credential) {
                    return _lanercPlayError('游客设备凭证无效或已失效，请在自己的设备重新完成官方 App 游客验证', true);
                }
                return _lanercPlayError('该剧集需要游客设备凭证，请在自己的设备完成官方 App 游客验证后配置 guestCredential', true);
            }
            return _lanercPlayError('新版播放接口未返回媒体地址');
        }
        var vid = _firstValue(flagData, [
            'vid', 'video_id', 'videoId', 'episode_id', 'episodeId', 'play_url', 'playUrl', 'url'
        ]);
        if (vid === '') {
            vid = rawFlag;
            if (!parsed && rawFlag.indexOf('$') !== -1) vid = _episodePart(rawFlag, '').vid;
        }
        vid = _normalizePlayText(vid);
        if (vid.indexOf('$') !== -1 && !/^https?:\/\//i.test(vid)) {
            vid = _episodePart(vid, '').vid;
        }
        if (/^https?:\/\/[^\s]+\.(?:m3u8|mp4|flv)(?:$|[?#])/i.test(vid)) {
            if (_shouldBlockLanercWarningPlaylist() && /\.m3u8(?:$|[?#])/i.test(vid)) {
                var directState = _inspectLanercPlaylist(vid, {});
                if (directState === 1) return _lanercPlayError('检测到防盗提示片，当前线路不可播放');
            }
            return JSON.stringify({ url: vid, type: _mediaType(vid) });
        }
        var requestedResolver = _legacyTrim(_lanercExt.playResolver || _lanercExt.resolver || _LANERC_PLAY_RESOLVER).toLowerCase();
        var officialOnly = requestedResolver === 'official' || requestedResolver === 'direct' || requestedResolver === 'media';
        if (requestedResolver !== 'x3x' && requestedResolver !== 'x4x' && requestedResolver !== 'auto' && !officialOnly) {
            requestedResolver = 'auto';
        }
        if (officialOnly) {
            var officialOnlyUrl = _resolveLanercOfficialMedia(vid);
            if (officialOnlyUrl) return JSON.stringify({ url: officialOnlyUrl, type: 'm3u8' });
            return _lanercPlayError('官方正片镜像暂不可用');
        }
        if (requestedResolver === 'auto') {
            var officialUrl = _resolveLanercOfficialMedia(vid);
            if (officialUrl) return JSON.stringify({ url: officialUrl, type: 'm3u8' });
        }
        var runtime = _runtimeValues(flagData);
        var body = {
            vid: String(vid || ''),
            player: String(_firstValue(flagData, ['player']) || ''),
            sign: runtime.sign,
            auth: runtime.auth
        };
        if (!body.vid) return _lanercPlayError('缺少剧集播放标识');
        var resolved = _resolveLanercPlay(body,
            requestedResolver === 'x3x' || requestedResolver === 'x4x' ? requestedResolver : 'auto');
        var response = resolved.response;
        var playUrl = resolved.url;
        if (!playUrl) return _lanercPlayError('播放接口未返回媒体地址');
        var result = _playResult(response, playUrl);
        var playlistState = _shouldBlockLanercWarningPlaylist()
            ? _inspectLanercPlaylist(playUrl, result.headers || {}) : 0;
        if (_shouldBlockLanercWarningPlaylist() && playlistState === 1) {
            _lanercLog('检测到防盗提示片（' + resolved.resolver + '），重新签名请求一次');
            if (playlistState === 1) return _lanercPlayError('检测到防盗提示片，当前线路不可播放');
        }
        return JSON.stringify(result);
    } catch (error) {
        _lanercLog('播放解析失败：' + String(error));
        return _lanercPlayError('播放解析失败：' + String(error));
    }
}


// ───────────────────────────── 源自带弹幕（barragev2）─────────────────────────────
// 依据 lanerc 1.08 逆向 + 真机 replay 核对：GET app/chat/barragev2?vid=<内容id>&vod=<集号(1基)>，
// 返回 code=201 的 AES 密文（_apiGet 里 _decodeApiResponse 已自动解密），明文 { new_barrages, old_barrages }。
// 单条 { id, bcolor:"#AARRGGBB", position:0滚动/1顶部, second:秒, content:文本 }。
// 已用 6703 实测确认：vid=内容 id（= detail 存的 _lanercLastDetail.id）、vod=集号(=episode+1，vod=1/2 返回不同集)、
// second=秒。App 契约只认 [{time(秒),text,color?}]，position(顶/滚) 当前无处安放，先忽略。


function _lanercDanmuContentId(payload) {
    if (_lanercLastDetail && _lanercLastDetail.id) return String(_lanercLastDetail.id);
    var title = _legacyTrim(payload && payload.title);
    if (!title) return '';
    try {
        var cards = _safeParse(search(title, 1), []);
        if (_legacyIsArray(cards) && cards.length) return String(cards[0].id || '');
    } catch (error) {
        _lanercLog('弹幕定位内容 id 失败：' + String(error));
    }
    return '';
}


function _lanercDanmuColor(value) {
    if (value === null || value === undefined || value === '') return 16777215;
    var text = String(value).replace(/^#/, '');
    if (/^[0-9a-f]{8}$/i.test(text)) return parseInt(text.slice(2), 16); // "#AARRGGBB"：丢 alpha 取 RGB
    if (/^[0-9a-f]{6}$/i.test(text)) return parseInt(text, 16);
    var num = Number(text);
    return isFinite(num) && num > 0 ? Math.floor(num) : 16777215;
}


function _lanercDanmuList(data) {
    var out = [];
    var groups = [data.new_barrages, data.old_barrages];
    for (var g = 0; g < groups.length; g += 1) {
        var list = groups[g];
        if (typeof list === 'string') list = _safeParse(list, []);
        if (!_legacyIsArray(list)) continue;
        for (var i = 0; i < list.length; i += 1) {
            var item = list[i] || {};
            var rawTime = _firstValue(item, ['second', 'time_point', 'time', 'sec', 'offset']);
            if (rawTime === '') continue;
            var time = Number(rawTime);
            if (!isFinite(time) || time < 0) continue;
            var text = _legacyTrim(_firstValue(item, ['content', 'text', 'msg']));
            if (!text) continue;
            out.push({
                time: time,
                text: text,
                color: _lanercDanmuColor(_firstValue(item, ['bcolor', 'color']))
            });
        }
    }
    return out;
}


function danmu(payloadJson) {
    try {
        var payload = _safeParse(payloadJson, {}) || {};
        var contentId = _lanercDanmuContentId(payload);
        if (!contentId) return '[]';
        var episodeNo = Math.floor(Number(payload.episode));
        if (!isFinite(episodeNo) || episodeNo < 0) episodeNo = 0;
        var vod = episodeNo + 1;
        var data = _payload(_apiGet(
            'app/chat/barragev2?vid=' + encodeUri(contentId) + '&vod=' + encodeUri(String(vod))
        ));
        if (!data || typeof data !== 'object') return '[]';
        return JSON.stringify(_lanercDanmuList(data));
    } catch (error) {
        _lanercLog('弹幕获取失败：' + String(error));
        return '[]';
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

