// @key com.lanerc.guazi
// @label 囧源·瓜子
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·瓜子 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 guazi.js，经 __JB 桥适配运行。免登录 / 免广告。
//
var ext = {"hosts":"https://apinew.uozvr.com,https://api.w32z7vtd.com,https://api.6a7nnf7.com,https://api.umygrx3.com,https://api.rmedphk.com"};
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
 * 瓜子影视（“瓜子｜影视”）JS 源
 * 原型：TVBox spider  csp_Gz360，2026-07-17 按 ls125781003/tbapi1 瓜子影视.py 对齐当前线上协议
 * version: 2.0.0
 *   2.0.0：站点/App 大版本升级，旧协议整体失效，按 py 参考重写鉴权与握手——
 *     · 头部升到新 App 版本（Version=2604028 / Ver=3.0.3.2 / 新包名 + code/deviceId/lang/api-ver）；
 *     · token 不再写死：首次用随机设备 signUp + refresh 动态领取，进程内缓存（切源/重启自然重领）；
 *     · keys 不再写死：每次请求用站点 RSA 公钥现加密 {iv,key}（PKCS1）得到，签名随之同步；
 *     · 多域名容灾：主 apinew.uozvr.com + 4 个备用，失败自动轮换；
 *     · request_key 改大写 hex（对齐 py，签名/请求体同源一致）；
 *     · 播放头补 Referer（CDN 防盗链）。
 *   1.1.1：detail 结果进程内缓存，避免简介回填/播放/重进对同一剧反复重拉选集（保留）。
 *
 * ⚠️ 站点是综合影视站（电影/国产剧/动漫/综艺/短剧），本源【只出动漫】：
 *   - 首页/分类：固定 tid=3，sub 走动漫二级类（30中国动漫 / 31日本动漫 / 33欧美动漫）；
 *     ⚠️ sub 不能传 0（实测 sub=0 会返回综艺等杂项），所以三个 tab 各自钉死 sub。
 *   - 搜索：findMoreVod 是全站搜索，结果按 t_id===4（动漫）二次过滤，
 *           电影(t_id=1)/电视剧(2)/综艺(3)/短剧(64)一律丢弃 —— 跨源搜索、自动换源也只命中动漫。
 *
 * 协议（加密 POST，全程 form-urlencoded）：
 *   - 请求体每个接口是一段明文 JSON，先 AES-128-CBC/PKCS5（key=ENC_KEY、iv=ENC_IV，客户端自选）加密、
 *     输出【大写 hex】作为表单字段 request_key。
 *   - keys = 站点 RSA 公钥(RSA/ECB/PKCS1) 加密 {"iv":ENC_IV,"key":ENC_KEY} 的 base64（服务端私钥解出后
 *     即知客户端用的 key/iv，再解 request_key）；PKCS1 每次密文不同，故每请求现算、签名随之取同一份。
 *   - 签名 signature = MD5("token_id=,token=<token>,phone_type=1,request_key=<hex>,app_id=1,"
 *     + "time=<秒>,keys=<keys>" + salt).toUpperCase()。
 *   - 表单字段：token / token_id(空) / phone_type=1 / time(秒) / phone_model / keys / request_key
 *     / signature / app_id=1 / ad_version=1；请求头带 code/deviceId/lang/Version/PackageName/Ver/api-ver/Referer/UA。
 *   - 响应体 { code, msg, data:{ keys, response_key } }：
 *       ① keys 用内置【客户端】RSA 私钥（RSA/ECB/PKCS1）解密 → {key, iv}（各 16 字节 ASCII）；
 *       ② response_key 是 hex 密文，AES-128-CBC/PKCS5（上一步 key/iv）解出明文业务 JSON。
 *   - 鉴权：先 /App/Authentication/Device/signUp（new_key=随机设备,old_key 固定）领 token+app_user_id，
 *     再 /App/Authentication/Authenticator/refresh 刷新拿最终 token；token 失效（业务解密空）时清空重领一次。
 *   - 列表 /App/IndexList/indexList → {list:[{vod_id,vod_name,vod_pic,vod_year,vod_area,d_type,new_continue,t_id}]}
 *     详情 /App/IndexPlay/playInfo → {vodInfo:{...}}；选集 /App/Resource/Vurl/show → {list:[{title,play:{<分辨率>:{param,show_type}}}]}
 *     （show_type==2 不可用要跳过，实测多为 1080 直链）；播放 /App/Resource/VurlDetail/showOne → {url} 直链 m3u8。
 */

