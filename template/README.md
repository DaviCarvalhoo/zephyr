# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

Built with the **davicarvalhoo** architecture pattern — multi-tenant SaaS
backend, admin SPA, public site, and a mobile app pre-wired for
offline-first use, cloud sync, IAP, push notifications, and health
integrations.

> Single Responsibility, Open/Closed, Big Picture. Cada diretório
> tem uma responsabilidade; trocar um pedaço continua sendo uma
> mudança contida.

## Quick start

### Via Docker (Recomendado)

Inicie todos os serviços, incluindo banco de dados, em um comando:

```bash
docker compose up --build
```
> O Docker cria e configura o PostgreSQL automaticamente e o servidor já roda as migrations e popula o admin inicial.

### Local (Node.js)

Se preferir rodar local sem Docker:

```bash
./install.sh           # install all node deps + scaffold .env files
./seed.sh              # create db + run migrations + seed admin user
./dev.sh               # start every web service this preset shipped
./dev.sh --mobile      # also start Expo Metro
```

For native iOS/Android (heavy step — needs Xcode CLI):

```bash
./install.sh --native  # expo prebuild + pod install + custom modules
./scripts/run-ios.sh   # auto: device if attached, else simulator
```

URLs (web):

- Admin: `http://localhost:{{ADMIN_UI_PORT}}`
- Admin API: `http://localhost:{{API_PORT}}`
- Site: `http://localhost:{{SITE_PORT}}`

## What's in this repo

```
{{PROJECT_SLUG}}/
├── server/                Admin API + Site API + console + DB
│   ├── apps/api/         Admin API (Express, port {{API_PORT}})
│   ├── apps/site-api/    Public API (Express, port {{SITE_API_PORT}})
│   ├── apps/shared/      middlewares + buildHandler wrapper
│   ├── core/             models/, context, db, s3, email, oauth, content
│   ├── console/          task runner (seed-admin, etc.)
│   ├── content/          content catalog source (catalog.json)
│   └── migrations/       raw SQL (Knex)
├── ui/admin/             React SPA (Vite + shadcn/ui)
├── ui/site/              Public site (Express + EJS + Tailwind)
├── mobile/{{PROJECT_SLUG}}/  Expo + React Native + TypeScript
│   ├── src/contexts/     AuthContext, ThemeContext
│   ├── src/services/     db, backup, content, iap, health, notifications
│   ├── src/pages/        auth/, main/
│   ├── src/routes/       NavigationContainer + typed param lists
│   ├── native/           custom Swift/Kotlin + cookbook
│   ├── plugins/          Expo config plugins
│   └── assets/           icon, splash, favicon (regenerable)
├── scripts/              All helpers (mobile, deploy, version, icons)
├── doc/                  HTML documentation (open doc/index.html)
└── misc/                 systemd units, nginx samples
```

Folders the preset didn't ship are simply absent — `dev.sh` /
`install.sh` guard on directory existence so the scripts work for
every preset.

## Multi-tenancy model

```
users (global identity)
    │
user_in_accounts  (user_id + account_id + role)
    │
accounts  (tenant)
    │
[domain entities, scoped by account_id]
```

Roles: `admin` (platform-wide), `owner`, `manager`, `user`. Each
HTTP request builds a fresh `Context` with every model instantiated
— no singletons, no shared state between requests.

## Documentation

- **[doc/index.html](./doc/index.html)** — full HTML docs (open in
  browser). Architecture, auth flows, API reference, mobile services
  per phase, native cookbook, post-install Xcode steps.
- **[architecture.md](./architecture.md)** — server architecture
  patterns, how-tos, examples.
- **[code.md](./code.md)** — coding standards. **Read before editing.**
- **[CLAUDE.md](./CLAUDE.md)** — quick reference for AI agents.
- **[scripts/README.md](./scripts/README.md)** — every script + flags.
- **[mobile/{{PROJECT_SLUG}}/README.md](./mobile/{{PROJECT_SLUG}}/README.md)** — mobile setup, auth, deploy.
- **[mobile/{{PROJECT_SLUG}}/native/README.md](./mobile/{{PROJECT_SLUG}}/native/README.md)** — native modules cookbook + gotchas.

