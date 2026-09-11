[English](README.md) | [简体中文](README.zh-CN.md)

# CF Manager

> ## ⚠️ Disclaimer & Compliance Notice
>
> This tool is intended **for learning, technical research, and self-hosted operations management of accounts you are authorized to use**. Any consequences arising from its use—including account bans, IP bans, charges, or other issues—are the sole responsibility of the user. The open-source project and its authors are not liable.
>
> - Strictly comply with the [Cloudflare Terms of Service (including Acceptable Use)](https://www.cloudflare.com/terms/). **Do not** use this project to provide public AI / rendering proxy services to third parties, or for reselling or splitting compute resources in violation of the terms.
> - Only add Cloudflare accounts that belong to you or that you are explicitly authorized to manage. Do not use any unauthorized account.
> - Multi-account switching and automatic quota switching must be used **only with multiple self-owned accounts that you are legally authorized to operate**. Bulk-attaching accounts to automatically split AI quotas may violate the Cloudflare service agreement and is not recommended.
> - Control your request rate. Avoid bulk or automated excessive requests that could trigger risk control or account suspension.
> - Features involving external URLs (e.g. browser rendering) should only be used with trusted sources, to guard against SSRF and internal network probing.
> - If you are unsure whether a feature complies with the Cloudflare Terms of Service, refer to the official terms and seek legal advice first.

## What Is This

> CF Manager is a **one-stop, multi-account unified management platform for Cloudflare**, built for developers and operators. It solves the pain of constantly switching between multiple account dashboards and the tedium of bulk resource operations.

- **What it is**: A self-hosted operations panel built on the official Cloudflare API. It unifies the management entry points of multiple accounts and multiple products (DNS / Workers / Pages / Storage / AI / Rendering) into a single interface.
- **Who it's for**: Individual developers, site owners, and operators who own multiple Cloudflare accounts; users who want to self-host locally and fully control their credentials and data.
- **Problems it solves**: Constant backend switching across accounts, tedious bulk resource operations, and the lack of a unified local debugging entry point for AI inference and browser rendering.
- **Core capabilities**: Visually manage domain DNS, Workers, Pages, and KV/D1/R2 storage; built-in local debugging for AI inference and web rendering; and an **internal / local-network-only** OpenAI-compatible adapter interface.
- **What it is NOT**: It is not a public AI / rendering proxy service. The OpenAI-compatible interface is for your own local debugging only and must never be used for reselling or any scenario that violates the Cloudflare Terms of Service.

## Online Demo

| | |
|---|---|
| URL | [https://mgrcf.pages.dev/admin/](https://mgrcf.pages.dev/admin/) |
| Password | `cfmgrbest` |

> The demo is deployed on Cloudflare Pages + D1, no Docker required. The root path shows a disguised nginx welcome page; the management UI is accessible via `/admin/`.
>
> ⚠️ The demo is bound to a **dedicated demo account**. All features are usable but with limited quota, for UI and feature demonstration only. **Do not use it for real business or bulk calls.** This is a publicly shared demo account; abuse may cause it to be rate-limited or banned by Cloudflare.

## Features

| Module | Core Capabilities |
|---|---|
| **Multi-account Management** | API Token / Global API Key dual auth · AES-encrypted credentials · unified account switching ([auth docs](docs/account-auth.md)) |
| **Dashboard** | Real-time quota usage per account (Workers, AI, Rendering) · visual progress bars · operation audit |
| **Workers / Pages** | Script/Project CRUD · single/cross-account batch deployment · env vars / bindings / routes / custom domains · config-only redeploy · Pages rollback |
| **DNS Management** | A/AAAA/CNAME/MX/TXT record management · Zone batch create/delete · Zone settings (SSL/cache/security) · Zone cache purge · Zone pause/resume |
| **Tunnel Management** | Tunnel create/delete · visual Ingress editor (domain↔service mapping) · one-click origin wizard (DNS CNAME + auto Ingress config) |
| **Rules Engine** | 8 rule types (origin, URL rewrite, request/response header transform, cache, firewall, rate limit, redirect) · structured form + advanced mode · expression builder |
| **Storage Management** | KV key-value CRUD · D1 SQL query + schema changes · R2 file upload/download/preview |
| **AI Workspace** | Unified AI console — chat / image generation (T2I & I2I) / TTS / translation + per-account usage stats · Prompt Caching-aware billing · streaming responses · conversation history · multi-account scheduling |
| **Browser Rendering** | 5 modes: screenshot / HTML / Markdown / PDF / link extraction · rate limit + quota management · SSRF protection |
| **OpenAI-compatible API** | `/v1/chat/completions`, `/v1/images/generations`, `/v1/audio/speech`, `/v1/translations`, `/v1/models` · streaming + non-streaming · local/internal only ([API docs](docs/api-v1.md)) |
| **App Store** | Built-in Catalog template marketplace · third-party source extension · one-click Workers/Pages deployment |
| **Internationalization** | Built-in zh-CN / en UI (vue-i18n, 1000+ keys) · auto-detect browser language · persistent choice |
| **System Settings** | HTTP/SOCKS5 proxy · Resin proxy pool (per-account sticky IP) · cache purge · scheduled task extensions |
| **Security** | AES-encrypted API Token · `/admin/` path hiding + nginx disguise · audit log |

---

## Quick Start

> Three deployment options are available. See the [deployment docs](docs/deploy.md) for details.

<details open>
<summary><strong>Option 1: Fork One-Click Deploy (easiest)</strong></summary>

No tools to install—everything happens in the browser.

**Recommended: Use the Secrets version (secrets never leak into logs)**

1. **Fork this repo** → click Fork in the top-right corner
2. Go to your fork → **Settings** → **Environments** → **New environment**, create an environment (e.g. `production`), and add 4 secrets inside it:
   - `CF_GLOBAL_KEY`: Cloudflare Global API Key (required for deployment; scoped API Token is not supported by this workflow)
   - `CF_EMAIL`: Cloudflare account email
   - `ENCRYPTION_KEY`: encryption key (use a strong random string, at least 16 chars)
   - `API_SECRET`: management UI access password (use a strong random string, avoid weak passwords)
3. Go to **Actions** → select **Deploy to Cloudflare Pages (Secrets)** → **Run workflow**, enter the environment name such as `production`
4. Wait for deployment to finish, then visit `https://cfmgr.pages.dev/admin/`

> ⚠️ Important: Bind only your own separate business/test accounts. Do not bulk-attach accounts to automatically split AI quotas—this violates the Cloudflare service agreement.

> For multiple accounts, create multiple Environments with separate secrets, then enter the corresponding environment name at deploy time.

> Get Cloudflare Global API Key: [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Keys → Global API Key → View

</details>

<details>
<summary><strong>Option 2: Manual Cloudflare Pages Deploy (zero cost)</strong></summary>

Download the prebuilt bundle and upload it to the Cloudflare Dashboard.

**1. Download the deployment bundle:**

👉 [Download the latest cf-manager.zip](https://github.com/hefy2027/cf-manager/releases/latest/download/cf-manager.zip)

Or build locally: `cd worker && npm install && npm run build`

**2. Create a D1 database:**

Cloudflare Dashboard → Workers & Pages → D1 → Create → name it `cf-manager` → run `worker/src/db/schema.sql` in the Console

**3. Upload & deploy:**

Workers & Pages → Create → Pages → Upload assets → upload `cf-manager.zip`

**4. Configure Bindings:**

Settings → Bindings → Add D1 Database → Variable name: `DB` → select your database

Settings → Bindings → Add KV Namespace → Variable name: `KV` → create or select an existing namespace

Settings → Environment variables → add `ENCRYPTION_KEY` and `API_SECRET` (optional)

**5. Redeploy, then visit** `https://your-project.pages.dev/admin/`

</details>

<details>
<summary><strong>Option 3: Docker Deploy (self-hosted server)</strong></summary>

**Quick start with prebuilt image (recommended):**

```bash
docker run -d --name cf-manager -p 3000:3000 \
  -e ENCRYPTION_KEY="cfmgrbest" \
  -e API_SECRET="cfmgrbest" \
  -v ./data:/app/data \
  --restart unless-stopped \
  ghcr.io/hefy2027/cf-manager:latest
```

> ⚠️ Please change `ENCRYPTION_KEY` and `API_SECRET` to your own strong passwords before production use.

Then visit `http://localhost:3000`.

**Build from source:**

```bash
# 1. Clone the project
git clone https://github.com/hefy2027/cf-manager.git
cd cf-manager

# 2. Create the config file
cp .env.example .env

# 3. Edit .env — at minimum set ENCRYPTION_KEY
#    Optionally set API_SECRET (UI login password), PROXY_URL (proxy address)

# 4. One-click deploy
chmod +x deploy.sh
./deploy.sh

# 5. Visit http://localhost:3000
```

</details>

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | Yes | Key used to encrypt stored API Tokens (any random string, at least 16 chars) |
| `API_SECRET` | No | Management UI access password; empty means no login required |
| `PROXY_URL` | No | HTTP/SOCKS5 proxy address, e.g. `http://127.0.0.1:7890` or `socks5://127.0.0.1:1080` |
| `APP_PORT` | No | Exposed port, default `3000` |
| `DEMO_ACCOUNT_IDS` | No | Protected demo account IDs (comma-separated), e.g. `1,2,3`. Protected accounts cannot be deleted or modified |
| `KV` (Binding) | No | KV Namespace binding (Pages deploy only), used for concurrent-request protection and cache-aware routing. Optional but recommended |

<details>
<summary><strong>Local Development</strong></summary>

```bash
# Backend (http://localhost:3001)
cd backend
npm install
ENCRYPTION_KEY="dev-key" npm run dev

# Frontend (http://localhost:5173, auto-proxies /api to backend)
cd frontend
npm install
npm run dev
```

</details>

---

## Tech Stack

| Layer | Docker | Worker |
|---|---|---|
| Frontend | Vue 3 + Naive UI + Pinia | Same |
| Backend | Express 5 + Cloudflare SDK | Hono + Cloudflare REST API |
| Database | SQLite (better-sqlite3) | Cloudflare D1 |
| Deploy | Docker Compose | Cloudflare Pages |

---

## Project Structure

```
cf-manager/
├── backend/                 # Backend API service (Express)
│   └── src/
│       ├── index.ts         # Express entry
│       ├── config.ts        # Config
│       ├── db.ts            # SQLite database
│       ├── data/            # Runtime data (auto-synced from shared/)
│       ├── middleware/      # Auth, error handling, response wrapper
│       ├── models/          # Data models
│       ├── routes/          # API routes
│       └── services/        # Business logic (Cloudflare SDK wrapper)
├── frontend/                # Vue frontend app
│   └── src/
│       ├── api/             # API call wrappers
│       ├── assets/          # Static assets
│       ├── components/      # Reusable components (StoreDeployDialog, etc.)
│       ├── i18n/            # Locale files (zh-CN / en)
│       ├── router/          # Vue Router config
│       ├── stores/          # Pinia state management
│       ├── types/           # TypeScript types
│       ├── utils/           # Utility functions
│       └── views/           # Page components
├── worker/                  # Cloudflare Pages deployment (Hono)
│   ├── src/
│   │   ├── index.ts         # Hono entry + Pages Functions handler
│   │   ├── types.ts         # Env interface (D1, KV, ASSETS)
│   │   ├── pages/           # Disguised nginx page
│   │   ├── routes/          # API routes (mirror of backend)
│   │   ├── services/        # Business logic (fetch-based CF API)
│   │   ├── db/              # D1 models + schema.sql / migrations/（版本化迁移）
│   │   └── middleware/      # Auth, error handling, response wrapper
│   ├── build.js             # One-click build script
│   └── wrangler.toml        # Wrangler config
├── scripts/                 # Build helper scripts
│   ├── sync-shared.js       # Sync shared/ to backend & worker
│   ├── gen-version.js       # Generate version.ts from CHANGELOG.md
│   └── gen-catalog-validator.js  # Precompile AJV validator for Workers
├── docker/                  # Docker build config (all-in-one single container)
│   └── Dockerfile            # Multi-stage: frontend build + backend build + production image
├── shared/                  # Single source of truth (auto-synced)
│   ├── model-pricing.json    # AI model pricing (incl. cache pricing)
│   ├── catalog.schema.json   # Catalog template JSON Schema
│   └── catalogValidator.ts   # Catalog validator source
├── docs/                    # Documentation
│   ├── api-v1.md            # External API docs
│   ├── account-auth.md      # Account auth docs
│   ├── deploy.md            # Deployment docs
│   └── cf-manager-analysis.md  # Project analysis report
├── docker-compose.yml
├── deploy.sh                # One-click deploy script
├── CHANGELOG.md             # Changelog
└── .env.example             # Env var template
```

---

## Screenshots

<table>
  <tr>
    <td width="33%"><img src="images/dashboard.png" alt="Dashboard"><br><em>Dashboard</em></td>
    <td width="33%"><img src="images/accounts.png" alt="Accounts"><br><em>Accounts</em></td>
    <td width="33%"><img src="images/workers.png" alt="Workers / Pages"><br><em>Workers / Pages</em></td>
  </tr>
  <tr>
    <td><img src="images/dns.png" alt="DNS"><br><em>DNS</em></td>
    <td><img src="images/storage.png" alt="Storage"><br><em>Storage (KV / D1 / R2)</em></td>
    <td><img src="images/browser-render.png" alt="Browser Rendering"><br><em>Browser Rendering</em></td>
  </tr>
  <tr>
    <td><img src="images/store.png" alt="App Store"><br><em>App Store</em></td>
    <td><img src="images/settings.png" alt="Settings"><br><em>Settings (incl. Resin proxy pool)</em></td>
    <td><img src="images/tunnels.png" alt="Tunnels"><br><em>Tunnels</em></td>
  </tr>
  <tr>
    <td><img src="images/rules-engine.png" alt="Rules Engine"><br><em>Rules Engine</em></td>
    <td><img src="images/deploy-config.png" alt="Deploy Config"><br><em>Deploy Config (env / bindings)</em></td>
    <td><img src="images/ai-chat.png" alt="AI Chat"><br><em>AI Chat</em></td>
  </tr>
  <tr>
    <td><img src="images/ai-image.png" alt="AI Image Generation"><br><em>AI Image Generation</em></td>
    <td><img src="images/ai-audio.png" alt="AI Text-to-Speech"><br><em>AI Text-to-Speech</em></td>
    <td><img src="images/ai-translation.png" alt="AI Translation"><br><em>AI Translation</em></td>
  </tr>
  <tr>
    <td><img src="images/ai-stats.png" alt="AI Usage Stats"><br><em>AI Usage Stats</em></td>
    <td></td>
    <td></td>
  </tr>
</table>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hefy2027/cf-manager&type=Date)](https://star-history.com/#hefy2027/cf-manager&Date)

## License

[MIT](LICENSE) © 2024 CF Manager Contributors


## Related Projects

- [cf-store](https://github.com/hefy2027/cf-store): The Catalog template repository for CF Manager's "App Store" (app/Worker deployment template source). Refer to it if you want to contribute or self-host templates.

## Community

This open-source project is linked to and recognized by the [LINUX DO community](https://linux.do).

Follow the WeChat Official Account **「AI非与」** for project updates and technical sharing:

<img src="https://i.ibb.co/mFq91Rzq/ai-feyu-wechat-qr.jpg" alt="AI非与 WeChat Official Account" width="200" />
