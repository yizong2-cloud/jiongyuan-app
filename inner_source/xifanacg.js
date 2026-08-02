// @key com.lanerc.xifanacg
// @label 囧源·稀饭精选
// @versionName 1.0.0
// @versionCode 1
// @libVersion 15
// @cover https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932543896.webp
//
// 囧次元 囧源·稀饭精选 内容源（EasyBangumi / 纯纯看番 扩展）
// 逆向自 jiong-ciyuan.apk 内置脚本 xifanacg.js，经 __JB 桥适配运行。免登录 / 免广告。
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
 * 稀饭动漫（anime.xifanacg.com） JS 源
 * 苹果 CMS · dsn2 模板 · bangumi/watch 路由 · 纯 HTML 抓取
 * version: 1.2.1
 *
 * 1.2.1：删 search() 里 '完结' 的死分支（TYPE_MAP 已含 '完结'，上一行即命中）
 * 1.2.0：+homeSections（首页分区，去掉兜底布局的"热门更新→最近更新"死链更多）；
 *        play() 返回 startSec:5（本源所有视频固定 5 秒起播）
 *
 * 实测（2026-06-11，iPhone UA）：
 *   - 列表/详情：/bangumi/{id}.html
 *   - 播放：/watch/{id}/{sid}/{nid}.html → player_aaaa encrypt=0 直出 mp4/m3u8。
 *     ⚠️ 主线-1（apn.moedot.net → 302 联通沃盘签名直链）对带 Referer 的请求直接 400，
 *     三条线路实测都不需要 Referer → play() 返回 referer:'never' 明确禁发；
 *     备用线 m3u8 路径含未编码中文（/新番/…）→ 返回前转义非 ASCII 字符。
 *   - 分类：/type/1 连载新番 · /type/2 完结旧番 · /type/3 剧场版 · /type/21 美漫；分页 /type/1-2.html
 *   - 筛选：/show/{tid}/... 页面是 AJAX 壳（HTML 里没有条目），真实数据来自
 *     POST /index.php/ds_api/vod {type,class,year,letter,by,page}（必须带 X-Requested-With 头，
 *     普通 GET 被模板防盗链拦截）→ JSON {code,list:[{url,vod_name,vod_pic,...}],pagecount}
 *   - 搜索：/search.html?wd= 是 ds-verify 验证码页（抓不到）；改用免验证码的
 *           JSON 联想接口 /index.php/ajax/suggest?mid=1&wd=，其 id 即 bangumi id
 */

var SITE     = 'https://anime.xifanacg.com';
var REQ_OPT  = JSON.stringify({ ua: 'iphone', timeout: 15000 });
var REFERER  = SITE + '/';
var SNIFF_UA = (typeof UA !== 'undefined' && UA.iphone) || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

var TYPE_MAP = { '日漫': '1', '完结': '2', '剧场版': '3', '欧美': '21' };
var APP_TYPE = { '1': '日漫', '2': '日漫', '3': '剧场版', '21': '欧美' };

function trim(s) { return s == null ? '' : String(s).replace(/^\s+|\s+$/g, ''); }
function clean(s) {
    if (!s) return '';
    return trim(String(s)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
        .replace(/[\u3000\s]+/g, ' '));
}
function abs(u) {
    if (!u) return '';
    u = String(u).replace(/&amp;/g, '&');
    if (/^https?:/i.test(u)) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    if (u.charAt(0) === '/') return SITE + u;
    return SITE + '/' + u;
}
function guessType(u) {
    var l = (u || '').toLowerCase();
    if (l.indexOf('.m3u8') >= 0) return 'm3u8';
    if (l.indexOf('.mp4') >= 0) return 'mp4';
    if (l.indexOf('.flv') >= 0) return 'flv';
    return 'auto';
}
// ── 分类筛选维度（2026-06-11 实测：类型仅 type 1/2 站点有配置，3/21 只有年份）──
var GENRES = ['搞笑','原创','轻小说改','恋爱','百合','漫改','校园','战斗','治愈','奇幻',
              '日常','青春','乙女向','悬疑','后宫','科幻','冒险','热血','异世界','游戏改',
              '音乐','偶像','美食','耽美'];

