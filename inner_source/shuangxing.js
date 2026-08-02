// @key com.lanerc.shuangxing
// @label 囧源·双星
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·双星 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 shuangxing.js，经 __JB 桥适配运行。免登录 / 免广告。
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
 * 双星 APP（双子星动漫）搜索源
 * 协议还原自 XS/spider.jar: com.github.catvod.spider.App99。
 * 实现 config()/categories()/search()/searchFiltered()/detail()/play()。
 * 全站即动漫：categories() 暴露站点全部分类，type 统一『动漫』。
 *
 * 加解密/签名 helper（encryptBody/decryptBody/requestHeaders/apiPost）为上次已离线自测通过的
 * 版本，本次做外科式增强、未改动：AES-256-CBC 随机 IV + zlib(inflate) + sha256 签名。
 */

var EXT = (typeof ext !== 'undefined' && ext) ? ext : {};
var HOST = (EXT.host || 'http://175.178.65.250:19987/app/bn').replace(/\/+$/, '');
var APPKEY = EXT.appkey || 'f66f65db127e48449f073c2c6eb0f993';
var VERSION_NAME = EXT.versionName || '6.4.5';
var APP_NAME = EXT.name || '双子星动漫';
var BUILD_SIGNATURE = EXT.buildSignature || '054FA8DDA4319C6B6A9B954CA5777541C993F00B1B0BD4394F7EDE48184C4594';
var BUILD_NUMBER = EXT.buildNumber || '2003';
var PACKAGE_NAME = EXT['package'] || 'com.yingfu.mobile.android.pgsp';
var LOGIN_PATH = EXT.LoginPath || '/app/log';
var HEADER_VERSION = EXT.version || VERSION_NAME;
var UA = EXT.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6299.95 Safari/537.36';
var TIMEOUT = 25000;

var RANDOM_COUNTER = 0;
var UUID = makeUuid();
var AES_KEY = UUID.replace(/-/g, '');
var TOKEN = '';
var SESSION_READY = false;

// systemInit 下发并缓存（对齐 App99.init 的 g["player"]/g["parses"]/g["categories"]）：
//  PLAYER     线路配置对象，按线路 code 为键，值含 {code,name,type,parseUrl}
//  PARSES     解析器数组（parser_api），每项 {id,...}，type!=0 线路走 /app/vodParser 时用
//  CATEGORIES 站点分类数组（categorys.data），每项 {id,name,type_extend:{class,areas,lang,years}}
var PLAYER = null;
var PARSES = null;
var CATEGORIES = null;

// 分类 key 前缀：categories() 下发的分类 key 形如 '@'+分类id，search() 见此前缀走分类浏览
// （对齐 xifan.js 的 '@' 约定，避免与真实搜索关键词混淆）。
var CAT_PREFIX = '@';

// 分类名黑名单：systemInit categorys.data 里混有「公告」「动漫资讯」等非影片栏目，
// categories() 里按名称包含匹配剔除（只留可浏览的动漫分类，用户要求）。
var CATEGORY_NAME_BLOCKLIST = ['\u516C\u544A', '\u8D44\u8BAF'];

function trim(s) {
    return s == null ? '' : String(s).replace(/^\s+|\s+$/g, '');
}

function config() {
    return JSON.stringify({ browseOnly: false });
}

function randomHex(bytes) {
    var out = '';
    while (out.length < bytes * 2) {
        out += md5(String(timestamp()) + ':' + Math.random() + ':' + (RANDOM_COUNTER++));
    }
    return out.substring(0, bytes * 2);
}

function makeUuid() {
    var h = randomHex(16);
    return h.substring(0, 8) + '-' + h.substring(8, 12) + '-' + h.substring(12, 16) + '-' + h.substring(16, 20) + '-' + h.substring(20, 32);
}

function nonce() {
    return crypto.base64.encode(randomHex(16), { input: 'hex' });
}

function encryptBody(plain) {
    var ivHex = randomHex(16);
    var cipherHex = crypto.aes.encrypt(plain, AES_KEY, {
        mode: 'CBC',
        padding: 'PKCS5',
        keyFormat: 'utf8',
        iv: ivHex,
        ivFormat: 'hex',
        input: 'utf8',
        output: 'hex'
    });
    return crypto.base64.encode(ivHex + cipherHex, { input: 'hex' });
}

