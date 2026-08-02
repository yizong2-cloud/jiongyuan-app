// @key com.lanerc.lmm85
// @label 囧源·lmm85
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·lmm85 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 lmm85.js，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {"site":"https://www.lmm85.com"};
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
 * 路漫漫在线动漫（lmm85） JS 源
 * 站点：https://www.lmm85.com  （苹果CMS V10 · jable 模板）
 * version: 1.2.2  （修"嗅探超时 cands=0"：sniff 加 autoPlay:true —— jable 模板播放器要点海报才起播，
 *                  不开 autoPlay 起播脚本不注入、播放器永不发 m3u8 请求、嗅探纯被动监听必超时。
 *                  配合 App 端 JsSniffer 注入脚本新增「直读 window.player_aaaa.url」兜底，
 *                  即使起播按钮没点中，也能从苹果 CMS 解码后的全局变量直接拿 m3u8）
 * version: 1.2.1  （修"嗅探不到"：站点全站开 Cloudflare 盾后，嗅探不再伪装桌面 UA（UA 与 WebView
 *                  指纹不一致会被 CF 判伪装、挑战永远过不去），timeout 15s→20s 给挑战自解留时间；
 *                  需配合 App 端 JsSniffer 修复——主文档 403/503 不再快退）
 *
 * 说明：
 *  - 首页/分类/详情/播放页都是普通 GET，可直接抓取解析。
 *  - 关键词搜索 /vod/search 被站点的 smart_token 反采集脚本（jsjiami 混淆）拦"身份验证"页。
 *    本源还原了算法：token = md5(unix秒 + SALT)，POST /index.php/ajax/smart_verify 通过后，
 *    同一 Cookie 会话内搜索直接放行。SALT 轮换导致失效时，自动退化为"客户端搜索"
 *    （抓最近更新/番剧/电影列表按片名过滤）。可用 ext.smartSalt 覆盖 SALT。
 *  - 站点开了 Cloudflare 盾（managed challenge）：真实浏览器可自动过非交互挑战；OkHttp/curl
 *    这类非浏览器 TLS 指纹基本必被拦成 "Just a moment" 403（与 IP 关系不大）。所以 direct
 *    直链路径被挑战时会失败（isBlocked 识别后返回空），自动退化到 sniff 嗅探兜底——WebView
 *    是真 Chromium，保持默认 UA 时能自己把挑战跑过去，拿到 cf_clearance 后续就畅通。
 *  - 取流方式按"线路（sid）"配置，见下方 PLAY_MODE / DEFAULT_PLAY_MODE：
 *      'direct' 只静态抓 player_aaaa 直链；'sniff' 只跑 WebView 嗅探；'auto' 先直链失败再嗅探。
 *    解决"同一站点不同线路取流方式不同"——A 线路是直链、B 线路必须嗅探时分别指定即可。
 *    可被后台 ext.playMode 覆盖（{"1":"direct","2":"sniff"} 这种 {线路sid:模式} 形式）。
 */

var SITE = (function () {
    var s = (typeof ext !== 'undefined' && ext && ext.site) ? String(ext.site) : 'https://www.lmm85.com';
    return s.replace(/\/+$/, '');
})();

// 统一请求头：普通桌面 Chrome UA + 站内 Referer，超时 15s。
var REQ_OPTS = JSON.stringify({
    ua: 'chrome',
    timeout: 15000,
    headers: { 'Referer': SITE + '/' }
});

// 关键词搜索的 smart_token 反采集：
//   token = md5(ts + SALT)，POST 到 VERIFY_PATH，返回 {"code":1} 即本会话验证通过，
//   之后同一 Cookie 会话内的搜索请求直接放行（站点用 PHPSESSID 记验证状态）。
//   SALT 来自站点验证脚本（jsjiami 混淆，按日期轮换）。轮换后这里失效会自动退化为客户端搜索。
var SMART_SALT  = (typeof ext !== 'undefined' && ext && ext.smartSalt) ? String(ext.smartSalt) : 'Lmm2026@VipS3cr3t!Kx9PqZ';
var VERIFY_PATH = '/index.php/ajax/smart_verify';

