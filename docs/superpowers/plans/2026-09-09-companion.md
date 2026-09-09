# 小芽陪伴 Implementation Plan

> Execute inline: tightly coupled existing mobile UI and speech lifecycle. User approved design and requested direct integration and delivery.

**Goal:** 在网页和 APK 接入可拖动、点击、日常动作的宠物和预录鼓励音频。
**Architecture:** 同一 React 组件使用三张透明 PNG。音频事件映射与日完成记录纯函数独立测试；录音复用 speech 的取消序号与互斥事件。网页 Service Worker 预缓存，APK 内置静态资源。
**Tech Stack:** React、Vite、Capacitor、HTML Audio、Cache API。
**Spec:** docs/宠物与鼓励音频清单-2026-09-09.md，加用户确认的拖动、点击和日常动作。

## Global Constraints

保留现有 UI 与用户文档；不实现口播稿中的家人绑定；不虚构完成状态；减少动画设置下静态展示；录音间隔至少 12 秒，同条至少 30 秒。

## Tasks

- [x] 1. 校验 ZIP 13 个指定 MP3，仅提取白名单文件；保存三张生成图片，记录路径。
- [x] 2. tests/companion.test.js 先验证缺失函数失败，再实现 src/mobile/companion.js：poseCue(result)、recordCompletion(record,type,date)、clampPetPosition。覆盖 partial 不表扬、日内去重、跨日归零和拖动边界。
- [x] 3. speech.js 支持预录音频且沿用 stopSpeech 取消；缓存由 public/companion-assets.json 列出全部 13 音频和三张图。SW 安装及重试只保存成功音频/图像，不误缓存 HTML 回退。
- [x] 4. PetCompanion.jsx 实现 pointer capture、拖动阈值、边界限制、方向键移动、收起/展开、点击播报、闲置状态轮换、庆祝事件；MobileApp 完成事件持久化，MotionScreen 使用有节流的事件，LaunchCover 增加原文标语。
- [x] 5. 跑单测、浏览器拖动/点击/离线录音、360 和 393 像素布局；构建 Web、APK。静态发布新增 pet/audio 目录，保留原后端配置；APK 提升为 1.4/code5。
- [x] 6. 验证下载哈希与线上素材，写交付记录，非强制推送到 GitHub。

## Decisions

沿用已授权当前工作目录与 feature 分支，不移走用户素材。按新用户明确指令继续执行，不为已批准方案重复询问。UI、事件和音频生命周期连续耦合，由当前 agent 完成；独立最终审查单独进行。