// ── 配置（默认值取自 py 参考，ext 注入时覆盖）──
function cfg(k, d) {
    try { if (typeof ext !== 'undefined' && ext && ext[k] != null && String(ext[k]) !== '') return String(ext[k]); } catch (e) {}
    return d;
}

// 多域名：ext 可用 'hosts'（逗号分隔整表覆盖）或 'host'（单域名置顶）覆盖，否则用 py 参考主备表。
var HOSTS = (function () {
    function norm(h) { return trim(h).replace(/\/+$/, ''); }
    var def = [
        'https://apinew.uozvr.com',
        'https://api.w32z7vtd.com',
        'https://api.6a7nnf7.com',
        'https://api.umygrx3.com',
        'https://api.rmedphk.com'
    ];
    var raw = cfg('hosts', '');
    if (raw) {
        var arr = raw.split(',').map(norm).filter(function (x) { return !!x; });
        if (arr.length) return arr;
    }
    var single = cfg('host', '');
    if (single) {
        var first = norm(single), out = [first];
        for (var i = 0; i < def.length; i++) if (def[i] !== first) out.push(def[i]);
        return out;
    }
    return def;
})();

var ENC_KEY  = cfg('encKey', 'OITxa5OqAYjhswxx');
var ENC_IV   = cfg('encIv', 'rCMNwZASNBKZ8mXV');
var SALT     = cfg('salt', '*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br');
// 站点 RSA 公钥（X.509 SPKI，base64）：加密外发 keys 用。
var RSA_PUB  = cfg('rsaPub', 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUM5+/y8sPsWkd1/RQS64X259EUwxFXFE5HlA65MqrxnPs0JqoSRojSDy5QhwvROlaD6TwRQHKMY2OAZ6SnQeUJsChTEFIR9qUkwrs3/MVUMxjsv6JS6Oe/juclyJGTgVmDhB55EafXsD0SQYVj/QXXsxR6ewR5E2kL52yAAD4yQIDAQAB');
// 客户端 RSA 私钥（PKCS#8，base64）：解密响应 data.keys 用。
var RSA_PRIV = cfg('rsaPriv', 'MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcKZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcWV9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdIDblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVMiMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUMWBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZK7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1bL3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oat5lYKfpe8k83ZA==');
// 设备注册用固定 old_key（py 参考 DEVICE_OLD_KEY）。
var DEVICE_OLD_KEY = cfg('deviceOldKey', 'aLFBMWpxBrIDAD1Si/KVvm41');

var UA       = cfg('ua', 'Lavf/57.83.100');           // API 请求头 UA（新版 App 用 Lavf）
// 播放器拉流 UA：必须用原 App 的 Lavf（CDN 防盗链只放行它）；默认浏览器 UA 会被 302/限速 → 拉流失败。
var PLAY_UA  = cfg('playUa', 'Lavf/57.83.100');
// 播放器拉流 Referer：CDN 防盗链校验（py 参考 header 固定此值）。
var PLAY_REF = cfg('playReferer', 'http://WJiZxLXA2.com/');
var CODE     = cfg('code', 'GZ0369');
var PKG      = cfg('package', 'com.ae06aebdbb.y286327f5a.ofe849883320260517');
var VERSION  = cfg('version', '2604028');
var VER      = cfg('ver', '3.0.3.2');
var PHONE_MODEL = cfg('phoneModel', 'xiaomi-25031');
// 可选：ext 直接注入 token / token_id 时跳过自动注册（应急用）。
var TOKEN_OVERRIDE    = cfg('token', '');
var TOKEN_ID_OVERRIDE = cfg('tokenId', '');

// ───────────────────────── 设备身份 / token（进程内缓存）─────────────────────────
// 说明：同一源在其激活生命周期内 context 复用，这些模块级变量跨 categories/search/detail/play 保留；
// 切源 / App 重启会重建 context → 重新随机设备并 signUp（与 py 参考「每进程一设备」等效）。
var _hostIdx   = 0;
var _deviceId  = '';
var _deviceKey = '';
var _token     = '';
var _tokenId   = '';
// 注册失败冷却：上次 signUp+refresh 全域名皆空的时刻(ms)。站点整体不可用时若不记失败态，
// 每次 api() 都会重跑 signUp+refresh×全部域名再加业务×全部域名（单次 detail 放大 ~30 个请求）。
// 冷却期内 ensureToken 直接快速失败不重试注册，到点自动恢复。
var _lastRegFailAt = 0;
var REG_FAIL_COOLDOWN_MS = 60000;

function randHex(n) {
    var s = '', c = '0123456789ABCDEF';
    for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * 16));
    return s;
}
// 生成一台全新设备（deviceId 走 header，new_key 走 signUp 设备身份）
function regenDevice() {
    _deviceId  = String(864150060000000 + Math.floor(Math.random() * 10000));
    _deviceKey = randHex(40);
}
// 保证 header 至少有一台设备（含 ext 注入 token、跳过注册的路径）
function ensureDevice() { if (!_deviceKey) regenDevice(); }

