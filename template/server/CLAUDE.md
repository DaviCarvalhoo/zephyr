# server/

Express + TypeScript + PostgreSQL + Knex. Two HTTP apps that share
a `core/` layer.

```
server/
├── apps/
│   ├── api/             Admin API on port {{API_PORT}}
│   │   ├── app.ts       Express setup
│   │   └── routes/      One file per resource (auth, user, …)
│   ├── site-api/        Public API on port {{SITE_API_PORT}}
│   └── shared/          Cross-app middlewares + buildHandler
├── core/                Business logic (used by both apps)
│   ├── context.ts       DI container — fresh per request
│   ├── models/          One file per entity, extends BaseModel
│   ├── db.ts, knexfile
│   ├── s3.ts, email.ts
│   ├── oauth.ts         Apple + Google JWKS verification
│   ├── content.ts       Catalog source loader
│   ├── errors.ts        AppError hierarchy
│   └── logger.ts
├── console/             CLI task runner (one file per task)
├── content/             Catalog source (catalog.json)
├── migrations/          Raw SQL via knex.raw() — never .schema.foo()
├── tests/               node:test + tsx
├── emails/              HTML email templates (lodash)
└── dirname.ts           Project-root anchor — see file header
```

## Path aliases (always use these — never `../../core/...`)

```typescript
import logger from '#core/logger.js';
import { buildHandler } from '#shared/utils.js';
import dirname from '#root/dirname.js';
import auth from '#api/routes/auth.js';
```

Defined in `package.json#imports`. Note the `.js` extension in
imports — TypeScript NodeNext resolution requires it even though
the source is `.ts`.

## Adding a new entity (the canonical recipe)

1. **Migration** — `migrations/YYYYMMDDHHMMSS_create-<thing>.ts`.
   Raw SQL via `knex.schema.raw()`. Required columns on every
   table: `id` (UUID), `utc_created_on`, `utc_updated_on`.
   Multi-tenant tables also need `account_id` with FK.

2. **Model** — `core/models/<thing>.ts` extending `BaseModel`.
   Access DB via `this.knex`, other models via `this.context.<other>`.
   Throw `AppError` subclasses (`ValidationError`, `NotFoundError`,
   `ForbiddenError`, `ConflictError`).

3. **Register on Context** — `core/context.ts` adds
   `this.<thing> = new ThingModel(this)`.

4. **Route** — `apps/api/routes/<thing>.ts` exporting
   `makeEndpoint(app)`. Wrap handlers with `buildHandler()`.
   Validate input with Zod. Routes ALWAYS go through models —
   never call `req.context.knex(...)` directly. Register in
   `routes/index.ts`.

5. **Tests** — `tests/core/<thing>.test.ts` with `node:test`.
   Run with `npm test`.

## The non-negotiables

- **Routes go through models.** Never `req.context.knex(...)` from
  a route. If a route needs a query, add a method to the model.
- **Raw SQL in migrations** (`knex.schema.raw()`). Easier to read,
  easier to audit, no surprises. Filter on `account_id` everywhere
  in multi-tenant queries.
- **Use `buildHandler()`** for every async route handler — it
  catches errors and formats them via the error middleware.
  Throwing `ValidationError`/`NotFoundError`/etc. is enough; you
  almost never need a try/catch in a route.
- **Models extend `BaseModel`.** They get `this.knex`, `this.db`,
  `this.context`. Inside a `knexTransaction()` block, every model's
  `this.knex` is automatically swapped to the transaction handle.
- **Path aliases over relative paths.** `#core/...` not `../../core`.
- **Pagination shape**: `{ rows, total, page, limit, totalPages }`.
- **Errors thrown from models are user-visible.** Their messages go
  to the frontend as-is, so write them in Portuguese (or whatever
  the UI language is — see ui/site/i18n for the locale convention).

## Commands (from server/)

```bash
npm run dev                # Admin API with hot-reload (tsx watch)
npm run dev:site-api       # Site API with hot-reload
npm run build              # tsc

npm run migrate:latest     # apply pending migrations
npm run migrate:rollback   # roll back last batch
npm run migrate:make NAME  # create new migration
npm run migrate:status     # what's pending

npm run console -- --task=TASK_NAME  # run a console task
npm test                   # node:test on tests/**/*.test.ts
npm run lint               # eslint --ext .ts,.tsx
```

`./knex.sh` is a thin wrapper if you want raw `knex` CLI access.

## Mobile-paired routes

Several routes in `apps/api/routes/` exist only because the mobile
app calls them: `auth.ts` (Apple/Google + refresh tokens),
`backup.ts`, `content.ts`, `iap.ts`, `health.ts`. If you don't ship
a mobile app, delete those + remove their imports from
`routes/index.ts` — nothing else depends on them.

## Auth patterns

- **Web** uses httpOnly cookies via `setAuthCookie()`. Cookies are
  set on `/login`, `/signup`, and the OAuth callback redirects.
- **Mobile** uses `Authorization: Bearer <jwt>` + a separate
  long-lived refresh token. `try-set-user-by-token` middleware
  accepts both transports — `req.user` lands the same way.
- **Refresh-token rotation** is single-flighted in `AuthModel.
  rotateRefreshToken()`. Old RT is deleted on use; the new one is
  returned. Concurrent callers should share an in-flight Promise on
  the client side too (see `mobile/<slug>/src/contexts/AuthContext`).

## Production hardening (already in app.ts)

- `process.env.TZ = 'UTC'` so the host TZ doesn't leak into DB
  timestamps or log formatting.
- `uncaughtException` / `unhandledRejection` → log + `exit(1)`.
  systemd / pm2 / docker restart the process; better to die loudly
  than serve broken responses.
- `app.set('trust proxy', 1)` so `req.ip` is the real client (we
  always run behind nginx in prod).