// ─── 取流方式（按线路 sid 配置）──────────────────────────────────────
//   play 的 flag 形如 "id_sid_nid"，其中 sid = 线路序号（与详情页线路 tab 顺序一致）。
//   每条线路可单独指定取流方式，解决"同源不同线路：A 直链 / B 必须嗅探"：
//     'direct' 只静态解析 player_aaaa 直链（最快，地址即真实 m3u8 时用）
//     'sniff'  只跑 WebView 嗅探（直链是网页/二次生成/需播放器跑 JS 时用）
//     'auto'   先直链，拿不到再嗅探兜底（默认，最稳）
//   未在 PLAY_MODE 里列出的线路一律走 DEFAULT_PLAY_MODE。
//   后台可用 ext.playMode 覆盖，形如 {"1":"direct","2":"sniff"}（键=线路sid，值=模式）。
var DEFAULT_PLAY_MODE = 'auto';
var PLAY_MODE = (function () {
    // 默认全 auto；确认某线路固定走某方式时在这里按 sid 写死，例如：
    //   var base = { '1': 'direct', '2': 'sniff' };
    var base = {};
    try {
        if (typeof ext !== 'undefined' && ext && ext.playMode) {
            var ov = (typeof ext.playMode === 'string') ? (parseJson(ext.playMode) || {}) : ext.playMode;
            for (var k in ov) { if (ov.hasOwnProperty(k)) base[String(k)] = String(ov[k]).toLowerCase(); }
        }
    } catch (e) { /* ext.playMode 解析失败就用默认 */ }
    return base;
})();

// 分类名 → 站点路径。type/* 是分类页，label/* 是标签聚合页（两者翻页规则不同）。
var TYPE_MAP = {
    '番剧':       'type/dongman',
    '日本动漫':   'type/ribendongman',
    '国产动漫':   'type/guochandongman',
    '欧美动漫':   'type/oumeidongman',
    '动态漫画':   'type/dongtaiman',
    '动画电影':   'type/dianying',
    '日本特摄剧': 'type/teshepian',
    '最近更新':   'label/new',
    '热门':       'label/hot'
};

// ───────────────────────────────────────────── 工具函数

function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }

function decodeEntities(s) {
    if (!s) return '';
    return s.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#0?39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
}

function stripTags(s) {
    if (!s) return '';
    return s.replace(/<[^>]+>/g, '');
}

// 识别 Cloudflare 挑战页 / 站点"身份验证"反采集页。
function isBlocked(html) {
    if (!html) return false;
    if (html.indexOf('_cf_chl_opt') >= 0) return true;
    if (html.indexOf('Just a moment') >= 0) return true;
    if (html.indexOf('challenge-platform') >= 0) return true;
    if (html.indexOf('身份验证') >= 0 && html.indexOf('请稍候') >= 0) return true;
    // smart_token 验证页特征：标题"身份验证" + 体积极小
    if (html.indexOf('<title>身份验证') >= 0) return true;
    return false;
}

function fetchHtml(url) {
    var html = request(url, REQ_OPTS);
    if (!html) { log('[lmm85] empty body: ' + url); return ''; }
    if (isBlocked(html)) { log('[lmm85] blocked: ' + url); return ''; }
    return html;
}

// 列表/标签页的翻页 URL。
//   type/xxx     → 第1页 /type/xxx.html         第N页 /type/xxx_N.html
//   label/xxx    → 第1页 /label/xxx.html        第N页 /label/xxx/page/N.html
function pagedUrl(path, page) {
    page = page || 1;
    if (path.indexOf('label/') === 0) {
        return SITE + '/' + path + (page > 1 ? '/page/' + page : '') + '.html';
    }
    return SITE + '/' + path + (page > 1 ? '_' + page : '') + '.html';
}

// 解析列表页里的影片卡片。按 "img-box cover-md" 切块，逐卡解析避免跨卡串数据。
function parseCards(html, typeName) {
    var out = [];
    if (!html) return out;
    var chunks = html.split('img-box cover-md');
    for (var i = 1; i < chunks.length; i++) {
        var c = chunks[i];
        var id = match(c, '/detail/(\\d+)\\.html', 1);
        if (!id) continue;
        var pic = match(c, 'data-src="([^"]+)"', 1) || match(c, '<img[^>]+src="([^"]+)"', 1) || '';
        var remark = match(c, '<span class="label">([^<]*)</span>', 1) || '';
        var name = match(c, '<h6 class="title">\\s*<a[^>]*>([^<]+)</a>', 1) || '';
        name = decodeEntities(trim(name));
        if (!name) continue;
        out.push({
            id: id,
            name: name,
            pic: pic,
            type: typeName || '',
            year: '',
            remarks: trim(decodeEntities(remark)),
            desc: ''
        });
    }
    return out;
}

function listFromPath(path, page, typeName) {
    var html = fetchHtml(pagedUrl(path, page));
    return parseCards(html, typeName);
}