// ───────────────────────── 工具 ─────────────────────────
function nowSec() { return String(Math.floor(timestamp() / 1000)); }
function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
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
    if (/日本|日韩|韩/.test(area)) return '日漫';
    if (/欧美|美国|英|法|德|加拿大|俄/.test(area)) return '欧美';
    return '国漫';
}
// d_type 二级分类优先（30国漫/31日漫/33欧美），无则按地区猜
function subType(dType, area) {
    var t = String(dType || '');
    if (t === '31') return '日漫';
    if (t === '33') return '欧美';
    if (t === '30') return '国漫';
    return typeOf(area);
}
function guessType(u) {
    u = (u || '').toLowerCase();
    if (u.indexOf('.m3u8') >= 0) return 'm3u8';
    if (u.indexOf('.mp4') >= 0) return 'mp4';
    if (u.indexOf('.flv') >= 0) return 'flv';
    return 'auto';
}

// ───────────────────────── 加解密 ─────────────────────────
// 明文 JSON → AES-128-CBC/PKCS5 加密 → 大写 hex（request_key，对齐 py .hex().upper()）
function encReq(plain) {
    var hex = crypto.aes.encrypt(plain, ENC_KEY, {
        mode: 'CBC', padding: 'PKCS5',
        keyFormat: 'utf8', ivFormat: 'utf8', iv: ENC_IV,
        input: 'utf8', output: 'hex'
    }) || '';
    return hex.toUpperCase();
}

// keys：站点 RSA 公钥 PKCS1 加密 {"iv":..,"key":..} → base64（每次现算，PKCS1 密文随机）
function buildKeys() {
    return crypto.rsa.encrypt(JSON.stringify({ iv: ENC_IV, key: ENC_KEY }), RSA_PUB, {
        padding: 'PKCS1', input: 'utf8', output: 'base64'
    }) || '';
}

// 响应解密：data.keys 用客户端 RSA 私钥解出 {key,iv}，再 AES 解 data.response_key（hex）
function decResp(resp) {
    var j = parseJson(resp);
    if (!j || !j.data) return '';
    var data = j.data;
    if (!data.keys || !data.response_key) return '';
    var kj = crypto.rsa.decrypt(data.keys, RSA_PRIV, { padding: 'PKCS1', input: 'base64', output: 'utf8' });
    var ko = parseJson(kj) || {};
    if (!ko.key || !ko.iv) return '';
    return crypto.aes.decrypt(data.response_key, ko.key, {
        mode: 'CBC', padding: 'PKCS5',
        keyFormat: 'utf8', ivFormat: 'utf8', iv: ko.iv,
        input: 'hex', output: 'utf8'
    }) || '';
}

// ───────────────────────── 传输 / 鉴权 ─────────────────────────
function curHost() { return HOSTS[_hostIdx % HOSTS.length]; }
function rotateHost() { _hostIdx = (_hostIdx + 1) % HOSTS.length; }