function strOpts(arr) {
    var out = [{ n: '全部', v: '' }];
    for (var i = 0; i < arr.length; i++) out.push({ n: arr[i], v: arr[i] });
    return out;
}
function yearOpts(minYear) {
    var out = [{ n: '全部', v: '' }];
    for (var y = (new Date()).getFullYear(); y >= minYear; y--) out.push({ n: String(y), v: String(y) });
    return out;
}
function showFilters(withClass) {
    var fs = [];
    if (withClass) fs.push({ key: 'class', name: '类型', value: strOpts(GENRES) });
    fs.push({ key: 'year', name: '年份', value: yearOpts(2004) });
    fs.push({ key: 'by',   name: '排序', value: [{ n: '默认', v: '' }, { n: '最新', v: 'time' }, { n: '最热', v: 'hits' }, { n: '评分', v: 'score' }] });
    return fs;
}
function isBlocked(html) {
    if (!html) return true;
    return html.indexOf('ds-verify') >= 0
        || html.indexOf('verify/index.html') >= 0
        || html.indexOf('请输入验证码') >= 0;
}

function parseList(html, typeName) {
    if (!html || isBlocked(html)) return [];
    var rows = parseJson(matchAll(html, 'href="/bangumi/(\\d+)\\.html"')) || [];
    var out = [], seen = {};
    for (var i = 0; i < rows.length; i++) {
        var id = rows[i][1];
        if (!id || seen[id]) continue;
        seen[id] = 1;
        var dl = '/bangumi/' + id + '\\.html';
        var name = match(html, dl + '"[^>]*title="([^"]+)"', 1);
        var pic  = match(html, dl + '"[\\s\\S]{0,360}?data-src="([^"]+)"', 1);
        var note = match(html, dl + '[\\s\\S]{0,360}?public-list-prb[^>]*>([^<]+)<', 1);
        var year = match(html, dl + '[\\s\\S]{0,500}?/search/year/((?:19|20)\\d{2})\\.html', 1);
        var nm = clean(name);
        if (!nm) continue;
        out.push({ id: id, name: nm, pic: abs(pic), type: typeName || '', year: year || '', remarks: clean(note), desc: '' });
        if (out.length >= 40) break;
    }
    return out;
}

function browseType(tid, page, typeName) {
    page = page || 1;
    var url = SITE + '/type/' + tid + (page > 1 ? '-' + page : '') + '.html';
    return parseList(request(url, REQ_OPT), typeName || APP_TYPE[tid] || '');
}

// 免验证码的 JSON 联想搜索：id 即 bangumi 详情 id
function suggestSearch(key) {
    var url = SITE + '/index.php/ajax/suggest?mid=1&limit=30&wd=' + encodeUri(key);
    var j = parseJson(request(url, REQ_OPT) || '') || {};
    var list = j.list || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (!it || it.id == null) continue;
        out.push({ id: String(it.id), name: clean(it.name), pic: abs(it.pic), type: '', year: '', remarks: '', desc: '' });
    }
    return out;
}

function categories() {
    return JSON.stringify([
        { key: '',       title: '推荐' },
        { key: '日漫',   title: '连载新番', filters: showFilters(true) },
        { key: '完结',   title: '完结旧番', filters: showFilters(true) },
        { key: '剧场版', title: '剧场版',   filters: showFilters(false) },
        { key: '欧美',   title: '美漫',     filters: showFilters(false) }
    ]);
}

function search(keyword, page) {
    page = page || 1;
    var key = trim(keyword);
    if (!key) return JSON.stringify(parseList(request(SITE + '/', REQ_OPT), ''));
    if (TYPE_MAP[key]) return JSON.stringify(browseType(TYPE_MAP[key], page, APP_TYPE[TYPE_MAP[key]] || key));
    if (page > 1) return '[]';                       // 联想接口不分页
    return JSON.stringify(suggestSearch(key));
}