// type/* 分类下返回的条目，type 字段填分类名以便前端筛选；label/* 是混合内容，留空。
function typeNameFor(key) {
    var path = TYPE_MAP[key] || '';
    return path.indexOf('type/') === 0 ? key : '';
}

// ───────────────────────────────────────────── 首页分区（可选）

function homeSections() {
    var defs = [
        { title: '最近更新', key: '最近更新', path: 'label/new',            type: '' },
        { title: '热门影片', key: '热门',     path: 'label/hot',            type: '' },
        { title: '日本动漫', key: '日本动漫', path: 'type/ribendongman',    type: '日本动漫' },
        { title: '国产动漫', key: '国产动漫', path: 'type/guochandongman',  type: '国产动漫' },
        { title: '欧美动漫', key: '欧美动漫', path: 'type/oumeidongman',    type: '欧美动漫' },
        { title: '动画电影', key: '动画电影', path: 'type/dianying',        type: '动画电影' }
    ];
    var out = [];
    for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        var items = listFromPath(d.path, 1, d.type);
        if (items.length) out.push({ title: d.title, key: d.key, items: items.slice(0, 12) });
    }
    return JSON.stringify(out);
}

// ───────────────────────────────────────────── 分类 tab（可选）

function categories() {
    return JSON.stringify([
        { key: '',         title: '推荐' },
        { key: '最近更新', title: '最近更新' },
        { key: '日本动漫', title: '日本动漫' },
        { key: '国产动漫', title: '国产动漫' },
        { key: '欧美动漫', title: '欧美动漫' },
        { key: '动态漫画', title: '动态漫画' },
        { key: '动画电影', title: '动画电影' },
        { key: '热门',     title: '热门' }
    ]);
}

// ───────────────────────────────────────────── 搜索 / 分类

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword || '');

    // 空关键词 = 推荐，用"最近更新"作为默认片库
    if (!key) return JSON.stringify(listFromPath('label/new', page, ''));

    // 命中内置分类 → 直接抓对应分类页
    if (TYPE_MAP[key]) {
        return JSON.stringify(listFromPath(TYPE_MAP[key], page, typeNameFor(key)));
    }

    // 真实关键词：先走服务端搜索（自动过 smart_token），不可用再退化客户端搜索
    var arr = searchServer(key, page);
    if (arr !== null) return JSON.stringify(arr);
    return JSON.stringify(clientSearch(key, page));
}

// 计算并提交 smart_token，过站点搜索反采集。成功返回 true（本会话标记已验证）。
function solveSmartVerify(key) {
    try {
        var ts = Math.floor(timestamp() / 1000);
        var token = md5(ts + SMART_SALT);
        var resp = post(SITE + VERIFY_PATH, 'smart_token=' + token + '&ts=' + ts, JSON.stringify({
            ua: 'chrome',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': SITE + '/vod/search.html?wd=' + encodeUri(key || '')
            }
        }));
        log('[lmm85] smart_verify: ' + resp);
        if (resp && resp.indexOf('"code":1') >= 0) return true;
    } catch (e) { log('[lmm85] smart_verify err: ' + e); }
    return false;
}

// 服务端关键词搜索。返回条目数组（可能为空=确实无结果）；被拦截且无法过验证时返回 null。
function searchServer(key, page) {
    page = page || 1;
    var url = SITE + '/vod/search/page/' + page + '/wd/' + encodeUri(key) + '.html';
    var html = request(url, REQ_OPTS);
    if (html && isBlocked(html)) {
        if (solveSmartVerify(key)) html = request(url, REQ_OPTS);
    }
    if (!html || isBlocked(html)) return null;
    return parseCards(html, '');
}

// 客户端搜索：抓最近更新/番剧/电影列表，按片名包含关键词过滤、按 id 去重。
// 不是全站搜索，但无需破解反采集脚本，永不失效。
function clientSearch(key, page) {
    if (page && page > 1) return [];          // 结果一次性返回，避免无限翻页
    var plan = [
        { path: 'label/new', pages: 3 },
        { path: 'type/dongman', pages: 2 },
        { path: 'type/dianying', pages: 1 }
    ];
    var seen = {}, out = [];
    for (var p = 0; p < plan.length; p++) {
        for (var pg = 1; pg <= plan[p].pages; pg++) {
            var items = listFromPath(plan[p].path, pg, '');
            if (!items.length) break;
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (seen[it.id]) continue;
                if (it.name && it.name.indexOf(key) >= 0) { seen[it.id] = 1; out.push(it); }
            }
        }
    }
    return out;
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    var arr = parseJson(search(category, page)) || [];
    if (f.year) {
        arr = arr.filter(function (it) { return !it.year || it.year === f.year; });
    }
    return JSON.stringify(arr);
}

