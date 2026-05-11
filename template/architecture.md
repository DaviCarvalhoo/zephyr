# Architecture

This document describes the architecture patterns and how-tos for
the project. Read `code.md` for coding standards and style rules.

---

## Context-Based Dependency Injection

Every request gets a fresh `Context` (created in middleware). The
Context holds all model instances. **ALL data access goes through
models — never raw queries in routes.**

```typescript
// How it works:
req.context = new Context();

// In a route handler:
const users = await req.context.user.list({ page: 1 });
const account = await req.context.account.findById(id);

// Models access each other via context:
class SomeModel extends BaseModel {
    async doSomething() {
        const user = await this.context.user.findById(userId);
    }
}
```

**Adding a new model:**
1. Create `server/core/models/my-entity.ts` extending `BaseModel`
2. Add to `server/core/context.ts`:
   `myEntity: MyEntityModel;` +
   `this.myEntity = new MyEntityModel(this);`
3. Access everywhere via `req.context.myEntity` or
   `this.context.myEntity`

---

## Model Pattern

```typescript
import BaseModel from './base.js';
import { NotFoundError, ValidationError } from '#core/errors.js';

class MyEntityModel extends BaseModel {
    // this.knex — Knex instance for queries
    // this.context — access to other models
    // this.db — Db singleton

    async list(options: {
        page?: number;
        limit?: number;
        search?: string;
    } = {}) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;

        const baseQuery = this.knex('my_entities')
            .where('account_id', accountId);

        if (options.search?.trim()) {
            baseQuery.whereILike(
                'name',
                `%${options.search.trim()}%`
            );
        }

        const [{ count }] = await baseQuery.clone()
            .count('id as count');
        const total = parseInt(String(count), 10);
        const rows = await baseQuery.clone()
            .select('*')
            .orderBy('utc_created_on', 'desc')
            .limit(limit)
            .offset(offset);

        return {
            rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id: string) {
        const row = await this.knex('my_entities')
            .where({ id })
            .first();

        if (!row) {
            throw new NotFoundError('Entidade não encontrada');
        }

        return row;
    }
}
```

**Key rules:**
- Always filter by `account_id` in multi-tenant queries
- Use `PaginatedResult<T>` pattern:
  `{ rows, total, page, limit, totalPages }`
- Use `whereILike` for case-insensitive search
- Parse JSON fields when reading, stringify when writing
- Throw `AppError` subclasses
  (`ValidationError`, `NotFoundError`, etc.)

---

## Route Handler Pattern

Routes use `buildHandler()` which catches errors and handles Zod
validation automatically.

```typescript
import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware
    from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware
    from '#shared/middlewares/demand-user.js';
import demandAccountAccessMiddleware
    from '#shared/middlewares/demand-account-access.js';
import { buildHandler } from '#shared/utils.js';

const router = express.Router();

const createSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
});

async function handleCreate(
    req: Request,
    res: Response,
): Promise<void> {
    const data = createSchema.parse(req.body);
    const result = await req.context.myEntity.create(
        req.accountId!,
        data,
    );
    res.json({ ok: true, result });
}

router.post('/my-entities', buildHandler(handleCreate));

// Export pattern — ALWAYS use makeEndpoint or makeRoutes
export default function makeEndpoint(app: Express): void {
    app.use(
        '/api/account/:accountId',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        demandAccountAccessMiddleware,
        router
    );
}
```

**Adding new routes:**
1. Create route file in `apps/api/routes/` following the pattern
2. Import and call from `apps/api/routes/index.ts`
3. Use appropriate middleware chain:
   - Public routes: just `trySetUserByTokenMiddleware`
   - User routes: `+ demandUserMiddleware`
   - Admin routes: `+ demandAdminUserMiddleware`
   - Account routes: `+ demandAccountAccessMiddleware`
     (sets `req.accountId`, `req.accountRole`)

---

## Middleware Chain

```
requestLogger → contextInjection → trySetUserByToken
    → [demand*] → routes → errorHandler
```

| Middleware | Does |
|---|---|
| `try-set-user-by-token` | Reads `auth_token` cookie, sets `req.user` if valid, always continues |
| `demand-user` | Requires `req.user`, returns 401 if missing |
| `demand-admin-user` | Requires `req.user.role === 'admin'`, returns 403 otherwise |
| `demand-account-access` | Checks user has access to `:accountId`, sets `req.accountId` + `req.accountRole`. Admins bypass check |
| `error-handler` | Final handler, catches all errors, returns JSON |

---

## Error Classes

```typescript
import {
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    UnauthorizedError,
} from '#core/errors.js';

// 400
throw new ValidationError(
    'A senha deve ter pelo menos 6 caracteres'
);
// 401
throw new UnauthorizedError('Não autorizado');
// 403
throw new ForbiddenError('Acesso negado');
// 404
throw new NotFoundError('Usuário não encontrado');
// 409
throw new ConflictError('Este email já está em uso');
```

---

## Transactions

```typescript
await req.context.knexTransaction(async () => {
    // All model operations here share the same transaction
    const user = await req.context.user.create(data);
    await req.context.account.addMember(accountId, { ... });
    // If anything throws, everything rolls back
});
```

---

## Migrations

