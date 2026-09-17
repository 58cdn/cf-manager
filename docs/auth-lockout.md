# API Secret 防爆破

本功能保护两端所有使用 API Secret 认证的接口（包括管理 API 与 OpenAI 兼容 API）。默认同一 IP 连续错误 3 次锁定 5 分钟，锁定结束后再次错误 1 次锁定 10 分钟，后续失败仍锁定 10 分钟。成功认证清除该 IP 的失败记录。

锁定期间正确凭据也不能通过，请求不会延长锁定。返回 HTTP 429，JSON 错误码 `AUTH_LOCKED`，`Retry-After` 响应头及 `error.retry_after` 表示剩余秒数。未提供 Bearer 凭据的页面探测不累计失败；已锁定 IP 的探测仍返回 429。未配置 `API_SECRET` 时保留原有免认证行为。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `AUTH_LOCKOUT_ENABLED` | `true` | `true` / `false`，是否启用 |
| `AUTH_LOCKOUT_ATTEMPTS` | `3` | 首次锁定的连续错误次数，1–1000 |
| `AUTH_LOCKOUT_MINUTES` | `5` | 首次锁定分钟数，1–10080 |
| `AUTH_LOCKOUT_REPEAT_MINUTES` | `10` | 解锁后再次失败的锁定分钟数，1–10080 |
| `AUTH_TRUSTED_PROXIES` | 空 | 仅 Docker：逗号分隔的可信代理 IP / CIDR |
| `UNLOCK_KEY` | 空 | URL 解锁密钥；运行时未设置则禁用解锁入口，Pages 部署 CI 未设置时自动生成 |

无效配置报错，不会静默关闭保护。Docker Compose 从 `.env` 传入上述变量；Cloudflare Pages 在项目环境变量中设置前四项，或按 Wrangler 部署流程配置。改变配置不会缩短已落库的锁定截止时间；关闭功能会暂时绕过所有锁定，重新开启后未过期记录仍然有效。

## 客户端 IP 与部署

### 手动解除当前 IP 的锁定

配置 `UNLOCK_KEY` 后，访问 `https://你的域名/admin/unlock/{UNLOCK_KEY}`，其中占位符替换为密钥（含特殊字符时需 URL 编码）。推荐使用至少 32 字节的随机 URL-safe 值，并与 `API_SECRET` 分开设置。

有效密钥仅删除访问者当前 IP 的失败次数与锁定记录，不解锁其他 IP、不创建登录会话。随后以 HTTP 303 返回管理登录入口（Docker `/`、Worker `/admin/`），仍需输入正确的 API Secret。错误或未配置密钥返回 403，数据库失败返回 503；Worker 缺少 Cloudflare 客户端 IP 时返回 400。仅 GET 可解锁，HEAD/POST 不会更改锁定状态。

Docker 在 `.env` 设置该变量，由 Compose 传入。手动部署 Pages 时设置同名环境变量/Secret。两个 Pages 部署工作流均读取 GitHub Secret `UNLOCK_KEY`（Secrets 版可使用所选 Environment 的同名 Secret）；缺失或为空时，在部署开始阶段生成 32 字节随机值，以 64 位十六进制明文在 `Prepare recovery key` 步骤日志显示一次，然后注册脱敏并写入后续步骤环境与 Cloudflare Pages Secret。已有配置不会明文回显，也不写入前端或镜像。

Pages Secret 的配置使用现有部署方式 `wrangler pages secret put UNLOCK_KEY --project-name ...`，命令依据：[Cloudflare Wrangler Pages 文档](https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-secret-put)。

**生成值会保留在 CI 日志中，能读取日志的人也能取得解锁能力。** 请私下保存，并配置为 GitHub Secret `UNLOCK_KEY`；否则下次部署会生成新值并替换旧值。不在应用启动时自动轮换，不在普通 PR 检查 CI 中创建部署密钥。

解锁响应设置 `Cache-Control: no-store` 与 `Referrer-Policy: no-referrer`，应用不会记录该入口的密钥或异常详情。URL 仍可能出现在浏览器历史、代理或 Cloudflare 访问日志中，应为 `/admin/unlock/` 配置日志脱敏，勿分享完整链接。通过与登录请求相同的可信代理/IP 链路访问；Docker 可信代理配置说明见下文。

### IP 与数据库

Docker 默认以 TCP 对端 IP 为准，忽略客户端伪造的 `X-Forwarded-For`。如有反向代理，必须将其真实 IP / CIDR 配入 `AUTH_TRUSTED_PROXIES`，并让代理正确覆盖或追加转发头。否则所有访客可能按代理地址共同计数。不要信任所有地址；代理链的选择遵循 [Express 官方说明](https://expressjs.com/en/guide/behind-proxies/)。

Worker 使用 Cloudflare 边缘注入的 `CF-Connecting-IP`，不使用 `X-Forwarded-For`。没有该头（如本地直接请求）时使用共同的 `unknown` 计数。应通过 Cloudflare 边缘访问；跨 Worker 子请求和 Pseudo IPv4 设置可能改变该头的语义，详见 [Cloudflare 请求头说明](https://developers.cloudflare.com/fundamentals/reference/http-headers/)。

Docker 启动自动创建 `auth_lockouts` 表。Worker 已有数据库必须先通过现有迁移流程执行 `0010_auth_lockouts.sql`（`cd worker` 后运行 `npm run db:migrate`），新库 schema 已包含此表。未完成迁移时启用功能会报数据库错误，不会放行认证。

失败记录保存在 SQLite / D1，进程重启不清除。30 天无失败活动且已解锁的记录在后续认证请求中清理。多个 Docker 实例使用不同数据库时，各自计数；锁定检查会增加数据库请求量。

回退应用版本时可保留新增表；如需暂时恢复原认证行为可设 `AUTH_LOCKOUT_ENABLED=false`，这也会失去此次新增保护。

## 其他防护与边界

按 IP 锁定不能阻止分布式 IP 轮换，NAT 共享出口也可能相互影响。建议同时使用强随机 Secret、HTTPS、入口层请求限流，以及带 MFA 的管理访问控制或访问白名单。自动化 API 需要单独设计可兼容的机器身份入口。验证码只能作为补充，不能替代后端认证与限流。依据：[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)。

不要记录请求中的 Secret。此版本不引入账户体系、MFA 或验证码，也不修改 Secret 的存储与比较方式。

## 解锁补充验证（2026-09-17）

- 本地 Windows / Node.js 24.20.0：backend 锁定与解锁测试 12 项、worker 测试 8 项、CI 密钥生成测试 3 项通过；两端 TypeScript 检查通过。
- 覆盖错误/缺失密钥、当前 IP 隔离、解锁后仍需认证、可信代理、非 GET 请求不修改状态、数据库故障以及密钥生成/保留/环境文件注入防护。已检查密钥比较、参数化删除和日志路径，解锁路由先于通用日志与 body parser 执行。
- Worker 使用本地真实 SQLite 加 D1 接口适配测试，不代表远程 D1 验证；未执行 Cloudflare 部署、线上解锁、完整构建或浏览器验证。部署脚本的真实 Secret 写入需在部署时验证。
