// @key com.lanerc.jinpai
// @label 囧源·金牌
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧源·金牌 内容源（EasyBangumi / 纯纯看番 扩展）
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

/*
 * 金牌 APP 源（金牌影视 / api=csp_Jpys）——【仅动漫，保留首页】
 * 原型：TVBox spider csp_Jpys（com.github.catvod.spider.Jpys），新 /api/mw-movie/ 接口。
 * 对齐同仓库实测版 admin/sources/jinpai.js（2026-06-13 实测）：首页写法一致，只是屏蔽其它大类、只出动漫。
 *
 * ⚠️ 站点是综合影视站（电影/剧/综艺/动漫，typeId1 = 1/2/4/3），本源【只出动漫】：
 *   - 首页/分类：固定 type1=4（动漫），不请求其它大类；保留「推荐」首页 tab（key=""）；
 *   - 搜索：searchByWord 结果按 typeId1===4 二次过滤，同名电影/剧集/综艺一律丢弃，
 *           跨源搜索、自动换源也只会命中动漫。
 *
 * 协议（全部 GET，明文 JSON）：
 *   - 多备用域名，首个可达者生效（ext 可覆盖：逗号分隔字符串 / {hosts:[]} / {host:''}）。
 *   - 鉴权头：sign = sha1(md5(<query 明文> + "&key=<KEY>&t=<毫秒>"))，另带 T=<毫秒>、Deviceid="Deviceid"。
 *   - 列表 /video/list?type1=4&pageNum=&area=&year=          → data.list[]
 *     搜索 /video/searchByWord?keyword=&pageNum=1&pageSize=8 → data.result.list[]（含 typeId1）
 *     详情 /video/detail?id=                                  → data{...,episodeList[]{name,nid}}
 *     播放 /v2/video/episode/url?id=&nid=                     → data.list[]{resolutionName,resolution,url}（多档）
 *   - 选集 flag 编成 "id@nid"，play() 拆开再调播放接口。
 *   - 多清晰度：data.list 每项一档（蓝光/高清/标清…），play() 全量下发 res.resolutions=[{name,url,type}]
 *     供前台「清晰度切换」；默认起播最高档（与原始脚本取 data.list[0] 行为一致）。
 *   - 播放地址按源站要求带 Origin/Referer = 站点域名 + Chrome UA。
 */

var KEY = 'cb808529bae6b6be45ecfab29a4889bc';
var CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
function rstrip(s) { return trim(s).replace(/\/+$/, ''); }

function config() {
    return JSON.stringify({ browseOnly: false });
}

// 备用域名池：优先用注入的 ext（字符串逗号分隔 / {hosts:[]} / {host:''}），否则内置默认。
var HOSTS = (function () {
    try {
        if (typeof ext !== 'undefined' && ext) {
            if (typeof ext === 'string' && ext.indexOf('http') >= 0) {
                return ext.split(',').map(rstrip).filter(function (x) { return !!x; });
            }
            if (ext.hosts && ext.hosts.length) return ext.hosts.map(rstrip);
            if (ext.host) return [rstrip(ext.host)];
        }
    } catch (e) {}
    return ['https://y2s52n7.com', 'https://m.hkybqufgh.com', 'https://m.sizhengxt.com',
            'https://m.9zhoukj.com', 'https://m.jiabaide.cn', 'https://www.hkybqufgh.com'];
})();

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
    if (u.indexOf('.mp4') >= 0) return 'mp4';
    if (u.indexOf('.flv') >= 0) return 'flv';
    return 'auto';
}
// 分辨率友好名：接口直接给中文档位名(蓝光/超清/高清/标清/4K…)，缺名时用数字分辨率兜底(1080→"1080P")
function resName(g) {
    var n = trim(g && g.resolutionName);
    if (n) return n;
    var r = parseInt(g && g.resolution, 10);
    return (r > 0) ? (r + 'P') : '默认';
}
// 档位排序权重(高→低)：先按档名档次(4K>蓝光>超清>高清>标清>流畅)，同档再按数字分辨率
function resRank(g) {
    var byName = { '4k': 6, '蓝光': 5, '超清': 4, '高清': 3, '标清': 2, '流畅': 1 };
    var base = byName[String(trim(g && g.resolutionName)).toLowerCase()] || 0;
    var num = parseInt(g && g.resolution, 10) || 0;
    return base * 100000 + num;
}

