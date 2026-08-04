// @key com.lanerc.gugu
// @label 囧源·咕咕剧场
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧源·咕咕剧场 内容源（EasyBangumi / 纯纯看番 扩展）
// 适配自 LANERC 系站点脚本，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {"url":"https://www.gugu3.com"};
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

/*
 * 咕咕｜动漫（gugu） JS 源
 * 还原自 TVBox csp_AppGet（com.github.catvod.spider.AppGet）。
 * version: 1.0.0
 *
 * 协议要点（逐段对照 AppGet.java / merge.m.a 加解密 / merge.k.b·k.c HTTP）：
 *   1) 所有业务接口都是 POST {BASE}/api.php{path}，body = 明文 JSON / 表单串，
 *      Content-Type 用 application/x-www-form-urlencoded（gugu 后端 JSON 与表单均可，统一走表单）。
 *      请求头额外带：app-user-device-id / app-version-code / app-api-verify-time / app-ui-mode。
 *   2) 响应是 {code,data,...}，其中 data 是 base64 密文：AES/CBC/PKCS7(dataKey,dataIv) 解开即明文 JSON。
 *   3) 播放地址 url 在详情里是「AES/CBC/PKCS5 加密 → base64」后塞进 parse_api 串，
 *      播放时按 playerContent 树解析；最常见路线是带 app-api-verify-sign 的 vodParse。
 *
 * 本源 dataKey == dataIv == 'nKfZ8KX6JTNWRzTD'（16B AES-128），BASE = https://www.gugu3.com。
 * 实测分类：0=全部 / 6=番剧 / 21=剧场版 / 23=特摄。
 * TVBox 配置里没有 deviceId/version/ua/token，所以这些头按原样发空串。
 */

// ─────────────────────────────────────────────── 配置（ext 覆盖，否则用内置默认）
var EXT       = (typeof ext !== 'undefined' && ext) ? ext : {};
var BASE      = (EXT.url || 'https://www.gugu3.com').replace(/\/+$/, '');
var DATA_KEY  = EXT.dataKey || 'nKfZ8KX6JTNWRzTD';
var DATA_IV   = EXT.dataIv  || 'nKfZ8KX6JTNWRzTD';
var DEVICE_ID = EXT.deviceId || '';
var VERSION   = EXT.version  || '';
var TOKEN     = EXT.token    || '';
var UA_API    = EXT.ua || 'okhttp/3.14.9';
var UA_WEB    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
var TIMEOUT   = 20000;

// AES/CBC：解密=base64→utf8，加密=utf8→base64（均默认）。PKCS7 在 JCE 里同 PKCS5。iv 即 key。
var AES = { mode: 'CBC', padding: 'PKCS7', keyFormat: 'utf8', ivFormat: 'utf8', iv: DATA_IV };

// ─────────────────────────────────────────────── 运行期缓存（懒加载）
var HOME_DONE   = false;
var TYPES       = [];     // [{id, name, filters}] 分类 tab（不含「全部」）
var RECOMMEND   = [];     // initV119 的 recommend_list（gugu 通常为空，banner_list 才有）
var BANNER      = [];     // initV119 的 banner_list（首页轮播位）
var ALL_ID      = '0';    // 「全部」分类 id，用作「推荐」默认 + 首页最新行

// 服务端筛选维度 → 中文标签（还原 AppGet.createFilterItem）。
var FILTER_LABEL = { 'class': '类型', 'area': '地区', 'lang': '语言', 'year': '年份', 'sort': '排序' };
var FILTER_KEYS  = ['class', 'area', 'lang', 'year', 'sort'];

// ─────────────────────────────────────────────── 工具
function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
function nowSec() { return Math.floor(new Date().getTime() / 1000); }
function stripTags(s) { return s ? String(s).replace(/<[^>]+>/g, '') : ''; }

function decData(b64) {
    var s = trim(b64);
    if (!s) return '';
    try { return crypto.aes.decrypt(s, DATA_KEY, AES); } catch (e) { return ''; }
}
function encUrl(plain) {
    try { return crypto.aes.encrypt(plain == null ? '' : String(plain), DATA_KEY, AES); } catch (e) { return ''; }
}

function decodeEntities(s) {
    if (!s) return '';
    s = String(s)
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&#0?39;/g, "'")
        .replace(/&ldquo;/gi, '\u201c').replace(/&rdquo;/gi, '\u201d')
        .replace(/&lsquo;/gi, '\u2018').replace(/&rsquo;/gi, '\u2019')
        .replace(/&middot;/gi, '\u00b7').replace(/&mdash;/gi, '\u2014').replace(/&hellip;/gi, '\u2026');
    s = s.replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { try { return String.fromCharCode(parseInt(h, 16)); } catch (e) { return m; } });
    s = s.replace(/&#(\d+);/g, function (m, d) { try { return String.fromCharCode(parseInt(d, 10)); } catch (e) { return m; } });
    return s;
}
function limitCats(s, n) {
    if (!s) return '';
    var parts = String(s).split(/[\s,，、\/\uff0f|\uff5c\u00b7]+/);
    var out = [], max = n || 2;
    for (var i = 0; i < parts.length && out.length < max; i++) { var p = trim(parts[i]); if (p) out.push(p); }
    return out.join(' ');
}
function guessType(u) {
    var l = (u || '').toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0)  return 'mp4';
    return 'auto';
}

