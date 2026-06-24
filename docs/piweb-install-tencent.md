# Pi.Agent Web 腾讯云部署方案

## 结论

Pi.Agent Web 当前部署在腾讯云服务器 `43.138.130.199`，面向大陆用户通过 `https://pi.gottao.com` 直接访问使用。此前试装到 `175.178.172.24` 的实例已卸载，当前以 199 服务器为准。

这次定位建议是 **Livo 授权后的受控试用 / 顾问演示 / 单企业试点环境**。2026-06-24 起，`pi.gottao.com` 已从匿名 mutation 切换为 Bearer token 保护：用户可打开页面查看入口，但 Livo 集成相关写入 API 必须由 Livo 后端持 `PI_WEB_REMOTE_TOKEN` 调用。需要明确的是：Pi.Agent Web 不是普通展示站，它能读会话、读文件、发起 Agent 工具调用。开放页面可以降低试用门槛，但必须把数据目录、运行用户、备份、日志和密钥隔离做好，避免把真实生产资料直接暴露到公网。

## 服务器目标

- 目标公网 IP：`43.138.130.199`
- 登录用户：`ubuntu`
- 面向用户：中国大陆用户
- 访问策略：页面开放访问；API mutation 使用 `PI_WEB_REMOTE_TOKEN` 受控访问
- 访问域名：`pi.gottao.com`

执行前先确认：

```bash
ssh ubuntu@43.138.130.199
uname -a
lsb_release -a || cat /etc/os-release
free -h
df -h
```

`pi.gottao.com` 当前解析到 `43.138.130.199`，并通过 Nginx + HTTPS 对外提供服务。正式面向大陆用户时仍需确认域名备案状态。

## 服务器评估

199 服务器资源比 24 服务器更充足，适合作为当前开放试用环境。后续如果再迁移到轻量机器，建议最低配置：

- 内测/演示：2C2G / 40GB 起，可以跑，但构建时可能吃紧。
- 稳定试点：2C4G / 60GB 或 90GB 更稳。
- 多团队或长期使用：4C8G 起，后续再考虑独立数据盘、对象存储、备份盘和任务执行节点。

2C2G 上不要频繁在服务器直接 `npm run build`。更稳的方式是本地或 CI 构建后发布；如果必须在服务器构建，先加 swap。

## 推荐架构

```text
用户浏览器
  -> pi.gottao.com / 43.138.130.199
  -> 腾讯云轻量应用服务器
  -> Nginx 80/443
  -> 127.0.0.1:30141
  -> Pi.Agent Web / Next.js
  -> /data/pi-agent
```

关键原则：

- 对外只开放 80/443。
- Pi.Agent Web 只监听 `127.0.0.1:30141`，由 Nginx 反向代理。
- 数据目录固定到 `/data/pi-agent`，不要使用 root 的默认 `~/.pi/agent`。
- 使用低权限系统用户运行服务，不用 root 跑 Node。
- 先不要放客户真实生产资料、财务资料、长期有效的高权限密钥。

## 部署目录

```bash
/opt/pi-agent/releases/<release>
/opt/pi-agent/pi-app-current
/data/pi-agent
/data/pi-agent/workspaces
/data/pi-agent/sessions
/data/pi-agent/models.json
/var/log/pi-agent
```

初始化：

```bash
sudo useradd --system --home-dir /data/pi-agent/workspaces --shell /usr/sbin/nologin piagent
sudo mkdir -p /opt/pi-agent/releases /data/pi-agent/workspaces /data/pi-agent/sessions /var/log/pi-agent
sudo chown -R piagent:piagent /data/pi-agent /var/log/pi-agent
```

注意：应用代码目录 `/opt/pi-agent` 不应整体改成可写。`/api/default-cwd` 会基于 Node 的 `os.homedir()` 创建 `pi-cwd-YYYYMMDD` 工作区，所以 systemd 必须显式设置 `HOME=/data/pi-agent/workspaces`，否则服务用户可能尝试写入 `/opt/pi-agent/pi-cwd-*` 并触发 `EACCES`。

