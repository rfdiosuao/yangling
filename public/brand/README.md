# 养令新版 Logo · 动效交接素材

本目录复用 APK 1.2 与网站左上角的同一份图形路径，不是重新设计的另一个标志。

| 文件 | 用途 |
| --- | --- |
| `yangling-mark-white.svg / .png` | 纯图标、纯白背景；PNG 2048×2048 |
| `yangling-mark-transparent.svg / .png` | 纯图标、透明背景；适合叠加动效 |
| `yangling-logo-white.svg / .png` | 图标＋养令＋YangLing，纯白背景；PNG 1600×1000 |
| `yangling-logo-transparent.svg / .png` | 完整标志、透明背景 |

SVG 的图形是可编辑路径，分层 ID：`outer-ring`（外环）、`inner-leaf`（中心叶形）、`stem`（短线）、`wordmark-cn`、`wordmark-en`、`background`。白底为 #FFFFFF，图形暖金 #8B6D39，中文深绿 #283E33。

完整标志的文字保留为可编辑 text：中文 SimSun／宋体，英文 Georgia；导入其他设备前请安装对应字体或在设计软件里转轮廓，避免字体替换。纯图形 SVG 不依赖任何字体。PNG 已固定外观，可直接交给视频工具。

建议启动动效约 1.2–1.6 秒：外环描边 → 叶形轻微浮现 → 中文、英文淡入。白底不闪烁、不循环，不等待网络；只在首次进入展示一次，减少动态效果偏好下直接显示静态标志。不要拉伸 Logo，描边动画用透明 SVG 的独立路径。

1.3 已接入网站与 APK：白底外环描边、叶形浮现、字标淡入，约 1.5 秒，可跳过；减少动态效果偏好下不播放。Android 系统启动屏使用同源白底矢量标志。动画实现位于 `src/mobile/LaunchCover.jsx`，无需下载视频。

再生成：安装或配置 `sharp` 后，在项目根目录运行 `node scripts/export-brand-assets.cjs`。
