# Code Standards

This document defines the coding standards for the project. All code
must follow these rules. Read `architecture.md` for architecture
patterns and how-tos.

---

## 1. Formatting

- **4-space indentation**, semicolons, LF line endings
- **No trailing commas** — not in arrays `[foo]`, objects `{foo}`,
  function calls `(foo)`, or parameters. Never `(foo,)` or `[foo,]`
- **Max 80 columns** per line — especially for `if` conditions,
  function signatures, and long strings. Break across lines:

```typescript
// bad
if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'manager') {

// good
if (
    userRole !== 'owner'
    && userRole !== 'admin'
    && userRole !== 'manager'
) {
```

## 2. Braces

**Always use braces** for `if`, `else`, `for`, `while`.
No single-line bodies without braces.

```typescript
// bad
if (foo) bar();
if (foo)
    bar();
for (const x of arr) doSomething(x);

// good
if (foo) {
    bar();
}

for (const x of arr) {
    doSomething(x);
}
```

## 3. Error Handling

**Never silently ignore errors.** Every `catch` block must at
minimum log the error with `logger.error()`:

```typescript
// bad
try {
    await deleteFromS3(key);
} catch {
    // ignore
}

// bad
try {
    await deleteFromS3(key);
} catch (ex) { }

// good
try {
    await deleteFromS3(key);
} catch (err) {
    logger.error('{context} failed to delete file', err);
}
```

In route handlers, let errors propagate to `buildHandler()` — it
catches and formats them automatically. Only use try/catch in routes
when you need to handle a specific error differently.

## 4. TypeScript

- **TypeScript strict** in all packages
- Use explicit types for function parameters and return types on
  exported functions
- Prefer `interface` over `type` for object shapes
- Use `unknown` over `any` when the type is truly unknown
- Use Zod schemas for runtime validation of external input
  (request bodies, query params)

## 5. Language

- **Code in English** — variable names, function names, comments,
  logs, error messages in code
- **UI text in Portuguese** — user-facing strings, labels, toast
  messages, validation messages shown to users
- Error messages thrown by models should be in Portuguese (they're
  sent to the frontend as-is)

## 6. Naming

| Type        | Convention    | Example                       |
|-------------|--------------|-------------------------------|
| Components  | PascalCase   | `NavUser.tsx`                 |
| Hooks       | kebab-case   | `use-user.tsx`                |
| Query hooks | kebab-case   | `use-accounts.ts`             |
| Utils/Lib   | kebab-case   | `fetch-api.ts`                |
| Routes      | kebab-case   | `demand-user.ts`              |
| Models      | kebab-case   | `account.ts`                  |
| Migrations  | timestamp    | `20260208000000_description.ts`|
| DB columns  | snake_case   | `utc_created_on`              |
| TS vars     | camelCase    | `accountRole`                 |

## 7. Path Aliases

- Server: `#core/*`, `#shared/*`, `#api/*`
- Admin UI: `@/*` (maps to `src/`)

Always use path aliases — never relative paths with `../../`.

## 8. Database

- **Raw SQL** in migrations (use `knex.schema.raw()`)
- Every table must have: `id` (UUID), `utc_created_on`, `utc_updated_on`
- Multi-tenant tables must have `account_id` with a foreign key
- Use `generate_series()` for date-based aggregations
- Filename format: `YYYYMMDDHHMMSS_description.ts`
- Never store sensitive data unencrypted (passwords use bcrypt)

## 9. Models

- Extend `BaseModel`, access DB via `this.knex`
- Access other models via `this.context.otherModel`
- Always filter by `account_id` in multi-tenant queries
- Use `PaginatedResult<T>`: `{ rows, total, page, limit, totalPages }`
- Use `whereILike` for case-insensitive search
- Parse JSON fields when reading, `JSON.stringify()` when writing
- Throw `AppError` subclasses: `ValidationError` (400),
  `UnauthorizedError` (401), `ForbiddenError` (403),
  `NotFoundError` (404), `ConflictError` (409)

## 10. Routes

- Use `buildHandler()` wrapper for all async handlers
- Export `makeEndpoint(app)` or `makeRoutes(app)`
- Use Zod schemas for all request body validation
- Middleware chain order:
  `trySetUserByToken` → `demandUser` → `[demandAdmin|demandAccountAccess]`
- Never do raw DB queries in routes — use models

## 11. Frontend

- Use `fetchApi()` for all API calls (handles cookies, errors, FormData)
- Use React Query (`useQuery` / `useMutation`) for all server state
- Use `keepPreviousData` on paginated/searchable queries
- Add query keys to `lib/query-keys.ts`
- Invalidate related queries in mutation `onSuccess`
- Use `useConfirm()` instead of `window.confirm()`
- Use `toast` from sonner for feedback messages

## 12. File Uploads (S3)

- Store only the S3 **key** in the database (`avatar_key`,
  `document_key`), never the full URL
- Serve files via **signed URLs** with short expiry (1 hour)
- Never expose raw S3 URLs to the frontend — always resolve to
  signed URLs on the backend before sending
- Use `createS3Upload()` with explicit `allowedMimeTypes` and
  `maxFileSize` — never accept all file types
- Delete old files from S3 when replacing (e.g. avatar update)

## 13. Charts

Use pure CSS/Tailwind bars with Radix Tooltip — no recharts library
needed (even though it's installed). Pattern:

```tsx
<TooltipProvider delayDuration={0}>
    <div className="flex items-end gap-1 h-32">
        {data.map((point) => (
            <Tooltip key={point.id}>
                <TooltipTrigger asChild>
                    <div
                        className="flex-1 rounded-sm bg-primary
                            cursor-pointer transition-opacity
                            hover:opacity-80"
                        style={{ height: `${height}%` }}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{point.label}</p>
                    <p className="text-lg font-bold">{point.value}</p>
                </TooltipContent>
            </Tooltip>
        ))}
    </div>
</TooltipProvider>
```

Calculate `maxValue` from data, derive bar heights as percentages
with a minimum of 4% so empty bars are still visible.

## 14. Security

- Auth via httpOnly cookies only — no tokens in localStorage
- All S3 files served through signed URLs (never public-read)
- Validate all input with Zod before processing
- Use parameterized queries (Knex handles this) — never
  string-concatenate SQL
- Admin users bypass `user_in_accounts` but still go through
  `demand-account-access` middleware which sets `req.accountRole`