function decryptBody(encoded) {
    if (!encoded) return '';
    try {
        var rawHex = crypto.hex.encode(encoded, { input: 'base64' });
        if (!rawHex || rawHex.length <= 32) return '';
        var ivHex = rawHex.substring(0, 32);
        var cipherHex = rawHex.substring(32);
        var decryptedBase64 = crypto.aes.decrypt(cipherHex, AES_KEY, {
            mode: 'CBC',
            padding: 'PKCS5',
            keyFormat: 'utf8',
            iv: ivHex,
            ivFormat: 'hex',
            input: 'hex',
            output: 'base64'
        });
        try {
            var inflated = crypto.inflate(decryptedBase64, { input: 'base64', output: 'utf8' });
            if (inflated) return inflated;
        } catch (ignored) {
        }
        return crypto.aes.decrypt(cipherHex, AES_KEY, {
            mode: 'CBC',
            padding: 'PKCS5',
            keyFormat: 'utf8',
            iv: ivHex,
            ivFormat: 'hex',
            input: 'hex',
            output: 'utf8'
        });
    } catch (e) {
        log('[shuangxing99] decrypt failed: ' + e);
        return '';
    }
}

function requestHeaders(encodedBody, now, requestNonce) {
    return {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'client_type': 'android',
        'uuid': UUID,
        'timestamp': now,
        'sign': sha256(encodedBody + ':' + now + ':' + requestNonce + ':' + TOKEN + ':' + APPKEY),
        'nonce': requestNonce,
        'appkey': APPKEY,
        'version': HEADER_VERSION,
        'api_version': 'v1'
    };
}

function apiPost(path, data) {
    try {
        var now = String(timestamp());
        var requestNonce = nonce();
        var body = data || {};
        body.timestamp = now;
        body.nonce = requestNonce;
        var encodedBody = encryptBody(JSON.stringify(body));
        var raw = post(
            HOST + path,
            encodedBody,
            JSON.stringify({ headers: requestHeaders(encodedBody, now, requestNonce), timeout: TIMEOUT })
        );
        return parseJson(decryptBody(raw));
    } catch (e) {
        log('[shuangxing99] request failed ' + path + ': ' + e);
        return null;
    }
}

function login() {
    var now = timestamp();
    var response = apiPost(LOGIN_PATH, {
        os: 'android',
        name: 'xiaomi',
        version: '15',
        sdkInt: 32,
        device: 'xiaomi',
        brand: 'xiaomi',
        manufacturer: 'xiaomi',
        product: 'b0q',
        hardware: 'xiaomi',
        isPhysicalDevice: true,
        androidId: 'V417IR',
        bootloader: 'unknown',
        display: 'V417IR release-keys',
        host: 'a11-gz01-test',
        tags: 'release-keys',
        type: 'user',
        finger: 'xiaomi/b0q/b0q:15/V619IR/613:user/release-keys',
        app: {
            version: VERSION_NAME,
            name: APP_NAME,
            'package': PACKAGE_NAME,
            buildNumber: BUILD_NUMBER,
            buildSignature: BUILD_SIGNATURE,
            install: now,
            update: now
        },
        did: makeUuid(),
        apiVersion: 'v2',
        channel: '',
        token: ''
    }) || {};
    if (response.userInfo && response.userInfo.user_token) {
        TOKEN = String(response.userInfo.user_token);
        SESSION_READY = true;
    }
}

function ensureSession() {
    if (SESSION_READY) return;
    // systemInit 用空 token 签名（对齐 App99：init 里 this.b 尚为空），
    // 顺带把 player / parser_api / categorys.data 缓存下来给 categories()/detail()/play() 用。
    var sys = apiPost('/app/systemInit', {
        v: VERSION_NAME,
        n: APP_NAME,
        s: BUILD_SIGNATURE,
        pl: '1',
        apiVersion: 'v2',
        token: ''
    });
    if (sys) {
        if (sys.player) PLAYER = sys.player;
        if (sys.parser_api) PARSES = sys.parser_api;
        if (sys.categorys && sys.categorys.data) CATEGORIES = sys.categorys.data;
    }
    if (!TOKEN) login();
}

function guessType(u) {
    var l = (u || '').toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0) return 'mp4';
    return 'auto';
}

function mapItems(list) {
    var out = [];
    if (!list || !list.length) return out;
    for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        if (item.id == null || !item.name) continue;
        out.push({
            id: String(item.id),
            name: String(item.name),
            pic: item.pic || '',
            remarks: item.remarks || '',
            year: item.year || '',
            // 全站即动漫（铁律：只做动漫）——type 统一『动漫』，不再用 class 当类型标签
            type: '\u52A8\u6F2B',
            desc: item.blurb || ''
        });
    }
    return out;
}

// ───────────────────────── 分类 / 筛选 ─────────────────────────

// 往 groups 里追加一个筛选维度（写法 A）：values 为 systemInit type_extend 里的字符串数组，
// 首项补「全部」(v:'')。空数组不生成维度（避免露出空筛选行）。
function addFilterGroup(groups, key, name, values) {
    if (!values || !values.length) return;
    var opts = [{ n: '\u5168\u90E8', v: '' }];
    for (var i = 0; i < values.length; i++) {
        var s = values[i];
        if (s == null || s === '') continue;
        opts.push({ n: String(s), v: String(s) });
    }
    if (opts.length > 1) groups.push({ key: key, name: name, value: opts });
}

