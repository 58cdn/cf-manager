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

无效配置报错，不会静默关闭保护。Docker Compose 从 `.env` 传入上述变量；Cloudflare Pages 在项目环境变量中设置前四项，或按 Wrangler 部署流程配置。改变配置不会缩短已落库的锁定截止时间；关闭功能会暂时绕过所有锁定，重新开启后未过期记录仍然有效。

## 客户端 IP 与部署

Docker 默认以 TCP 对端 IP 为准，忽略客户端伪造的 `X-Forwarded-For`。如有反向代理，必须将其真实 IP / CIDR 配入 `AUTH_TRUSTED_PROXIES`，并让代理正确覆盖或追加转发头。否则所有访客可能按代理地址共同计数。不要信任所有地址；代理链的选择遵循 [Express 官方说明](https://expressjs.com/en/guide/behind-proxies/)。

Worker 使用 Cloudflare 边缘注入的 `CF-Connecting-IP`，不使用 `X-Forwarded-For`。没有该头（如本地直接请求）时使用共同的 `unknown` 计数。应通过 Cloudflare 边缘访问；跨 Worker 子请求和 Pseudo IPv4 设置可能改变该头的语义，详见 [Cloudflare 请求头说明](https://developers.cloudflare.com/fundamentals/reference/http-headers/)。

Docker 启动自动创建 `auth_lockouts` 表。Worker 已有数据库必须先通过现有迁移流程执行 `0010_auth_lockouts.sql`（`cd worker` 后运行 `npm run db:migrate`），新库 schema 已包含此表。未完成迁移时启用功能会报数据库错误，不会放行认证。

失败记录保存在 SQLite / D1，进程重启不清除。30 天无失败活动且已解锁的记录在后续认证请求中清理。多个 Docker 实例使用不同数据库时，各自计数；锁定检查会增加数据库请求量。

回退应用版本时可保留新增表；如需暂时恢复原认证行为可设 `AUTH_LOCKOUT_ENABLED=false`，这也会失去此次新增保护。

## 其他防护与边界

按 IP 锁定不能阻止分布式 IP 轮换，NAT 共享出口也可能相互影响。建议同时使用强随机 Secret、HTTPS、入口层请求限流，以及带 MFA 的管理访问控制或访问白名单。自动化 API 需要单独设计可兼容的机器身份入口。验证码只能作为补充，不能替代后端认证与限流。依据：[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)。

不要记录请求中的 Secret。此版本不引入账户体系、MFA 或验证码，也不修改 Secret 的存储与比较方式。
