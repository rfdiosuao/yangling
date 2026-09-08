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

公开接口：`GET /api/health`、`GET /api/config`、`GET /api/audio/:filename`、`POST /api/generate`。管理接口：`GET|PUT /api/admin/config` 和 `POST /api/admin/audio`，需要 `Authorization: Bearer <token>`。

配置读取不会返回 API key，只返回 `llm.configured`。更新时提交空 `apiKey` 会保留原密钥；提交 `clearApiKey: true` 才会清除。音频限制 20 MiB，服务会检查 MIME 类型和基本文件头。

生成功能只使用已启用且已审核的匹配知识。无匹配依据、引用校验失败、超时或上游异常时都返回预先批准的回退文案；有依据不等于医学正确性保证。
