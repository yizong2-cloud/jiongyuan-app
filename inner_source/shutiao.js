// @key com.lanerc.shutiao
// @label 囧源·薯条
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·薯条 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 shutiao.js，经 __JB 桥适配运行。免登录 / 免广告。
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
 * 薯条 APP 源（薯条影视 / api=csp_AppDrama）——【仅动漫】
 * 协议还原自 XS/spider.jar: com.github.catvod.spider.AppDrama。
 *
 * 薯条是综合影视站（电影/剧/综艺/动漫），本源按需求只做动漫：
 *   · categories() 只暴露「动漫」一个分类（key=动漫 typeId1）+ 其筛选维度；
 *   · search() 关键词搜索只保留动漫结果（按 DramaBean.type==动漫 typeId 或 clazz 含 动漫/动画/番 过滤）。
 *
 * 实现：config / categories / search / searchFiltered / detail / play 全量。
 * 底层复用已过离线自测的手写 protobuf（ProtoWriter/ProtoReader/decodeProto）
 * + RSA 握手换动态公钥（handshake）+ 多层 AES(ECB/CBC) + iso-8859-1 字节透传，未改动。
 *
 * 关键端点（均见 AppDrama.java）：
 *   分类列表  GET  /api/v3/drama/getCategory?orderBy=type_id   e() 明文JSON头（decrypt="0" 免解密）
 *   分类浏览  POST /api/proto/v5/drama/category                g() proto（typeId1+筛选）→ DramaBeanPage
 *   搜索      POST /api/proto/v5/drama/search                  g() proto → DramaBeanPage（客户端过滤动漫）
 *   详情      POST /api/proto/v5/drama/getDetail               g() proto → DramaDetailBean
 *   取流      POST /api/proto/v5/videoUsableUrl                g() proto → ParsePlayUrlBean{playUrl,headers}
 */

var EXT = (typeof ext !== 'undefined' && ext) ? ext : {};
var HOST = (EXT.host || '').replace(/\/+$/, '');
var SITE = EXT.site || 'https://dyttandroid-1372779881.cos.ap-guangzhou.myqcloud.com/app_dyttandroid.txt';
var PUBLIC_KEY = EXT.publicKey || 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCduNEnfxGaLuQRk5ABzXHhPV43zi00sCHjLo8BYc+Wi6xXm2b4v0i28Sq4WlNCKhseft9fz8kO/qLr6/022o1RcuOU7e4GFL3U9WnNODwRBYSYWd+K8nqpI/tAUDmZEBGRWqjrc7x6aMl3A+xpnWkLbPCLsuhbuuUE3tv09oeOpwIDAQAB';
var DATA_KEY = EXT.dataKey || 'A1VACZJWDKRZY1P3MFV0DDRAZ3F3PT0=';
var DATA_IV = EXT.dataIv || 'OC1A06E197EF10CF3F6058CA7A803B5E';
var PACKAGE_NAME = EXT.pkg || 'com.st.standroid';
var APP_NAME = EXT.appName || '薯条影视';
var VERSION = EXT.version || '5.0.0.1';
var PARAM_KEY = 'ed5fdsgucxumegqa';
var TIMEOUT = 25000;

