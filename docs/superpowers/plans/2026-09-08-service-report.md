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
