# Task 1 服务端实施报告

## 结果

已实现无新运行时依赖的 Node.js HTTP API，包括持久化配置、Bearer 管理鉴权、密钥脱敏/保留/清除、签名校验音频上传与 Range 读取、基于已审核条目的引用生成与安全回退。同时提供前端 service client、systemd unit 和部署文档。

## RED

- 命令：`npx vitest run tests/service.test.js`
- 结果：失败，`Cannot find module '../server/app.mjs'`；证明新服务测试在实现前为红。

## GREEN

- 命令：`npx vitest run tests/service.test.js`
- 结果：6 tests passed。覆盖真实本地 HTTP 服务/临时目录、鉴权、重启持久化、密钥不泄露/保留/清除、音频签名与 Range、未审核回退、注入上游 fetcher 的引用成功。
- 命令：`npx vitest run tests/service.test.js tests/mobile-llm.test.js`
- 结果：2 files / 8 tests passed。
- 命令：`node --check server/app.mjs` 和 `node --check src/mobile/service.js`
- 结果：通过。
- 命令：`git diff --check`
- 结果：通过（只有 Git 的 LF/CRLF 工作区提示）。

## 变更文件

- `server/app.mjs`、`server/index.mjs`
- `src/mobile/config.js`、`src/mobile/service.js`
- `tests/service.test.js`
- `deploy/yangling-api.service`
- `docs/SERVICE.md`
- `docs/superpowers/plans/2026-09-08-service-report.md`

## 剩余限制

- 旧 `tests/mobile-config.test.js` 仍期待 `example.com` 视频有效且默认视频非空，与本任务的新明确契约相反；因任务文件边界禁止修改该旧测试，故保留由主任务统一更新。
- 全量 `npm run build` 在并行开发中的 `MobileApp.jsx` 处因 `testNativeNotification` 尚未导出而失败，不属于本任务拥有文件。
- SSRF 防护在请求前校验 DNS 解析结果并禁止重定向；如需彻底消除高级 DNS rebinding 窗口，生产环境还应用出站防火墙限制私有网段。

## 集成回归修正

- RED：`npx vitest run tests/service.test.js` 新增 3 项用例后失败，分别复现问答原文被开关阻断、三卡片并发被节流、中文文件名未编码。
- GREEN：`npx vitest run tests/service.test.js` 通过 10 项，新增覆盖 Android native 基址、中文文件名/MIME 回退、三卡片并发与意图、问答原文、上游响应上限、GitHub Pages CORS 和 `no-store`。
- 生成上游改为每客户每分钟 12 次、最大并发 3，首页三卡片可同时生成；超限仍安全回退。

## 审查加固（2026-09-09）

### RED

- `npx vitest run tests/service.test.js`：14 项中 5 项失败，分别复现任意 localhost 端口被放行、未知凭据字段泄漏、`bytes=-N` 返回 416、Nginx 回环代理后所有用户共用限流桶、上传 12 秒被中止。
- `npx vitest run tests/service.test.js -t "exposes unreviewed research"`：失败，当时尚无 `/api/research` 路由。

### GREEN

- `npx vitest run tests/service.test.js --maxWorkers=1`：15/15 通过。
- `npx vitest run tests/research.test.js --maxWorkers=1`：2/2 通过。
- `npx vitest run tests/mobile-config.test.js tests/mobile-llm.test.js --maxWorkers=1`：9/9 通过。
- 多文件默认并行运行时由于 8,322 个论文分块被多个 Vitest worker 同时加载，2 个 worker 异常退出；改为 `--maxWorkers=1` 后各组全部通过。

### 变更

- 只信任来自回环连接且通过 IP 语法校验的 `X-Real-IP`，并在生成请求时清理过期限流记录。
- LLM 与 generation 按明确 schema 归一化，未知 token/password/authorization 类字段不再持久化或返回。
- 音频支持后缀 Range，缺失文件返回 404，非法范围返回 416，文件句柄用 `finally` 关闭。
- CORS 仅允许生产域、GitHub Pages 域、localhost 无端口或 5173，以及 `127.0.0.1:5173`。音频上传客户端超时单独调整为 120 秒。
- 新增论文检索接口；未审核论文只作问答的研究资料展示，不进入三张个性化卡片或 LLM 上下文。

### 剩余限制

- 论文资料保持 `reviewed:false`，界面需按“研究资料”而非个体健康建议展示。
- 本轮未部署。