// 单次加密 POST 到当前域名，返回解密后的明文业务 JSON 字符串（失败返回 ''）。不做 token 保障，避免递归。
function rawApi(path, obj) {
    var host = curHost();
    var time = nowSec();
    var rk = encReq(JSON.stringify(obj));
    var keys = buildKeys();
    var sign = md5('token_id=,token=' + _token + ',phone_type=1,request_key=' + rk +
        ',app_id=1,time=' + time + ',keys=' + keys + SALT).toUpperCase();
    var form = 'token=' + encodeUri(_token) +
        '&token_id=&phone_type=1&time=' + time +
        '&phone_model=' + encodeUri(PHONE_MODEL) +
        '&keys=' + encodeUri(keys) +
        '&request_key=' + encodeUri(rk) +
        '&signature=' + sign +
        '&app_id=1&ad_version=1';
    var headers = {
        'User-Agent': UA,
        'code': CODE,
        'deviceId': _deviceId,
        'lang': 'zh_cn',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Version': VERSION,
        'PackageName': PKG,
        'Ver': VER,
        'api-ver': VER,
        'Referer': host
    };
    var resp = post(host + path, form, JSON.stringify({ headers: headers, timeout: 20000 }));
    return decResp(resp);
}

// 带域名轮换：当前域名失败则换下一个，全表试一遍仍空才返回 ''。
function rawApiAll(path, obj) {
    for (var i = 0; i < HOSTS.length; i++) {
        var s = rawApi(path, obj);
        if (s) return s;
        rotateHost();
    }
    return '';
}

// 领取 / 刷新 token：每次都用【全新设备】signUp 再 refresh。
// 实测：signUp 对全新随机设备稳定成功（返回 token + app_user_id）；同一设备重注册会「用户已存在」、
// 本站 signIn 亦不可靠，故重领时换新设备 signUp 最稳（与 py「每进程一新设备」同理，去掉 signIn 分支）。
function doRegister() {
    regenDevice();
    var r = parseJson(rawApiAll('/App/Authentication/Device/signUp',
        { new_key: _deviceKey, old_key: DEVICE_OLD_KEY, phone_type: 1, code: '' })) || {};
    if (r.token) {
        _token = String(r.token);
        if (r.app_user_id != null && String(r.app_user_id) !== '') _tokenId = String(r.app_user_id);
    }
    var r2 = parseJson(rawApiAll('/App/Authentication/Authenticator/refresh', {})) || {};
    if (r2.token) {
        _token = String(r2.token);
        if (r2.app_user_id != null && String(r2.app_user_id) !== '') _tokenId = String(r2.app_user_id);
    }
    // 记录注册结果：拿到 token 清失败态；没拿到记失败时刻，进入冷却（见 _lastRegFailAt 注释）。
    _lastRegFailAt = _token ? 0 : timestamp();
}

// 确保有可用 token（ext 注入 token 时直接采用）。以 _token 存在为闸，避免注册死循环。
function ensureToken() {
    if (TOKEN_OVERRIDE) {
        _token = TOKEN_OVERRIDE;
        if (TOKEN_ID_OVERRIDE) _tokenId = TOKEN_ID_OVERRIDE;
        return;
    }
    if (_token) return;
    // 注册失败冷却期内不再重试注册：保持空 token 快速失败（api() 会就地返回 ''），
    // 避免站点不可用时每次调用都重跑 signUp+refresh×全部域名。
    if (_lastRegFailAt && timestamp() - _lastRegFailAt < REG_FAIL_COOLDOWN_MS) return;
    doRegister();
}

// 业务加密 POST：保障 token → 轮换域名请求；若拿到 token 却仍解密空（多半 token 失效），清空重领一次再试。
function api(path, obj) {
    ensureDevice();
    ensureToken();
    // 注册失败（含冷却期内快速失败）没拿到 token：业务请求必被拒，直接返回空，别再×域名空转。
    if (!_token) return '';
    var s = rawApiAll(path, obj);
    if (!s && _token && !TOKEN_OVERRIDE) {
        _token = ''; _tokenId = '';
        doRegister();
        // 重领失败（已进入冷却）就不再空转一轮域名了
        s = _token ? rawApiAll(path, obj) : '';
    }
    return s;
}
// 同 api()，但直接返回解析好的对象（失败返回 {}）
function apiJson(path, obj) { return parseJson(api(path, obj)) || {}; }