// 分类名是否命中黑名单（含即剔除）：公告 / 动漫资讯 等非影片栏目不进分类 tab。
function isBlockedCategory(name) {
    for (var i = 0; i < CATEGORY_NAME_BLOCKLIST.length; i++) {
        if (name.indexOf(CATEGORY_NAME_BLOCKLIST[i]) >= 0) return true;
    }
    return false;
}

// categories()：暴露双子星站点全部分类（来自 systemInit categorys.data），每类带
// 类型/地区/语言/年份筛选（写法 A）。首项「推荐」= 空 key，走 search('') 拉推荐列表。
// 「公告」「动漫资讯」等非影片栏目按名称剔除（见 CATEGORY_NAME_BLOCKLIST）。
function categories() {
    ensureSession();
    var arr = [{ key: '', title: '\u63A8\u8350' }];
    var cats = CATEGORIES || [];
    for (var i = 0; i < cats.length; i++) {
        var c = cats[i] || {};
        if (c.id == null || !c.name) continue;
        if (isBlockedCategory(String(c.name))) continue;   // 剔除 公告 / 动漫资讯 等非影片栏目
        var entry = { key: CAT_PREFIX + String(c.id), title: String(c.name) };
        var te = c.type_extend || {};
        var groups = [];
        addFilterGroup(groups, 'class', '\u7C7B\u578B', te['class']);
        addFilterGroup(groups, 'area', '\u5730\u533A', te.areas);
        addFilterGroup(groups, 'lang', '\u8BED\u8A00', te.lang);
        addFilterGroup(groups, 'year', '\u5E74\u4EFD', te.years);
        if (groups.length) entry.filters = groups;
        arr.push(entry);
    }
    return JSON.stringify(arr);
}

// 分类浏览：POST /vod/search + pid + isCategory（对齐 App99 categoryContent/homeContent）。
// filters 为已选筛选 {class,area,lang,year}；App99 原生只按 pid 取分类、并不下发这些维度，
// 这里在用户选了具体值时附带发送——服务端支持即生效，不支持则被忽略退化为按分类浏览
// （与原 App 行为一致）。⚠ 需真机联网复核筛选维度是否真被服务端消费。
function categoryBrowse(pid, page, filters) {
    ensureSession();
    var body = {
        kw: '',
        page: page || 1,
        limit: 21,
        pid: String(pid),
        orderBy: 'time',
        isCategory: 1,
        token: TOKEN
    };
    if (filters) {
        if (filters['class']) body['class'] = filters['class'];
        if (filters.area) body.area = filters.area;
        if (filters.lang) body.lang = filters.lang;
        if (filters.year) body.year = filters.year;
    }
    var result = apiPost('/vod/search', body) || {};
    return mapItems(result.data);
}

function search(keyword, page) {
    var key = trim(keyword);
    // 分类浏览：'@'+分类id（categories() 下发的 key）→ /vod/search + pid
    if (key.charAt(0) === CAT_PREFIX) {
        return JSON.stringify(categoryBrowse(key.substring(1), page, null));
    }
    // 推荐/精选（空关键词）：对齐 App99 homeContent 用 pid='1' 拉推荐列表，
    // 避免首页判空触发「坏源自动跳源」。
    if (!key) {
        return JSON.stringify(categoryBrowse('1', page, null));
    }
    ensureSession();
    var result = apiPost('/vod/search', {
        kw: key,
        page: page || 1,
        limit: 21,
        orderBy: 'vod_hits_month',
        sort: 'desc',
        token: TOKEN
    }) || {};
    return JSON.stringify(mapItems(result.data));
}

// searchFiltered：分类 tab 里选了筛选后调用。category = categories() 下发的 key（'@'+pid）。
function searchFiltered(category, filtersJson, page) {
    var cat = trim(category);
    var pid = cat.charAt(0) === CAT_PREFIX ? cat.substring(1) : (cat || '1');
    var f = parseJson(filtersJson) || {};
    return JSON.stringify(categoryBrowse(pid, page, f));
}

// ───────────────────────── 详情 / 播放 ─────────────────────────