## 环境变量

### Livo 受控接入

接入 Livo 后不要再使用匿名公网写入。199 应改为 Livo 后端持有 Bearer token 调用，浏览器前端不接触 token：

```bash
NODE_ENV=production
PORT=30141
HOSTNAME=127.0.0.1
PI_CODING_AGENT_DIR=/data/pi-agent
HOME=/data/pi-agent/workspaces
PI_WEB_REMOTE=1
PI_WEB_REMOTE_TOKEN=<strong-server-token>
PI_WEB_LIVO_WORKSPACE_ROOT=/data/pi-agent/workspaces/livo
PI_WEB_TERMINAL_DISABLED=1
```

确认不要设置：

```bash
PI_WEB_ALLOW_REMOTE_MUTATIONS=1
```

### Livo SSO 直登

用户直接访问 `https://pi.gottao.com/app` 工作台时，使用 Livo SSO ticket 登录 Pi Web。`https://pi.gottao.com/` 保持产品介绍页。Pi 不保存 Livo JWT，只设置自己的 `pi_livo_session` HttpOnly cookie。

Pi Web 需要新增：

```bash
PI_LIVO_SSO_ENABLED=1
PI_LIVO_BASE_URL=https://livo.gottao.com/livoApi/livoAgent
PI_LIVO_WEB_LOGIN_URL=https://livo.gottao.com/auth/login
PI_LIVO_SSO_VERIFY_TOKEN=<same-as-livo-backend-PI_SSO_VERIFY_TOKEN>
PI_LIVO_SESSION_SECRET=<new-random-secret-min-32-bytes>
PI_PUBLIC_ORIGIN=https://pi.gottao.com
PI_WEB_LIVO_WORKSPACE_ROOT=/data/pi-agent/workspaces/livo
```

Livo Backend 需要新增：

```bash
PI_SSO_VERIFY_TOKEN=<same-as-pi-PI_LIVO_SSO_VERIFY_TOKEN>
PI_SSO_ALLOWED_PI_ORIGIN=https://pi.gottao.com
PI_SSO_TICKET_TTL_SECONDS=120
```

验收：

```bash
curl -i https://pi.gottao.com/api/livo/sso/start?returnTo=/app/
curl -i https://pi.gottao.com/api/livo/me
```

预期：

- `/api/livo/sso/start` 返回 307，`Location` 指向 Livo 登录页并带 `/pi-sso?returnTo=...`。
- 未带 `pi_livo_session` 时 `/api/livo/me` 返回 401。
- 浏览器完成 Livo 登录后，Pi callback 设置 `pi_livo_session`，随后 `/api/livo/me` 返回当前 Livo 用户。
- 用户只能看到自己 `/data/pi-agent/workspaces/livo/users/{userId}` 下的 session。

验收：

```bash
curl -i https://pi.gottao.com/api/sessions
curl -i -X POST https://pi.gottao.com/api/agent/new \
  -H 'Content-Type: application/json' \
  -d '{"cwd":"/tmp","type":"prompt","message":"probe"}'
```

以上匿名请求应返回 `401` 或 `403`，不能返回 session 列表或创建 agent。

### 当前 199 验收结果

2026-06-24 已上线 Livo 受控接入：

- `PI_WEB_REMOTE=1`
- `PI_WEB_REMOTE_TOKEN=<rotated-server-token>`
- `PI_WEB_LIVO_WORKSPACE_ROOT=/data/pi-agent/workspaces/livo`
- `PI_WEB_TERMINAL_DISABLED=1`
- 已移除 `PI_WEB_ALLOW_REMOTE_MUTATIONS=1`

验收结果：

```text
匿名 GET /api/sessions -> 401
匿名 POST /api/livo/workspace -> 401
Bearer POST /api/livo/workspace -> 200
Livo POST /pi-agent/tasks -> 200
Pi session URL https://pi.gottao.com/app/?session=<id> -> SSO 后打开
```

2026-06-24 已上线 Livo SSO 直登：