// ───────────────────────── 列表 / 搜索 ─────────────────────────
function mapItem(it) {
    return {
        id:      String(it.vod_id),
        name:    clean(it.vod_name),
        pic:     trim(it.vod_pic),
        type:    subType(it.d_type, it.vod_area),
        year:    yearStr(it.vod_year),
        remarks: clean(it.new_continue || it.vod_continu),
        desc:    ''
    };
}

// 动漫片库（tid 恒为 3，sub 必须是 30/31/33），可带 area/year/sort 过滤
function listVod(sub, f, page) {
    f = f || {};
    var j = apiJson('/App/IndexList/indexList', {
        tid: '3',
        page: String(page || 1),
        sort: f.sort || 'd_id',
        area: f.area || '0',
        sub: String(sub),
        year: f.year || '0',
        pageSize: '30'
    });
    return (j.list || []).map(mapItem);
}

// 关键词搜索：全站搜索后按 t_id===4 只留动漫（findMoreVod 不分页）
function searchWord(wd) {
    var j = apiJson('/App/Index/findMoreVod', { keywords: wd, order_val: '1' });
    return (j.list || [])
        .filter(function (it) { return String(it.t_id) === '4'; })
        .map(mapItem);
}

// ───────────────────────── 分类筛选项（取自 dex homeContent 动漫 tid=3 的 filters）──
var AREA_OPTS = [
    { n: '全部', v: '0' }, { n: '大陆', v: '大陆' }, { n: '日本', v: '日本' },
    { n: '香港', v: '香港' }, { n: '台湾', v: '台湾' }, { n: '韩国', v: '韩国' },
    { n: '欧美', v: '俄罗斯,加拿大,德国,意大利,法国,欧美,美国,英国,西班牙' },
    { n: '其他', v: '其他,印度,新加坡,马来西亚' }
];
var SORT_OPTS = [{ n: '综合', v: 'd_id' }, { n: '最新', v: 'd_addtime' }, { n: '最热', v: 'd_score' }];
function yearOpts() {
    var o = [{ n: '全部', v: '0' }];
    for (var y = (new Date()).getFullYear(); y >= 2015; y--) o.push({ n: String(y), v: String(y) });
    return o;
}

// 首页 tab key 即动漫 sub：''(默认)→31 日番 / '30'→国漫 / '33'→欧美
function subOf(cat) {
    cat = trim(cat);
    if (cat === '30') return '30';
    if (cat === '33') return '33';
    return '31';
}

// ───────────────────────── 契约入口 ─────────────────────────
function categories() {
    var fil = [
        { key: 'area', name: '地区', value: AREA_OPTS },
        { key: 'year', name: '年份', value: yearOpts() },
        { key: 'sort', name: '排序', value: SORT_OPTS }
    ];
    return JSON.stringify([
        { key: '',   title: '日番', filters: fil },
        { key: '30', title: '国漫', filters: fil },
        { key: '33', title: '欧美', filters: fil }
    ]);
}

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword);
    if (!key) return JSON.stringify(listVod('31', {}, page));
    if (key === '30' || key === '31' || key === '33') return JSON.stringify(listVod(key, {}, page));
    // 关键词搜索不分页，翻页直接空
    return page > 1 ? '[]' : JSON.stringify(searchWord(key));
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    return JSON.stringify(listVod(subOf(category), f, page || 1));
}

