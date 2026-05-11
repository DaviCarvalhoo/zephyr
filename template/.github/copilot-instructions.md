# Copilot Instructions

## Project: {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

Multi-tenant SaaS application built with the **zephyr** architecture pattern for the Brazilian market.

## Tech Stack

- **Backend:** TypeScript, Express.js, PostgreSQL, Knex.js, Zod
- **Admin UI:** React 18, Vite, TailwindCSS, shadcn/ui (Radix), React Router DOM 6, TanStack Query v5, React Hook Form + Zod
- **Site UI:** Express + EJS + TailwindCSS
- **Auth:** httpOnly JWT cookies (30-day expiry)
- **Uploads:** AWS S3 via multer-s3 with signed URLs

## Architecture

- Multi-API: `server/apps/api/` (admin, port 4000) + `server/apps/site-api/` (site, port 4001)
- Shared core: `server/core/` (db, models, context, s3, email, errors, logger)
- Shared middleware: `server/apps/shared/` (auth guards, error handler, buildHandler)
- Context-based DI: fresh `Context` per request with all models instantiated
- Models extend `BaseModel`, access DB via `this.knex`, other models via `this.context`
- Routes use `buildHandler()` wrapper for async error handling + Zod validation
- Multi-tenant: users -> user_in_accounts -> accounts -> domain entities
- Roles: admin (platform-wide), owner, manager, user (per-account)

## Code Style

- 4-space indentation, semicolons required, LF line endings
- TypeScript strict mode everywhere
- Code in English, UI text in Portuguese (Brazilian market)
- Path aliases: `#core/*`, `#shared/*`, `#api/*` (server), `@/*` (admin UI)

## Key Patterns — Follow These When Generating Code

### Backend: Models (data access)

All database queries go in models, never in route handlers directly. Models extend `BaseModel` and live in `server/core/models/`.

```typescript
import BaseModel from './base.js';
import { NotFoundError, ValidationError } from '#core/errors.js';

class MyEntityModel extends BaseModel {
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
        const rows = await baseQuery.clone().select('*')
            .orderBy('utc_created_on', 'desc').limit(limit).offset(offset);
        return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findById(id: string) {
        const row = await this.knex('my_entities').where({ id }).first();
        if (!row) throw new NotFoundError('Entidade não encontrada');
        return row;
    }
}
```

Register in `server/core/context.ts`: add field + `this.myEntity = new MyEntityModel(this);`

### Backend: Routes

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
        trySetUserByTokenMiddleware, demandUserMiddleware,
        demandAccountAccessMiddleware, router);
}
```

### Backend: Errors

```typescript
throw new ValidationError('Campo obrigatório');     // 400
throw new NotFoundError('Não encontrado');           // 404
throw new ConflictError('Já existe');                // 409
throw new ForbiddenError('Sem permissão');           // 403
throw new UnauthorizedError('Não autorizado');       // 401
```

### Backend: Transactions

```typescript
await req.context.knexTransaction(async () => {
    // All model ops share the same transaction; rollback on throw
});
```

### Backend: Migrations (raw SQL)

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

### Frontend: fetchApi

```typescript
import fetchApi from '@/lib/fetch-api';
const data = await fetchApi('user/accounts');                           // GET
const data = await fetchApi('admin/users', { page: 1 });               // GET with params
const data = await fetchApi('login', { email, password }, 'POST');     // POST
```

Uses `credentials: 'include'` for cookie auth.

### Frontend: React Query hooks

```typescript
export function useMyEntities(accountId: string, filters: PaginationFilters) {
    return useQuery({
        queryKey: queryKeys.myEntities.list(accountId, filters),
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const res = await fetchApi(`account/${accountId}/my-entities`, filters);
            if (!res.ok) throw new Error(res.message);
            return res;
        },
    });
}
```

Use `keepPreviousData` on paginated/searchable queries. Add keys to `lib/query-keys.ts`. Invalidate related queries in mutation `onSuccess`.

### Frontend: Confirm modal

```typescript
const confirm = useConfirm();
const ok = await confirm({
    title: 'Excluir', description: 'Tem certeza?',
    confirmLabel: 'Excluir', variant: 'destructive',
});
```

### Frontend: Layouts

| Layout | Auth | Route prefix |
|---|---|---|
| `PublicLayout` | None | `/` |
| `UserLayout` | `useUser()` | `/user` |
| `AdminLayout` | admin role | `/admin` |
| `AccountLayout` | account access | `/account/:accountId` |

## File Naming

- Components: PascalCase (`AppSidebar.tsx`)
- Hooks: kebab-case with `use-` prefix (`use-user.tsx`)
- Routes/Models/Utils: kebab-case (`demand-user.ts`, `fetch-api.ts`)
- Migrations: timestamp prefix (`20260208000000_description.ts`)

## Multi-Tenancy

Always filter by `account_id` in tenant-scoped queries. The `demand-account-access` middleware verifies access and sets `req.accountId` + `req.accountRole`. Admin users bypass the check.
