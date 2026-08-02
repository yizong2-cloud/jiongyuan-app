# 囧源 · 看番

基于 [EasyBangumi / 纯纯看番](https://github.com/easybangumiorg/EasyBangumi) 的个人精简版 Fork。

内置囧次元 LANERC 内容源，免登录、免广告、开箱即用。

## 本 Fork 的改动

- **内置 LANERC 源**：`inner_source/lanerc.js`（来自 `lanerc-source` 仓库，随 App 打包，自动安装）；已移除其余默认源。
- **封面请求头支持**（`OkImage.kt`）：封面 URL 支持 `@Referer=...@User-Agent=...` 后缀约定（豆瓣防盗链图片需要），解析后附加到 Coil ImageRequest；另提供 `headers` 参数供显式传入。
- **重命名**：应用名「囧源」，applicationId `com.jiongyuan.app`。
- **签名**：`app/keystore.jks`（已 gitignore），CI 通过 secrets 注入密码。
- **CI**：`.github/workflows/build.yml`，打 tag 自动构建 release APK。

## 构建

```bash
# Debug APK（applicationId: com.jiongyuan.app.debug）
./gradlew :app:assembleDebug

# Release APK（需签名，密码走环境变量或默认值）
RELEASE=true ./gradlew :app:assembleRelease
```

输出：`app/build/outputs/apk/{debug,release}/`

## 源脚本维护

LANERC 源脚本独立维护在 [lanerc-source](https://github.com/yizong-boop/lanerc-source) 仓库（API/AES/签名/封面约定的权威文档见 `SOURCE_CONTRACT.md`）。接口变化时更新源仓库，App 内置源随版本同步。

## 许可与署名

基于 [EasyBangumi](https://github.com/easybangumiorg/EasyBangumi)（[Apache-2.0](LICENSE)）fork。保留原作者版权与许可；本 Fork 仅作个人学习/自用，请勿用于分发或商业用途。
