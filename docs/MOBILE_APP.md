# 养令手机 App 原型

以提供的三张设计图右侧手机页面为标准。手机与桌面共享 `src/mobile/` 中的组件；桌面保持 393 px 单列应用宽度。

## 启动

在项目目录执行：

```powershell
npm install
npm run dev
```

打开 `http://localhost:5173/`。如果端口被占用，以终端显示的实际地址为准。

- 轻养生：`/#home`
- 问答知识库：`/#knowledge`
- 动作识别：`/#motion`
- 原工作台：`/?legacy=1`

同一局域网手机可以访问开发机 IP 对应的开发端口。摄像头和语音需要浏览器支持与权限，摄像头通常还要求 HTTPS 或 localhost；普通局域网 HTTP 可体验其余原型操作。

## 已实现

状态输入／快捷选择、养生卡片详情、饮水打卡、呼吸计时与暂停、问答输入与示例匹配、知识来源弹层、答案反馈、儿女版／家长版、动作切换、教学视频、示范步骤、练习打卡，以及摄像头本地姿态检测入口。主界面已针对短屏压缩，三页核心功能无需纵向滚动即可看到。

右上角齿轮进入管理台，可配置 OpenAI-compatible LLM、知识条目、套式／动作名称和教学视频链接；配置保存在当前浏览器。填写 LLM API Key 后问答会调用所配置模型，异常时自动回退本地知识库。语音支持普通话、粤语、四川话、吴语选项，实际识别能力由浏览器 SpeechRecognition 实现决定。摄像头开启后会加载本地 MediaPipe 模型，并从关键点计算练习反馈。

## 文件

- `src/mobile/MobileApp.jsx`：页面、输入、详情、计时、导航和摄像头流程。
- `src/mobile/mobile.css`：与手机参考图对应的视觉与响应式规则。
- `src/mobile/model.js`：示例问答、建议卡片和姿态几何评分。
- `src/mobile/config.js`、`AdminPanel.jsx`：管理台配置、持久化和知识匹配。
- `src/mobile/llm.js`：OpenAI-compatible 问答请求与本地回退衔接。
- `public/prototype/`：用户参考图片的项目副本，供原图摄影和图标区域复用。
- `tests/mobile-model.test.js`：新增原型逻辑测试。
- `scripts/mobile-qa.html`：开发环境同屏对照页。
- `design-qa.md`、`docs/mobile-qa/`：验收记录与截图。

## 验证与构建

```powershell
npm run check
```

构建输出仍沿用项目既有的 `dist/` 和 `/yangling/` 基础路径。本次没有发布、推送或生成原生安装包。
