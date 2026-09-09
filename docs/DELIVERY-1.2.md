# 养令 1.2 交付记录 · 2026-09-09

- 网站：https://yangling.entermodetwo.com
- 管理台：https://yangling.entermodetwo.com/#admin
- APK：https://yangling.entermodetwo.com/downloads/yangling-v1.2-debug.apk
- Logo 源素材：https://yangling.entermodetwo.com/brand/yangling-logo-assets.zip
- [项目 Q&A 与下一步](./项目Q&A与演示准备-2026-09-09.md)。

APK 包名 `com.yangling.app`，versionCode 3，versionName 1.2；SHA256：`85de6453352242cf14592a9e8dc1f473ff4940850b84ae959559803f723f37c5`。

使用原机器 Android Debug 签名，与旧体验包一致，可覆盖旧版安装。证书 SHA256：`5587b4edf5d051ee7f25452532da27d32a7f79f458cf74e22be3cff9486f9f2b`。这是体验包，不是商店正式发布包。

## 本次交付

1. Logo、导航、养生卡片与头像统一矢量；同源导出 APK/PWA 图标及白底、透明底动画素材。启动动画尚未接入。
2. 家长版语音优先、直白行动入口、先选动作再跟练、提醒分两步。主页面首屏展示，长答案、表单与大字体允许滚动。
3. 提醒支持名称、活动、固定时间或间隔、时间窗口与免打扰。使用 Android 本机通知，无需推送服务器；移除测试通知按钮，提供权限失效提示与系统设置入口。
4. 音频库支持上传或链接、启停、删除、随机选择、暂停、音量及退出停止，三分钟练习结束淡出。服务器当前没有正式音频素材。
5. 动态卡片和问答通过后端使用已核对知识与配置模型；失败回退。线上真实模型问答已验证一次 `generated:true`、1 条来源。
6. 移动问答接入原始论文：102 个不同来源标题、8,322 个切片；原始资料不自动作为个体建议依据。
7. 教学链接按套式和动作配置，空链接不跳 example.com；真实相机与参考图片等比显示，不显示假实时分数。服务器当前没有教学视频链接。

## 验证记录

- `npm test -- --maxWorkers=1`：16 个文件、105 项通过。
- Web、Android 资源构建与 Gradle `assembleDebug` 成功，签名验证通过。
- `scripts/qa-mobile.cjs`：360×740 家长版三个主页面横向与主区域溢出均为 0；提醒分步、真实本地 WAV 上传/发布/播放/暂停/更换/退出停止通过。
- `scripts/qa-public.cjs`：公网桌面 1440×900 下 App 容器 420×852；393×852 手机布局、问答及三条原文依据展示通过，无页面异常。
- API 健康和论文统计可访问；未认证管理请求返回 401，公共配置不含 API key。公网 APK 返回 200，服务器文件哈希与本地一致。
- 没有完成新版 APK 的真实手机安装、摄像头、方言及锁屏提醒实测。浏览器模拟或编译成功不等同实机验收。

## 构建与素材

`npm run build:web` 输出 `dist-web/`；`npm run build:android` 后执行 `npx cap sync android`，在 Android 目录用 JDK 21、Gradle `assembleDebug --no-daemon --max-workers=2`。

图标再生成：`node scripts/sync-brand-vectors.cjs`；动效素材：`node scripts/export-brand-assets.cjs`，需要 `sharp`。勿运行旧截图式 Logo 同步脚本覆盖新版资源。

本地浏览器检查需要 Playwright、已安装 Chromium、5173 Vite 与 8789 独立 QA API。`qa-mobile.cjs` 使用 `local-qa-only` 凭证与 `.tmp-qa-api` 数据；先运行 `node scripts/qa-audio-fixture.mjs` 创建测试 WAV，测试素材不发布到生产。

## 部署与恢复

API 代码：`/opt/yangling/releases/20260909-113119`；配置与音频：`/var/lib/yangling`；凭证：`/etc/yangling/api.env`。原 `/opt/yangling-api` 保留。管理凭证沿用原值，本地副本 `yangling-admin.local` 被 Git 忽略。

API 升级备份：`/var/backups/yangling/api-20260909-113119`；网页备份：`/var/backups/yangling/20260909-113331`，最终小修另有时间戳备份。静态发布保留旧 hash 资源，API 发布保留持久数据并检查健康。

下一步：上传正式音频和教学视频、核对知识内容，在至少两款手机检查权限、相机、锁屏提醒、重启与大字体；详见 Q&A 文档末尾清单。
