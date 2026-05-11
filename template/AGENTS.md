# AGENTS.md

## Project: {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

Multi-tenant SaaS application built with the **zephyr** architecture pattern for the Brazilian market.

## Quick Start

```bash
./install.sh          # Install all deps + create .env files from samples
./dev.sh              # Start all services concurrently (Ctrl+C to stop)
```

## Repository Structure

Independent packages (each has its own `node_modules` and `package-lock.json`):

```
server/
  apps/api/           Admin/main API (port 4000)
    routes/            Route handlers by domain (auth, user, account, admin, files)
  apps/site-api/       Site API (port 4001)
    routes/            Public API route handlers
  apps/shared/         Shared across all APIs
    middlewares/        Auth guards, error handler, request logger
    utils.ts           buildHandler() async route wrapper
  core/                Shared business logic
    context.ts         DI container (fresh per request)
    models/            Data access layer (one model per entity)
    db.ts              Knex database wrapper
    knexfile.ts        PostgreSQL connection config
    s3.ts              AWS S3 uploads via multer-s3
    email.ts           Email sending via nodemailer + templates
    errors.ts          AppError hierarchy (ValidationError, NotFoundError, etc.)
    logger.ts          Application logging
  console/             CLI task runner
    tasks/             One file per task
  migrations/          Knex migrations (raw SQL)
  types/               TypeScript type extensions (express.d.ts)
  emails/              HTML email templates

ui/admin/              React SPA (Vite, port 5173)
  src/
    pages/             Route pages by scope: public/, user/, admin/, account/
    layouts/           Layout wrappers: PublicLayout, UserLayout, AdminLayout, AccountLayout
    components/ui/     shadcn/ui components (Radix + CVA + Tailwind)
    components/        App-level components (sidebar, theme, nav)
    hooks/             Custom hooks (use-user, use-confirm, use-mobile, use-sidebar)
    hooks/queries/     React Query hooks per entity (use-users, use-accounts, use-members, etc.)
    lib/               Utilities (fetch-api, query-client, query-keys, config, utils)

ui/site/               Public marketing site (Express + EJS, port 3000)
  views/               EJS templates (pages/, partials/)
  styles/              TailwindCSS input
```

## Tech Stack

- **Backend:** TypeScript, Express.js, PostgreSQL, Knex.js, Zod
- **Admin UI:** React 18, Vite, TailwindCSS, shadcn/ui (Radix), React Router DOM 6, React Query (TanStack Query v5), React Hook Form + Zod, Recharts
- **Site UI:** Express + EJS + TailwindCSS
- **Auth:** httpOnly JWT cookies (30-day expiry)
- **Uploads:** AWS S3 via multer-s3 with signed URLs

## Code Style

- 4-space indentation, semicolons, LF line endings
- TypeScript strict mode in all packages
- Code in English, UI text in Portuguese (Brazilian market)
- Path aliases: `#core/*`, `#shared/*`, `#api/*` (server), `@/*` (admin UI)

### File Naming
| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `NavUser.tsx` |
| Hooks | kebab-case with `use-` | `use-user.tsx` |
| Query hooks | kebab-case with `use-` | `use-accounts.ts` |
| Utils/Lib | kebab-case | `fetch-api.ts` |
| Routes | kebab-case | `demand-user.ts` |
| Models | kebab-case | `account.ts` |
| Migrations | timestamp prefix | `20260208000000_initial-schema.ts` |

## Critical Patterns

### Context-Based Dependency Injection

Every request gets a fresh `Context` (created in middleware). The Context holds all model instances. **ALL data access goes through models — never raw queries in routes.**

```typescript
// In route handlers:
const users = await req.context.user.list({ page: 1 });
const account = await req.context.account.findById(id);
```

**Adding a new model:**
1. Create `server/core/models/my-entity.ts` extending `BaseModel`
2. Add to `server/core/context.ts`: `myEntity: MyEntityModel;` + `this.myEntity = new MyEntityModel(this);`
3. Access via `req.context.myEntity` or `this.context.myEntity`

### Model Pattern

```typescript
import BaseModel from './base.js';
import { NotFoundError, ValidationError } from '#core/errors.js';

class MyEntityModel extends BaseModel {
    // this.knex — Knex instance
    // this.context — access other models
    // this.db — Db singleton

    async list(options = {}) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;

        const baseQuery = this.knex('my_entities').where('account_id', accountId);
        if (options.search?.trim()) {
            baseQuery.whereILike('name', `%${options.search.trim()}%`);
        }

        const [{ count }] = await baseQuery.clone().count('id as count');
        const total = parseInt(String(count), 10);
        const rows = await baseQuery.clone()
            .select('*').orderBy('utc_created_on', 'desc')
            .limit(limit).offset(offset);

        return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
```

