# 养令体验升级 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent service task; the main agent integrates the UI and delivery. Steps use checkbox syntax for tracking.

**Goal:** 实现已确认的视觉、家长版、提醒、可配置音频和动态知识规划。

**Architecture:** 保留 React/Capacitor，增加 Node HTTP 配置与 RAG 代理服务；公共配置不含密钥，管理接口使用服务端管理令牌。音频上传持久化到服务器，用户端随机播放；提醒仍由 Android 本机调度。

**Tech Stack:** React 18、Vite、Node HTTP、Capacitor LocalNotifications、SVG、Vitest。

**Spec:** docs/养令体验升级规划-2026-09-08.md

## Global Constraints

- 保留当前分支的用户提交，不覆盖新品牌文档。
- 不增加通知服务器；音频与知识配置需要服务端发布。
- 图标统一矢量绘制，真实教学画面等比显示。
- 家长版保留所有功能；长内容和系统大字体允许必要滚动。
- 模型密钥不随网页或 APK 分发；无依据时不生成虚构引用。

## Task 1: 配置服务、音频上传与模型代理

独立任务详细接口及验收见 docs/superpowers/plans/2026-09-08-service-brief.md。

- [ ] 先写服务测试：未授权写入被拒；配置持久化且公共响应脱敏；音频上传类型/大小校验；生成仅使用检索依据，失败返回备用内容。
- [ ] 实现 server/*.mjs、src/mobile/service.js、配置字段、部署服务样例。
- [ ] 执行相关测试，记录失败与通过结果；只提交该任务文件。

## Task 2: UI、家长版、后台与音频

Files: src/mobile/MobileApp.jsx、AdminPanel.jsx、BrandIcons.jsx、AudioSession.jsx、experience.css、audio-library.js；tests/audio-library.test.js。

- [ ] 测试随机选取不重复、禁用音频不可选、空库返回 null；实现 selectAudio(tracks, history, random)。
- [ ] 统一 SVG Logo、图标、头像；家长版行动命名、语音优先、跟练流程分层，保留文本、依据和反馈。
- [ ] 音频组件使用 HTMLAudio，三分钟倒计时、暂停、音量、换一段、停止；不自动并行播放。
- [ ] 后台接入服务登录、发布、音频上传/增删停用、生成开关/要求/备用文案。
- [ ] 首页按显式提交调用 generate endpoint，不因渲染生成；问答移除伪造示例引用，支持朗读。

## Task 3: 本机提醒

Files: src/mobile/reminder-schedule.js、native-notifications.js、ReminderSettings.jsx；tests/reminder-schedule.test.js。

- [ ] 测试固定时间、间隔、跨午夜免打扰、关闭、内容与名称更改后的重排。
- [ ] 设置按日重复的 Android 通知时刻，时间窗口内按间隔枚举；内容选择、称呼、可选身体状态、免打扰。
- [ ] 删除测试通知及常驻技术说明，首次启用才请求权限，失败不保存为成功。

## Task 4: 集成与发布

- [ ] 运行 npm test、build:web、build:android；浏览器检查三页与家长版、后台发布流程。
- [ ] 生成同源 APK 图标，更新版本为 1.2 / code 3，构建签名校验。
- [ ] 部署服务及静态站点前备份，验证公开配置脱敏、未授权拒绝、首页资源和 APK 下载。
- [ ] 审查 diff，更新交付记录，推送 GitHub；无实机不宣称实机通知验证通过。

## Progress

- 基线：838ee28；远端 main 是其祖先；工作区初始干净。
- 服务任务由独立 agent 执行，主 agent 只改 UI、提醒与集成文件，避免共享文件冲突。
