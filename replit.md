# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Groq SDK (5-tier cascade model system)

## AI Agent — Groq 5-Tier Cascade

Endpoint: `POST /api/ai/analyze` — requires `GROQ_API_KEY` secret.

Model tiers (auto-cascade on rate limit):
1. `llama-3.3-70b-versatile` — Premium
2. `moonshotai/kimi-k2-instruct` — High
3. `compound-beta` — Good
4. `meta-llama/llama-4-scout-17b-16e-instruct` — Scout
5. `llama-3.1-8b-instant` — Standard

The AI analyzes real-time market data (price, 24h range, volume, volatility) and recommends optimal strategy parameters for DCA and Grid bots. Returns `recommendation`, `reasoning`, `marketCondition`, `riskLevel`, `confidence`.

## Strategy Features

### DCA Bot
- Market / Limit order type selection
- Limit Price Offset (USDC) — shown when orderType=limit
- AI Auto-Fill button (analyzes market → fills all parameters)

### Grid Bot
- Market / Limit order type selection (default: Limit ⭐ for maker fees)
- Limit Price Offset from crossing price
- Mode: Neutral / Long / Short
- Stop Loss / Take Profit
- AI Auto-Fill button (analyzes market → fills Lower/Upper/Levels/Amount/Mode/SL/TP)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Replit Environment Setup

- **Frontend workflow**: `Start application` — runs `cd artifacts/lighter-bot && PORT=5000 pnpm run dev` on port 5000 (webview)
- **Backend workflow**: `Start Backend` — runs `cd artifacts/api-server && PORT=8000 pnpm run dev` on port 8000 (console)
- **Vite proxy**: Frontend proxies `/api` → `http://localhost:8000`
- **Database**: Replit PostgreSQL provisioned, schema pushed via `pnpm --filter @workspace/db run push`
- **Deployment target**: `vm` (always-on, needed for Telegram bot + trading engine)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- **Security**: `src/lib/encrypt.ts` — AES-256-GCM encryption for `private_key` and `notify_bot_token` fields in `botConfigTable`. Requires `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes). Backward-compatible: unencrypted legacy values are read as-is.
- **Shared utilities**: `src/lib/utils.ts` — `generatePassword()` and `addDays()` shared across routes
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest
- `koffi` is in the externals list (native addon — not bundled by esbuild)
- Live order execution via `src/lib/lighterSigner.ts` (koffi FFI wrapper) + `src/lib/lighterApi.ts` (`sendTx`, `toBaseAmount`, `toPriceInt`)
- Lighter signing .so at `signers/lighter-signer-linux-amd64.so` (lighter-go v1.0.5, loaded lazily at runtime)
- Bot engine (`src/lib/botEngine.ts`) delegates to `executeLiveOrder` when user credentials are present; falls back to paper trade otherwise

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

Available scripts:
- `hello` — contoh script minimal
- `check-lighter-api` — validasi semua endpoint Lighter API di kode sudah sesuai dokumentasi resmi. Tambah flag `--ping` untuk live test ke mainnet.

## Lighter API Integration

### Base URLs
- Mainnet: `https://mainnet.zklighter.elliot.ai`
- Testnet: `https://testnet.zklighter.elliot.ai`

### Bug fixes history
- `getCandles`: parameter diganti dari `from`/`to` (detik) → `start_timestamp`/`end_timestamp` (milidetik), resolution dari angka (`"60"`) → enum string (`"1h"`), ditambah `count_back` yang sebelumnya hilang
- `getOrderBookDepth`: endpoint dari `/api/v1/orderBook` (tidak ada) → `/api/v1/orderBookOrders`, param `depth` → `limit`, response parsing dari root level → nested `order_book.bids`/`order_book.asks`

### Candles resolution enum
`1m` | `5m` | `15m` | `30m` | `1h` | `4h` | `12h` | `1d` | `1w`

### Verifikasi endpoint
```bash
pnpm --filter @workspace/scripts run check-lighter-api           # cek kode vs docs
pnpm --filter @workspace/scripts run check-lighter-api -- --ping # + live test mainnet
```

### REFERENSI
Cek folder referensi/ — semua file sudah tersedia dan bisa langsung kamu jalankan. Jika ada perubahan terbaru, jalankan fetch-docs.js untuk menghasilkan dokumentasi .md resmi dari Lighter, lalu bandingkan hasilnya dengan implementasi yang ada.
Perhatian: Sistem ini berjalan 24/7 dan digunakan secara live. Jika ada bug, kerugian finansial bisa terjadi — jadi jangan asumsikan, verifikasi dulu dari docs sebelum menyimpulkan apapun.