// 详情结果进程内缓存：detail() 会被「搜索页简介回填 DescEnricher + 类型回填 TypeEnricher +
// 播放页 + 历史重进同一剧」对同一 id 反复调用，而每次都要重拉 playInfo + Vurl/show（选集），
// 既慢又费流量（本源是加密 POST + RSA 解密，比普通源贵得多）。缓存后同一剧在本源生命周期内
// 只拉一次（切源 / App 重启自然失效）。仅缓存「拿到选集」的成功结果，失败（episodes 空）不缓存，
// 以便下次重试。
var _detailCache = {};
var _detailOrder = [];
function detail(id) {
    var key = String(id);
    if (_detailCache.hasOwnProperty(key)) return _detailCache[key];
    var out = { id: key, name: '', pic: '', desc: '', type: '', remarks: '', year: '', episodes: [] };
    // playInfo 业务体要带 token/token_id，须在构造请求体【前】先领到 token（否则冷 context 首个调用是 detail 时
    // 参数先求值会捕获空串）；api() 内部虽也会 ensureToken，但那发生在请求体求值之后，故这里显式提前。
    ensureDevice();
    ensureToken();
    var d = apiJson('/App/IndexPlay/playInfo',
        { token_id: _tokenId, vod_id: String(id), mobile_time: nowSec(), token: _token }).vodInfo || {};
    out.name    = clean(d.vod_name);
    out.pic     = trim(d.vod_pic);
    out.desc    = clean(d.vod_use_content);
    out.remarks = clean(d.new_continue);
    out.year    = yearStr(d.vod_year);
    out.type    = typeOf(d.vod_area);

    // 选集：按分辨率分组成线路（一档分辨率 = 一条线路），show_type==2 不可用要跳过
    var list = apiJson('/App/Resource/Vurl/show', { vurl_cloud_id: '2', vod_d_id: String(id) }).list || [];
    var lineMap = {}, order = [];
    for (var i = 0; i < list.length; i++) {
        var ep = list[i] || {};
        var play = ep.play || {};
        var epTitle = clean(ep.title) || ('第' + (i + 1) + '集');
        for (var res in play) {
            if (!play.hasOwnProperty(res)) continue;
            var pv = play[res] || {};
            if (String(pv.show_type) === '2' || !pv.param) continue;
            if (!lineMap[res]) { lineMap[res] = []; order.push(res); }
            lineMap[res].push({ name: epTitle, url: trim(pv.param) });
        }
    }
    // 分辨率从高到低排，默认线路即最高清（对象 key 遍历是数值升序，不排会让 480P 当默认）
    order.sort(function (a, b) {
        var na = parseInt(a, 10), nb = parseInt(b, 10);
        return (isNaN(nb) ? -1 : nb) - (isNaN(na) ? -1 : na);
    });
    for (var oi = 0; oi < order.length; oi++) {
        var resKey = order[oi];
        var route = /^\d+$/.test(resKey) ? (resKey + 'P') : resKey;   // 480P / 720P / 1080P
        var eps = lineMap[resKey];
        for (var ei = 0; ei < eps.length; ei++) {
            out.episodes.push({ name: eps[ei].name, url: eps[ei].url, route: route });
        }
    }
    var json = JSON.stringify(out);
    // 拿到选集才缓存：episodes 为空多半是网络 / 风控失败，缓存会让后续永远空、连播放都进不去，故跳过。
    if (out.episodes.length > 0) {
        _detailCache[key] = json;
        _detailOrder.push(key);
        if (_detailOrder.length > 80) delete _detailCache[_detailOrder.shift()];
    }
    return json;
}

function play(flag) {
    var res = { url: '', type: 'auto' };
    var param = trim(flag);
    if (!param) return JSON.stringify(res);

    // param 形如 vod_d_id=x&vurl_id=y&domain_type=8&resolution=1080&type=play → 拆成 JSON 当请求体
    var obj = {};
    var kvs = param.split('&');
    for (var i = 0; i < kvs.length; i++) {
        var eq = kvs[i].indexOf('=');
        if (eq < 0) continue;
        obj[kvs[i].substring(0, eq)] = kvs[i].substring(eq + 1);
    }
    var url = trim(apiJson('/App/Resource/VurlDetail/showOne', obj).url);
    if (!url) return JSON.stringify(res);
    res.url = url;
    res.type = guessType(url);
    res.userAgent = PLAY_UA;   // 折叠进播放 header 的 User-Agent，过 CDN 防盗链
    res.referer = PLAY_REF;    // CDN 防盗链 Referer（py 参考固定值）
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