// sign = sha1(md5(raw))，raw 末尾固定拼 &key=&t=
function sign(raw) { return sha1(md5(raw)); }
function hdr(raw, t) {
    return { 'sign': sign(raw), 'T': t, 'Deviceid': 'Deviceid', 'User-Agent': 'okhttp/3.15' };
}

var RESOLVED = '';
// 选用首个能正常返回 JSON 的域名（带签名探一次 hotSearch），结果缓存
function host() {
    if (RESOLVED) return RESOLVED;
    for (var i = 0; i < HOSTS.length; i++) {
        var h = rstrip(HOSTS[i]);
        if (!h) continue;
        var t = String(timestamp());
        var body = request(h + '/api/mw-movie/anonymous/home/hotSearch',
            JSON.stringify({ headers: hdr('key=' + KEY + '&t=' + t, t), timeout: 8000 })) || '';
        if (body && body.charAt(0) === '{') { RESOLVED = h; return h; }
    }
    RESOLVED = rstrip(HOSTS[0] || '');
    return RESOLVED;
}

function api(path, raw, t) {
    return request(host() + path, JSON.stringify({ headers: hdr(raw, t), timeout: 15000 })) || '';
}

function mapItem(it) {
    var year = yearStr(it.vodYear);
    if (!year) year = yearStr(String(it.vodPubdate || '').substring(0, 4));
    return {
        id:      String(it.vodId),
        name:    clean(it.vodName),
        pic:     trim(it.vodPic),
        type:    typeOf(it.vodArea),
        year:    year,
        remarks: clean(it.vodRemarks),
        desc:    ''
    };
}

// 动漫片库（type1 恒为 4，保证只出动漫）
function listVod(area, year, page) {
    page = page || 1;
    var t = String(timestamp());
    var raw = 'area=' + (area || '') + '&pageNum=' + page + '&type1=4&year=' + (year || '') + '&key=' + KEY + '&t=' + t;
    var path = '/api/mw-movie/anonymous/video/list?type1=4&pageNum=' + page +
               '&area=' + encodeUri(area || '') + '&year=' + encodeUri(year || '');
    var j = parseJson(api(path, raw, t)) || {};
    var list = (j.data && j.data.list) || [];
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(mapItem(list[i]));
    return out;
}

// 关键词搜索：只留 typeId1===4（动漫）
function searchWord(wd, page) {
    var t = String(timestamp());
    var raw = 'keyword=' + wd + '&pageNum=1&pageSize=8&key=' + KEY + '&t=' + t;
    var path = '/api/mw-movie/anonymous/video/searchByWord?keyword=' + encodeUri(wd) + '&pageNum=1&pageSize=8';
    var j = parseJson(api(path, raw, t)) || {};
    var list = (j.data && j.data.result && j.data.result.list) || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
        if (Number(list[i].typeId1) !== 4) continue;   // 非动漫丢弃
        out.push(mapItem(list[i]));
    }
    return out;
}

// 首页 tab key → 列表 area 取值（'' = 不限地区）
var TAB_AREA = { '动漫': '', '日本': '日本', '大陆': '中国大陆' };

// 年份选项（贴合源站动漫年份档位）
var YEAR_OPTS = (function () {
    var o = [{ n: '全部', v: '' }];
    for (var y = (new Date()).getFullYear(); y >= 2010; y--) o.push({ n: String(y), v: String(y) });
    o.push({ n: '2009~2000', v: '2009~2000' }, { n: '更早', v: '更早' });
    return o;
})();
var AREA_OPTS = [{ n: '全部', v: '' }, { n: '中国大陆', v: '中国大陆' },
                 { n: '日本', v: '日本' }, { n: '美国', v: '美国' }, { n: '其他', v: '其他' }];

// 保留首页「推荐」（key=""）+ 只出动漫的子分类（全部/日番/国漫）；不暴露电影/剧/综艺大类。
function categories() {
    return JSON.stringify([
        { key: '',     title: '推荐' },
        { key: '动漫', title: '全部', filters: [
            { key: 'area', name: '地区', value: AREA_OPTS },
            { key: 'year', name: '年份', value: YEAR_OPTS }
        ] },
        { key: '日本', title: '日番', filters: [
            { key: 'year', name: '年份', value: YEAR_OPTS }
        ] },
        { key: '大陆', title: '国漫', filters: [
            { key: 'year', name: '年份', value: YEAR_OPTS }
        ] }
    ]);
}

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword);
    if (!key) return JSON.stringify(listVod('', '', page));               // 推荐/首页 = 最新动漫
    if (TAB_AREA.hasOwnProperty(key)) return JSON.stringify(listVod(TAB_AREA[key], '', page));
    return JSON.stringify(searchWord(key, page));
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    var cat = trim(category);
    var area = TAB_AREA.hasOwnProperty(cat) ? TAB_AREA[cat] : '';
    if (!area && f.area) area = f.area;
    return JSON.stringify(listVod(area, f.year || '', page || 1));
}