// ───────────────────────────────────────────── 详情

function detail(id) {
    var url = SITE + '/detail/' + id + '.html';
    var html = fetchHtml(url);
    if (!html) {
        return JSON.stringify({ id: id, name: '', pic: '', desc: '', episodes: [] });
    }

    var name = decodeEntities(trim(match(html, '<h1 class="page-title">([^<]+)</h1>', 1)));
    var pic  = match(html, '<img class="url_img"[^>]*src="([^"]+)"', 1) || '';
    var typeName = decodeEntities(trim(match(html, '/type/[a-z0-9]+\\.html"\\s*title="([^"]+)"', 1)));
    var year = match(html, '/year/(\\d{4})\\.html', 1) || '';
    var remarks = decodeEntities(trim(match(html,
        '集数：</span>\\s*<div class="video-info-item">([^<]+)</div>', 1)));
    var desc = trim(stripTags(decodeEntities(match(html,
        '<div class="video-info-item video-info-content">([\\s\\S]*?)</div>', 1) || '')));

    // 线路名（聚合线路 / box聚合 …）
    var tabNames = [];
    var rawTabs = parseJson(matchAll(html, 'data-dropdown-value="([^"]+)"')) || [];
    for (var t = 0; t < rawTabs.length; t++) tabNames.push(decodeEntities(trim(rawTabs[t][1])));

    // 所有选集链接：/play/{id}_{sid}_{nid}.html  →  [whole, id, sid, nid, epName]
    var episodes = [];
    var rawEps = parseJson(matchAll(html,
        '/play/(\\d+)_(\\d+)_(\\d+)\\.html"[^>]*>\\s*<span>([^<]+)</span>')) || [];
    for (var e = 0; e < rawEps.length; e++) {
        var m = rawEps[e];
        var sid = m[2];
        var routeName = tabNames[parseInt(sid, 10) - 1] || ('线路' + sid);
        episodes.push({
            name: decodeEntities(trim(m[4])),
            url: m[1] + '_' + m[2] + '_' + m[3],   // 传给 play() 的 flag
            route: routeName
        });
    }

    return JSON.stringify({
        id: id,
        name: name,
        pic: pic,
        type: typeName,
        year: year,
        remarks: remarks,
        desc: desc,
        episodes: episodes
    });
}

// 相关推荐（可选）：详情页底部"猜你喜欢"用的同款卡片。
function related(id) {
    var html = fetchHtml(SITE + '/detail/' + id + '.html');
    var arr = parseCards(html, '');
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].id !== String(id)) out.push(arr[i]);
    }
    return JSON.stringify(out);
}

// ───────────────────────────────────────────── 播放解析

function guessType(u) {
    if (!u) return 'auto';
    var l = u.toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0) return 'mp4';
    return 'auto';
}