**Always use raw SQL:**
```typescript
export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        CREATE TABLE my_entities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id),
            name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            settings JSONB DEFAULT '{}',
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            utc_updated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_my_entities_account
            ON my_entities(account_id);
    `);
}
```

**Conventions:** Always include `id` (UUID), `utc_created_on`,
`utc_updated_on`. Use PostgreSQL ENUMs for roles/statuses.
Filename: `YYYYMMDDHHMMSS_description.ts`.

---

## Authentication

- Backend sets `auth_token` httpOnly cookie on login/signup via
  `setAuthCookie()`
- Frontend uses `credentials: 'include'` (handled by `fetchApi()`)
- Token read from `req.cookies?.auth_token` in
  `try-set-user-by-token` middleware
- JWT contains `user_id`, 30-day expiration
- No Authorization header needed — cookies are automatic

---

## Multi-Tenancy

```
users (global identity)
    ↓ (many-to-many)
user_in_accounts (user_id + account_id + role)
    ↓
accounts (tenant)
    ↓
[domain entities scoped by account_id]
```

**Roles:** `admin` (platform-wide), `owner` (account owner),
`manager` (account manager), `user` (regular user)

**Access control:** `demand-account-access` middleware verifies
access and sets `req.accountId` + `req.accountRole`. Admin users
bypass the `user_in_accounts` check.

---

## File Uploads (S3)

```typescript
import { createS3Upload, generateSignedUrl } from '#core/s3.js';

const upload = createS3Upload({
    folder: 'documents',
    maxFileSize: 10 * 1024 * 1024,
});

router.post(
    '/upload',
    upload.single('file'),
    buildHandler(async (req, res) => {
        const file = req.file as Express.MulterS3.File;
        // Store file.key in the database — never file.location
        res.json({ ok: true, key: file.key });
    }),
);

// Serve securely via signed URL (1-hour expiry)
const signedUrl = await generateSignedUrl(s3Key, 3600);
```

**Rules:**
- Store only the S3 **key** in the database, never the full URL
- Serve via **signed URLs** with short expiry
- Never expose raw S3 URLs to the frontend
- Delete old files from S3 when replacing

---

## Frontend: fetchApi

```typescript
import fetchApi from '@/lib/fetch-api';

// GET (body becomes query params)
const data = await fetchApi('user/accounts');
const data = await fetchApi(
    'admin/users',
    { page: 1, search: 'john' },
);

// POST/DELETE
const data = await fetchApi(
    'login',
    { email, password },
    'POST',
);
const data = await fetchApi(
    `admin/users/${id}`,
    null,
    'DELETE',
);

// FormData (auto-detected, skips Content-Type)
const formData = new FormData();
formData.append('file', file);
const data = await fetchApi('files/upload', formData, 'POST');
```

- Uses `credentials: 'include'` for cookie auth
- On 401/403: clears storage, redirects to `/login`
- Always check `res.ok` before using data

---

## Frontend: React Query Hooks

All server state uses TanStack Query v5 with a structured query
key factory.

```typescript
// Query hook pattern
export function useMyEntities(
    accountId: string,
    filters: PaginationFilters,
) {
    return useQuery({
        queryKey: queryKeys.myEntities.list(accountId, filters),
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const res = await fetchApi(
                `account/${accountId}/my-entities`,
                filters,
            );
            if (!res.ok) {
                throw new Error(res.message);
            }
            return res;
        },
    });
}

// Mutation hook pattern
export function useCreateMyEntity(accountId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await fetchApi(
                `account/${accountId}/my-entities`,
                data,
                'POST',
            );
            if (!res.ok) {
                throw new Error(res.message);
            }
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.myEntities.all,
            });
        },
    });
}
```

**Key rules:**
- Use `keepPreviousData` on paginated/searchable queries
  (prevents UI flash)
- Invalidate related queries in `onSuccess`
- Add query keys to `lib/query-keys.ts`

---

## Frontend: Layouts and Routing

Routes are nested under layouts by role scope. Each layout
provides context:

| Layout | Auth | Provides | Route prefix |
|---|---|---|---|
| `PublicLayout` | None | — | `/` |
| `UserLayout` | `useUser()` | user, logout | `/user` |
| `AdminLayout` | admin role | sidebar, user | `/admin` |
| `AccountLayout` | account access | `useAccountContext()` | `/account/:accountId` |

**Adding a new account page:**
1. Create `src/pages/account/my-page.tsx`
2. Add route to `src/router.tsx`:
   `{ path: 'my-entities', element: <MyPage /> }`
3. Add nav item to `src/layouts/account.tsx` in `getNavSections()`

---

## Frontend: Page Pattern (pagination + search)

```typescript
export default function MyPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useMyEntities(accountId!, {
        page,
        limit: 20,
        search: debouncedSearch || undefined,
    });

    const rows = data?.rows || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    // ... render table with search input and pagination
}
```

---

## Frontend: Confirm Modal

Use `useConfirm()` instead of `window.confirm()`:

```typescript
const confirm = useConfirm();

async function handleDelete(item) {
    const ok = await confirm({
        title: 'Excluir Item',
        description: `Tem certeza que deseja excluir "${item.name}"?`,
        confirmLabel: 'Excluir',
        variant: 'destructive',
    });

    if (!ok) {
        return;
    }

    await deleteMutation.mutateAsync(item.id);
}
```

---

## Console Tasks

```bash
npm run console -- --task=seed-admin
```

Create tasks in `server/console/tasks/`:
```typescript
import type { ConsoleTask } from '../runner.js';

const task: ConsoleTask = {
    name: 'my-task',
    description: 'Does something useful',
    async run(context, args) {
        // context has all models
        const users = await context.user.list();
    },
};
export default task;
```

Register in `console/index.ts`.
