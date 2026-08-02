// @key com.lanerc.akianime
// @label 囧源·AKI动漫
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·AKI动漫 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 akianime.js，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {"site":"https://www.akianime.com"};
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
 * AkiAnime（Aki动漫 akianime.com） JS 源
 * version: 1.2.0
 *
 * 站点：https://www.akianime.com （dsn2 模板定制 maccms，走 Cloudflare）
 * 反爬：首访 ?cckey= 两跳重定向 + 下发 PHPSESSID / _ok9_ cookie。
 *       GET 请求靠 OkHttp followRedirects + 共享 CookieJar 自动通过；
 *       但 POST（分类接口）必须先有 cookie，故 dsApi 前先 ensureCookie() 拿一次首页。
 *
 * 列表：POST /index.php/ds_api/vod  →  JSON {code:1,list,pagecount,total}
 *       有效筛选：class(剧情) / year(年份) / by(排序 time|hits|score) / page(翻页)；
 *       tid/area 实测无效（单一大类），不使用。
 * 关键词搜索：GET /bgmsearch/{wd}-…-.html（服务端渲染，仅第 1 页）。
 * 详情：GET /bgmdetail/{ID}.html（ID 混淆，如 PEcDDE）。
 * 播放：/bgmplay/{ID}-{线路}-{集}.html 内 player_aaaa.url——
 *       明文 m3u8/mp4/flv 直接返回（秒开，无防盗链）；
 *       Doki- 加密线路走站点自带外部解析器：读 playerconfig.js 的 player_list[from].parse，
 *       GET 解析器页拿内嵌 config{url,key,time} → POST 同目录 api_config.php 换真实直链；
 *       解析器拿不到再退回 WebView 嗅探（先嗅解析器页、后嗅播放页）。
 *
 * v1.2.0：加密线路补「外部解析器直取」（原先只有嗅探，常失败/慢）；
 *         列表接口 cookie 失效自愈（返回非 JSON 时重新预热重试一次）。
 */

var EXT  = (typeof ext !== 'undefined' && ext) ? ext : {};
var SITE = (EXT.site || 'https://www.akianime.com').replace(/\/+$/, '');
var UA_STR = (typeof UA !== 'undefined' && UA.chrome) ? UA.chrome
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
var API = SITE + '/index.php/ds_api/vod';
var TIMEOUT = 20000;

// ─────────────────────────────────────────────── 工具
function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }

function abs(u) {
    if (!u) return '';
    if (/^https?:\/\//.test(u)) return u;
    return SITE + (u.charAt(0) === '/' ? '' : '/') + u;
}

function stripTags(s) { return s ? String(s).replace(/<[^>]+>/g, '') : ''; }

function decodeEntities(s) {
    if (!s) return '';
    s = String(s)
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&#0?39;/g, "'");
    s = s.replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { try { return String.fromCharCode(parseInt(h, 16)); } catch (e) { return m; } });
    s = s.replace(/&#(\d+);/g, function (m, d) { try { return String.fromCharCode(parseInt(d, 10)); } catch (e) { return m; } });
    return s;
}

function guessType(u) {
    var l = (u || '').toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0)  return 'mp4';
    if (l.indexOf('.flv') >= 0)  return 'flv';
    return 'auto';
}

function yearOpts(n) {
    var out = [{ n: '全部', v: '' }];
    var y = (new Date()).getFullYear();
    for (var i = 0; i < (n || 10); i++) out.push({ n: String(y - i), v: String(y - i) });
    return out;
}

function HDR() {
    return JSON.stringify({ headers: { 'User-Agent': UA_STR, 'Referer': SITE + '/' }, timeout: TIMEOUT });
}
function req(url) { return request(url, HDR()) || ''; }

// 先 GET 一次首页过 cckey、把 cookie 存进共享 CookieJar，供后续 POST 使用。
// warm 只在「确实拿到过站点响应」时才置位，拿不到不闩死——下次调用会再试，避免首刷网络抖动后一直空。
var COOKIE_READY = false;
function ensureCookie(force) {
    if (COOKIE_READY && !force) return;
    try {
        var h = request(SITE + '/', HDR());
        if (h) COOKIE_READY = true;   // 有响应才算预热成功
    } catch (e) {}
}