// 筛选数据接口：/show 页面是 AJAX 壳，列表实际来自 ds_api/vod。
// 必须 POST + X-Requested-With 头（普通 GET 会被模板防盗链拦截，只回「短视主题」文案）。
// 接口失败返回 null，由调用方兜底。
function apiFiltered(tid, f, page) {
    var body = 'type=' + tid + '&page=' + (page || 1)
             + '&class='  + encodeUri(f['class'] || '')
             + '&year='   + encodeUri(f.year || '')
             + '&letter=' + encodeUri(f.letter || '')
             + '&by='     + (f.by || '');
    var opt = JSON.stringify({
        ua: 'iphone', timeout: 15000,
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': SITE + '/show/' + tid + '.html' }
    });
    var j = parseJson(post(SITE + '/index.php/ds_api/vod', body, opt) || '') || {};
    if (j.code != 1 || !j.list) return null;
    var out = [];
    for (var i = 0; i < j.list.length; i++) {
        var it = j.list[i];
        var id = match(String(it.url || ''), '/bangumi/(\\d+)\\.html', 1);
        if (!id) continue;
        out.push({
            id:      id,
            name:    clean(it.vod_name),
            pic:     abs(it.vod_pic),
            type:    APP_TYPE[tid] || '',
            year:    String(f.year || ''),
            remarks: clean(it.vod_remarks || it.vod_serial || ''),
            desc:    clean(it.vod_blurb || '')
        });
    }
    return out;
}

function searchFiltered(category, filtersJson, page) {
    var f = parseJson(filtersJson) || {};
    var cat = trim(category);
    var tid = TYPE_MAP[cat] || '1';
    page = page || 1;
    var list = apiFiltered(tid, f, page);
    if (list === null) list = browseType(tid, page, cat || APP_TYPE[tid] || '');  // 接口失败兜底：无筛选浏览
    return JSON.stringify(list);
}

function detail(id) {
    var out = { id: id, name: '', pic: '', desc: '', type: '', remarks: '', year: '', episodes: [] };
    var html = request(SITE + '/bangumi/' + id + '.html', REQ_OPT) || '';
    if (!html) return JSON.stringify(out);

    out.name = clean(match(html, 'slide-info-title[^>]*>([^<]+)', 1)
                  || match(html, 'property="og:title"\\s+content="([^"]+)"', 1));
    out.pic  = abs(match(html, 'mask-this2[^>]*data-src="([^"]+)"', 1)
                || match(html, 'bangumi/' + id + '[\\s\\S]{0,400}?data-src="([^"]+)"', 1));
    out.desc = clean(match(html, 'name="description"\\s+content="([^"]{10,})"', 1));
    out.year = match(html, '/search/year/((?:19|20)\\d{2})\\.html', 1) || '';
    // 备注：主信息区第一个 slide-info-remarks（更新状态，如「10|周三22:10」）
    out.remarks = clean(match(html, 'slide-info-remarks cor5">([^<]+)<', 1));
    // 分类：「类型 :」行的 /search/class/ 链接，跳过档期(YYYY年M月)和"TV"取第一个真实题材
    var cls = parseJson(matchAll(html, '/search/class/[^"]*"[^>]*>([^<]+)</a>')) || [];
    for (var c = 0; c < cls.length; c++) {
        var cn = clean(cls[c][1]);
        if (!cn || /^(?:19|20)\d{2}年\d{1,2}月$/.test(cn) || cn === 'TV') continue;
        out.type = cn;
        break;
    }

    var tabs = parseJson(matchAll(html, 'swiper-slide"[^>]*>(?:<i[^>]*></i>)?&nbsp;([^<]+)<span class="badge"')) || [];
    var lineOrder = [];
    for (var t = 0; t < tabs.length; t++) lineOrder.push(clean(tabs[t][1]));

    var eps = parseJson(matchAll(html,
        'this-link"\\s+href="(/watch/' + id + '/(\\d+)/(\\d+)\\.html)"[^>]*>([^<]+)')) || [];
    var sidSeen = {}, sidIdx = 0;
    for (var i = 0; i < eps.length; i++) {
        var href = eps[i][1], sid = eps[i][2], epName = clean(eps[i][4]);
        if (!sidSeen[sid]) {
            sidSeen[sid] = lineOrder[sidIdx] || ('线路' + sid);
            sidIdx++;
        }
        out.episodes.push({ name: epName, url: href, route: sidSeen[sid] });
    }
    return JSON.stringify(out);
}