// 首页「精选」分区（key="" 的推荐页用这个渲染成多行横滑）。全部走 type1=4，保证只出动漫、不掺其它大类。
// 分区 key 尽量对齐 categories() 的 tab（''/日本/大陆），方便前台点分区跳到对应 tab。
function homeSections() {
    var buckets = [
        { title: '最新动漫', key: '',   area: '' },
        { title: '日本番',   key: '日本', area: '日本' },
        { title: '国产动漫', key: '大陆', area: '中国大陆' },
        { title: '欧美动漫', key: '',   area: '美国' }
    ];
    var out = [];
    for (var i = 0; i < buckets.length; i++) {
        var b = buckets[i];
        var items = listVod(b.area, '', 1);
        if (items.length) out.push({ title: b.title, key: b.key, items: items.slice(0, 12) });
    }
    return JSON.stringify(out);
}

function detail(id) {
    var out = { id: String(id), name: '', pic: '', desc: '', type: '', remarks: '', year: '', episodes: [] };
    var t = String(timestamp());
    var raw = 'id=' + id + '&key=' + KEY + '&t=' + t;
    var j = parseJson(api('/api/mw-movie/anonymous/video/detail?id=' + encodeUri(String(id)), raw, t)) || {};
    var d = j.data || {};
    out.name    = clean(d.vodName);
    out.pic     = trim(d.vodPic);
    out.desc    = clean(d.vodContent || d.vodBlurb);
    out.remarks = clean(d.vodRemarks);
    out.year    = yearStr(d.vodYear);
    out.type    = typeOf(d.vodArea);

    var eps = d.episodeList || [];
    for (var i = 0; i < eps.length; i++) {
        var nid = trim(eps[i].nid);
        if (!nid) continue;
        var name = clean(eps[i].name) || ('第' + (i + 1) + '集');
        // 选集 flag = id@nid，play() 拆开调播放接口
        out.episodes.push({ name: name, url: String(id) + '@' + nid, route: '在线播放' });
    }
    return JSON.stringify(out);
}

function play(flag) {
    var res = { url: '', type: 'auto' };
    var parts = String(flag || '').split('@');
    var id = trim(parts[0]);
    var nid = trim(parts[1] || '');
    if (!id || !nid) return JSON.stringify(res);

    var t = String(timestamp());
    var raw = 'id=' + id + '&nid=' + nid + '&key=' + KEY + '&t=' + t;
    var body = api('/api/mw-movie/anonymous/v2/video/episode/url?id=' + encodeUri(id) + '&nid=' + encodeUri(nid), raw, t);
    var j = parseJson(body) || {};
    var list = (j.data && j.data.list) || [];

    // data.list 每项是一档清晰度（蓝光/高清/标清…）：全量收集，按档次高→低排序
    var gears = [];
    for (var i = 0; i < list.length; i++) {
        var g = list[i]; if (!g) continue;
        var gu = trim(g.url);
        if (!gu || !/^https?:/i.test(gu)) continue;
        gears.push({ name: resName(g), url: gu, type: guessType(gu), rank: resRank(g) });
    }
    gears.sort(function (a, b) { return b.rank - a.rank; });

    // 去重：switchResolution 按「档名」匹配 → 档名必须唯一；同 url 也只留一条
    var resolutions = [], useen = {}, nseen = {};
    for (var k = 0; k < gears.length; k++) {
        var gg = gears[k];
        if (useen[gg.url] || nseen[gg.name]) continue;
        useen[gg.url] = 1; nseen[gg.name] = 1;
        resolutions.push({ name: gg.name, url: gg.url, type: gg.type });
    }
    if (!resolutions.length) return JSON.stringify(res);

    // 默认起播最高档（排序后首位；与原始脚本取 data.list[0] 行为一致，蓝光在首位）
    var best = resolutions[0];
    res.url = best.url;
    res.type = best.type;
    res.referer = host();
    res.headers = JSON.stringify({ 'Origin': host(), 'Referer': host(), 'User-Agent': CHROME_UA });
    // ≥2 档才下发档位列表，前台据此显示「清晰度」按钮可切换
    if (resolutions.length >= 2) res.resolutions = resolutions;
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