var DYNAMIC_KEY = '';
var HANDSHAKE_TRIED = false;
var ANDROID_ID = '';
var ALNUM = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// 动漫分类缓存（getCategory 解析后填充）：typeId1 + 筛选维度（写法 A）。
var ANIME_TYPE_ID = '';
var ANIME_NAME = '动漫';
var ANIME_FILTERS = null;
var ANIME_RESOLVED = false;
// 动漫 tab 的稳定 key（不随动态 typeId 变）：categories/search/searchFiltered 都认它，
// getCategory 拉不到 typeId 也能正常点进「动漫」tab（browseCategory 再懒解析真 typeId）。
var ANIME_CAT_KEY = '动漫';
// getCategory 里各筛选维度 → /drama/category 提交字段名的映射（见 AppDrama.categoryContent）。
var FILTER_KEYS = ['class', 'lang', 'area', 'year', 'extend_sort'];
var FILTER_LABEL = { 'class': '类型', 'lang': '语言', 'area': '地区', 'year': '年份', 'extend_sort': '排序' };
// getCategory 拿不到 converUrl 筛选时的兜底筛选（地区/年份），保证「动漫」tab 始终有筛选条。
var FALLBACK_FILTERS = (function () {
    var years = [{ n: '全部', v: '' }];
    for (var y = 2026; y >= 2015; y--) years.push({ n: String(y), v: String(y) });
    return [
        { key: 'area', name: '地区', value: [
            { n: '全部', v: '' }, { n: '中国大陆', v: '中国大陆' }, { n: '日本', v: '日本' },
            { n: '美国', v: '美国' }, { n: '其他', v: '其他' }
        ] },
        { key: 'year', name: '年份', value: years }
    ];
})();
// 首页精选分区（走 area 桶，全部限定动漫 typeId）。
var HOME_BUCKETS = [
    { title: '最新动漫', key: ANIME_CAT_KEY, area: '' },
    { title: '日本动漫', key: ANIME_CAT_KEY, area: '日本' },
    { title: '国产动漫', key: ANIME_CAT_KEY, area: '中国大陆' }
];

function trim(s) {
    return s == null ? '' : String(s).replace(/^\s+|\s+$/g, '');
}

function config() {
    return JSON.stringify({ browseOnly: false });
}

function randomText(length) {
    var out = '';
    for (var i = 0; i < length - 1; i++) {
        out += ALNUM.charAt(Math.floor(Math.random() * ALNUM.length));
    }
    return out + '=';
}

function androidId() {
    if (ANDROID_ID) return ANDROID_ID;
    ANDROID_ID = getItem('shutiao_aid') || '';
    if (!ANDROID_ID) {
        while (ANDROID_ID.length < 16) {
            ANDROID_ID += Math.floor(Math.random() * 16).toString(16);
        }
        ANDROID_ID = ANDROID_ID.substring(0, 16);
        setItem('shutiao_aid', ANDROID_ID);
    }
    return ANDROID_ID;
}

function utf8Encode(value) {
    var text = String(value == null ? '' : value);
    var out = '';
    for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i);
        if (code < 0x80) {
            out += String.fromCharCode(code);
        } else if (code < 0x800) {
            out += String.fromCharCode(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0xD800 || code >= 0xE000) {
            out += String.fromCharCode(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
            i++;
            var pair = text.charCodeAt(i);
            var point = 0x10000 + ((code & 0x3FF) << 10) + (pair & 0x3FF);
            out += String.fromCharCode(
                0xF0 | (point >> 18),
                0x80 | ((point >> 12) & 0x3F),
                0x80 | ((point >> 6) & 0x3F),
                0x80 | (point & 0x3F)
            );
        }
    }
    return out;
}

function utf8Decode(binary) {
    var out = '';
    var i = 0;
    while (i < binary.length) {
        var first = binary.charCodeAt(i++) & 0xFF;
        if (first < 0x80) {
            out += String.fromCharCode(first);
        } else if (first < 0xE0) {
            var second = binary.charCodeAt(i++) & 0x3F;
            out += String.fromCharCode(((first & 0x1F) << 6) | second);
        } else if (first < 0xF0) {
            var third1 = binary.charCodeAt(i++) & 0x3F;
            var third2 = binary.charCodeAt(i++) & 0x3F;
            out += String.fromCharCode(((first & 0x0F) << 12) | (third1 << 6) | third2);
        } else {
            var fourth1 = binary.charCodeAt(i++) & 0x3F;
            var fourth2 = binary.charCodeAt(i++) & 0x3F;
            var fourth3 = binary.charCodeAt(i++) & 0x3F;
            var point = (((first & 0x07) << 18) | (fourth1 << 12) | (fourth2 << 6) | fourth3) - 0x10000;
            out += String.fromCharCode(0xD800 + (point >> 10), 0xDC00 + (point & 0x3FF));
        }
    }
    return out;
}