**Key rules:**
- Always filter by `account_id` in multi-tenant queries
- Use `PaginatedResult<T>` pattern: `{ rows, total, page, limit, totalPages }`
- Throw `AppError` subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`)

### Route Handler Pattern

```typescript
import { buildHandler } from '#shared/utils.js';
import { z } from 'zod';

const createSchema = z.object({ name: z.string().min(1, 'Nome é obrigatório') });

async function handleCreate(req: Request, res: Response): Promise<void> {
    const data = createSchema.parse(req.body);
    const result = await req.context.myEntity.create(req.accountId!, data);
    res.json({ ok: true, result });
}

router.post('/my-entities', buildHandler(handleCreate));

export default function makeEndpoint(app: Express): void {
    app.use('/api/account/:accountId',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        demandAccountAccessMiddleware,
        router
    );
}
```

### Middleware Chain

```
requestLogger → contextInjection → trySetUserByToken → [demand*] → routes → errorHandler
```

| Middleware | Does |
|---|---|
| `try-set-user-by-token` | Reads cookie, sets `req.user` if valid |
| `demand-user` | Requires `req.user`, returns 401 |
| `demand-admin-user` | Requires admin role, returns 403 |
| `demand-account-access` | Checks account access, sets `req.accountId` + `req.accountRole` |

### Error Classes

```typescript
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '#core/errors.js';

throw new ValidationError('A senha deve ter pelo menos 6 caracteres');  // 400
throw new NotFoundError('Usuário não encontrado');                       // 404
throw new ConflictError('Este email já está em uso');                    // 409
throw new ForbiddenError('Acesso negado');                               // 403
```

### Transactions

```typescript
await req.context.knexTransaction(async () => {
    const user = await req.context.user.create(data);
    await req.context.account.addMember(accountId, { ... });
    // If anything throws, everything rolls back
});
```

### Migrations

Always use raw SQL:
```typescript
export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        CREATE TABLE my_entities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id),
            name VARCHAR(255) NOT NULL,
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            utc_updated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX idx_my_entities_account ON my_entities(account_id);
    `);
}
```

Conventions: always include `id` (UUID), `utc_created_on`, `utc_updated_on`. Filename: `YYYYMMDDHHMMSS_description.ts`.

## Frontend Patterns

### fetchApi

```typescript
import fetchApi from '@/lib/fetch-api';
const data = await fetchApi('user/accounts');                              // GET
const data = await fetchApi('admin/users', { page: 1 }, 'GET');           // GET with params
const data = await fetchApi('login', { email, password }, 'POST');        // POST
const data = await fetchApi(`admin/users/${id}`, null, 'DELETE');         // DELETE
```

Uses `credentials: 'include'` for cookie auth. On 401/403: clears storage, redirects to `/login`.

### React Query Hooks

All server state uses TanStack Query v5 with a structured query key factory in `lib/query-keys.ts`.

```typescript
export function useMyEntities(accountId: string, filters: PaginationFilters) {
    return useQuery({
        queryKey: queryKeys.myEntities.list(accountId, filters),
        placeholderData: keepPreviousData,  // Prevents UI flash during search
        queryFn: async () => {
            const res = await fetchApi(`account/${accountId}/my-entities`, filters);
            if (!res.ok) throw new Error(res.message);
            return res;
        },
    });
}
```

**Key rules:**
- Use `keepPreviousData` on paginated/searchable queries
- Invalidate related queries in mutation `onSuccess`
- Add keys to `lib/query-keys.ts`

### Layouts and Routing

| Layout | Auth | Route prefix |
|---|---|---|
| `PublicLayout` | None | `/` |
| `UserLayout` | `useUser()` | `/user` |
| `AdminLayout` | admin role | `/admin` |
| `AccountLayout` | account access | `/account/:accountId` |

### Confirm Modal

Use `useConfirm()` instead of `window.confirm()`:
```typescript
const confirm = useConfirm();
const ok = await confirm({
    title: 'Excluir Item',
    description: `Tem certeza que deseja excluir "${item.name}"?`,
    confirmLabel: 'Excluir',
    variant: 'destructive',
});
if (!ok) return;
```

## Multi-Tenancy

```
users (global identity) → user_in_accounts (many-to-many + role) → accounts (tenant) → [domain entities]
```

**Roles:** `admin` (platform-wide), `owner` (account owner), `manager`, `user`

## Commands

```bash
# Server (from server/)
npm run dev                # Admin API with hot-reload
npm run dev:site-api       # Site API with hot-reload
npm run migrate:latest     # Run pending migrations
npm run migrate:rollback   # Rollback last batch
npm run migrate:make NAME  # Create new migration
npm run console -- --task=TASK_NAME  # Run console task

# Admin UI (from ui/admin/)
npm run dev           # Vite dev server on port 5173
npm run build         # TypeScript check + Vite production build

# Site UI (from ui/site/)
npm run dev           # Express server + Tailwind watcher
npm run build         # TypeScript + minified Tailwind CSS
```