// ─────────────────────────────────────────────── HTTP（POST 表单串，响应 data 解密）
function apiHeaders() {
    var h = {
        'User-Agent': UA_API,
        'Content-Type': 'application/x-www-form-urlencoded',
        'app-user-device-id': DEVICE_ID,
        'app-version-code': VERSION,
        'app-api-verify-time': '' + nowSec(),
        'app-ui-mode': 'light'
    };
    if (TOKEN) h['app-user-token'] = TOKEN;
    return h;
}

// 把对象序列化成 application/x-www-form-urlencoded 表单串。
function toForm(obj) {
    var parts = [];
    for (var k in obj) { if (obj.hasOwnProperty(k)) parts.push(encodeUri(k) + '=' + encodeUri(obj[k] == null ? '' : String(obj[k]))); }
    return parts.join('&');
}

// POST {BASE}/api.php{path}（path 可带 ?query），body = 表单串；返回解密后的明文 JSON 串。
function apiPost(path, params) {
    try {
        var body = (typeof params === 'string') ? params : toForm(params || {});
        var resp = post(BASE + '/api.php' + path, body, JSON.stringify({ headers: apiHeaders(), timeout: TIMEOUT }));
        var rj = parseJson(resp) || {};
        var data = rj.data || '';
        if (!data) { log('[gugu] empty data: ' + path); return ''; }
        return decData(data);
    } catch (e) { log('[gugu] apiPost err ' + path + ': ' + e); return ''; }
}

// ─────────────────────────────────────────────── 数据映射
function toItem(v) {
    return {
        id: (v.vod_id == null) ? '' : String(v.vod_id),
        name: decodeEntities(v.vod_name || ''),
        pic: v.vod_pic || '',
        type: limitCats(v.vod_class || v.type_name || '', 2),
        year: v.vod_year || '',
        remarks: decodeEntities(v.vod_remarks || ''),
        desc: ''
    };
}
function mapList(arr) {
    var out = [];
    if (!arr) return out;
    for (var i = 0; i < arr.length; i++) { if (arr[i] && arr[i].vod_id != null) out.push(toItem(arr[i])); }
    return out;
}

// 把 initV119 里某分类的 filter_type_list 转成 TVBox 数组式筛选：
//   [{key, name, value:[{n,v}, ...]}]；class/area/lang/year 的「全部」提交空值；sort 无「全部」时补一个「默认」(空值)。
function buildFilters(filterTypeList) {
    var out = [];
    if (!filterTypeList) return out;
    for (var i = 0; i < filterTypeList.length; i++) {
        var f = filterTypeList[i] || {};
        var name = f.name || '';
        if (!FILTER_LABEL[name]) continue;      // 只收已知维度
        var lst = f.list || [];
        var values = [], hasReset = false;
        for (var j = 0; j < lst.length; j++) {
            var opt = trim(lst[j]);
            if (!opt) continue;
            var v = (opt === '全部') ? '' : opt;
            if (v === '') hasReset = true;
            values.push({ n: opt, v: v });
        }
        if (!values.length) continue;
        if (!hasReset) values.unshift({ n: '默认', v: '' });   // 给 sort 这类没「全部」的维度补中性默认项
        out.push({ key: name, name: FILTER_LABEL[name], value: values });
    }
    return out;
}

// ─────────────────────────────────────────────── 初始化（initV119：分类 + 筛选 + 推荐 + 轮播）
function ensureHome() {
    if (HOME_DONE) return;
    try {
        var hj = parseJson(apiPost('/getappapi.index/initV119', '')) || {};
        var tl = hj.type_list || [];
        // 服务器限流 / 网络失败导致 initV119 拿不到数据时，type_list 为空：
        // 此时不置位 HOME_DONE，让下一次 categories()/homeSections()/search() 自动重试。
        // 修复：之前在请求“之前”就 HOME_DONE=true，首请求被高防 RST 后整个会话分类永久为空，
        //       用户换 IP 也不会刷新（引擎状态卡住，除非重启 App 重载脚本）。
        if (!tl.length) return;
        RECOMMEND = mapList(hj.recommend_list);
        BANNER    = mapList(hj.banner_list);
        for (var i = 0; i < tl.length; i++) {
            var t = tl[i];
            var name = t.type_name || '';
            // 跟随原 App 过滤掉广告/敏感分类
            if (name.indexOf('正版QQ群') >= 0 || name === '伦理' || name === '福利' || name === '小影院') continue;
            var id = (t.type_id == null) ? '' : String(t.type_id);
            if (!id) continue;
            // 「全部」(type_id=0) 不单列 tab —— 「推荐」已映射到它
            if (id === '0' || name === '全部') { ALL_ID = id; continue; }
            TYPES.push({ id: id, name: name || ('分类' + id), filters: buildFilters(t.filter_type_list) });
        }
        HOME_DONE = true;
    } catch (e) { log('[gugu] ensureHome err: ' + e); }
}