function ProtoWriter() {
    this.bytes = [];
}

ProtoWriter.prototype.varint = function (value) {
    var n = Number(value);
    if (!isFinite(n) || n < 0) n = 0;
    n = Math.floor(n);
    while (n > 127) {
        this.bytes.push((n % 128) | 0x80);
        n = Math.floor(n / 128);
    }
    this.bytes.push(n);
};

ProtoWriter.prototype.tag = function (field, wire) {
    this.varint(field * 8 + wire);
};

ProtoWriter.prototype.string = function (field, value) {
    var binary = utf8Encode(value);
    this.tag(field, 2);
    this.varint(binary.length);
    for (var i = 0; i < binary.length; i++) {
        this.bytes.push(binary.charCodeAt(i) & 0xFF);
    }
};

ProtoWriter.prototype.number = function (field, value) {
    this.tag(field, 0);
    this.varint(value);
};

ProtoWriter.prototype.build = function () {
    var out = '';
    for (var i = 0; i < this.bytes.length; i += 8192) {
        out += String.fromCharCode.apply(null, this.bytes.slice(i, i + 8192));
    }
    return out;
};

function ProtoReader(binary) {
    this.binary = binary || '';
    this.position = 0;
}

ProtoReader.prototype.byte = function () {
    return this.binary.charCodeAt(this.position++) & 0xFF;
};

ProtoReader.prototype.varint = function () {
    var result = 0;
    var shift = 0;
    var current;
    do {
        if (this.position >= this.binary.length || shift > 56) return 0;
        current = this.byte();
        result += (current & 0x7F) * Math.pow(2, shift);
        shift += 7;
    } while (current & 0x80);
    return result;
};

function decodeProto(binary) {
    var reader = new ProtoReader(binary);
    var out = {};
    while (reader.position < reader.binary.length) {
        var key = reader.varint();
        var field = Math.floor(key / 8);
        var wire = key & 7;
        var value;
        if (!field) break;
        if (wire === 0) {
            value = reader.varint();
        } else if (wire === 2) {
            var length = reader.varint();
            if (length < 0 || reader.position + length > reader.binary.length) break;
            value = reader.binary.slice(reader.position, reader.position + length);
            reader.position += length;
        } else if (wire === 1) {
            reader.position += 8;
            value = 0;
        } else if (wire === 5) {
            reader.position += 4;
            value = 0;
        } else {
            break;
        }
        if (out[field] === undefined) out[field] = value;
        else if (Array.isArray(out[field])) out[field].push(value);
        else out[field] = [out[field], value];
    }
    return out;
}

function protoList(message, field) {
    var value = message[field];
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}

function protoString(message, field) {
    var value = message[field];
    return typeof value === 'string' ? utf8Decode(value) : '';
}

function protoNumber(message, field) {
    return typeof message[field] === 'number' ? message[field] : 0;
}

function aesEcbBase64(plain, key) {
    return crypto.aes.encrypt(plain, key, {
        mode: 'ECB',
        padding: 'PKCS7',
        keyFormat: 'utf8',
        input: 'utf8',
        output: 'base64'
    });
}

function aesCbcHex(plain, key) {
    return crypto.aes.encrypt(plain, key, {
        mode: 'CBC',
        padding: 'PKCS7',
        keyFormat: 'utf8',
        iv: key,
        ivFormat: 'utf8',
        input: 'utf8',
        output: 'hex'
    });
}

function rsaBase64(plain, key) {
    return crypto.rsa.encrypt(plain, key, { padding: 'PKCS1', output: 'base64' });
}