## Auth flows pre-wired

- **Email / password** — `/api/login`, `/api/signup`,
  `/api/forgot-password`.
- **Apple Sign-In** (iOS native) — `expo-apple-authentication` →
  `/api/auth/apple/mobile` (verifies via Apple JWKS, no SDK).
- **Google** (server-side OAuth) — `WebBrowser` →
  `/api/auth/google/{app,callback}` → deep-link redirect with token
  pair. Keeps `client_secret` out of the app bundle.
- **Refresh-token rotation** — single-flighted on both client and
  server to prevent false logouts under concurrent refresh.

## Mobile pre-wired (per phase)

| Phase | What |
|---|---|
| 1 | auth flows, theme, navigation, splash, toasts, typed fetch |
| 2 | offline SQLite (USER vs SHARED tables), cloud backup/restore via S3 |
| 3 | server-driven content sync + HMAC-signed presigned asset URLs |
| 4 | IAP (`react-native-iap`), receipt validation, premium gate, foreground re-check |
| 5 | custom-native local notifications with cold-start tap dispatch |
| 6 | Apple Health + Android Health Connect unified surface |
| 7 | native modules cookbook (Hello iOS/Android + Live Activity scaffold + gotchas) |

Delete what you don't need — every feature lives in its own folder
under `src/services/` so `rm -rf` removes it cleanly.

## How to add things

### A new domain entity

1. Migration: `server/migrations/YYYYMMDDHHMMSS_create-<thing>.ts` (raw SQL).
2. Model: `server/core/models/<thing>.ts` extending `BaseModel`.
3. Register on `Context` in `server/core/context.ts`.
4. Route: `server/apps/api/routes/<thing>.ts`, register in `routes/index.ts`.
5. UI/admin: page, query hook in `hooks/queries/use-<thing>.ts`,
   query keys in `lib/query-keys.ts`.
6. Mobile: a service in `mobile/{{PROJECT_SLUG}}/src/services/<thing>/`
   if it needs offline state, plus screens.

### A new mobile feature

If it needs server backing: **one route file** + **one service folder
on mobile** + the hook/screen consuming it. Check `src/services/iap/`
for a self-contained example.

### A new native module

`mobile/{{PROJECT_SLUG}}/native/cookbook/hello-{ios,android}/` is the
canonical pattern. Copy, rename, register the package on Android,
patch AppDelegate on iOS. Gotchas in `native/README.md`.

## Server commands (from `server/`)

```bash
npm run dev                # admin API with hot-reload
npm run dev:site-api       # site API with hot-reload
npm run build              # TypeScript compilation
npm run migrate:latest     # run pending migrations
npm run migrate:rollback   # rollback last batch
npm run migrate:make NAME  # create new migration
npm run console -- --task=TASK_NAME
```

## Code standards (the must-knows)

- **4-space indent, semicolons, max 80 columns.**
- **Always braces** for `if`/`else`/`for`/`while`. No single-line bodies.
- **Never silently catch** — every catch logs with `logger.error()`.
- **Routes go through models** — never call knex from a route.
- **Code in English; user-facing strings in Portuguese.**
- **No `any` in TypeScript** — `unknown` when truly unknown.

Full list: [code.md](./code.md).

## Deployment

Production layout under `/apps/{{PROJECT_SLUG}}/`:

```
builds/server/         npm run build output
builds/ui/admin/dist/  Vite build (served by nginx)
builds/ui/site/        compiled site
log/                   service logs
.env                   production env vars
```

- **Nginx** reverse-proxies: `api.{{DOMAIN}}` → admin API,
  `api-site.{{DOMAIN}}` → site API, `app.{{DOMAIN}}` → admin SPA
  (static), `{{DOMAIN}}` → public site.
- **systemd** units in `misc/systemd/` for each Node.js process.
- **Mobile** ships via EAS — `./scripts/release-android.sh` for the
  Play Store internal track in one shot.

## License

MIT

---

🛠  Built with the **zephyr** stack — _aulas em [github.com/davicarvalhoo](https://github.com/davicarvalhoo)_