- `PI_LIVO_SSO_ENABLED=1`
- `PI_LIVO_BASE_URL=https://livo.gottao.com/livoApi/livoAgent`
- `PI_LIVO_WEB_LOGIN_URL=https://livo.gottao.com/auth/login`
- `PI_LIVO_SSO_VERIFY_TOKEN=<configured>`
- `PI_LIVO_SESSION_SECRET=<configured>`
- `PI_PUBLIC_ORIGIN=https://pi.gottao.com`
- `PI_WEB_ALLOW_REMOTE_MUTATIONS` 已移除
- Nginx `pi.gottao.com/` 根路径保持 `/var/www/pi-gottao` 产品介绍页
- Nginx `/app` 保留 query 重定向到 `/app/`
- Nginx `/app/` 反代到 `127.0.0.1:30141`，并设置 `X-Pi-Workbench-Entry: /app`

验收结果：

```text
GET / -> 200 产品介绍页
GET /app?session=probe -> 301 /app/?session=probe
GET /app/?session=probe -> 307 /api/livo/sso/start?returnTo=%2Fapp%2F%3Fsession%3Dprobe
curl -L /app/ -> https://livo.gottao.com/auth/login?redirect=...
GET /api/livo/sso/start?returnTo=/?session=legacy -> 307 Livo 登录，returnTo 归一化为 /app/?session=legacy
GET /api/livo/me without cookie -> 401
GET /api/sessions without cookie -> 401
POST /api/livo/workspace without token -> 401
GET /api/livo/sso/start?returnTo=https://evil.example/ -> 400
GET /api/livo/sso/callback?ticket=invalid -> 401
```

### 旧开放试用配置

因为本阶段要求“用户可以直接访问使用”，需要显式打开远程公开访问：

```bash
NODE_ENV=production
PORT=30141
HOSTNAME=127.0.0.1
PI_CODING_AGENT_DIR=/data/pi-agent
HOME=/data/pi-agent/workspaces
PI_WEB_REMOTE=1
PI_WEB_ALLOW_REMOTE_MUTATIONS=1
PI_WEB_TERMINAL_DISABLED=1
```

说明：

- `HOSTNAME=127.0.0.1`：确保 Next 服务不直接暴露到公网，只让 Nginx 代理访问。
- `HOME=/data/pi-agent/workspaces`：默认工作区写入数据盘，不写入 `/opt/pi-agent` 程序目录。
- `PI_WEB_REMOTE=1`：允许非 localhost 场景进入远程模式。
- `PI_WEB_ALLOW_REMOTE_MUTATIONS=1`：当前代码仍兼容的开放访问开关，允许公网用户直接使用 API。这个变量在 pi-app 文档中已标注为 deprecated；后续正式生产化时应改为配对、token、账号体系或反向代理层认证。
- `PI_WEB_TERMINAL_DISABLED=1`：公网开放试用环境禁用浏览器终端 API。即使前端入口可见，服务端也会返回 403，不执行命令。
- 本阶段不要设置 `PI_WEB_REMOTE_TOKEN`，否则用户 API 调用会要求 Bearer token。
- `/data/pi-agent/pi-web-remote.json` 中也应保持 `"enabled": true`、`"allowedHostnames": []`、`"readOnly": false`。否则远程配置接口会显示未开启，并可能在运行期同步配置时清掉 `PI_WEB_REMOTE`。

当前 199 服务器上的开放远程配置：

```json
{
  "enabled": true,
  "allowedHostnames": [],
  "sessions": [],
  "pairingCodes": [],
  "readOnly": false
}
```

## 应用部署

推荐在本地或 CI 构建 Next standalone 运行包，再上传到服务器 release 目录。199 当前使用独立 Node 运行时：

```bash
/opt/pi-agent/runtime/node-v22.13.1-linux-x64-glibc-217/bin/node
```

服务入口是：

```bash
/opt/pi-agent/pi-app-current/server.js
```

如果需要在服务器上源码构建：

```bash
cd /opt/pi-agent/pi-app
npm ci
npm run build
```

