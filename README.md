# 囧源 · 看番

基于 [EasyBangumi / 纯纯看番](https://github.com/easybangumiorg/EasyBangumi) 的个人精简版 Fork。

内置动漫内容源，免登录、免广告、开箱即用。

## 功能

- **内置 14 个动漫源**（LANERC 系，随 App 打包自动安装）
- **首页分类**：热门 / 日漫 / 剧场版 / 推荐 等分区标签
- **聚合搜索**：一次搜索覆盖全部源（默认开启）
- **高清渲染 (Anime4K)**：设置 → 播放设置 可开关（默认开启，持久化），
  含渲染方案（7 档：标准 4K / 柔和 / 去噪 / 精细等）与渲染质量（S/M/L）
- **竖屏锁定**：默认关闭传感器自动横屏（手机横放不翻转），全屏按钮仍可横屏
- 免登录、免广告、无会员

## 本 Fork 的关键改动

- **内置 14 个 LANERC 源**：`inner_source/*.js`（来自 `lanerc-source` 仓库，随 App 打包自动安装）。
- **封面请求头支持**（`OkImage.kt parseCoverImage`）：封面 URL 支持
  `@Referer=...@User-Agent=...` 后缀约定（豆瓣防盗链图片需要），解析后附加到 Coil ImageRequest。
- **播放器渲染调整**：Media3 1.4.0-alpha02 效果管线（VideoGraph）要求有效输出 surface，
  TextureView 与其不兼容，播放渲染统一使用 SurfaceView（截图/录制功能依赖 TextureView，已优雅降级）。
- **Anime4K 高清渲染**：`app/src/main/java/com/heyanle/easybangumi4/anime4k/`，
  shader 资产在 `app/src/main/assets/anime4k/`。当前核心链路可用、正在修复渲染问题。
- **重命名**：应用名「囧源」，applicationId `com.jiongyuan.app`。
- **签名**：`app/keystore.jks`（已 gitignore），storePassword/keyAlias/keyPassword
  默认 `jiongyuan2026` / `jiongyuan`，可用环境变量覆盖（见 `app/build.gradle.kts`）。

## 下载安装包

- **Releases 页面**（https://github.com/yizong2-cloud/jiongyuan-app/releases）提供签名 APK，
  打 `v*` tag 自动构建发布。
- 手机安装：下载 APK 后直接安装（需允许未知来源）。

## 构建

```bash
# Debug APK（applicationId: com.jiongyuan.app.debug）
./gradlew :app:assembleDebug

# Release APK（需签名）
./gradlew :app:assembleRelease
```

输出：`app/build/outputs/apk/{debug,release}/`

要求：JDK 17+，Android SDK 34。

## 源脚本维护

LANERC 源脚本独立维护在 [lanerc-source](https://github.com/yizong-boop/lanerc-source) 仓库
（API/AES/签名/封面约定的权威文档见其 `SOURCE_CONTRACT.md`）。接口变化时更新源仓库，
App 内置源随版本同步。

## 许可与署名

基于 [EasyBangumi](https://github.com/easybangumiorg/EasyBangumi)（[Apache-2.0](LICENSE)）fork。
保留原作者版权与许可。
内置 Anime4K shader 为 MIT License（Copyright (c) 2019-2021 bloc97）。