function isTypeId(key) {
    ensureHome();
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === key) return true;
    return false;
}

// 分类筛选页（typeFilterVodList）。extra = 选中的 {class/area/lang/year/sort}（仅非空项提交，服务端筛选）。
function typeFilter(typeId, page, extra) {
    var p = page || 1;
    var body = { type_id: String(typeId), page: String(p) };
    if (extra) {
        for (var i = 0; i < FILTER_KEYS.length; i++) {
            var k = FILTER_KEYS[i], v = extra[k];
            if (v != null && String(v) !== '') body[k] = String(v);
        }
    }
    var rj = parseJson(apiPost('/getappapi.index/typeFilterVodList?page=' + p, body)) || {};
    return mapList(rj.recommend_list);
}

// ─────────────────────────────────────────────── 契约入口
function categories() {
    ensureHome();
    var out = [{ key: '', title: '推荐' }];
    for (var i = 0; i < TYPES.length; i++) {
        var t = TYPES[i], c = { key: t.id, title: t.name };
        if (t.filters && t.filters.length) c.filters = t.filters;   // 服务端筛选（类型/地区/语言/年份/排序）
        out.push(c);
    }
    return JSON.stringify(out);
}

function homeSections() {
    ensureHome();
    var out = [];
    // 优先用轮播位/推荐位当热门，二者皆空时退回「全部」最新一行
    var firstItems = BANNER.length ? BANNER : (RECOMMEND.length ? RECOMMEND : typeFilter(ALL_ID, 1));
    if (firstItems.length) out.push({ title: '热门推荐', key: '', items: firstItems.slice(0, 12) });
    var rows = Math.min(TYPES.length, 4);
    for (var i = 0; i < rows; i++) {
        try {
            var items = typeFilter(TYPES[i].id, 1);
            if (items.length) out.push({ title: TYPES[i].name, key: TYPES[i].id, items: items.slice(0, 12) });
        } catch (e) { log('[gugu] home row err: ' + e); }
    }
    return JSON.stringify(out);
}

// search 同时承担分类浏览与关键词搜索：
//   空 key → 「全部」分类；纯数字且命中 type_id → 分类页；否则关键词搜索。
function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword || '');
    ensureHome();
    if (!key) return JSON.stringify(typeFilter(ALL_ID, page));
    if (/^\d+$/.test(key) && isTypeId(key)) return JSON.stringify(typeFilter(key, page));
    var rj = parseJson(apiPost('/getappapi.index/searchList', { type_id: 0, keywords: key, page: page })) || {};
    return JSON.stringify(mapList(rj.search_list));
}

// 选了筛选条 → 直接走服务端 typeFilterVodList（class/area/lang/year/sort）。
function searchFiltered(category, filtersJson, page) {
    ensureHome();
    var f = parseJson(filtersJson) || {};
    // 非分类 tab（如「推荐」空 key 或关键词）→ 退回普通逻辑
    if (!(category && /^\d+$/.test(category) && isTypeId(category))) return search(category, page);
    return JSON.stringify(typeFilter(category, page, f));
}

function detail(id) {
    var out = { id: id, name: '', pic: '', type: '', year: '', remarks: '', desc: '', episodes: [] };
    try {
        var dj = parseJson(apiPost('/getappapi.index/vodDetail', { vod_id: String(id) })) || {};
        var d = dj.vod || {};
        out.name    = decodeEntities(d.vod_name || '');
        out.pic     = d.vod_pic || '';
        out.type    = limitCats(d.vod_class || '', 2);
        out.year    = d.vod_year || '';
        out.remarks = decodeEntities(d.vod_remarks || '');
        out.desc    = trim(decodeEntities(stripTags(d.vod_content || '')));

        var lines = dj.vod_play_list || [];
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i] || {};
            var pinfo = ln.player_info || {};
            var show = (pinfo.show || ('线路' + (i + 1)));
            var parse = pinfo.parse || '';
            var urls = ln.urls || [];
            for (var j = 0; j < urls.length; j++) {
                var ep = urls[j] || {};
                // flag 塞够 play() 所需：parse_api_url / parse / 集url / token
                var flag = JSON.stringify({
                    p: ep.parse_api_url || '',
                    parse: parse,
                    u: ep.url || '',
                    t: ep.token || '',
                    nid: ep.nid || ''
                });
                out.episodes.push({ name: ep.name || ('' + (j + 1)), url: flag, route: show });
            }
        }
    } catch (e) { log('[gugu] detail err: ' + e); }
    return JSON.stringify(out);
}