启动验证：

```bash
sudo -u piagent env \
  NODE_ENV=production \
  PORT=30141 \
  HOSTNAME=127.0.0.1 \
  PI_CODING_AGENT_DIR=/data/pi-agent \
  PI_WEB_REMOTE=1 \
  PI_WEB_ALLOW_REMOTE_MUTATIONS=1 \
  npm start
```

服务进程建议使用 systemd。

`/etc/systemd/system/pi-agent-web.service`：

```ini
[Unit]
Description=Pi.Agent Web
After=network.target

[Service]
Type=simple
User=piagent
Group=piagent
WorkingDirectory=/opt/pi-agent/pi-app-current
Environment=NODE_ENV=production
Environment=PORT=30141
Environment=HOSTNAME=127.0.0.1
Environment=PI_CODING_AGENT_DIR=/data/pi-agent
Environment=HOME=/data/pi-agent/workspaces
Environment=PI_WEB_REMOTE=1
Environment=PI_WEB_ALLOW_REMOTE_MUTATIONS=1
Environment=PI_WEB_TERMINAL_DISABLED=1
ExecStart=/opt/pi-agent/runtime/node-v22.13.1-linux-x64-glibc-217/bin/node /opt/pi-agent/pi-app-current/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pi-agent-web
sudo systemctl status pi-agent-web --no-pager
curl -i http://127.0.0.1:30141/api/health
```

## Nginx 配置

Pi.Agent 有 SSE 流式输出，反代必须禁用缓冲。

`/etc/nginx/sites-available/pi-agent-web`：

```nginx
server {
  listen 80;
  server_name pi.gottao.com;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:30141;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    add_header X-Accel-Buffering no;
  }
}
```

启用：

```bash
sudo ln -sf /etc/nginx/sites-available/pi-agent-web /etc/nginx/sites-enabled/pi-agent-web
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS：

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pi.gottao.com
```

199 服务器当前证书由 `acme.sh` 签发并安装到：

```bash
/etc/nginx/cert/pi.gottao.com.key
/etc/nginx/cert/pi.gottao.com_bundle.pem
```

`certbot` 在该服务器上受 Python/OpenSSL 环境影响不可用，后续续签和重签优先沿用 `acme.sh`。

## DNS 与防火墙

DNS：

- 将 `pi.gottao.com` 的 A 记录指向 `43.138.130.199`。
- 如后续再迁移服务器，先降低 TTL，再切换 A 记录。
- 切换后保留旧服务器至少 24 小时，方便回滚或迁移数据。

腾讯云安全组/轻量防火墙：

- 开放：80、443。
- SSH 22：建议只允许固定运维 IP；如果暂时无法限制，至少使用强密码并尽快改为 SSH key。
- 不开放：30141。Pi.Agent Web 只走 Nginx 反代。

