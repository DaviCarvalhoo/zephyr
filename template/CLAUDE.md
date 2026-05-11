# CLAUDE.md

## Project: {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

Multi-tenant SaaS built with the **davicarvalhoo** architecture pattern.
Server + admin UI + public site + mobile app, all sharing the same
auth/data backbone.

**Before writing code, read these:**
- `code.md` — coding standards, style rules, naming conventions
- `architecture.md` — patterns, how-tos, examples

**Working in a specific app?** Each one has its own `CLAUDE.md` with
the conventions that matter there:

- [`server/CLAUDE.md`](./server/CLAUDE.md) — models, routes, migrations
- [`ui/admin/CLAUDE.md`](./ui/admin/CLAUDE.md) — React Query, shadcn/ui
- [`ui/site/CLAUDE.md`](./ui/site/CLAUDE.md) — EJS + i18n + SEO
- [`mobile/{{PROJECT_SLUG}}/CLAUDE.md`](./mobile/{{PROJECT_SLUG}}/CLAUDE.md) — RN, contexts, native modules

Claude Code loads each CLAUDE.md from the cwd up to the repo root,
so being inside `server/` automatically picks up the server-specific
rules in addition to this one.

## Quick start

```bash
./install.sh           # all node deps + .env scaffolds
./install.sh --native  # also expo prebuild + pod install + native modules
./seed.sh              # create db + run migrations + seed admin
./dev.sh               # start every service (mobile included by default)
./dev.sh --no-mobile   # skip Metro this run
```

URLs:
- Admin SPA: `http://localhost:{{ADMIN_UI_PORT}}`
- Admin API: `http://localhost:{{API_PORT}}`
- Site API: `http://localhost:{{SITE_API_PORT}}`
- Site (pt-BR `/`, en `/en/...`): `http://localhost:{{SITE_PORT}}`

## Repository structure

```
{{PROJECT_SLUG}}/
├── server/                 Admin API + Site API + console + DB
├── ui/admin/               React SPA (Vite + shadcn/ui)
├── ui/site/                Public site (Express + EJS + i18n + SEO)
├── mobile/{{PROJECT_SLUG}}/  Expo + React Native + TypeScript
├── scripts/                ALL helpers (mobile, deploy, version, icons)
├── doc/                    HTML documentation (open doc/index.html)
├── misc/                   systemd units, nginx samples
├── .davicarvalhoo/manifest.json Per-file hashes — used by `davicarvalhoo update`
└── .claude/settings.json   Permission allowlist for routine commands
```

Folders that the preset didn't ship are simply absent. `dev.sh`
and `install.sh` guard on existence per directory, so the same
script works for every preset (everything / web-only /
mobile-and-server / just-mobile).

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

## Auth flows pre-wired

- **Email + password** — `/api/login`, `/api/signup`,
  `/api/forgot-password`. Returns a JWT cookie (web) AND a
  `{token, refreshToken}` body (mobile).
- **Apple Sign-In** — mobile native via `expo-apple-authentication`
  → `/api/auth/apple/mobile` (server verifies via Apple JWKS, no SDK).
- **Google** — server-side OAuth flow keeps `client_secret` out of
  the app bundle. Browser → `/api/auth/google/{app,callback}` →
  deep-link redirect with token pair.
- **Refresh-token rotation** — single-flighted on both client and
  server to prevent false logouts under concurrent refresh.

## Mobile pre-wired (per phase)

| Phase | What |
|---|---|
| 1 | auth flows, theme, navigation, splash, toasts, typed fetch |
| 2 | offline SQLite (USER vs SHARED tables), cloud backup/restore |
| 3 | server-driven content sync + HMAC-signed presigned asset URLs |
| 4 | IAP via `react-native-iap`, premium gate, foreground re-check |
| 5 | custom-native local notifications with cold-start tap dispatch |
| 6 | Apple Health + Android Health Connect unified surface |
| 7 | native cookbook (Hello iOS/Android + Live Activity scaffold) |

The mobile app is **free-first**: anyone can use it without signing
in. Auth is reached via Profile → "Entrar / Criar conta" or via
`<PremiumGate onUpgrade={...}>` triggered by tapping a locked
feature. See `mobile/{{PROJECT_SLUG}}/CLAUDE.md` for the full nav tree.

## i18n

Default **pt-BR**, English under `/en/...` (site) or via the
language picker (mobile). Both apps share the same TranslationShape
pattern: pt-BR is the source of truth, en satisfies the same type.

- **Site** uses URL prefixes for SEO (canonical + hreflang +
  sitemap.xml). See `ui/site/CLAUDE.md`.
- **Mobile** detects device locale on boot, persists user
  override via AsyncStorage. Picker in Profile.

## How to add things

### A new domain entity (server-side)

1. Migration: `server/migrations/YYYYMMDDHHMMSS_create-<thing>.ts`.
   Raw SQL via `knex.schema.raw()`.
2. Model: `server/core/models/<thing>.ts` extending `BaseModel`.
3. Register on `Context` in `server/core/context.ts`.
4. Route: `server/apps/api/routes/<thing>.ts`, register in
   `routes/index.ts`. Use `buildHandler()` and Zod.
5. Admin UI: page + query hook in `hooks/queries/use-<thing>.ts`.
6. Mobile (if needed): a service in `mobile/<slug>/src/services/<thing>/`.

### A new mobile feature

If it needs server backing: **one route file** + **one service
folder on mobile** + the hook/screen consuming it. Check
`src/services/iap/` for a self-contained example.

### A new native module

`mobile/<slug>/native/cookbook/hello-{ios,android}/` is the
canonical pattern. Copy, rename, register the package on Android,
patch AppDelegate on iOS. Gotchas in `native/README.md`.

## The non-negotiables

- **4-space indent, semicolons, max 80 columns.**
- **Always braces** for `if`/`else`/`for`/`while`.
- **Never silently catch** — every catch logs with `logger.error()`.
- **Routes go through models** — never call knex from a route.
- **Code in English; user-facing strings in Portuguese.** Server-
  side error messages thrown from models are user-facing (sent to
  the frontend as-is) so write them in Portuguese.
- **No `any` in TypeScript** — `unknown` when truly unknown.
- **Path aliases:** `#core/*`, `#shared/*`, `#api/*`, `#root/*`,
  `#tests/*` (server) and `@/*` (admin UI / mobile). Never relative
  paths beyond a single `../`.

Full list: [`code.md`](./code.md).

## Updating an existing project

When the davicarvalhoo template ships a new version (new files, fixes,
refactors), pull the changes in:

```bash
davicarvalhoo update .          # walk template + project, prompt per file
davicarvalhoo update . --yes    # accept all auto-updates without prompting
```

The CLI uses `.davicarvalhoo/manifest.json` (written at scaffold time)
to know which files are user-edited vs untouched. Untouched files
auto-update; edited files surface a diff and ask before overriding.
Generated assets (icons) regenerate from the manifest's saved
primary color when missing.

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
- **Mobile** ships via EAS — `./scripts/release-android.sh` for
  the Play Store internal track in one shot.