// edu：把 url=...&token 之间的值做 url 编码（base64 里有 +//= 需转义，否则被表单解析破坏）。
function edu(s) {
    return String(s).replace(/(url=)([\s\S]*?)(?=&token)/, function (m, a, b) { return a + encodeUri(b); });
}
// eduAesDecode：把 &url=<密文> 解回明文（playerContent 第 3 分支用）。
function eduAesDecode(s) {
    return String(s).replace(/(&url=)([\s\S]*?)(?=&token)/, function (m, a, b) {
        var d = '';
        try { d = crypto.aes.decrypt(b, DATA_KEY, AES); } catch (e) { d = b; }
        return a + (d || b);
    });
}

// vodParse：带 app-api-verify-sign 的 POST，响应 data 解密后取 .json.url（还原 AppGet.c）。
function vodParse(bodyStr) {
    try {
        var ts = '' + nowSec();
        var h = {
            'User-Agent': UA_API,
            'Connection': 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'app-version-code': VERSION,
            'app-ui-mode': 'light',
            'app-user-device-id': DEVICE_ID,
            'app-api-verify-time': ts,
            'app-api-verify-sign': encUrl(ts)
        };
        if (TOKEN) h['app-user-token'] = TOKEN;
        var resp = post(BASE + '/api.php/getappapi.index/vodParse', bodyStr, JSON.stringify({ headers: h, timeout: TIMEOUT }));
        var dec = decData((parseJson(resp) || {}).data || '');
        var obj = parseJson(dec) || {};
        var jf = obj.json;
        if (typeof jf === 'string') { var jo = parseJson(jf) || {}; return jo.url || ''; }
        if (jf && jf.url) return jf.url;
        return obj.url || '';
    } catch (e) { log('[gugu] vodParse err: ' + e); return ''; }
}

function playResult(url, ua) {
    return JSON.stringify({ url: url, type: guessType(url), referer: '', headers: JSON.stringify({ 'User-Agent': ua || UA_WEB }) });
}

function play(flag) {
    var empty = JSON.stringify({ url: '', type: 'auto', referer: '' });
    try {
        var f = parseJson(flag) || {};
        var p = f.p || '', parse = f.parse || '', u = f.u || '', t = f.t || '';

        // 构造 strEduAesDecode：parse_api_url 是 http 直接用；否则拼 parse_api=...&url=<enc>&token=
        var s = /^https?:/i.test(p) ? p : ('parse_api=' + parse + '&url=' + encUrl(u) + '&token=' + t);

        // 1) http 解析地址且带 ?url=/?key=：GET 取 .url（明文 JSON 或正则）
        if (/^https?:/i.test(s) && (s.indexOf('?url=') >= 0 || s.indexOf('?key=') >= 0)) {
            var body = trim(request(s, JSON.stringify({ headers: { 'User-Agent': UA_WEB }, timeout: TIMEOUT })));
            var real = '';
            if (body.charAt(0) === '{') real = (parseJson(body) || {}).url || '';
            else { var m = body.match(/"url"\s*:\s*"([^"]+)"/); if (m) real = m[1]; }
            if (real) return playResult(real, UA_WEB);
        }
        // 2) 本身就是直链媒体
        if (/(m3u8|mp4|mkv)/i.test(s)) return playResult(s, UA_API);
        // 3) parse_api html / ?url= / ?key=：解回明文后 GET (parse + url) 取 .data.url
        if (s.indexOf('?url=') >= 0 || s.indexOf('?key=') >= 0 || s.indexOf('html') >= 0) {
            var s2 = eduAesDecode(s);
            var mm = s2.match(/parse_api=([\s\S]*?)(?=&token)/);
            if (mm) {
                var resp = request(mm[1], JSON.stringify({ headers: { 'User-Agent': UA_WEB }, timeout: TIMEOUT }));
                var dj = parseJson(resp) || {};
                var real2 = (dj.data && dj.data.url) || dj.url || '';
                if (real2) return playResult(real2, UA_WEB);
            }
        }
        // 4) 兜底：vodParse（最常见的非直链路线）
        var real3 = vodParse(edu(s));
        if (real3) return playResult(real3, UA_WEB);

        log('[gugu] play unresolved, s=' + s.substring(0, 120));
    } catch (e) { log('[gugu] play err: ' + e); }
    return empty;
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