function deviceParams() {
    var uuid = '';
    while (uuid.length < 32) uuid += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    uuid = uuid.substring(0, 32);
    return {
        country: 'CN',
        vName: VERSION,
        cpuId: 'MT6893Z%2FCZA',
        young: 0,
        facturer: 'Xiaomi',
        pkg: PACKAGE_NAME,
        uuid: uuid,
        resolution: '1080x2272',
        mac: '02%3A00%3A00%3A00%3A00%3A00',
        abid: '397',
        model: 'M2012K11AC',
        plat: 'android',
        udid: uuid,
        dpi: '440',
        net: '1',
        lang: 'zh',
        brand: 'Xiaomi',
        density: '2.75',
        appName: APP_NAME,
        cpu: 'arm64-v8a',
        chid: '10000',
        carrier: '%E8%81%94%E9%80%9A',
        _vOsCode: 33,
        vOs: '13',
        v: 1,
        tenantId: '',
        vApp: String(VERSION).replace(/\./g, ''),
        device: 0,
        androidID: androidId()
    };
}

function protoHeaders() {
    var key = DYNAMIC_KEY || PUBLIC_KEY;
    var params = deviceParams();
    var now = timestamp();
    var random = randomText(16);
    var splitSign = aesEcbBase64(String(now) + random, DATA_IV);
    params.sig = rsaBase64(String(now) + random + params.vApp, key);
    params.random_str = random;
    params.timestamp = now;
    params.sig2 = splitSign.substring(0, 8);
    params.sig3 = splitSign.substring(8);
    return {
        'User-Agent': 'okhttp/3.12.1',
        'Accept': 'application/x-protobuf',
        'Content-Type': 'application/x-protobuf; charset=iso-8859-1',
        'publicParams': JSON.stringify({ paramsData: aesCbcHex(JSON.stringify(params), PARAM_KEY) })
    };
}

// e() 等价：明文 JSON 接口（getCategory）用的头。device params 直接 CBC(PARAM_KEY)，无 sig/握手。
function jsonHeaders() {
    var params = deviceParams();
    return {
        'User-Agent': 'okhttp/3.12.1',
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'publicParams': JSON.stringify({ paramsData: aesCbcHex(JSON.stringify(params), PARAM_KEY) })
    };
}

function queryString(params) {
    var pairs = [];
    for (var key in params) {
        if (!params.hasOwnProperty(key)) continue;
        var value = params[key];
        if (value == null || String(value) === '') continue;
        pairs.push(key + '=' + value);
    }
    return pairs.join('&');
}

function secureRequest(params) {
    var now = timestamp();
    var random = randomText(8);
    var encrypted = random + aesEcbBase64(queryString(params) + now, DATA_KEY);
    var writer = new ProtoWriter();
    writer.string(1, encrypted.substring(0, 20));
    writer.string(2, encrypted.substring(20));
    writer.string(3, randomText(20));
    writer.number(4, now);
    writer.string(5, random);
    return writer.build();
}

function rsaRequest() {
    var now = timestamp();
    var random = randomText(16);
    var writer = new ProtoWriter();
    writer.number(1, now);
    writer.string(2, rsaBase64(String(now) + random, PUBLIC_KEY));
    writer.string(3, randomText(16));
    writer.string(4, random);
    writer.string(5, randomText(16));
    return writer.build();
}

function resolveHost() {
    if (HOST || !SITE) return;
    try {
        var response = request(SITE, JSON.stringify({ timeout: 8000 }));
        var data = parseJson(response) || {};
        if (data.domain) HOST = trim(data.domain).replace(/\/+$/, '');
    } catch (e) {
        log('[shutiao] resolve host failed: ' + e);
    }
}

function handshake() {
    if (!HOST) return false;
    try {
        var response = http.post2(
            HOST + '/api/v5/find/app/zone',
            rsaRequest(),
            JSON.stringify({ headers: protoHeaders(), charset: 'iso-8859-1', timeout: TIMEOUT })
        );
        if (!response) return false;
        var envelope = decodeProto(response);
        if (typeof envelope[3] !== 'string') return false;
        var keyParts = decodeProto(envelope[3]);
        DYNAMIC_KEY = protoString(keyParts, 2) + protoString(keyParts, 3) + protoString(keyParts, 4) + protoString(keyParts, 5);
        return !!DYNAMIC_KEY;
    } catch (e) {
        log('[shutiao] handshake failed: ' + e);
        return false;
    }
}

