# ui/admin/

React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui (Radix + CVA).
SPA on port {{ADMIN_UI_PORT}} that talks to the admin API on
{{API_PORT}}.

```
ui/admin/src/
├── pages/           Route pages, grouped by scope:
│                      public/   no auth
│                      user/     signed-in user
│                      admin/    platform admin
│                      account/  scoped to a tenant
├── layouts/         One layout per scope — wraps the matching pages
├── components/
│   ├── ui/          shadcn/ui primitives (button, dialog, sheet, …)
│   └── *.tsx        App-specific: sidebar, theme, nav user
├── hooks/
│   ├── *.tsx        use-confirm, use-user, etc.
│   └── queries/     use-<entity>.ts — React Query per entity
├── lib/
│   ├── fetch-api.ts Wrapper that handles cookies, errors, FormData
│   ├── query-client.ts
│   ├── query-keys.ts  ALL keys live here, sorted by domain
│   └── utils.ts     cn() helper, formatters
└── App.tsx, main.tsx
```

Path alias: `@/*` → `./src/*`. Use it everywhere.

## Adding a feature (the recipe)

1. **Page** — `pages/<scope>/<thing>.tsx`. Wrap in the matching
   layout via the route declaration in `App.tsx`.

2. **Query hook** — `hooks/queries/use-<thing>.ts`. Returns a typed
   React Query result. List + detail go in the same file.

3. **Query keys** — add to `lib/query-keys.ts`. Keys are tuples;
   keep them grouped by domain so invalidation is greppable.

4. **Mutation** — same file as the query hook. `onSuccess` calls
   `queryClient.invalidateQueries({ queryKey: keys.thing.list() })`.

5. **shadcn primitive missing?** Run
   `npx shadcn-ui@latest add <name>` from `ui/admin/`. It writes
   into `components/ui/`.

## The non-negotiables

- **`fetchApi()` for every API call.** Handles cookies, JSON, errors,
  FormData. Don't reach for `fetch` directly.
- **React Query for every server-state read.** `useQuery` /
  `useMutation` / `useInfiniteQuery`. Use `placeholderData:
  keepPreviousData` on paginated/searchable queries so the table
  doesn't flash empty between pages.
- **Query keys live in `lib/query-keys.ts`** so invalidation is
  centralized. When you add a key in two places, you've made a
  bug.
- **`useConfirm()` instead of `window.confirm`** — themed dialog
  matching the rest of the UI.
- **`toast` from sonner** for user feedback. Never `alert()`.
- **shadcn/ui primitives** under `components/ui/`. Compose them in
  feature components — don't fork the primitives.
- **TailwindCSS classes**, not inline styles. The theme variables
  in `index.css` come from the project's primary color (set at
  scaffold time).

## i18n

Admin UI ships pt-BR strings inline today (the admin is for the
operator, not the customer). If you need EN admin support later,
mirror the mobile app's pattern: `src/i18n/{index,locales/*}` with
`react-i18next` + `i18next`. The mobile app is the reference.

## Charts

Pure CSS/Tailwind bars with Radix Tooltip. recharts is installed
but the convention is to compose the pattern in `code.md` (search
for `Charts`). Saves a render and matches the rest of the UI.

## Commands (from ui/admin/)

```bash
npm run dev          # Vite on port {{ADMIN_UI_PORT}}
npm run build        # tsc + vite build → dist/
npm run lint         # eslint
```

## Connecting to the API

`fetch-api.ts` reads `import.meta.env.VITE_API_URL` and falls back
to `http://localhost:{{API_PORT}}`. Cookies flow because the API
sends `Set-Cookie` on `/login` + we send `credentials: 'include'`
on every request.

## Auth state

`use-user.tsx` hook calls `GET /api/auth` and caches the result via
React Query. `signed: !!user` for guard checks. Layouts redirect on
the absence of `user` (or wrong role).