// POST 列表接口。cckey 反爬：cookie 缺失/过期时服务端 302 回带 cckey 的地址，
// 跟随重定向后 body 会是 HTML（非 JSON）。检测到非 JSON 就强制重新预热 cookie 再打一次。
function dsApiRaw(params) {
    var parts = [];
    for (var k in params) {
        if (params.hasOwnProperty(k)) parts.push(encodeUri(k) + '=' + encodeUri(params[k] == null ? '' : String(params[k])));
    }
    var opt = JSON.stringify({
        headers: {
            'User-Agent': UA_STR, 'Referer': SITE + '/',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: TIMEOUT
    });
    return post(API, parts.join('&'), opt) || '';
}
function looksJson(s) {
    if (!s) return false;
    var t = s.replace(/^\s+/, '');
    return t.charAt(0) === '{' || t.charAt(0) === '[';
}
function dsApi(params) {
    ensureCookie(false);
    var body = dsApiRaw(params);
    if (!looksJson(body)) {   // cookie 过期/首刷抖动 → 重新预热后重试一次
        ensureCookie(true);
        body = dsApiRaw(params);
    }
    return body;
}

function vodReq(cls, year, by, page) {
    return dsApi({ mid: 1, tid: 20, 'class': cls || '', area: '', year: year || '', by: by || 'time', page: page || 1 });
}

// 解析 ds_api JSON 列表
function parseApiList(jsonStr) {
    var out = [];
    var j = parseJson(jsonStr) || {};
    var list = j.list || [];
    for (var i = 0; i < list.length; i++) {
        var v = list[i];
        var id = match(String(v.url || ''), '/bgmdetail/([^/.]+)\\.html', 1) || String(v.vod_id || '');
        if (!id) continue;
        out.push({
            id:      id,
            name:    decodeEntities(trim(v.vod_name || '')),
            pic:     abs(v.vod_pic || ''),
            type:    '番剧',
            year:    v.vod_year ? String(v.vod_year) : '',
            remarks: decodeEntities(trim(v.vod_remarks || '')),
            desc:    decodeEntities(stripTags(v.vod_blurb || '')).replace(/\s+/g, ' ').trim()
        });
    }
    return out;
}

// bgmsearch 14 段 URL（仅用于关键词搜索）：段1=关键词
function buildSearch(wd) {
    var seg = ['', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    seg[0] = wd || '';
    var parts = [];
    for (var i = 0; i < seg.length; i++) parts.push(encodeUri(seg[i]));
    return SITE + '/bgmsearch/' + parts.join('-') + '.html';
}

// 解析 bgmsearch 列表卡片（slide-info 结构）
function parseHtmlList(html) {
    var out = [], seen = {};
    if (!html) return out;
    var arr = parseJson(matchAll(html,
        'data-src="(/upload/[^"]+)"[\\s\\S]*?/bgmdetail/([^"/]+?)\\.html"[^>]*>\\s*<h3[^>]*>([^<]+)</h3>[\\s\\S]*?slide-info-remarks[^>]*>([^<]*)<'
    )) || [];
    for (var i = 0; i < arr.length; i++) {
        var m = arr[i], id = m[2];
        if (!id || seen[id]) continue;
        seen[id] = 1;
        out.push({
            id: id, name: decodeEntities(m[3]).trim(), pic: abs(m[1]),
            type: '番剧', year: '', remarks: decodeEntities(stripTags(m[4])).trim(), desc: ''
        });
    }
    return out;
}

function pickDesc(html) {
    var d = match(html, '<em[^>]*>简介[：:\\s]*</em>([\\s\\S]*?)</(?:div|p|span)>', 1)
         || match(html, '<div class="[^"]*juqing[^"]*"[^>]*>([\\s\\S]*?)</div>', 1)
         || match(html, 'class="check"[^>]*>([\\s\\S]*?)</div>', 1);
    d = decodeEntities(stripTags(d || '')).replace(/\s+/g, ' ').trim();
    if (/^(暂无简介|暂无剧情介绍|剧情简介暂缺)/.test(d)) d = '';
    if (d.length > 300) d = d.substring(0, 300);
    return d;
}

// 线路名清洗：去掉「不要相信视频里的广告」等话术 + 尾部分隔符
function cleanLine(s) {
    s = decodeEntities(stripTags(s || '')).replace(/\u00a0/g, '').trim();
    s = s.replace(/(不要相信|请不要|切勿相信|视频里的广告|广告|更新至|提示).*$/, '').trim();
    s = s.replace(/[\-—－|｜·、,]+$/, '').trim();
    return s || '线路';
}

// ─────────────────────────────────────────────── 外部解析器（Doki- 加密线路）
// 把相对地址按某个页面 URL 求绝对地址（api_config.php 相对解析页目录）
function joinUrl(base, rel) {
    if (!rel) return '';
    if (/^https?:\/\//.test(rel)) return rel;
    var m = /^(https?:\/\/[^\/]+)(\/[^?#]*)?/.exec(String(base).split('#')[0].split('?')[0]);
    if (!m) return rel;
    var origin = m[1], path = m[2] || '/';
    if (rel.charAt(0) === '/') return origin + rel;
    return origin + path.substring(0, path.lastIndexOf('/') + 1) + rel;
}

// playerconfig.js 里的 player_list：from → {ps, parse}。ps=1 表示要外部解析器。缓存一次。
var PLAYER_CFG = null;
function playerCfg() {
    if (PLAYER_CFG) return PLAYER_CFG;
    PLAYER_CFG = {};
    try {
        var js = req(SITE + '/static/js/playerconfig.js?t=' + timestamp());
        var block = match(js, 'player_list\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*,\\s*MacPlayerConfig\\.downer_list', 1);
        var obj = block ? parseJson(block) : null;
        if (obj) PLAYER_CFG = obj;
    } catch (e) { log('[akianime] playerCfg err: ' + e); }
    return PLAYER_CFG;
}
function parserFor(from) {
    if (!from) return '';
    var e = playerCfg()[from];
    return (e && (e.ps === '1' || e.ps === 1) && e.parse) ? e.parse : '';
}

// 解析加密 token：GET 解析器页拿 config{url,key,time} → POST api_config.php 换真实直链。
// 返回 { page, url }：url 空表示没解出（page 交给嗅探兜底）。
function resolveByParser(token, from) {
    var parse = parserFor(from);
    if (!parse) return null;
    var pageUrl = parse + encodeUri(token);
    var html = req(pageUrl);
    if (!html) return { page: pageUrl, url: '' };

    // 1) mac 解析器通用套路：var config = { url, key, time } + 同目录 api_config.php
    var cfg = parseJson(match(html, 'var\\s+config\\s*=\\s*(\\{[\\s\\S]*?\\})', 1) || '');
    if (cfg && cfg.url) {
        var api = joinUrl(pageUrl, 'api_config.php');
        var body = 'url=' + encodeUri(cfg.url) + '&time=' + encodeUri(cfg.time || '') +
                   '&key=' + encodeUri(cfg.key || '') + '&title=';
        var opt = JSON.stringify({
            headers: {
                'User-Agent': UA_STR, 'Referer': pageUrl,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            }, timeout: TIMEOUT
        });
        var r = parseJson(post(api, body, opt) || '') || {};
        if (String(r.code) === '200' && r.url) return { page: pageUrl, url: r.url };
    }
    // 2) 解析器页直接内嵌明文流
    var direct = match(html, '(https?:[^"\'\\s\\\\]+\\.(?:m3u8|mp4|flv|m4s)[^"\'\\s\\\\]*)', 1);
    if (direct) return { page: pageUrl, url: direct.split('\\/').join('/') };

    return { page: pageUrl, url: '' };
}

// ─────────────────────────────────────────────── 分类（剧情 tab + 年份/排序筛选）
var CAT_TABS = [
    ['', '推荐'], ['校园', '校园'], ['恋爱', '恋爱'], ['异世界', '异世界'],
    ['战斗', '热血'], ['日常', '日常'], ['治愈', '治愈'], ['奇幻', '奇幻'],
    ['后宫', '后宫'], ['冒险', '冒险'], ['魔法', '魔法'], ['原创', '原创']
];
var BY_OPTS = [{ n: '最新', v: 'time' }, { n: '最热', v: 'hits' }, { n: '评分', v: 'score' }];

function categories() {
    var ys = yearOpts(10);
    var out = [];
    for (var i = 0; i < CAT_TABS.length; i++) {
        out.push({
            key: CAT_TABS[i][0], title: CAT_TABS[i][1],
            filters: [
                { key: 'year', name: '年份', value: ys },
                { key: 'by',   name: '排序', value: BY_OPTS }
            ]
        });
    }
    return JSON.stringify(out);
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    var cls = trim(category);                                   // '' = 推荐（全部）
    var by = f.by || (cls === '' ? 'hits' : 'time');            // 推荐默认热门，剧情默认最新
    var year = (f.year && f.year !== '全部') ? String(f.year) : '';
    return JSON.stringify(parseApiList(vodReq(cls, year, by, page || 1)));
}

// ─────────────────────────────────────────────── 契约入口
function search(keyword, page) {
    page = page || 1;
    var kw = trim(keyword || '');
    if (!kw) return JSON.stringify(parseApiList(vodReq('', '', 'time', page)));   // 空 → 最近更新（可翻页）
    if (page > 1) return '[]';                                                    // 关键词走 bgmsearch，仅第 1 页
    return JSON.stringify(parseHtmlList(req(buildSearch(kw))));
}

function homeSections() {
    var rows = [['', 'time', '最近更新'], ['', 'hits', '人气热门'], ['', 'score', '高分推荐'], ['异世界', 'time', '异世界']];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
        var items = parseApiList(vodReq(rows[i][0], '', rows[i][1], 1));
        if (items.length) out.push({ title: rows[i][2], key: rows[i][0], items: items.slice(0, 12) });
    }
    return JSON.stringify(out);
}

function detail(id) {
    var out = { id: id, name: '', pic: '', type: '', year: '', remarks: '', desc: '', episodes: [] };
    var html = req(abs('/bgmdetail/' + id + '.html'));
    if (!html) return JSON.stringify(out);

    out.name    = decodeEntities(match(html, 'detail-info[^>]*">\\s*<h3[^>]*>([^<]+)<', 1) || '').trim();
    out.pic     = abs(match(html, 'data-src="(/upload/[^"]+)"', 1) || '');
    out.year    = match(html, '/bgmsearch/-+(\\d{4})\\.html', 1) || '';
    out.type    = decodeEntities(match(html, '类型\\s*:</strong>\\s*<a[^>]*>([^<]+)<', 1) || '').trim();
    out.remarks = decodeEntities(match(html, 'slide-info-remarks cor5">([^<]+)<', 1) || '').trim();
    out.desc    = pickDesc(html);

    // 线路 tab 名（swiper-slide + badge 集数）
    var tabs = parseJson(matchAll(html,
        'swiper-slide[^>]*>(?:<i[^>]*></i>)?(?:&nbsp;|\\s)*([^<]+?)<span class="badge">(\\d+)</span>'
    )) || [];

    // 只取当前影片的剧集（限定 id，排除相关推荐区其它片的 /bgmplay 链接）
    var idRe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var eps = parseJson(matchAll(html, '/bgmplay/' + idRe + '-(\\d+)-(\\d+)\\.html"[^>]*>([^<]+)<')) || [];

    // 线路号可能不连续（如只有 line3）；按首次出现顺序依次对应 tab 名
    var lineOrder = [], lineSeen = {};
    for (var i0 = 0; i0 < eps.length; i0++) {
        var ln = eps[i0][1];
        if (!lineSeen[ln]) { lineSeen[ln] = 1; lineOrder.push(ln); }
    }
    var lineNames = {};
    for (var t = 0; t < lineOrder.length; t++) {
        lineNames[lineOrder[t]] = (tabs[t] && tabs[t][1]) ? cleanLine(tabs[t][1]) : ('线路' + (t + 1));
    }

    // 按 line-ep 去重（PC/wap 两套 DOM）
    var seen = {};
    for (var e = 0; e < eps.length; e++) {
        var m = eps[e], line = m[1], ep = m[2];
        var k = line + '-' + ep;
        if (seen[k]) continue;
        seen[k] = 1;
        out.episodes.push({
            name:  decodeEntities(m[3]).trim() || ('第' + ep + '集'),
            url:   '/bgmplay/' + id + '-' + line + '-' + ep + '.html',
            route: lineNames[line] || ('线路' + line)
        });
    }
    return JSON.stringify(out);
}

function play(flag) {
    var res = { url: '', type: 'auto', referer: SITE + '/' };
    var pageUrl = /^https?:/i.test(flag) ? flag : abs(flag);
    var html = req(pageUrl);

    // player_aaaa：优先整体 parseJson（正确解码 \/ 与 \uXXXX，url 路径可能含中文）
    // 用 [^<] 而非 [\s\S] 限定在同一行内，避免大页面正则回溯
    var pj = parseJson(match(html, 'player_aaaa\\s*=\\s*(\\{[^<]*\\})', 1) || '') || {};
    var u = pj.url || '';
    if (!u) {   // 兜底：正则取字符串再手动解码
        u = match(html, 'player_aaaa[\\s\\S]*?"url"\\s*:\\s*"([^"]*)"', 1) || '';
        u = u.replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }).split('\\/').join('/');
    }
    // maccms 兼容：encrypt=1 urldecode / encrypt=2 base64+urldecode（现站点是 0，稳妥保留）
    if (u) {
        if (String(pj.encrypt) === '1') { try { u = decodeUri(u); } catch (e) {} }
        else if (String(pj.encrypt) === '2') { try { u = decodeUri(base64Decode(u)); } catch (e) {} }
    }

    // 1) 明文直链 → 直接返回（秒开）。url 路径若含中文需编码，否则播放器请求会失败
    if (/^https?:\/\//.test(u) && /\.(m3u8|mp4|flv|m4s)(\?|#|$)/i.test(u)) {
        if (/[^\x00-\x7F]/.test(u)) { try { u = encodeURI(u); } catch (e) {} }
        res.url = u;
        res.type = guessType(u);
        res.headers = JSON.stringify({ 'User-Agent': UA_STR, 'Referer': SITE + '/' });
        return JSON.stringify(res);
    }

    // 2) Doki- 等加密 token → 优先走站点自带的外部解析器（GET 解析页拿 config → POST api_config.php），
    //    比嗅探快且稳；拿到直链直接返回。referer 用「never」意图：解析出的云直链多不校验防盗链。
    var parsed = (u && !/^https?:\/\//.test(u)) ? resolveByParser(u, pj.from) : null;
    if (parsed && parsed.url) {
        var pu = parsed.url;
        if (/[^\x00-\x7F]/.test(pu)) { try { pu = encodeURI(pu); } catch (e) {} }
        res.url = pu;
        res.type = guessType(pu);
        res.referer = '';
        res.headers = JSON.stringify({ 'User-Agent': UA_STR });
        return JSON.stringify(res);
    }

    // 3) 兜底：隐藏 WebView 跑页面 JS 后嗅探真实流。优先嗅探解析器页（真流在那产生），
    //    没有解析器页则退回原播放页。
    var sniffUrl = (parsed && parsed.page) ? parsed.page : pageUrl;
    try {
        var hit = sniffMedia(sniffUrl, {
            patterns:  ['\\.m3u8(\\?|$)', '\\.mp4(\\?|$)', '\\.flv(\\?|$)'],
            referer:   SITE + '/',
            userAgent: UA_STR,
            autoPlay:  true,
            timeout:   15000
        });
        if (hit && hit.ok && hit.url) {
            res.url = hit.url;
            res.type = guessType(hit.url);
            res.referer = hit.referer || (SITE + '/');
            var hh = { 'User-Agent': hit.ua || UA_STR };
            if (hit.referer) hh['Referer'] = hit.referer;
            if (hit.cookie)  hh['Cookie']  = hit.cookie;
            res.headers = JSON.stringify(hh);
            return JSON.stringify(res);
        }
    } catch (e) { log('[akianime] sniff err: ' + e); }

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