// 握手只为「升级到动态公钥」，best-effort：失败也绝不阻断后续请求。
// protoHeaders() 在 DYNAMIC_KEY 为空时回退用 PUBLIC_KEY 签名，实测服务端对 PUBLIC_KEY 签名的
// category/search/getDetail/videoUsableUrl 同样放行（code=200 出数据）；而 /api/v5/find/app/zone
// 握手端点在真机上常年返回「RSA解密失败」。旧实现 `if(!DYNAMIC_KEY && !handshake()) return []`
// 会因握手必败而直接返回空 → 整源不出任何数据。HANDSHAKE_TRIED 保证一次会话只试一次、不反复白打。
function ensureHandshake() {
    if (DYNAMIC_KEY || HANDSHAKE_TRIED) return;
    HANDSHAKE_TRIED = true;
    try { handshake(); } catch (e) { log('[shutiao] handshake err(ignored): ' + e); }
}

function protoPost(path, params) {
    try {
        var response = http.post2(
            HOST + path,
            secureRequest(params),
            JSON.stringify({ headers: protoHeaders(), charset: 'iso-8859-1', timeout: TIMEOUT })
        );
        if (!response) return '';
        var envelope = decodeProto(response);
        return typeof envelope[3] === 'string' ? envelope[3] : '';
    } catch (e) {
        log('[shutiao] request failed ' + path + ': ' + e);
        return '';
    }
}

function mapDrama(binary) {
    var drama = decodeProto(binary);
    var pic = '';
    if (typeof drama[2] === 'string') {
        // DramaCoverImageBean: path=1, thumbnail_path=2
        var cover = decodeProto(drama[2]);
        pic = protoString(cover, 2) || protoString(cover, 1);
    }
    // DramaBean 字段号：id=3 name=5 type=8(分类type_id,int) remark=13 year=14(int) clazz=15
    var year = protoNumber(drama, 14);
    var clazz = protoString(drama, 15);
    return {
        id: String(protoNumber(drama, 3)),
        name: protoString(drama, 5),
        pic: pic,
        remarks: protoString(drama, 13),
        year: year ? String(year) : '',
        type: clazz,                 // 展示用分类名（如「动漫」）
        desc: '',
        _typeId: protoNumber(drama, 8)   // 供动漫过滤，parseList 会忽略下划线字段
    };
}

/** 是否动漫：命中动漫分类 type_id，或分类名(clazz)含 动漫/动画/番。 */
function isAnimeItem(item) {
    if (!item) return false;
    if (ANIME_TYPE_ID && String(item._typeId) === String(ANIME_TYPE_ID)) return true;
    return /动漫|动画|番/.test(item.type || '');
}

var MEDIA_RE = /\.(mp4|m3u8|flv|mkv|avi|ts|mov|mpd|m4a|wmv)(\?.*)?$/i;
function isMediaUrl(u) {
    return MEDIA_RE.test(String(u == null ? '' : u));
}
function guessType(u) {
    var l = String(u == null ? '' : u).toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0) return 'mp4';
    return 'auto';
}

function mapPage(binary) {
    var out = [];
    if (!binary) return out;
    var page = decodeProto(binary);
    var dramas = protoList(page, 1);
    for (var i = 0; i < dramas.length; i++) {
        if (typeof dramas[i] !== 'string') continue;
        var item = mapDrama(dramas[i]);
        if (item.id !== '0' && item.name) out.push(item);
    }
    return out;
}