// 把 flag 还原成播放页 URL。
function playPageUrl(flag) {
    if (/^https?:/i.test(flag)) return flag;
    var f = String(flag).replace(/^\/+/, '').replace(/^play\//, '').replace(/\.html$/, '');
    return SITE + '/play/' + f + '.html';
}

// 从 flag（id_sid_nid）里取线路序号 sid，取不到返回 ''。
function sidOf(flag) {
    var f = String(flag).replace(/^\/+/, '').replace(/^play\//, '').replace(/\.html$/, '');
    var m = /^\d+_(\d+)_\d+/.exec(f);
    return m ? m[1] : '';
}

// 按线路决定取流方式：PLAY_MODE[sid] 优先，否则 DEFAULT_PLAY_MODE；非法值归一为 'auto'。
function playModeFor(flag) {
    var sid = sidOf(flag);
    var mode = (sid && PLAY_MODE[sid]) ? PLAY_MODE[sid] : DEFAULT_PLAY_MODE;
    mode = String(mode).toLowerCase();
    return (mode === 'direct' || mode === 'sniff') ? mode : 'auto';
}

// 去掉 m3u8/mp4 地址末尾非标准拼接的 &t=hls&ct=1 之类尾巴。
//   lmm85 的 player_aaaa.url 形如 "....m3u8&t=hls&ct=1"（注意是 & 不是 ?），
//   直接请求会 404；真正的播放地址是截到 .m3u8 为止。若已是 "?query" 形式则保留。
function cleanMedia(u) {
    if (!u) return u;
    var exts = ['.m3u8', '.mp4', '.flv', '.mkv'];
    for (var i = 0; i < exts.length; i++) {
        var idx = u.toLowerCase().indexOf(exts[i]);
        if (idx >= 0) {
            var after = u.charAt(idx + exts[i].length);
            if (after && after !== '?') return u.substring(0, idx + exts[i].length);
            return u;
        }
    }
    return u;
}

// 静态解析 player_aaaa 拿直链。
function staticPlay(pageUrl) {
    var html = fetchHtml(pageUrl);
    var conf = match(html, 'player_aaaa\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*</script>', 1)
            || match(html, 'player_aaaa\\s*=\\s*(\\{[\\s\\S]*?\\});', 1);
    var obj = conf ? (parseJson(conf) || {}) : {};
    var raw = obj.url || '';
    var enc = obj.encrypt;
    if (raw) {
        if (enc === 1 || enc === '1') raw = decodeUri(raw);
        else if (enc === 2 || enc === '2') { try { raw = decodeUri(base64Decode(raw)); } catch (ex) {} }
    }
    return cleanMedia(raw);
}

// 直链：静态解析 player_aaaa 拿真实 m3u8（cleanMedia 已去掉 &t=hls&ct=1 尾巴）。命中返回结果对象，否则 null。
function tryDirect(pageUrl) {
    var raw = staticPlay(pageUrl);
    if (raw && /^https?:/i.test(raw)) {
        log('[lmm85] direct url: ' + raw);
        return { url: raw, type: guessType(raw), referer: '' };
    }
    return null;
}

// 嗅探：WebView 在播放页上下文里跑播放器，截获真实媒体请求并带回 Referer。命中返回结果对象，否则 null。
//   ⚠ 不要伪装桌面 UA：CF 挑战会比对 UA 与浏览器指纹，"桌面 Chrome UA + Android WebView"必被
//   判为伪装而挑战循环过不去；保持 WebView 默认 UA 才能自动过非交互挑战（cf_clearance 也绑定 UA）。
//   timeout 给 20s：挑战自解约 3~6s + 真页重载 + 播放器起播，15s 偏紧。
//   ⚠ 必须开 autoPlay：jable 模板播放器停在海报上等点击，不点就永远不发 m3u8 请求（嗅探纯被动监听
//   会一直 cands=0 超时）。autoPlay=true 才会注入起播脚本——点海报/起播按钮 + 强制 video.play()，
//   并直接读 window.player_aaaa.url（苹果 CMS 解码后的 m3u8 就在这个全局变量里，不依赖播放器起播）。
function trySniff(pageUrl) {
    var hit = sniffMedia(pageUrl, JSON.stringify({
        timeout: 20000,
        autoPlay: true,
        patterns: ['\\.m3u8(\\?|$)', '\\.mp4(\\?|$)', '/m3u8', '/playlist']
    }));
    if (hit && hit.ok && hit.url) {
        log('[lmm85] sniff hit: ' + hit.url);
        // headers = 嗅探用的 UA/cookie（拼好的 JSON 字符串），带进播放防 CDN UA 校验 403
        return { url: hit.url, type: guessType(hit.url), referer: hit.referer || '', headers: hit.headers || '' };
    }
    return null;
}

// 播放解析：取流方式按线路（sid）决定，见顶部 PLAY_MODE / DEFAULT_PLAY_MODE。
//   direct=只直链，sniff=只嗅探，auto=直链优先、失败嗅探兜底。
//   注：该站把 ts 切片伪装成 PNG（切片首部 PNG 头 + 真实 TS 数据），剥头由 App 播放层
//   （本地代理 MpvLocalPlaylistServer，已对 EXO/MPV 两内核生效）统一处理，源只管拿地址。
function play(flag) {
    var mode = playModeFor(flag);
    var pageUrl = playPageUrl(flag);
    log('[lmm85] play flag=' + flag + ' sid=' + sidOf(flag) + ' mode=' + mode);

    var r = null;
    if (mode === 'direct') {
        r = tryDirect(pageUrl);
    } else if (mode === 'sniff') {
        r = trySniff(pageUrl);
    } else {                       // auto：先直链，拿不到再嗅探
        r = tryDirect(pageUrl) || trySniff(pageUrl);
    }

    if (r) { r.mode = mode; return JSON.stringify(r); }
    log('[lmm85] play failed (mode=' + mode + ')');
    return JSON.stringify({ url: '', type: 'auto', mode: mode });
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