// 首页分区：用站点首页自带的「热乎の新番 / 刚上架の旧番」两个板块（一次请求按标题切块解析）。
// 声明 homeSections 后 App 首页走分区渲染 —— 顺带去掉了兜底布局里"热门更新→更多→最近更新"
// 那个死链接（本源没有"最近更新"分类，点进去永远是空的）；这里的"更多"都指向真实存在的 tab。
function homeSections() {
    var html = request(SITE + '/', REQ_OPT) || '';
    if (!html || isBlocked(html)) return '[]';
    var iHot = html.indexOf('热乎の新番');
    var iOld = html.indexOf('刚上架の旧番');
    var out = [];
    if (iHot >= 0) {
        var hotHtml = (iOld > iHot) ? html.substring(iHot, iOld) : html.substring(iHot);
        var hot = parseList(hotHtml, '日漫');
        if (hot.length) out.push({ title: '热乎の新番', key: '日漫', items: hot });
    }
    if (iOld >= 0) {
        var old = parseList(html.substring(iOld), '日漫');
        if (old.length) out.push({ title: '刚上架の旧番', key: '完结', items: old });
    }
    // 两块都没解析到 → 返回空数组，App 自动回退扁平片库
    return JSON.stringify(out);
}

// 播放页「相关推荐」：详情页自带"相关作品"区（dsn2 卡片），parseList 直接能解析；排除自身
function related(id) {
    var html = request(SITE + '/bangumi/' + id + '.html', REQ_OPT) || '';
    var list = parseList(html, '');
    var out = [];
    for (var i = 0; i < list.length; i++) if (list[i].id !== String(id)) out.push(list[i]);
    return JSON.stringify(out);
}

function play(flag) {
    // startSec: 本源所有视频固定 5 秒起播（App 播放层与全局"跳过片头"设置取较大者）
    var res = { url: '', type: 'auto', referer: REFERER, startSec: 5 };
    var f = String(flag || '');
    var page = /^https?:/i.test(f) ? f : SITE + (f.charAt(0) === '/' ? f : '/' + f);
    var html = request(page, REQ_OPT) || '';

    var url = '';
    var raw = match(html, 'player_aaaa\\s*=\\s*(\\{.*?\\})\\s*;?\\s*</script>', 1);
    if (raw) {
        var pj = parseJson(raw) || {};
        url = pj.url || '';
        var enc = pj.encrypt;
        if (url && (enc == 1)) url = decodeUri(url);
        else if (url && (enc == 2)) url = decodeUri(base64Decode(url));
    }
    if (!url) url = match(html, '"url"\\s*:\\s*"([^"]+\\.(?:m3u8|mp4|flv|mkv)[^"]*)"', 1) || '';
    if (url) url = url.replace(/\\\//g, '/');

    if (url && /\.(m3u8|mp4|flv|mkv)/i.test(url)) {
        // 三条线路的媒体主机都不需要 Referer；主线-1（apn.moedot.net → 302 联通沃盘签名直链）
        // 带 Referer 反而直接 400（2026-06-11 实测）→ referer:'never' 明确禁发。
        // 备用线 m3u8 路径含未编码中文（/新番/…），部分播放内核解析不了 → 转义非 ASCII 字符。
        res.url = url.replace(/[^\x00-\x7F]/g, function (c) { return encodeURIComponent(c); });
        res.type = guessType(url);
        res.referer = 'never';
        return JSON.stringify(res);
    }

    var hit = sniffMedia(page, { patterns: ['\\.m3u8(\\?|$)', '\\.mp4(\\?|$)'], userAgent: SNIFF_UA, referer: REFERER, timeout: 15000 });
    if (hit && hit.ok) { res.url = hit.url; res.type = guessType(hit.url); res.referer = hit.referer || REFERER; }
    else if (url) { res.url = url; res.type = guessType(url); }
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