function fallbackSearch(keyword, page) {
    try {
        var url = HOST + '/api/v3/debug/drama/search?searchKeys=' + encodeURIComponent(keyword) +
            '&page=' + (page || 1) + '&pagesize=21';
        var raw = request(url, JSON.stringify({ headers: { 'User-Agent': 'okhttp/3.12.1' }, timeout: TIMEOUT }));
        var response = parseJson(raw) || {};
        var list = response.data && response.data.list ? response.data.list : [];
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var drama = list[i] || {};
            if (drama.id == null || !drama.name) continue;
            var cover = drama.coverImage || {};
            out.push({
                id: String(drama.id),
                name: String(drama.name),
                pic: cover.thumbnailPath || cover.path || '',
                remarks: drama.remark || '',
                year: drama.year || '',
                type: drama.clazz || '',
                desc: drama.brief || ''
            });
        }
        return out;
    } catch (e) {
        log('[shutiao] fallback search failed: ' + e);
        return [];
    }
}

// 只保留动漫。ANIME_TYPE_ID 已知 → 按分类 type_id 精确过滤；未知 → 退化为 clazz 名正则。
function filterAnime(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
        if (isAnimeItem(items[i])) out.push(items[i]);
    }
    return out;
}

/* ───────────────────────────── 分类（仅动漫） ───────────────────────────── */

// GET /api/v3/drama/getCategory：明文 JSON，解析出动漫分类 typeId1 + 其筛选维度。
// 只解析一次，结果缓存进模块变量（并持久化 typeId 便于下次直接命中）。
function resolveAnimeCategory() {
    if (ANIME_RESOLVED) return;
    ANIME_RESOLVED = true;
    resolveHost();
    if (!HOST) { ANIME_RESOLVED = false; return; }
    // 先吃持久化缓存（仅 typeId；筛选项每次现拉，站点会调整）
    if (!ANIME_TYPE_ID) ANIME_TYPE_ID = getItem('shutiao_anime_type') || '';
    try {
        var raw = request(
            HOST + '/api/v3/drama/getCategory?orderBy=type_id',
            JSON.stringify({ headers: jsonHeaders(), timeout: TIMEOUT })
        );
        var data = (parseJson(raw) || {}).data;
        if (!data || !data.length) return;
        for (var i = 0; i < data.length; i++) {
            var cat = data[i] || {};
            var name = trim(cat.name);
            if (!name || name === '公告') continue;
            if (!/动漫|动画|番/.test(name)) continue;
            ANIME_TYPE_ID = String(cat.id);
            ANIME_NAME = name;
            ANIME_FILTERS = parseCategoryFilters(cat.converUrl);
            setItem('shutiao_anime_type', ANIME_TYPE_ID);
            return;
        }
    } catch (e) {
        log('[shutiao] resolve anime category failed: ' + e);
    }
}

// converUrl 是一段 JSON 字符串，形如 {"class":"动作,喜剧","area":"日本,大陆","year":"2024,2023",...}。
// 分隔符：线上实测各维度用「,」逗号分隔（如 class="情感,科幻,热血,…"），反编译 spec 记的是
// 「|」(字节124)——两者取其一即可能出现，这里同时兼容 , 与 |（谁都不命中时整串当单选项）。
function parseCategoryFilters(converUrl) {
    var cu = trim(converUrl);
    if (!cu) return null;
    var obj = parseJson(cu);
    if (!obj) return null;
    var filters = [];
    for (var i = 0; i < FILTER_KEYS.length; i++) {
        var k = FILTER_KEYS[i];
        var val = trim(obj[k]);
        if (!val) continue;
        var parts = val.split(/[|,]/);
        var options = [{ n: '全部', v: '' }];
        for (var j = 0; j < parts.length; j++) {
            var p = trim(parts[j]);
            if (p) options.push({ n: p, v: p });
        }
        if (options.length > 1) {
            filters.push({ key: k, name: FILTER_LABEL[k] || k, value: options });
        }
    }
    return filters.length ? filters : null;
}

// 是否「动漫分类」的 key：稳定 key「动漫」、空串（首页推荐）、或动态解析出的真 typeId 都算。
function isAnimeCatKey(key) {
    var k = trim(key);
    if (!k || k === ANIME_CAT_KEY) return true;
    return !!(ANIME_TYPE_ID && k === String(ANIME_TYPE_ID));
}