服务器本机也建议开启 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 30141/tcp
sudo ufw enable
sudo ufw status verbose
```

## 数据与密钥边界

开放访问阶段务必遵守：

- `/data/pi-agent` 只放试用数据和演示数据。
- 不放客户生产密钥、财务资料、隐私数据、长期有效的云账号密钥。
- 模型供应商 key 使用专门的试用额度账号，不用个人主账号。
- 定期清理无用会话，避免用户上传的资料长期沉积。
- 如果需要接入企业知识库，先做脱敏样例库。

## 备份

每日备份 `/data/pi-agent`，至少保留 7-14 天：

```bash
sudo mkdir -p /data/backups/pi-agent
sudo tee /usr/local/bin/backup-pi-agent.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ts="$(date +%Y%m%d-%H%M%S)"
tar -czf "/data/backups/pi-agent/pi-agent-${ts}.tar.gz" -C /data pi-agent
find /data/backups/pi-agent -type f -name 'pi-agent-*.tar.gz' -mtime +14 -delete
EOF
sudo chmod +x /usr/local/bin/backup-pi-agent.sh
```

Cron：

```bash
sudo crontab -e
```

加入：

```cron
15 3 * * * /usr/local/bin/backup-pi-agent.sh
```

## 验收清单

本机服务：

```bash
systemctl status pi-agent-web --no-pager
curl -i http://127.0.0.1:30141/api/health
```

Nginx：

```bash
curl -I http://43.138.130.199/
```

域名：

```bash
dig +short pi.gottao.com
curl -I https://pi.gottao.com/
curl -i https://pi.gottao.com/api/remote/client
```

受控访问能力：

```bash
curl -i https://pi.gottao.com/api/sessions
curl -i -X POST https://pi.gottao.com/api/default-cwd
```

预期：

- 首页 200。
- 本机 `http://127.0.0.1:30141/api/health` 200。
- 公网 `/api/health` 返回 403 是预期行为；该接口是 loopback-only 健康检查，不作为浏览器连通性验收。
- 公网 `/api/remote/client` 200。
- 公网 `/api/terminal/*` 403。开放试用环境不允许浏览器终端执行命令。
- `/api/sessions` 在不带 Pi/Livo 登录态或 server token 的情况下必须返回 401/403。
- `/api/default-cwd` 返回 `/data/pi-agent/workspaces/pi-cwd-YYYYMMDD`，不得返回 `/opt/pi-agent/pi-cwd-*`。
- 浏览器能创建会话、发送消息，并看到 SSE 流式输出。
- `/data/pi-agent/sessions` 中出现新会话数据。

端口：

```bash
ss -lntp | grep -E '(:80|:443|:30141)'
```

预期：

- Nginx 监听 `0.0.0.0:80` / `0.0.0.0:443`。
- Node 只监听 `127.0.0.1:30141`。

## 迁移或回滚

1. 在当前服务器上确认是否已有会话、模型配置、远程配置：

```bash
ls -lah ~/.pi/agent || true
sudo ls -lah /data/pi-agent || true
```

2. 如需迁移，把 199 的 agent 数据打包：

```bash
tar -czf pi-agent-data-migrate.tar.gz -C /data pi-agent
```

3. 上传到新服务器后解压到 `/data/pi-agent`，再修正权限：

```bash
sudo tar -xzf pi-agent-data-migrate.tar.gz -C /data
sudo chown -R piagent:piagent /data/pi-agent
```

4. 在新服务器完成 health、首页、会话、SSE 验收。
5. 切 DNS A 记录到新服务器。
6. 观察日志和访问情况：

```bash
sudo journalctl -u pi-agent-web -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

## 阶段计划

第一阶段，1 天：

- `43.138.130.199` 完成 Node.js、Nginx、Pi.Agent Web 部署。
- 使用公网域名跑通首页、`/api/remote/client`、`/api/sessions`、`/api/default-cwd`、SSE。
- 建立 `/data/pi-agent` 数据目录和每日备份。

第二阶段，1-2 天：

- `pi.gottao.com` 完成备案状态确认、DNS 解析和 HTTPS。
- 切换大陆用户入口到 `https://pi.gottao.com`。
- 使用演示数据跑通销售、客服、运营、研发四类样板会话。

第三阶段，对外试点：

- 观察访问日志、错误日志和资源占用。
- 明确数据保留周期和清理规则。
- 如果开始承载真实客户数据，再补账号体系、访问控制、租户隔离和审计。

## 风险提示

当前方案为了让大陆用户直接访问，使用了开放访问策略。这适合早期试用，不适合长期公网生产。

后续出现以下任一情况，应升级安全模型：

- 用户开始上传客户真实资料。
- 需要接入企业内部知识库。
- 需要配置长期有效的模型 key 或云服务 key。
- 多家公司或多个团队同时使用。
- 需要区分管理员、普通用户、只读用户。

升级方向：

- 使用 pi-app 远程配对或 `PI_WEB_REMOTE_TOKEN`。
- 在 Nginx 层增加账号登录、Basic Auth 或企业 SSO。
- 按客户拆分数据目录或工作区。
- 增加审计日志、备份恢复演练、资源监控和告警。
