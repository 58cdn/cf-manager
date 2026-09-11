# CF Manager - 项目分析报告

> 更新日期：2026-08-05
> 技术栈：Vue 3 + Naive UI + Pinia（前端） / Express 5 + Hono 4（双后端） / SQLite + Cloudflare D1（数据库）
> 项目规模：约 240 个源文件 / v1.5.1

---

## 目录

1. [项目概览](#1-项目概览) ✅ 必填
2. [项目定位与核心价值](#2-项目定位与核心价值) ✅ 必填
3. [功能清单](#3-功能清单) ✅ 必填
4. [系统架构](#4-系统架构) ✅ 必填
5. [设计模式与编码约定](#5-设计模式与编码约定) 🔵 可选
6. [代码导航指南](#6-代码导航指南) ✅ 必填
7. [核心业务流程](#7-核心业务流程) 🔵 可选
8. [数据模型与实体关系](#8-数据模型与实体关系) 🔵 可选
9. [模块依赖关系](#9-模块依赖关系) 🔵 可选
10. [API 接口清单](#10-api-接口清单) 🔵 可选
11. [企业级能力评估](#11-企业级能力评估) 🔵 可选
12. [关键发现与建议](#12-关键发现与建议) ✅ 必填
- [附录](#附录) 🔵 可选

> **图例：** ✅ 必填 | 🔵 可选（根据项目情况选择性填写）

---

## 1. 项目概览 ✅

### 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 6.0.x（backend/frontend）/ 5.x（worker） | 全栈 TypeScript 严格模式（`strict: true`） |
| 前端框架 | Vue | 3.5.34 | 组合式 API（`<script setup>`） |
| UI 组件库 | Naive UI | 2.44.1 | 含离散 API（message/dialog/loading）封装 |
| 状态管理 | Pinia | 3.0.4 | 账户/配额/Worker/DNS 等 store |
| 前端路由 | Vue Router | 5.1.0 | SPA 路由 |
| 构建工具 | Vite | 8.0.12 | 前端开发/构建（`vue-tsc` 类型检查） |
| HTTP 客户端 | Axios | 1.17.0 | 统一封装 + 拦截器解包 |
| 后端（Docker） | Express | 5.2.1 | CommonJS 模块，Docker 自建部署 |
| CF 交互（Docker） | cloudflare SDK | 6.3.0 | Node.js 官方 SDK 封装 |
| 后端（Worker） | Hono | 4.x | ESM 模块，Cloudflare Pages 部署 |
| CF 交互（Worker） | 原生 fetch | — | 直连 Cloudflare REST API |
| 数据库（Docker） | SQLite (better-sqlite3) | 12.10.0 | 同步 API，启动时自动迁移 |
| 数据库（Worker） | Cloudflare D1 | — | 异步 API + `schema.sql`/`migrations.sql` |
| 校验 | AJV + ajv-formats + ajv-errors | 8.20.0 | Catalog JSON Schema 校验（预编译 standalone） |
| 日志（Docker） | winston + daily-rotate | 3.19.0 | 文件轮转日志 |
| 缓存（Docker） | node-cache | 5.1.2 | 内存缓存（配额/路由结果） |
| 定时任务（Docker） | node-cron | 4.2.1 | 定时任务调度 |
| 代理（Docker） | https-proxy-agent / socks-proxy-agent | 9.1/10.1 | HTTP/SOCKS5 代理 |
| 哈希（Docker） | hash-wasm | 4.12.0 | 账号指纹/校验 |
| 加密（两端） | @noble/hashes（worker）/ crypto（backend） | 1.5.0 | AES 凭据加密 |
| 容器化 | Docker / Docker Compose | — | All-in-One 单容器（Express 直出静态资源） |
| 边缘部署 | Wrangler / Cloudflare Pages | 4.x | Worker 构建与部署 |
| 代码混淆（Worker） | javascript-obfuscator | 5.4.3 | 构建期 Worker 代码混淆 |

### 目录结构

```
cf-manager/
├── backend/                 # Express 后端（Docker 部署版，CommonJS）
│   └── src/
│       ├── index.ts         # Express 入口，路由挂载
│       ├── config.ts        # 环境变量配置
│       ├── db.ts            # SQLite 初始化 + 迁移
│       ├── routes/          # API 路由（accounts, dns, workers, ai, ...）
│       ├── services/        # 业务逻辑（cfFactory, aiService, workerService...）
│       │   └── deploy/      # 部署编排子模块（worker/pages/assets/triggers）
│       ├── models/          # 数据模型（account, auditLog, quotaUsage...）
│       ├── middleware/      # 认证/响应包装/错误处理/日志/请求ID
│       └── data/            # 运行时数据（自动同步的 model-pricing.json）
├── frontend/                # Vue 3 前端（两端共用）
│   └── src/
│       ├── api/             # Axios API 封装
│       ├── views/           # 页面组件（10+ 业务视图）
│       ├── components/      # 可复用组件
│       ├── stores/          # Pinia 状态管理
│       ├── router/          # Vue Router 路由
│       └── utils/           # 工具函数（discreteApi, dateFormat, quota...）
├── worker/                  # Hono 后端（Cloudflare Pages 部署版，ESM）
│   ├── src/
│   │   ├── index.ts         # Hono 入口 + Pages Functions handler
│   │   ├── types.ts         # Env 接口（D1/KV/ASSETS bindings）
│   │   ├── routes/          # 与 backend 对称路由
│   │   ├── services/        # 业务服务（cfApi 等）+ deploy/ 子模块
│   │   ├── db/              # D1 模型(models.ts) + schema.sql + migrations.sql
│   │   └── pages/           # 伪装 nginx 页面
│   ├── build.js             # 一键构建脚本（前端 + worker + ZIP）
│   └── wrangler.toml        # Wrangler 配置
├── shared/                  # 前后端共享「唯一真实来源」
│   ├── model-pricing.json   # AI 模型定价（含缓存计费）
│   ├── catalog.schema.json  # Catalog JSON Schema
│   └── catalogValidator.ts  # Catalog 校验器源码
├── scripts/                 # 构建辅助
│   ├── sync-shared.js        # 同步 shared/ 到 backend 和 worker
│   ├── gen-version.js        # 从 CHANGELOG 生成 version.ts
│   └── gen-catalog-validator.js # 预编译 AJV 校验器
├── docker/                  # Docker 构建（All-in-One 单容器）
├── docs/                    # 文档（api-v1/account-auth/deploy）
├── docker-compose.yml
├── deploy.sh                # 一键部署脚本
└── CHANGELOG.md             # 版本号来源
```

### 规模统计

| 维度 | 数量 | 说明 |
|------|------|------|
| 后端源文件（Docker） | 63 个 `.ts` | 含 `routes/`(14) `services/`(含 deploy 约 24) `models/`(4) `middleware/`(7) |
| 后端源文件（Worker） | 47 个 `.ts` | 对称路由 + 服务 + `db/models.ts` 集中模型 |
| 前端源文件 | 19 个 `.vue` + 约 22 个 `.ts` | 10+ 业务视图 + 多个 store/api/router 模块 |
| 共享/脚本 | shared(3) + scripts(3) | 单一真实来源 + 构建脚本 |
| 业务路由模块 | 约 14 个（两端对称） | accounts/dns/workers/storage/ai/openai/browserRender/store/settings/tunnels/tasks... |
| 总代码规模 | 约 240 个源文件 | 不含生成文件（version.ts、catalogValidate.generated.ts） |
| 当前版本 | v1.5.1（2026-08-05） | CHANGELOG 首条 |

---

## 2. 项目定位与核心价值 ✅

### 这个项目是什么

CF Manager 是一个**一站式、多账户统一的 Cloudflare 自托管管理平台**，面向开发者与运维人员。它基于 Cloudflare 官方 API 构建，把多个账户、多个产品（DNS / Workers / Pages / Storage / AI / 浏览器渲染）的管理入口聚合到同一个界面中，解决了在多账户后台之间反复切换、批量资源操作繁琐、缺乏统一的本地 AI 推理与渲染调试入口等痛点。

项目采用**双后端架构**——同一套业务逻辑分别用 Express（Docker 自建部署）和 Hono（Cloudflare Pages 边缘部署）实现，前端为共享的 Vue 3 SPA。用户可按场景选择部署方式：低成本/零成本上 Cloudflare Pages + D1，或在自有服务器用 Docker 一键部署。两种部署共享同一套前端与数据模型约定。

> 项目明确声明**不是**公开的 AI/渲染代理服务，OpenAI 兼容接口仅用于本地/内网调试，且要求使用者仅管理自己授权拥有的账户，遵守 Cloudflare 服务条款。

### 核心能力

| 能力 | 说明 |
|------|------|
| **多账户统一管理** | API Token / Global API Key 双认证；AES 加密存储凭据；统一账户切换；演示账户保护 |
| **仪表盘与配额** | 各账户实时配额（Workers/AI/Rendering）可视化进度条；操作审计日志 |
| **Workers / Pages 部署** | 脚本/项目 CRUD；单账户与跨账户批量部署；绑定/环境变量/路由/自定义域；Pages 回滚 |
| **DNS 管理** | A/AAAA/CNAME/MX/TXT 记录管理；一键代理开关；批量操作 |
| **隧道与回源** | Tunnel 创建/删除；可视化 Ingress 编辑器（域名↔服务映射）；一键回源向导 |
| **规则引擎** | 8 类规则（源站/URL 重写/请求响应头变换/缓存/防火墙/限流/重定向）；结构化表单 + 高级模式 + 表达式构建器 |
| **存储管理** | KV 键值 CRUD；D1 SQL 查询与表结构变更；R2 文件上传/下载/预览 |
| **AI 推理** | 全量 Workers AI 模型；Prompt Caching 计费感知；流式对话 + 推理可视化；多账户调度 |
| **浏览器渲染** | 5 种模式（截图/HTML/Markdown/PDF/链接抽取）；限速与配额管理；SSRF 防护 |
| **OpenAI 兼容 API** | `/v1/chat/completions`、`/v1/models`、渲染端点；流式/非流式；仅限本地/内网 |
| **应用商店（Catalog）** | 内置模板市场；第三方源扩展；一键 Workers/Pages 部署 |
| **系统设置** | HTTP/SOCKS5 代理；Resin 代理池（每账户 sticky IP）；缓存清理；定时任务扩展 |

### 技术选型理由

| 选型 | 理由 |
|------|------|
| **双后端（Express + Hono）** | 同一业务逻辑需同时运行在「自有服务器（Docker/Node）」和「Cloudflare Pages（边缘）」两种差异极大的运行时；Express 生态成熟适合 Docker，Hono 轻量且原生兼容 Workers 运行时 |
| **Vue 3 + Naive UI** | 组合式 API 与 Naive UI 的离散 API（message/dialog）适合快速构建数据密集的后台管理界面；两端共用同一前端降低维护成本 |
| **SQLite（Docker）/ D1（Worker）** | Docker 版本用 better-sqlite3 同步 API 简化逻辑；Pages 版本必须使用 D1 这种无服务器数据库；两者通过对称模型与 `schema.sql` 保持结构一致 |
| **Cloudflare SDK（Docker）vs 原生 fetch（Worker）** | Docker 用官方 SDK 减少样板代码；Worker 受 Workers 运行时限制（无 Node 原生模块），必须用 `fetch` 直连 REST API |
| **共享层（shared/）+ 同步脚本** | 模型定价、Catalog Schema 等作为单一真实来源，通过 `sync-shared.js` 同步到两端，避免双端漂移 |
| **AJV 预编译校验器** | Catalog 模板需在 Worker（无 `eval`/`new Function`）中校验，故通过 `gen-catalog-validator.js` 预编译为 standalone 代码 |
| **javascript-obfuscator** | Worker 构建期混淆，提升边缘代码反逆向能力（配合根路径 nginx 伪装） |

---

## 3. 功能清单 ✅

> 图例：`[D]` Docker/Express 版可用　`[W]` Worker/Cloudflare Pages 版可用　`[D+W]` 两端均可用

### 3.1 账户管理 `accounts` [D+W]
- 添加账户（**API Token** 或 **Global API Key** 两种认证方式）
- 凭据 **AES 加密**存储；返回前端时脱敏为 `***encrypted***`
- 账户列表、当前活跃账户切换（`X-Account-ID`）
- 编辑、删除账户
- **演示账户保护**：`DEMO_ACCOUNT_IDS` 配置的账户禁止删除/修改

### 3.2 DNS 管理 `dns` [D+W]
- Zone（域名）列表查询
- DNS 记录 **增/删/改/查**（A/AAAA/CNAME/MX/TXT/SRV/NS 等）
- 一键 Cloudflare 代理（橙色云）开关
- 记录批量操作
- **规则引擎**：基于 Cloudflare Rulesets，按 `phase`（请求/响应阶段）管理规则，覆盖 8 类规则：
  - 源站/URL 重写、请求头与响应头变换、缓存设置、防火墙规则、限流、重定向

### 3.3 Workers / Pages 部署 `workers` [D+W]
- Worker 脚本 **部署/更新/删除**（支持脚本本体 + 绑定 assets 上传，multipart）
- Worker 查询：日志、secrets（增/改/删）、schedules（定时触发器）、自定义域、子域、settings、routes、源码内容、部署历史
- **Pages 项目**：部署、项目信息、绑定、自定义域、部署历史、回滚（删除指定 deployment）
- 资源查询：KV 命名空间、D1 数据库、R2 桶、Zone 列表
- **批量部署**：跨多账户单/多 Worker 部署、Pages 批量部署（zip 上传）
- **环境变量同步**：`/env-sync/preview` 预览差异 + `/env-sync/execute` 执行同步

### 3.4 隧道与回源 `tunnels` [D+W]
- 账户列表、各账户 Tunnel 列表、Zone 列表
- Tunnel 创建/删除
- 可视化 Ingress 配置编辑器（域名 ↔ 服务映射 → 生成 tunnel config）
- 一键回源向导

### 3.5 存储管理 `storage` [D+W]
- **KV**：命名空间列表 + 键值 CRUD、批量导入导出
- **D1**：SQL 查询执行、表结构读取、DDL/DML 变更
- **R2**：Bucket 列表、对象上传/下载/预览/删除、预签名 URL

### 3.6 AI 推理 `ai` [D+W]
- Workers AI **全量模型**列表（从 `model-pricing.json` 加载定价/支持能力）
- 单账户/多账户**推理调用**，账户自动轮换（配额感知）
- **流式聊天** + 推理可视化（token 计数、耗时、成本）
- **Prompt Caching 计费感知**：区分 cached/uncached input token 计费
- 对话历史持久化、会话管理

### 3.7 浏览器渲染 `browser-render` [D+W]
- 5 种渲染模式：**截图 / 导出 HTML / Markdown / PDF / 链接抽取**
- **限速器**（`browserRateLimiter`）：按账户限流，配额管理
- **SSRF 防护**：内联在渲染逻辑中（见第 11 章）

### 3.8 OpenAI 兼容接口 `openai` [D+W]
- `POST /v1/chat/completions`（流式/非流式，`X-Account-ID` 选账户）
- `GET /v1/models`
- `POST /v1/browser`（外部浏览器渲染端点）
- `POST /api/v1/...`（同 `/v1` 的内部前缀镜像）
- 仅限本地/内网调试，不经过 `responseWrapper`

### 3.9 应用商店（Catalog）`store` [D+W]
- 内置模板市场（Workers/Pages 模板）
- 第三方 Catalog 源管理（增/删/启停、定时刷新，每 6h）
- 模板 **一键部署**（校验 → 部署编排）
- 从 URL 安装 / 上传模板

### 3.10 系统设置 `settings` [D+W]
- **代理配置**：HTTP / SOCKS5 代理（全局或每账户）
- **Resin 代理池**：为每账户分配 sticky 出口 IP
- 缓存清理、运行信息、版本号、健康检查
- **定时任务扩展**（仅 Docker）：用户自定义 cron 任务管理 `[D]`

### 3.11 定时任务 `tasks` [D]
- 任务 CRUD、立即执行、调度记录
- 定时刷新 Catalog 源（cron `0 */6 * * *`）
- Worker 版由 Pages `scheduled` handler 等价替代（Catalog 刷新）`[W]`

### 3.12 仪表盘与可观测性 [D+W]
- **配额仪表盘**：Workers/AI/Rendering 配额可视化（实时进度 + 占比）
- **审计日志**：所有写操作记录（`auditLog`），支持按 action/时间范围查询
- 操作统计、账户活跃度

### 3.13 安全外壳 [D+W]
- 根路径伪装为 **nginx 默认页**（管理界面隐藏在 `/admin/`，Docker 版在 `/`）`[W]`/`[D]`
- 全站 `Authorization: Bearer <API_SECRET>` 认证
- 凭据加密、审计、演示账户保护

---

## 4. 系统架构 ✅

### 4.1 两种部署拓扑

项目以**同一套业务逻辑**提供两种部署形态，前端 SPA 完全共用：

**A. Docker / Express（自建服务器，All-in-One 单容器）**

```
┌──────────────────────────────────────────────────────────┐
│  Docker Container (cf-manager)                             │
│                                                            │
│   Express 5 (port 3001)                                   │
│   ├── 静态资源 /  SPA (public/)  ← 直出 index.html         │
│   ├── /api/*  内部接口 (responseWrapper 包装)              │
│   ├── /v1/*    OpenAI 兼容接口 (裸格式)                    │
│   └── /api/v1/* 内部 OpenAI 兼容镜像                       │
│            │                                               │
│            ├── 业务 Service 层 (cfFactory / aiService …)   │
│            ├── Cloudflare SDK ──► Cloudflare REST API      │
│            └── SQLite (better-sqlite3, 同步)              │
└──────────────────────────────────────────────────────────┘
```

**B. Cloudflare Pages / Hono（边缘部署，零成本）**

```
Browser ──► *.pages.dev / 自定义域
              ├── /admin/*   → ASSETS binding 提供 SPA 静态资源
              ├── /api/*     → Hono 路由 (D1 + KV + CF REST)
              ├── /v1/*      → OpenAI 兼容接口
              └── * (根路径) → 伪装 nginx 默认页 (隐藏管理入口)
              Worker scheduled handler：每 6h 刷新 Catalog 源
```

两端差异由 AGENTS.md 的「技术栈」表精确约束（Express/CommonJS/SQLite vs Hono/ESM/D1）。

### 4.2 分层架构（单后端视角）

```
┌────────────┐
│  Frontend  │  Vue 3 SPA（Pinia + Axios + Vue Router）
│  (SPA)     │
└─────┬──────┘
      │  Authorization: Bearer <API_SECRET>
      │  X-Account-ID: <当前账户>        (选择操作账户)
      ▼
┌─────────────────────────────────────────────────┐
│  Middleware 层                                    │
│  auth → requestId → (v1Logger|apiLogger)          │
│  → responseWrapper（仅 /api） → errorHandler      │
└─────┬───────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────┐
│  Router 层 (routes/*.ts)                          │
│  accounts / dns / workers / storage / ai /        │
│  browserRender / store / settings / tunnels /     │
│  openai / tasks(Docker)                           │
└─────┬───────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────┐
│  Service 层                                       │
│  cfFactory|cfApi · aiService · workerService ·    │
│  quotaTracker · pricing · accountRouter ·         │
│  encryption · proxyService · browserRateLimiter · │
│  catalogDeploy · rulesetService · deploy/*        │
└─────┬───────────────────────────────┬───────────┘
      ▼                               ▼
┌──────────────┐              ┌─────────────────────┐
│ Cloudflare   │              │ 持久化层             │
│ REST API     │              │ SQLite (Docker)     │
│ (SDK/fetch)  │              │ D1 + KV (Worker)    │
└──────────────┘              └─────────────────────┘
```

### 4.3 请求处理流程

1. **认证**：所有 `/api`、`/v1` 请求需 `Authorization: Bearer <API_SECRET>`（由 `authMiddleware` 校验）。`/api/health` 免认证以便 Docker 健康检查。
2. **账户选择**：前端把当前选中账户写入 `X-Account-ID` 头；Service 层据此取出加密凭据并解密，调用对应 Cloudflare 账户。
3. **内部接口**：`/api/*` 经 `responseWrapper` 统一包装为 `{ success, data }` 或 `{ success:false, error }`；前端 Axios 拦截器自动解包 `data`，错误时提取 `error.message` 并 `message.error` 提示。
4. **外部接口**：`/v1/*`、`/api/v1/*` **不经过** `responseWrapper`，保持 OpenAI 标准格式；错误由 `v1ErrorHandler` 返回 OpenAI 风格 `{ error: { message, type, code } }`。
5. **错误与追踪**：`requestIdMiddleware` 注入 `X-Request-Id`；Docker 版经 `apiLogger`/`v1Logger` 写 winston 文件日志，统一 `errorHandler` 兜底。

### 4.4 双后端对称性 & 共享层

- `backend/src/`（Express）与 `worker/src/`（Hono）的 `routes/`、`services/`、`middleware/` **逐模块对称**：如 `cfFactory.ts ↔ cfApi.ts`、`encryptionService.ts ↔ encryption.ts`、`models/*.ts ↔ db/models.ts`（Worker 端集中）。
- `shared/` 为**单一真实来源**：`model-pricing.json`、`catalog.schema.json`、`catalogValidator.ts`。`scripts/sync-shared.js` 在 dev/build 前同步到 `backend/src/data` 与 `worker/src/data`；`scripts/gen-catalog-validator.js` 预编译 AJV 为 Worker 可用的 standalone 校验器。
- `scripts/gen-version.js` 从 `CHANGELOG.md` 首条 `[x.y.z]` 生成 `version.ts`，**禁止手改**。

### 4.5 前端集成要点

| 项 | 说明 |
|----|------|
| API 基地址 | `VITE_API_BASE_URL \|\| '/api'`（相对路径，由反向代理/Nginx 路由到后端） |
| 状态管理 | Pinia：`accountStore`（账户/活跃账户）、`quotaStore`、`workerStore`、`dnsStore` 等 |
| 鉴权态 | `localStorage.api_token`；401/403 时清除并派发 `auth-expired` 事件触发重新登录 |
| 路由 | `createWebHistory`，Docker 基址 `/`，Worker 基址 `/admin/`（构建期注入 `BASE_URL`） |
| UI 反馈 | `utils/discreteApi.ts` 封装 Naive UI 离散 message/dialog/loading |

### 4.6 数据流（AI 推理为例）

```
用户选择账户 → 前端 POST /api/ai/infer (X-Account-ID)
  → authMiddleware 校验 API_SECRET
  → aiRouter → aiService
      → accountRouter 解析账户凭据（解密）
      → quotaTracker 检查配额 / 多账户轮换
      → Cloudflare Workers AI API（流式 SSE）
  → responseWrapper 包装 → 前端流式渲染 + 计费可视化（pricing.ts）
  → 配额用量写入 auditLog / quotaUsage
```

---

## 5. 设计模式与编码约定 🔵

### 5.1 关键设计模式

| 模式 | 落点 | 说明 |
|------|------|------|
| **分层架构** | Router → Service → Model/Db | 路由只做参数解析与鉴权，业务逻辑下沉到 Service，数据访问集中在 Model |
| **中间件责任链** | `middleware/*` | `auth → requestId → logger → responseWrapper → errorHandler` 顺序装配；外部接口在链中提前用 `v1ErrorHandler` 分流 |
| **响应包装器（装饰器）** | `responseWrapper.ts` | **monkey-patch `res.json`**：在写出前自动包装为 `{ success, data }` / `{ success:false, error }`，对 `/v1` 与 OpenAI 格式响应跳过 |
| **适配器 / 对称双实现** | `cfFactory.ts` ↔ `cfApi.ts` | 同一业务意图在 Docker 用 CF SDK、在 Worker 用 `fetch` REST，接口语义对齐 |
| **策略模式（CF 客户端）** | `proxyService` / Resin 池 | 全局/每账户代理出口可插拔；Resin 为每账户分配 sticky 出口 IP |
| **工厂 + 路由（账户抽象）** | `accountRouter` | 把「当前账户选择」从具体 CF 调用解耦：凭据解密 + 配额感知的账户轮换集中一处 |
| **OpenAI 兼容适配器** | `openai` 路由 | 把内部推理能力翻译为 OpenAI 标准请求/响应格式（含 SSE 流式） |
| **单一真实来源** | `shared/` + `sync-shared.js` | 定价/Schema 只维护一份，构建期同步到两端，避免双端漂移 |
| **预编译校验器** | `gen-catalog-validator.js` | 将 AJV 校验器预编译为 Worker 可用的 standalone 代码（规避 `eval` 限制） |
| **外观 / 部署编排** | `services/deploy/*` | 部署流程拆为 worker/pages/assets/triggers 子模块，统一编排入口 |

### 5.2 凭据加密实现（AES-256-GCM）

`backend/src/services/encryptionService.ts` 采用 **AES-256-GCM**（带认证标签），密文格式 `iv:authTag:ciphertext`：

```ts
const ALGORITHM = 'aes-256-gcm';
// 密钥支持 64 位 hex 或任意字符串（自动 SHA-256 哈希为 32 字节）
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  // ... iv:tag:encrypted
}
```

Worker 端 `encryption.ts` 用 `@noble/hashes` 实现等价逻辑，保证两端可互解密。凭据在返回前端时脱敏为 `***encrypted***`。

### 5.3 统一错误与响应约定

- 内部接口错误：`{ success: false, error: { code, message } }`，`code` 含 `UNAUTHORIZED`/`FORBIDDEN`/`INTERNAL_ERROR` 等。
- 外部接口错误：`v1ErrorHandler` 返回 OpenAI 风格 `{ error: { message, type, code } }`。
- Docker 路由统一 `try/catch + next(err)`；Worker 路由直接 `return c.json({ error }, status)`。

### 5.4 编码约定（来自 AGENTS.md）

| 维度 | 约定 |
|------|------|
| TypeScript | 全栈 `strict: true` |
| 文件命名 | camelCase（如 `accountRouter.ts`）；类型/接口 PascalCase（`AccountInput`） |
| 路由变量 | camelCase |
| 环境变量 | 经 `config.ts`（Docker）/ `c.env`（Worker）访问；除 `config.ts` 外不直接引用 `process.env` |
| 注释 | 中英文混用，新增代码可用中文注释 |
| 模块系统 | Docker CommonJS；Worker ESM（esbuild bundle） |
| 自动生成文件 | `version.ts`、`backend/src/data/*`、`catalogValidate.generated.ts` 禁止手改 |
| 双后端修改 | 新增功能需同步 `backend/src` 与 `worker/src`，并更新 `CHANGELOG.md` 版本号 |

### 5.5 值得注意的实现细节

- `responseWrapper` 通过重写 `res.json` 实现「零侵入包装」，但需在 `index.ts` 中将 `/api/v1` 与 `v1ErrorHandler` **放在** `responseWrapper` 之后注册，否则 OpenAI 响应会被二次包装（`backend/src/index.ts:95-98`）。
- `authMiddleware` 在 `API_SECRET` 为空时**放行**（便于首次初始化），这是有意的安全取舍，部署时必须设置 `API_SECRET`/`ENCRYPTION_KEY`（`config.ts:5-13`）。
- Worker 端用 `scheduled` handler 替代 Docker 的 `node-cron` 做 Catalog 定时刷新，体现「同能力、异实现」的双后端对称原则。

---

## 6. 代码导航指南 ✅

### 6.1 关键入口文件

| 入口 | 文件 | 作用 |
|------|------|------|
| Docker 后端启动 | `backend/src/index.ts` | Express 装配：中间件链、路由挂载、`initDb()`、`initScheduler()`、静态资源直出、SPA fallback |
| Worker 后端 | `worker/src/index.ts` | Hono 装配 + Pages Functions `fetch` + `scheduled` handler（Catalog 刷新）；`/admin/*` 资源路由 + 根路径 nginx 伪装 |
| Worker 类型/Bindings | `worker/src/types.ts` | `Env` 接口（DB/API_SECRET/ENCRYPTION_KEY/DEMO_ACCOUNT_IDS/ASSETS/KV） |
| 前端入口 | `frontend/src/main.ts` | 创建 Vue App、挂载 Pinia/Router |
| 前端根组件 | `frontend/src/App.vue` | 全局布局、登录态、导航 |
| 前端路由 | `frontend/src/router/index.ts` | 10+ 视图路由（Docker 基址 `/` / Worker `/admin/`） |
| 共享同步 | `scripts/sync-shared.js` | 把 `shared/` 同步到 backend/worker（dev/build 前自动执行） |
| 版本生成 | `scripts/gen-version.js` | 从 `CHANGELOG.md` 生成 `version.ts` |
| Worker 构建 | `worker/build.js` | 一键构建（前端 + worker esbuild + 可选混淆 + ZIP） |

### 6.2 功能 → 文件 速查表（双端对称）

| 我要改… | Docker 端 | Worker 端 |
|---------|-----------|-----------|
| 账户 CRUD/认证 | `backend/src/routes/accounts.ts` · `models/account.ts` | `worker/src/routes/accounts.ts` · `db/models.ts` |
| DNS 记录 / 规则引擎 | `backend/src/routes/dns.ts` · `services/rulesetService.ts` | `worker/src/routes/dns.ts` |
| Workers/Pages 部署 | `backend/src/routes/workers.ts` · `services/workerService.ts` · `services/deploy/*` | `worker/src/routes/workers.ts` · `services/pagesDeploy.ts` |
| 存储 KV/D1/R2 | `backend/src/routes/storage.ts` · `services/storageService.ts` | `worker/src/routes/storage.ts` |
| AI 推理 | `backend/src/routes/ai.ts` · `services/aiService.ts` · `accountRouter.ts` | `worker/src/routes/ai.ts` · `routes/openai.ts`（内联） |
| 模型定价 | `shared/model-pricing.json`（改这里！） | 同步后 `worker/src/data/model-pricing.json` |
| 浏览器渲染 | `backend/src/routes/browserRender.ts` · `services/browserRender*` | `worker/src/routes/browserRender.ts` |
| OpenAI 兼容 | `backend/src/routes/openai.ts` · `externalBrowserRender.ts` | `worker/src/routes/openai.ts` |
| 应用商店/Catalog | `backend/src/routes/store.ts` · `services/catalogDeploy.ts` | `worker/src/routes/store.ts` · `services/catalogDeploy.ts` |
| 隧道 | `backend/src/routes/tunnels.ts` | `worker/src/routes/tunnels.ts` |
| 系统设置/代理 | `backend/src/routes/settings.ts` · `services/proxyService.ts` | `worker/src/routes/settings.ts` |
| 定时任务 | `backend/src/routes/tasks.ts` · `services/taskScheduler.ts` | `scheduled` handler（`index.ts`）+ `db` |
| 配额追踪 | `backend/src/services/quotaTracker.ts` | `worker/src/services/quotaTracker.ts` |
| 加密 | `backend/src/services/encryptionService.ts` | `worker/src/services/encryption.ts` |
| CF API 客户端 | `backend/src/services/cfFactory.ts`（`cloudflare` SDK） | `worker/src/services/cfApi.ts`（`fetch`） |
| 审计日志 | `backend/src/models/auditLog.ts` | `worker/src/db/models.ts` |
| 前端页面 | `frontend/src/views/*.vue` | 同左（共用） |
| 前端 API 封装 | `frontend/src/api/*.ts` | 同左 |
| 前端状态 | `frontend/src/stores/*.ts` | 同左 |

### 6.3 常见修改位置（速记）

- **新增一个内部 API**：在 `routes/` 加文件 → `index.ts` 用 `app.use('/api/xxx', xxxRouter)` 挂载 → 同步写 Worker 端 → 更新 `CHANGELOG.md`。
- **改模型定价/新增 AI 模型**：只改 `shared/model-pricing.json`，再跑 `node scripts/sync-shared.js`。
- **新增 Catalog 模板**：编辑 `shared/catalog.schema.json` + `catalogValidator.ts`（源码），重跑生成器。
- **改 UI**：`frontend/src/views/` + 对应 `stores/` + `api/`；注意 Worker 版 `BASE_URL=/admin/`、Docker 版 `/`。
- **加数据库列**：Docker 改 `backend/src/db.ts` 的 `MIGRATIONS` 数组（幂等 `ADD COLUMN IF NOT EXISTS`）；Worker 在 `worker/src/db/migrations/` 新增带版本号的 `.sql`，由 `worker/scripts/migrate.mjs` 部署时应用；两处都要改（`ci.yml` 的 `schema-check` 比对双端共享表列集合，不一致则阻断合并）。
- **改部署配置**：Docker 看 `docker/Dockerfile` + `docker-compose.yml` + `deploy.sh`；Worker 看 `worker/wrangler.toml` + `.github/workflows/deploy-cf.yml`。

### 6.4 推荐搜索关键词

| 想找… | 搜… |
|------|-----|
| 某接口的路由定义 | `router.get('/path'` 或 `router.post('/path'` |
| Cloudflare 调用点 | `getCfClient(`（Docker）/ `cfFetch(`（Worker） |
| 凭据加解密 | `encrypt(` / `decrypt(` |
| 账户切换逻辑 | `X-Account-ID` / `accountRouter` |
| 统一响应 | `responseWrapper` / `success:` |
| 外部接口错误 | `v1ErrorHandler` / `chatcmpl-` |
| 审计记录 | `createAuditLog(` |

---

## 7. 核心业务流程 🔵

> 本章选取 3 条最具代表性的端到端流程，覆盖「账户凭据生命周期」「AI 配额感知推理」「Worker 部署编排」。

### 7.1 账户添加与凭据解密使用

**目标**：安全地新增一个 Cloudflare 账户，并把加密凭据在后续请求中按需解密使用。

```
① 前端提交 POST /api/accounts  { name, authType: 'token'|'key', apiToken|globalApiKey, accountId? }
      │
② accounts 路由 → createAccount()
      ├─ authType==='token': encrypt(apiToken) → encryptedApiToken
      ├─ authType==='key'  : encrypt(globalApiKey) → encryptedGlobalApiKey; encrypt(email) → encryptedEmail
      └─ 写入 accounts 表（凭据均为密文）；返回时脱敏为 '***encrypted***'
      │
③ 后续请求（如 AI/Worker/DNS）携带 X-Account-ID
      │
④ accountRouter.getAccountForRequest(req)
      ├─ 解析 X-Account-ID → 查 accounts 表取密文
      ├─ decrypt(密文) → 明文凭据
      └─ 返回 Account 对象（含解密后 apiToken/apiKey 供 CF 调用）
      │
⑤ CF 调用（cfFactory.getCfClient / cfApi.cfFetch）使用明文凭据
```

**要点**
- 凭据在存储层永不明文：`createAccount`（`backend/src/routes/accounts.ts:47-59`）加密后写入，返回前 `presentAccount` 脱敏（`accounts.ts:11-15`）。
- 解密下沉到 `accountRouter`：业务代码不直接碰密文，`getAccountForRequest` 统一解密并缓存（带 `exhausted` 标记）。
- `authType` 双路径：Token 模式只存 `encryptedApiToken`；Key 模式额外存 `encryptedEmail` + `encryptedGlobalApiKey`（`accountRouter.resolveAccountsByStrategy:166-205`）。

### 7.2 AI 推理 + 多账户配额感知路由 + 用量校准

**目标**：在配额约束下调用 Workers AI，支持单/多账户，并每日用 CF 权威值校准本地计数。

```
① 前端带 X-Account-ID（或缺省）发起推理请求
      │
② accountRouter.resolveAccountsByStrategy(strategy, accountId)
      ├─ 'single'     : 用指定账户
      ├─ 'round-robin': 在「未 exhausted 且未达日限额」的活跃账户间轮换
      └─ 'failover'   : 主账户失败则切换下一可用账户
      │
③ 选定账户 → aiService（或直接 openai 路由）→ Cloudflare Workers AI API
      ├─ 流式 SSE 返回 → 前端实时渲染 + 计费可视化（pricing.ts）
      └─ 用量写入 quotaUsage（本地估算）
      │
④ 定时/手动校准：GET /api/ai/usage
      ├─ 并发 getAiUsageToday(每个活跃账户)  →  GraphQL aiInferenceAdaptiveGroups
      ├─ CF 返回 >0：setQuota(CF 权威值) + invalidateAiCache（保留 exhausted 标记）
      └─ CF 失败/返回 0：回退本地 quotaUsage 估算值
```

**要点**
- **配额感知路由**：`resolveAccountsByStrategy` 在 `round-robin` 下跳过 `exhausted` 或已超 `dailyNeuronLimit` 的账户，实现「免费额度用满自动换号」（`accountRouter.ts:112-164`）。
- **CF 权威校准**：`aiService.getAiUsageToday` 用 GraphQL 拉当天 `totalNeurons` 校准本地估算；注释明确「exhausted 标记只应通过日期变化或手动清除，用量>0 不代表额度没用完」（`aiService.ts:40-116` + `ai.ts:23-35`）。
- **外部接口同构**：OpenAI 兼容的 `/v1/chat/completions` 复用同一套账户解析与 CF 调用，仅响应格式不同。

### 7.3 Workers 部署编排（含 Assets 三阶段上传）

**目标**：把一个 Worker 脚本（单模块/多模块 zip/Worker-with-Assets）部署到 Cloudflare，并自动配置可观测性、子域与部署版本。

```
deployWorker(account, name, scriptContent, options)
  │
  ├─ 多模块 zip → extractZipFiles 解压；resolveMainModule 推断入口（worker.js/index.js→wrangler.toml main）
  ├─ 探测 nodejs_compat 需求（__commonJS/require/process./Buffer.）→ 自动加兼容标志
  ├─ 组装 metadata（main_module / compatibility_date / bindings / env）
  │
  ├─ [可选] Worker with Assets 三阶段上传：
  │     1) POST .../assets-upload-session（提交 manifest）→ 返回 { jwt, buckets }
  │     2) buckets 非空 → 按 bucket 分批 multipart 上传（base64=true），每批刷新 completion jwt
  │     3) buckets 为空 → sessionJwt 即 completion token，跳过上传
  │     → metadata.assets = { jwt, config }; 注入 ASSETS 绑定
  │
  ├─ PUT /workers/scripts/{name}（multipart: metadata + 各模块 / worker.js）
  ├─ PATCH script-settings（独立设置 observability: traces+logs；CF 不读 metadata 里的 observability）
  ├─ 默认开启 workers.dev 子域（subdomain.create + 取 account 级 subdomain 拼 URL）
  └─ createDeployment: 用 version_id 创建 100% 部署（版本化 API 必需；经典 API PUT 已部署则跳过）
```

**要点**
- **与 wrangler 同款协议**：`deployWorkerAssets` 严格实现 Cloudflare 的 assets 三阶段上传（manifest → 分桶上传 → completion jwt），并伪装 `User-Agent: wrangler/4.112.0`（`workerService.ts:123-200`）。
- **健壮性细节**：`resolveMainModule` 多候选回退；`nodejs_compat` 自动探测避免运行期 `ReferenceError`；版本化/经典 API 双路径兼容（deployment 创建条件判断）；子域/可观测性失败均 soft-fail 不阻断主流程（`workerService.ts:211-428`）。
- **配套副作用**：`addPagesDomain` 自动建 CNAME 记录指向 Pages 子域（同账户 zone 检测），部署与 DNS 联动（`workerService.ts:661-714`）。

> 上述三条流程在 **Worker（Hono）端均有对称实现**：`accountRouter` 逻辑内联进 `quotaTracker`/`ai`，CF 调用改用 `cfApi.cfFetch`，部署走 `services/pagesDeploy.ts` + 内联的 Worker 部署逻辑；数据库由 `better-sqlite3` 换为 D1 异步 API，但结构与事务语义保持一致。

---

## 8. 数据模型与实体关系 🔵

### 8.1 实体清单

项目共 **7 张表**（Docker/SQLite）；Worker/D1 版本由于用 `scheduled` handler 取代持久化定时任务，**少 2 张表**（`scheduled_tasks`/`task_executions`），其余 5 张结构一致。

| 实体 | 表名 | 部署 | 关键字段 | 作用 |
|------|------|------|----------|------|
| 账户 | `accounts` | D+W | `id, name, auth_type, api_token*, api_key*, email*, account_id, is_active, enabled_features, proxy_url, proxy_enabled` | 核心实体，存储**加密**凭据与每账户代理配置 |
| 配额用量 | `quota_usage` | D+W | `account_id, resource, date, count, exhausted`（唯一键 `(account_id,resource,date)`） | 每日配额计数（AI/Workers/Rendering），驱动账户轮换 |
| 审计日志 | `audit_log` | D+W | `account_id, action, target, detail, status, created_at` | 所有写操作留痕 |
| 应用设置 | `app_settings` | D+W | `key(PK), value` | KV 式全局配置（如代理开关、版本） |
| Catalog 源 | `catalog_sources` | D+W | `url(UNIQUE), name, is_default, enabled, last_synced, last_status, etag` | 第三方模板源，含 HTTP 缓存 `etag` |
| 定时任务 | `scheduled_tasks` | D | `name, type, cron, config, enabled` | 用户自定义 cron（仅 Docker） |
| 任务执行 | `task_executions` | D | `task_id(FK), status, detail, started/finished_at` | 任务运行记录（仅 Docker） |

> `*`：`api_token`/`api_key`/`email` 均为 AES 加密密文。

### 8.2 实体关系（ER）

```
┌──────────────┐         ┌────────────────┐         ┌──────────────┐
│   accounts   │ 1    N  │  quota_usage   │  N    1 │   (date 分区) │
│  id (PK)     │────────▶│  account_id(FK)│         │  resource     │
│  api_token*  │         │  resource       │         └──────────────┘
│  api_key*    │         │  date / count   │
│  email*      │         │  exhausted      │
└──────┬───────┘         └────────────────┘
       │ 1
       │
       │ N          ┌────────────────┐
       └──────────▶│   audit_log    │
                  │  account_id(FK) │
                  │  action/target  │
                  └────────────────┘

┌────────────────┐   1:N   ┌──────────────────┐
│ scheduled_tasks│────────▶│ task_executions  │   (仅 Docker)
│  id (PK)       │         │  task_id (FK)    │
└────────────────┘         └──────────────────┘

┌────────────────┐      ┌───────────────┐
│ catalog_sources│ 独立  │ app_settings  │  (均不依赖 accounts)
└────────────────┘      └───────────────┘
```

**关系要点**
- `quota_usage.account_id → accounts (ON DELETE CASCADE)`：删除账户级联清配额。
- `audit_log.account_id → accounts (ON DELETE SET NULL)`：删除账户保留日志，仅置空账户引用。
- `task_executions.task_id → scheduled_tasks (ON DELETE CASCADE)`。
- `catalog_sources` / `app_settings` 为独立配置实体，与主账户无外键关联。

### 8.3 双后端数据层差异（需注意）

| 项 | Docker (SQLite) | Worker (D1) |
|----|-----------------|-------------|
| 迁移方式 | `db.ts` 的 base CREATE 建表 + `MIGRATIONS` 数组幂等迁移（`_migrations` 记录） | `schema.sql` 建表（当前完整 schema 单一真相源）+ `migrations/*.sql` 由 `migrate.mjs` 版本化应用（`_migrations` 记录） |
| 定时任务 | `scheduled_tasks`/`task_executions` 持久化 | 无表，由 Pages `scheduled` handler 替代 |
| 配额字段 | 接口 `QuotaUsage` 未声明 `optimistic` 列 | `quota_usage` 含 `optimistic` 列（`schema.sql:25`），为后续乐观锁预留 |
| 查询风格 | `better-sqlite3` 同步 `prepare().all()` | D1 异步 `prepare().all()`，需在 `async` 函数中 `await` |

---

## 9. 模块依赖关系 🔵

### 9.1 后端依赖分层（Docker）

依赖方向严格自上而下，无向上回边：

```
routes/*.ts ──▶ services/*.ts ──▶ models/*.ts / db.ts ──▶ SQLite
     │                │                    │
     │                └──▶ cfFactory ──────┴──▶ Cloudflare SDK
     │                         │
     │                ┌────────┴───────────────┐
     │           accountRouter            quotaTracker ──▶ models/quotaUsage
     │                │  (解密+账户路由)            │
     │           encryptionService              ├──▶ aiService
     │                │  (AES)                   └──▶ workerService
     │           proxyService (HTTP/SOCKS5)
     │           ssrfGuard / pricing / logger
     └──▶ middleware/* (auth/responseWrapper/errorHandler)
```

**路由 → 服务 依赖明细**（节选）

| 路由 | 依赖的服务 / 模型 |
|------|-------------------|
| `accounts` | `models/account`, `encryptionService`, `cfFactory`, `quotaTracker`, `accountRouter`, `accountProbe`, `proxyService` |
| `dns` | `accountRouter`, `dnsService`, `zoneService`, `rulesetService`, `auditLog` |
| `workers` | `workerService`, `deploy/pagesDeploy`, `accountRouter`, `auditLog` |
| `storage` | `storageService`, `workerService`(KV/D1/R2 列表), `auditLog` |
| `ai` | `aiService`, `quotaUsage`, `accountRouter` |
| `openai` | `accountRouter`, `aiService`, `cfFactory`, `proxyService`, `pricing`, `quotaUsage`, `auditLog` |
| `store` | `catalogSource`, `catalogValidator`, `catalogDeploy`, `ssrfGuard`, `accountRouter` |
| `settings` | `config`, `accountRouter`, `cfFactory`, `proxyService` |
| `tunnels` | `tunnelService`, `dnsService`, `auditLog` |
| `browserRender` / `externalBrowserRender` | `browserRenderHandler` → `browserRenderService` + `browserRateLimiter` |
| `tasks` | `taskScheduler`, `auditLog` |

**服务间核心依赖**
- `cfFactory`（CF SDK 客户端）被几乎所有服务依赖，是调用 Cloudflare 的唯一出口；内部统一经 `decrypt` + `proxyService.getHttpAgentForAccount`。
- `accountRouter` 是「账户选择/解密/配额缓存」的中心枢纽，被 openai/dns/workers/ai/store/settings 共用。
- `quotaTracker` 组合 `aiService.getAiUsageToday` + `workerService.getWorkersUsageToday` 计算配额，二者**不反向依赖** `quotaTracker`（无环）。
- `pricing.ts` 与 `accountRouter.ts` 共同消费 `data/model-pricing.json`（由 `shared/` 同步）。
- `services/deploy/*` 为部署子模块：`index → workerDeploy/pagesDeploy/triggers/preflight`，统一经 `headers → cfFactory` + `proxyService`。

### 9.2 前端依赖分层

```
views/*.vue ──▶ stores/*.ts ──▶ api/*.ts ──▶ api/client.ts ──▶ 后端 /api
     │                │                │
     │                └────────────────┘   (stores 与 views 均依赖 api)
     ├──▶ api/client (直接 fetch：/api/v1/models, /api/v1/chat/completions, /api/ai/usage)
     └──▶ utils/* (discreteApi, dateFormat, quota, demoAccounts→api/accounts)
```

- **Views** 既用 `stores`（状态）也直接用 `api`（即时请求）；AI 视图对 OpenAI 端点用原生 `fetch` 直连（流式），不经过 Axios 拦截器。
- **Stores** 仅依赖 `api` 与 `client`，不直接调后端；`accountStore`/`dnsStore`/`workerStore`/`quotaStore` 各管一类资源。
- **Api 层** 全部经 `client.ts`（Axios 实例 + 拦截器解包）。

### 9.3 循环依赖检查

| 依赖对 | 是否成环 | 说明 |
|--------|----------|------|
| `quotaTracker ↔ aiService / workerService` | 否 | `quotaTracker` 单向引用二者取用量，二者不引用 `quotaTracker` |
| `accountRouter ↔ quotaTracker` | 否 | `accountRouter` 用 `quotaTracker.getAccountQuota`；`quotaTracker` 不引用 `accountRouter` |
| `cfFactory ↔ proxyService` | 否 | `cfFactory` 用 `proxyService.getHttpAgentForAccount`；`proxyService` 独立 |
| `deploy/index ↔ workerService` | 否 | `deploy/index` 复用 `workerService` 工具函数，方向单向 |

> **发现**：`frontend/src/views/SettingsView.vue:276` 从 `'../api/storage'` 导入 `tasksApi`，而该导出实际定义在 `api/storage.ts:50`。编译可通过，但**职责错位**（定时任务 API 不应放在 storage 模块），建议移入独立 `api/tasks.ts`（详见第 12 章）。

---

## 10. API 接口清单 🔵

### 10.1 接口分类与挂载前缀

| 前缀 | 格式 | 包装 | 来源 |
|------|------|------|------|
| `/api/*` | 内部 JSON（`{success,data}`） | `responseWrapper` | 所有 `routes/*.ts` |
| `/api/health` | 健康检查（免认证） | 否 | `index.ts` 直接挂载 |
| `/v1/*` 、`/api/v1/*` | OpenAI 兼容（裸格式） | 否 | `openai` + `externalBrowserRender` |
| 根 `/`（Worker） | nginx 伪装页 | 否 | `worker/src/pages` |

> 全部 `/api`、`/v1` 请求需 `Authorization: Bearer <API_SECRET>`（除 `/api/health`）。账户选择经 `X-Account-ID` 头。

### 10.2 账户 `accounts`（→ `/api/accounts`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 账户列表（分页/筛选/搜索） |
| POST | `/` | 新增账户（token/key，凭据加密） |
| PUT | `/:id` | 更新账户 |
| PATCH | `/:id/features` | 更新启用功能 |
| DELETE | `/:id` | 删除账户（演示账户受保护） |
| GET | `/:id/credentials` | 取凭据（脱敏） |
| POST | `/:id/test` | 测试账户连通性 |
| POST | `/:id/clear-exhausted` | 清除配额 exhausted 标记 |
| POST | `/test-batch` | 批量测试 |
| POST | `/batch/features` `/batch/delete` `/batch/proxy` | 批量功能/删除/代理 |
| POST | `/import-csv` | CSV 批量导入账户 |
| GET | `/export-csv` | CSV 导出账户（按 `ids`/`filter`+`search` 选范围，`includeCredentials` 控制是否含明文凭证；演示模式下 403 `DEMO_PROTECTED`） |

### 10.3 DNS `dns`（→ `/api/dns`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/domains` | Zone 列表 |
| GET/POST/PUT/DELETE | `/domains/:domain/records` `.../records/:id` | 记录增删改查 |
| GET/PATCH | `/domains/:domain/settings` `/proxy` | Zone 设置 / 代理开关 |
| GET/POST/PUT/DELETE | `/domains/:domain/rules/:phase(/:ruleId)` | 规则引擎（按 phase 管理 8 类规则） |

### 10.4 Workers / Pages `workers`（→ `/api/workers`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` `/summary` `/usage` | 列表 / 汇总 / 用量 |
| POST | `/:accountId/workers`（multipart） | 部署/更新 Worker（含 assets） |
| DELETE | `/:accountId/workers/:name` `/pages/:name` | 删除 Worker / Pages |
| GET | `/:accountId/workers/:name/logs` `content` `deployments` `secrets` `schedules` `domains` `subdomain` `settings` `routes` | Worker 各类查询 |
| PUT/DELETE | `.../secrets` `.../secrets/:secretName` `.../schedules` `.../domains` `.../routes/:routeId` | 密钥/定时/域/路由管理 |
| PATCH | `.../settings` `.../subdomain` | 设置/子域 |
| POST | `/:accountId/pages/deploy` | Pages 部署 |
| GET/PATCH/DELETE | `/:accountId/pages/:name/project` `domains` `deployments` | Pages 项目/域/部署（含回滚 `DELETE deployments/:deploymentId`、批量删除 `DELETE deployments`） |
| GET | `/:accountId/resources/kv` `d1` `r2` `zones` | 资源列表 |
| PUT | `/:accountId/pages/:name/bindings` | Pages 绑定 |
| POST | `/batch-deploy` `/batch-deploy-pages` | 跨账户批量部署 |
| POST | `/env-sync/preview` `/env-sync/execute` | 环境变量同步预览/执行 |

### 10.5 隧道 `tunnels`（→ `/api/tunnels`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/accounts` `/accounts/:id/tunnels` `/accounts/:id/zones` | 账户/隧道/Zone 列表 |
| POST/DELETE | `/accounts/:id/tunnels` `/:tunnelId` | 创建/删除隧道 |
| GET | `/:id/tunnels/:tunnelId/token` `connections` `hostnames` `config` | 令牌/连接/主机名/配置 |
| PUT | `/:id/tunnels/:tunnelId/config` | 更新 Ingress 配置 |
| POST | `/accounts/:id/wizard` | 一键回源向导 |

### 10.6 存储 `storage`（→ `/api/storage/:accountId/...`）

- **KV**：`GET/POST /kv`；`DELETE /kv/:nsId`；`GET /kv/:nsId/keys`；`GET/PUT/DELETE /kv/:nsId/values/:key`；`POST /kv/:nsId/bulk-delete`
- **D1**：`GET/POST /d1`；`DELETE /d1/:dbId`；`GET /d1/:dbId/tables`；`GET .../tables/:tableName/schema`；`POST /d1/:dbId/query`
- **R2**：`GET/POST /r2`；`DELETE /r2/:bucket`；`GET /r2/:bucket/objects` `.../download`；`PUT /r2/:bucket/upload`（multipart）；`DELETE /r2/:bucket/objects`；`POST .../bulk-delete`

### 10.7 AI `ai`（→ `/api/ai`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/usage` | 当日配额用量（CF 权威校准） |

> 推理能力经 OpenAI 兼容端点暴露（见 10.11）。

### 10.8 浏览器渲染 `browser-render`（→ `/api/browser-render`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 渲染（截图/HTML/Markdown/PDF/链接抽取，含限速） |
| POST | `/render`（外部 `/v1/browser`） | 外部渲染端点 |
| GET | `/status` | 渲染状态/配额 |

### 10.9 应用商店 `store`（→ `/api/store`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/sources` `/sources/:id` | Catalog 源管理 |
| POST | `/sources/test` | 测试源可达性 |
| GET | `/templates` | 模板列表（聚合所有启用源） |
| POST | `/refresh` | 刷新所有源（每 6h 定时） |
| GET | `/init` | 初始化默认源 |
| POST | `/preflight` `/deploy` `/deploy-batch` | 部署预检 / 一键部署 / 批量部署 |

### 10.10 系统设置 `settings`（→ `/api/settings`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 运行信息/版本 |
| POST | `/cache/clear` | 清理缓存 |
| PUT/POST(test) | `/proxy` `/proxy/test` | HTTP/SOCKS5 代理配置与测试 |
| PUT/POST(test) | `/resin` `/resin/test` | Resin 代理池配置与测试 |

### 10.11 OpenAI 兼容 `openai`（→ `/v1` 与 `/api/v1`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/models` | 模型列表（仅 `text-generation` 任务） |
| POST | `/chat/completions` | 聊天补全（流式/非流式，`X-Account-ID` 选账户） |
| POST | `/browser` | 外部浏览器渲染（镜像 `/api/browser-render` 外部端点） |

### 10.12 定时任务 `tasks`（→ `/api/tasks`，仅 Docker）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/` | 列表 / 新建 |
| PUT/DELETE | `/:id` | 更新 / 删除 |
| POST | `/:id/run` | 立即执行 |
| GET | `/:id/history` | 执行历史 |

> Worker 版无 `tasks` 路由，Catalog 刷新由 Pages `scheduled` handler 承担。

---

## 11. 企业级能力评估 🔵

> 评分范围 1–5（5 最佳）。评估基于源码实证，覆盖 10 个维度。

| # | 维度 | 评分 | 关键证据 | 改进建议 |
|---|------|------|----------|----------|
| 1 | 安全与合规 | **4.5** | AES-256-GCM 加密凭据；Bearer 鉴权；`ssrfGuard` 私网 IP 拦截（含 DNS 重绑定）；根路径 nginx 伪装；演示账户保护；凭据返回脱敏 | `authMiddleware` 在 `API_SECRET` 为空时放行（首启便利），部署须强制设密；Worker 端 SSRF 因运行时限制无法做完整 DNS 解析 |
| 2 | 可观测性 | **4** | winston 按日轮转日志；`requestId` 全链路追踪；`audit_log` 操作留痕；配额仪表盘；`apiLogger`/`v1Logger` | Worker 仅 `console` 日志；缺指标/APM 导出 |
| 3 | 可扩展性与性能 | **3** | `node-cache` 缓存；账户轮换分摊配额；CF 边缘（Worker）就近；代理池避免限速 | SQLite 单节点；内存缓存非分布式；无水平扩展方案 |
| 4 | 可靠性与容错 | **3.5** | AI `failover` 策略；子域/可观测性 soft-fail；multipart 重试；版本化/经典 API 双路径；`resolveMainModule` 多候选回退 | 无自动化测试；单库；缺熔断器/重试上限配置 |
| 5 | 测试与质量保障 | **2** | TypeScript `strict` 全量启用；双端对称约定降低回归风险 | **未发现任何单元/集成测试**（`*.test.ts` = 0）；建议引入 Vitest + CI 门禁 |
| 6 | 文档与可维护性 | **4.5** | `AGENTS.md` 详尽导航；`README`/`README.zh-CN`；`docs/`（api-v1/account-auth/deploy）；`CHANGELOG` 版本治理；`shared/` 单一真实来源 | 个别引用漂移（见 12 章） |
| 7 | 国际化与本地化 | **2** | UI 全中文；README 有 zh-CN 版 | 无 `vue-i18n`/i18n 框架；不支持多语言切换 |
| 8 | 部署与运维成熟度 | **4.5** | Docker 一键（`deploy.sh`/`docker-compose`/`Dockerfile`）；Cloudflare Pages（`build.js`/`wrangler`）；GitHub Actions（`docker-publish`/`deploy-cf`）；`.env.example`；构建期代码混淆 | 缺一键回滚/备份脚本说明 |
| 9 | 身份认证与权限 | **3** | 全局 `API_SECRET` + 账户级 `X-Account-ID` 选户；演示账户禁改禁删 | 单管理员密钥，无多用户/RBAC；无登录态与会话管理 |
| 10 | 数据管理与持久化 | **4** | SQLite/D1 结构化清晰；`initDb`+`migrations.sql` 迁移；审计/配额持久化；缓存层 | TS 类型 `QuotaUsage` 未声明 `optimistic` 列（与 schema 轻微漂移）；未见备份工具 |

### 综合研判

**整体成熟度约 3.6 / 5**，属于「个人/小团队自托管场景下完成度很高」的项目：安全（加密 + SSRF + 伪装）、文档、部署、数据治理均达到可上线水准；主要短板在**自动化测试缺失、无多用户/RBAC、无分布式扩展、无 i18n**。若面向企业内多团队协作使用，应优先补齐测试体系与权限模型。

---

## 12. 关键发现与建议 ✅

### 12.1 关键发现（实证）

| # | 类型 | 发现 | 位置 | 影响 |
|---|------|------|------|------|
| F1 | 功能不对称 | 前端 `TasksView.vue` **未注册到路由**（`router/index.ts` 无 `/tasks`），但后端仍服务 `/api/tasks`（Docker），Worker 端则视图与路由皆无 | `frontend/src/router/index.ts:3-14` vs `backend/src/routes/tasks.ts` | 定时任务功能在 Docker 前端实际不可达（死视图）；双端功能面不一致 |
| F2 | 职责错位 | `tasksApi` 导出在 `api/storage.ts:50`，被 `SettingsView.vue:276` 引用 | `frontend/src/api/storage.ts` | 编译可通过，但模块边界混乱，维护易误判 |
| F3 | 类型/ schema 漂移 | `QuotaUsage` TS 接口未声明 `optimistic` 列，而 `worker/src/db/schema.sql:25` 已建该列 | `backend/src/models/quotaUsage.ts` vs `worker/src/db/schema.sql` | 非运行时错误（列未被后端代码引用），但类型不反映真实 schema |
| F4 | 部署风险 | Worker 端无 `/api/tasks` 路由；若未来启用 TasksView，`fetch` 将命中根路径伪装 nginx 的 404 HTML，Axios 解析报 `SyntaxError: Unexpected token '<'` | 项目记忆已记载此 404 伪装陷阱 | 符合已知的「新增后端路由须同步双端」约束（见 AGENTS.md 注意事项 1） |
| F5 | 安全取舍 | `authMiddleware` 在 `API_SECRET` 为空时放行（首启便利） | `backend/src/middleware/auth.ts:11-15` | 部署若漏设 `API_SECRET` 等同未授权访问，属有意取舍但需文档强调 |
| F6 | 优势 | 双后端对称 + `shared/` 单一真实来源 + 安全纵深（AES-GCM / SSRF `isPrivateIp` / nginx 伪装 / 凭据脱敏 / 演示账户保护） | 全局 | 架构健康度高，回归风险可控 |

### 12.2 优先级建议

| 优先级 | 建议 | 说明 |
|--------|------|------|
| **P0** | 建立自动化测试 + CI 门禁 | 当前 `*.test.ts` = 0；建议 Vitest 覆盖 `accountRouter`、`quotaTracker`、`encryptionService`、`ssrfGuard` 等核心纯逻辑 |
| **P1** | 消除功能不对称 | 要么在 `router/index.ts` 注册 `/tasks` 并**同步为 Worker 新增 `tasks` 路由**（遵守 F4 约束），要么删除 `TasksView.vue` 与 `api/tasks` 死代码 |
| **P1** | 模块职责归位 | 将 `tasksApi` 从 `api/storage.ts` 迁移至 `api/tasks.ts`；更新 `SettingsView.vue` 导入 |
| **P1** | 权限模型（若团队使用） | 由单一 `API_SECRET` 升级为多用户 + 账户级 RBAC；当前无会话/登录态 |
| **P2** | 对齐类型与 schema | 在 `QuotaUsage` 补 `optimistic` 或删除该列，消除漂移 |
| **P2** | 国际化 | 引入 `vue-i18n`，将硬编码中文抽离（当前 UI 仅中文） |
| **P2** | 运维增强 | 提供 SQLite/D1 备份恢复脚本；为 Worker 增加指标/日志导出 |
| **P3** | 文档治理 | 发版时确保 `AGENTS.md` 路由索引、双端对称性、版本号同步更新 |

### 12.3 一句话总结

CF Manager 是一个**架构设计成熟、安全与文档到位、适合自托管的多账户 Cloudflare 管理平台**；进入企业级多团队协作前，建议优先补齐**自动化测试**与**功能/权限的一致性治理**。

---

## 附录 🔵

### 附录 A：环境变量与 Bindings

**Docker / Express（`.env`，构建/运行前设置）**

| 变量 | 必填 | 说明 |
|------|------|------|
| `ENCRYPTION_KEY` | ✅ | 凭据 AES 加密密钥（任意随机串，≥16 字符） |
| `API_SECRET` | 否 | 管理界面访问凭证（Bearer）。**留空则禁用鉴权**（首启便利，生产必须设置） |
| `PROXY_URL` | 否 | Cloudflare API 请求代理，`http://` 或 `socks5://` |
| `APP_PORT` | 否 | 宿主暴露端口（默认 3000） |
| `DEMO_ACCOUNT_IDS` | 否 | 逗号分隔的演示受保护账户 ID（禁止删除/修改） |

**Worker / Cloudflare Pages（`wrangler.toml [vars]` + Secrets）**

| 名称 | 类型 | 说明 |
|------|------|------|
| `DB` | D1 binding | 数据库（`database_name=cf-manager`，`database_id` 需填） |
| `KV` | KV binding | 键值存储（id 需填） |
| `ASSETS` | Pages Assets | SPA 静态资源（构建输出 `public/`） |
| `API_SECRET` | [vars] | 同 Docker（建议用 `wrangler secret` 而非明文） |
| `ENCRYPTION_KEY` | [vars] | 同 Docker |
| `DEMO_ACCOUNT_IDS` | [vars] | 同 Docker |

> Worker 端 `index.ts` 的 `scheduled` handler 还用于每 6h 刷新 Catalog 源（无需额外变量）。

### 附录 B：常用命令

**后端（Docker 版，Express，CommonJS）**
```bash
cd backend
npm install
ENCRYPTION_KEY="dev-key" npm run dev     # 开发（自动同步 shared + 生成 version + nodemon 热重载）
npm run build                            # 编译（tsc）
npm start                                # 运行 dist/index.js
```

**前端（Vue 3，两端共用）**
```bash
cd frontend
npm install
npm run dev                              # Vite 开发服务器（:5173，代理 /api）
npm run build                            # vue-tsc 类型检查 + vite 构建
npm run preview                          # 预览构建产物
```

**Worker（Cloudflare Pages 版，ESM）**
```bash
cd worker
npm install
npm run build                            # 一键构建：前端 + esbuild worker + 可选混淆 + ZIP
npm run dev                              # wrangler pages dev（需先 build 前端到 public/）
npm run deploy                           # 构建并 wrangler pages deploy
npm run db:init                          # 远程执行 schema.sql 初始化 D1
```

**构建/部署辅助**
```bash
node scripts/sync-shared.js              # 将 shared/ 同步到 backend/worker（dev/build 前自动执行）
node scripts/gen-version.js backend      # 从 CHANGELOG 生成 version.ts
node scripts/gen-catalog-validator.js    # 预编译 AJV Catalog 校验器
cp .env.example .env && ./deploy.sh      # Docker 一键部署
docker compose up -d                     # 启动 all-in-one 容器
```

### 附录 C：文档与索引

| 文档 | 路径 | 内容 |
|------|------|------|
| 项目导航 | `AGENTS.md` | AI 助手导航、双后端约定、功能场景索引、开发命令 |
| 英文 README | `README.md` | 项目介绍、功能、技术栈、部署、安全说明 |
| 中文 README | `README.zh-CN.md` | 同上（中文） |
| 部署文档 | `docs/deploy.md` | Docker / Cloudflare Pages 部署步骤 |
| API 文档 | `docs/api-v1.md` | OpenAI 兼容接口（/v1）规范 |
| 账户认证说明 | `docs/account-auth.md` | API Token / Global Key 认证与凭据说明 |
| 版本日志 | `CHANGELOG.md` | 版本号来源（生成 version.ts） |
| 共享 Schema | `shared/catalog.schema.json` | Catalog 模板 JSON Schema |
| 模型定价 | `shared/model-pricing.json` | AI 模型定价（含缓存计费） |

---

> 报告生成方式：本项目分析报告遵循 `project-analysis` skill 的结构化流程，所有结论均基于源码实证（v1.5.1，2026-08-05）。


---