// 保留「推荐」首页 tab（key=""）+「动漫」tab（key=稳定值「动漫」，不用动态 typeId 当 key，
// 避免 getCategory 拉不到 typeId 时 tab 点不动）。筛选优先用 getCategory 拉到的，拉不到用兜底。
function categories() {
    resolveAnimeCategory();
    var filters = (ANIME_FILTERS && ANIME_FILTERS.length) ? ANIME_FILTERS : FALLBACK_FILTERS;
    return JSON.stringify([
        { key: '', title: '推荐' },
        { key: ANIME_CAT_KEY, title: ANIME_NAME || '动漫', filters: filters }
    ]);
}

// 分类浏览：POST /api/proto/v5/drama/category（typeId1=动漫 + 可选筛选）→ DramaBeanPage。
// filterMap 里的键是 getCategory 维度名（class/lang/area/year/extend_sort）。
function browseCategory(page, filterMap) {
    resolveHost();
    if (!HOST) return [];
    resolveAnimeCategory();
    ensureHandshake();
    var f = filterMap || {};
    var params = {
        pagesize: '21',
        typeId1: ANIME_TYPE_ID,   // 拉不到就空，服务端可能返回全站 → 下方兜一层动漫过滤
        page: String(page || 1),
        vodOrderBy: trim(f['extend_sort']) || '最新',
        vodArea: trim(f['area']),
        vodLang: trim(f['lang']),
        vodClass: trim(f['class']),
        vodYear: trim(f['year'])
    };
    var result = protoPost('/api/proto/v5/drama/category', params);
    var items = mapPage(result);
    // typeId1 已限定动漫；万一 typeId 未解析出来（空）则本地兜一层动漫过滤
    return ANIME_TYPE_ID ? items : filterAnime(items);
}

// 首页「精选」分区：多行横滑（最新/日本/国产动漫），全部限定动漫。key 用稳定「动漫」对齐 tab。
function homeSections() {
    resolveHost();
    if (!HOST) return JSON.stringify([]);
    var out = [];
    for (var i = 0; i < HOME_BUCKETS.length; i++) {
        var b = HOME_BUCKETS[i];
        var items = browseCategory(1, { area: b.area });
        if (items.length) out.push({ title: b.title, key: b.key, items: items.slice(0, 12) });
    }
    return JSON.stringify(out);
}

function search(keyword, page) {
    var key = trim(keyword);
    resolveHost();
    if (!HOST) return JSON.stringify([]);
    resolveAnimeCategory();
    // 空关键词 / 「动漫」tab key / 动态 typeId（首页 tab 无筛选浏览走 search(cat.key)）→ 分类浏览
    if (isAnimeCatKey(key)) {
        return JSON.stringify(browseCategory(page || 1, null));
    }
    // 真·关键词搜索：/drama/search 返回全站结果，客户端只留动漫
    ensureHandshake();
    var result = protoPost('/api/proto/v5/drama/search', {
        searchKeys: key,
        page: String(page || 1),
        pagesize: '21'
    });
    var items = filterAnime(mapPage(result));
    if (!items.length) items = filterAnime(fallbackSearch(key, page || 1));
    return JSON.stringify(items);
}

// 首页 tab 选了筛选 → searchFiltered(category, filtersJson, page)。category 是「动漫」稳定 key。
function searchFiltered(category, filtersJson, page) {
    resolveHost();
    if (!HOST) return JSON.stringify([]);
    resolveAnimeCategory();
    var f = parseJson(filtersJson) || {};
    return JSON.stringify(browseCategory(page || 1, f));
}

/* ───────────────────────────── 详情 / 取流 ───────────────────────────── */