// detail：POST /vod/detail → data。play_from（$$$ 分线路 code）+ play_url（$$$ 分线路、
// # 分集、$ 分「集名$地址」）。
//
// ⚠ flag 构造与 App99 的差异（关键）：App99 跑在 CatVod/TVBox 框架内，vod_play_url 的
// 每集是「显示名$播放flag」，框架点集时会**按首个 $ 切掉显示名**，只把后半段交给
// playerContent——所以 Java 里 split("@")[0] 拿到的其实是纯地址。而 Lanerc 是把
// episode.url **原样**传给 play(flag)（无框架级切名），故这里 flag 里**不含**「集名$」
// 前缀，直接拼「{地址/ID}@{线路code}@{片名}@{集号}」；集名放到 episode.name。
// 若照抄 Java 的「名$址@…」，play 会把「名$址」整段当地址/丢给解析器 → 播放失败。
// route = 线路显示名。
function detail(id) {
    ensureSession();
    var out = { id: String(id), name: '', pic: '', desc: '', type: '\u52A8\u6F2B', year: '', remarks: '', episodes: [] };
    var resp = apiPost('/vod/detail', {
        id: String(id),
        eps: '1',
        v: '2.0.0',
        pl: 1,
        token: TOKEN
    }) || {};
    var d = resp.data;
    if (!d) return JSON.stringify(out);
    out.name = d.name != null ? String(d.name) : '';
    out.pic = d.pic || '';
    out.year = d.year != null ? String(d.year) : '';
    out.remarks = d.remarks || '';
    out.desc = d.content || d.blurb || '';
    var vodName = out.name;
    // 线路 code → 显示名：systemInit player[*].{code,name}（对齐 App99 detailContent）
    var codeToName = {};
    if (PLAYER) {
        for (var pk in PLAYER) {
            var pv = PLAYER[pk] || {};
            var pc = trim(pv.code);
            if (pc) codeToName[pc] = trim(pv.name) || pc;
        }
    }
    var fromArr = String(d.play_from || '').split('$$$');
    var urlArr = String(d.play_url || '').split('$$$');
    for (var i = 0; i < urlArr.length; i++) {
        var code = i < fromArr.length ? trim(fromArr[i]) : '';
        var lineName = codeToName[code] || code || ('\u7EBF\u8DEF' + (i + 1));
        var epStrs = urlArr[i].split('#');
        for (var j = 0; j < epStrs.length; j++) {
            var seg = epStrs[j];
            if (!seg) continue;
            var dollar = seg.indexOf('$');
            var epName = dollar >= 0 ? seg.substring(0, dollar) : ('\u7B2C' + (j + 1) + '\u96C6');
            var epBody = dollar >= 0 ? seg.substring(dollar + 1) : seg;
            if (!epBody) continue;
            // 集号：从集名抽数字，无数字用 '1'（对齐 App99 的 \D+ 剔除逻辑，用于弹幕定位）
            var idx = epName.replace(/\D+/g, '');
            if (!idx) idx = '1';
            // flag = {地址/ID}@{线路code}@{片名}@{集号}（不含集名前缀，见上方 ⚠ 说明）
            var flag = epBody + '@' + code + '@' + vodName + '@' + idx;
            out.episodes.push({ name: epName, url: flag, route: lineName });
        }
    }
    return JSON.stringify(out);
}

// play：按 @ 拆 flag → [urlId, 线路code, 片名, 集号]。查 systemInit player[线路code]：
// type==0 直连（urlId 即地址）；type!=0 遍历 parser_api（受 player.parseUrl 白名单约束）
// POST /app/vodParser 取 data(http 直链)。type 判断用 Number(type||0)===0（对齐 Java optInt）。
function play(flag) {
    ensureSession();
    var f = String(flag || '');
    var at = f.split('@');
    var urlId = at[0] || '';
    var code = at.length > 1 ? at[1] : '';
    var res = { url: '', type: 'auto' };

    // 线路配置：优先按 code 直接取键；取不到再按 value.code 扫描兜底
    var pobj = null;
    if (PLAYER) {
        pobj = PLAYER[code];
        if (!pobj) {
            for (var pk in PLAYER) {
                var pv = PLAYER[pk] || {};
                if (trim(pv.code) === code) { pobj = pv; break; }
            }
        }
    }
    var type = pobj ? Number(pobj.type || 0) : 0;
    if (type === 0) {
        res.url = urlId;
        res.type = guessType(urlId);
        return JSON.stringify(res);
    }

    // parseUrl 白名单（逗号分隔的解析器 id）；空 = 允许全部解析器
    var allow = (pobj && pobj.parseUrl) ? String(pobj.parseUrl).split(',') : [];
    if (PARSES && PARSES.length) {
        for (var i = 0; i < PARSES.length; i++) {
            var parser = PARSES[i] || {};
            var pid = String(parser.id);
            if (allow.length && allow.indexOf(pid) < 0) continue;
            var r = apiPost('/app/vodParser', {
                id: Number(parser.id),
                url: urlId,
                token: TOKEN
            }) || {};
            var data = r.data;
            if (data && String(data).indexOf('http') === 0) {
                res.url = String(data);
                res.type = guessType(res.url);
                return JSON.stringify(res);
            }
        }
    }
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

