# Android 与网站交付（2026-09-08）

线上网站：https://yangling.entermodetwo.com

体验 APK：https://yangling.entermodetwo.com/downloads/yangling-v1.1-debug.apk

APK SHA256：`e26d98d5152fe7076c2e719130c0594c63f475ad21778f4f8367e5a919b80d39`。与原体验包使用相同签名，可覆盖安装。公网入口、资源与 APK 下载返回 200；Service Worker 返回 `Cache-Control: no-store`。公网浏览器自动预览连接超时，不能据此认定真实用户网络访问均已解决。

## 本次改动

- 复用 `src/assets/seal-logo.png`：前台左上角、PWA 图标、Android 标准／圆形／自适应启动图标。
- Android 通过 `@capacitor/local-notifications` 本机调度，支持 15／30／45／60／90 分钟间隔、取消、权限检查、通知点击返回首页及测试通知；不连接推送服务器。
- Android 13+ 需用户同意系统通知权限。周期提醒使用系统非精确闹钟，省电模式可能延迟；强行停止后需要重新打开。插件接收开机广播恢复安排。
- Web 保留页面打开时的浏览器通知，移除用户界面的服务器地址与 VAPID 配置。
- APK 内禁止注册网页 Service Worker，使用打包资源；处理 Capacitor 系统栏 CSS 安全区、键盘缩放、标题换行、摄像头等比显示。
- 生产网页采用独立根路径构建，入口文档网络优先；发布时先传资源再原子替换入口，保留旧 hash 资源和回滚文件。

## 构建

```powershell
npm ci
npm run build:android
npx cap sync android
$env:ANDROID_HOME='D:\Android'
Set-Location android
gradle assembleDebug --no-daemon --max-workers=2
```

Gradle 使用 JDK 21；本项目设置 Kotlin 进程内编译，避免 Windows 中文目录在参数文件中被转义。

- APK：`yangling-v1.1-debug.apk`，包名 `com.yangling.app`，versionCode 2，versionName 1.1。
- 签名为当前机器 Android Debug 签名，属于体验安装包。
- 网页：`npm run build:web` → `dist-web/`；GitHub Pages：`npm run build:pages`。
- Logo 再生成：`scripts/sync-brand-icons.ps1`。

## 验证

- 13 个测试文件、84 项测试通过。
- Android assembleDebug 成功；apksigner 校验通过，Manifest 包含 CAMERA、RECORD_AUDIO、POST_NOTIFICATIONS 和插件的开机恢复声明。
- 浏览器模拟 360×740 屏幕并预留上下各 24px 系统栏：三页无横向溢出、主区域无溢出、底栏位于 740px 边界、Logo 正常载入。
- 当前未连接 Android 实机，锁屏、系统省电策略和真实相机权限仍需设备验证。点击铃铛 → 授权通知 → 发送一条测试通知，约 5 秒后检查通知栏；再打开周期提醒验证后台行为。

## 网站检查依据

网站 `https://yangling.entermodetwo.com` 的服务器日志记录 2026-09-08 00:10:22 对入口引用脚本 `index-Cvr1hk70.js` 的 404。检查时该文件已补齐并返回 200；这能证明发布期间存在资源缺失，但不能单独证明所有朋友访问失败均由此导致。旧 Service Worker 对入口缓存优先也会延长旧版本存留。

发布脚本 `deploy/release.sh` 留存入口、Service Worker 和 Nginx 配置到 `/var/backups/yangling/`，只更新养令站点；旧版脚本资源保留用于兼容已打开页面。