// detail(id)：POST /api/proto/v5/drama/getDetail → DramaDetailBean。按线路(source_cn)给每集打 route。
function detail(id) {
    var vid = trim(id);
    var out = { id: vid, name: '', pic: '', desc: '', year: '', remarks: '', episodes: [] };
    resolveHost();
    if (!HOST) return JSON.stringify(out);
    ensureHandshake();
    var data = protoPost('/api/proto/v5/drama/getDetail', { id: vid });
    if (!data) return JSON.stringify(out);
    // DramaDetailBean 字段号：area=1 cover=2 id=4 intro=6 brief=7 name=9 director=12 tag=13
    //                        type=14 year=18 actor=25 remark=26 videos=29
    var d = decodeProto(data);
    out.name = protoString(d, 9);
    if (typeof d[2] === 'string') {
        var cover = decodeProto(d[2]);
        out.pic = protoString(cover, 2) || protoString(cover, 1);
    }
    var year = protoNumber(d, 18);
    out.year = year ? String(year) : '';
    out.remarks = protoString(d, 26);
    out.desc = protoString(d, 6) || protoString(d, 7);

    var videos = protoList(d, 29);
    for (var i = 0; i < videos.length; i++) {
        if (typeof videos[i] !== 'string') continue;
        // DramaVideoBean 字段号：title=2 path=4 source=9 source_cn=10
        var v = decodeProto(videos[i]);
        var title = protoString(v, 2);
        var path = protoString(v, 4);
        var source = protoString(v, 9);
        var sourceCn = protoString(v, 10) || '橘汁';
        if (!path) continue;
        var flag = path;
        // 非直链媒体后缀 → base64(JSON{vodPlayFrom,playUrl}) 作 play() 的 flag（同 AppDrama）
        if (!isMediaUrl(path)) {
            flag = crypto.base64.encode(JSON.stringify({ vodPlayFrom: source, playUrl: path }), { input: 'utf8' });
        }
        out.episodes.push({ name: title || ('第' + (i + 1) + '集'), url: flag, route: sourceCn });
    }
    return JSON.stringify(out);
}

// ParsePlayUrlBean.headers 是 proto map<string,string>（field 6，重复的 {1:key,2:value} 条目）。
function parseHeadersMap(bean) {
    var entries = protoList(bean, 6);
    var map = {};
    for (var i = 0; i < entries.length; i++) {
        if (typeof entries[i] !== 'string') continue;
        var e = decodeProto(entries[i]);
        var k = protoString(e, 1);
        var val = protoString(e, 2);
        if (k) map[k] = val;
    }
    return map;
}

// play(flag)：直链后缀直接返回；否则 base64→{vodPlayFrom,playUrl}→videoUsableUrl 取真实流 + 头。
function play(flag) {
    var f = String(flag == null ? '' : flag);
    if (isMediaUrl(f)) return JSON.stringify({ url: f, type: guessType(f) });

    var payload = null;
    try {
        payload = parseJson(crypto.base64.decode(f, { output: 'utf8' }));
    } catch (e) {
        payload = null;
    }
    if (!payload || !payload.playUrl) {
        // 兜底：解不出结构就当直链
        return JSON.stringify({ url: f, type: guessType(f) });
    }

    resolveHost();
    if (!HOST) return JSON.stringify({ url: '', type: 'auto' });
    ensureHandshake();
    var data = protoPost('/api/proto/v5/videoUsableUrl', {
        vodPlayFrom: payload.vodPlayFrom || '',
        playUrl: payload.playUrl
    });
    if (!data) return JSON.stringify({ url: '', type: 'auto' });
    // ParsePlayUrlBean：play_url=1, headers=6(map)
    var bean = decodeProto(data);
    var url = protoString(bean, 1);
    var res = { url: url, type: guessType(url) };
    var headers = parseHeadersMap(bean);
    var hasHeader = false, hj = {};
    for (var k in headers) {
        if (!headers.hasOwnProperty(k)) continue;
        hj[k] = headers[k];
        hasHeader = true;
        if (/^referer$/i.test(k)) res.referer = headers[k];
    }
    if (hasHeader) res.headers = JSON.stringify(hj);
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

