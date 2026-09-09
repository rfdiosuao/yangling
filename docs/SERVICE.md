# 养令 API 服务

服务使用 Node.js 内置 HTTP 服务器，默认只监听 `127.0.0.1:8789`，由 Nginx 反向代理 `/api/`。

## 配置

`YANGLING_DATA_DIR` 指定持久化目录，建议为 `/var/lib/yangling`。`YANGLING_ADMIN_TOKEN` 是管理端 Bearer token，必须设置；空值时所有管理请求都会被拒绝。`PORT` 可选，默认 `8789`。

```sh
sudo install -d -o yangling -g yangling /var/lib/yangling /etc/yangling
sudo install -m 0644 deploy/yangling-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now yangling-api
```

`/etc/yangling/api.env` 示例（文件权限应为 `0600`）：

```ini
YANGLING_DATA_DIR=/var/lib/yangling
YANGLING_ADMIN_TOKEN=replace-with-a-long-random-token
```

## 接口

公开接口：`GET /api/health`、`GET /api/config`、`GET /api/research?q=关键词`、`GET /api/audio/:filename`、`POST /api/generate`。管理接口：`GET|PUT /api/admin/config` 和 `POST /api/admin/audio`，需要 `Authorization: Bearer <token>`。

配置读取不会返回 API key，只返回 `llm.configured`。更新时提交空 `apiKey` 会保留原密钥；提交 `clearApiKey: true` 才会清除。音频限制 20 MiB，服务会检查 MIME 类型和基本文件头。

1.3 生成功能有两条路径：匹配已启用且已审核的知识时生成带引用回答；无匹配且模型已启用和配置时，生成明确标注的 `AI 通用建议`，返回 `basis:general` 与空来源数组，不伪造依据。引用校验失败、超时或上游异常时返回回退文案。接口 kind 为 cup、move、breath 或 question。有依据不等于医学正确性保证。

## 已部署目录与升级

2026-09-09 起，服务代码位于 `/opt/yangling/releases/<时间>/`，`/opt/yangling/current` 指向当前版本；持久化配置及音频位于 `/var/lib/yangling`，管理凭证位于 `/etc/yangling/api.env`。以 `yangling` 用户运行，不以 root 运行应用。

`deploy/release-api.sh` 接受 `/tmp/yangling-release-*` 暂存目录，包含 `api/` 代码、`yangling-api.service` 和 `migrate-api-env.mjs`。首次升级会迁移原 `/opt/yangling-api/data` 与管理令牌，备份位于 `/var/backups/yangling/api-<时间>/`。代码包需同时包含 `src/core/rag/papers.js`。

Nginx 必须覆盖 `X-Real-IP` 为 `$remote_addr`；服务只对本机反向代理使用此请求头进行限流。音频上传最大 20 MiB、前端上传超时 120 秒。配置 JSON 请求最大 256 KiB；大体积论文资料作为服务端数据发布，不直接塞入管理表单。

管理地址：`https://yangling.entermodetwo.com/#admin`。管理令牌不要放入 GitHub、网页或 APK；网站普通界面没有管理入口。隐藏入口不代替鉴权，管理 API 仍需令牌。

原始研究检索结果标记 `reviewed:false, kind:research`。它们用于展示实际资料，不自动作为个体动态卡片的依据；有来源的动态生成依赖后台已核对条目，无匹配时走上述通用建议路径。音频 URL 公开可播放，请勿上传私人录音。
