# ui/site/

Public marketing site. Express + EJS + TailwindCSS on port
{{SITE_PORT}}. SSR-rendered for SEO. Default locale **pt-BR** at
`/`, English under `/en/...`.

```
ui/site/
├── app.ts                    Express setup + i18n middleware
├── i18n/
│   ├── index.ts              localeMiddleware + viewLocalsMiddleware
│   └── locales/
│       ├── pt-BR.ts          source-of-truth TranslationShape
│       └── en.ts             same shape, satisfies the type
├── views/
│   ├── partials/
│   │   ├── header.ejs        <html>, SEO tags, nav, lang toggle
│   │   └── footer.ejs
│   └── pages/                home, not-found, ...
├── public/                   static assets + Tailwind output
├── styles/input.css          Tailwind input
└── tailwind.config.js
```

## i18n & SEO (the non-negotiables)

- **URL strategy**: `/` → pt-BR (no prefix, primary market),
  `/en/...` → English. Default-without-prefix avoids redirects on
  the root domain and keeps clean URLs for SEO.

- **`localeMiddleware`** strips `/en` from `req.url` and sets
  `req.locale`, `req.canonicalPath`. **Add it BEFORE every other
  middleware.** Routes are written once, no /en variants needed.

- **`viewLocalsMiddleware`** populates `res.locals` with: `t()`,
  `urlForLocale(locale)`, `hreflangAlternates`, `canonicalUrl`,
  `ogLocale`, `ogLocaleAlternates`, `htmlLang`. Templates consume
  via `<%= t('hero.title') %>`.

- **Header partial sets all required SEO tags**: `<html lang>`,
  `<link rel="alternate" hreflang>` per locale + `x-default`
  pointing at pt-BR, `<link rel="canonical">`, `og:locale` +
  `og:locale:alternate`. Don't override these in pages.

- **Sitemap.xml** lists every page in every locale with
  `xhtml:link` alternates (Google's recommended format). Update
  the `PUBLIC_PATHS` array in app.ts when adding a public page.

- **robots.txt** is dynamic and points at the sitemap.

## Adding a page

1. Add to `views/pages/<page>.ejs` — `include` the header/footer
   partials, use `<%= t('section.key') %>` for every string.

2. Add the keys to `i18n/locales/pt-BR.ts` (TranslationShape) and
   `en.ts`. Both must have the same shape — TypeScript catches
   omissions.

3. Register the route in `app.ts`:
   ```ts
   app.get('/foo', (_req, res) => res.render('pages/foo'));
   ```
   The `/en/foo` variant works automatically (the middleware
   stripped `/en` already).

4. Add the path to `PUBLIC_PATHS` so sitemap.xml lists it.

## The non-negotiables

- **Every user-facing string goes through `t()`.** No bare strings
  in templates.

- **Internal links use `urlForLocale(locale)`**:
  ```ejs
  <a href="<%= urlForLocale(locale) %>#features">…</a>
  ```
  Never hardcode `/` or `/en` — the helper handles the prefix.

- **`<html lang="<%= htmlLang %>">`** is set in the header partial.
  Every page renders the right lang attribute automatically.

- **`SITE_URL` env var must be set in production** so canonical
  URLs and sitemap entries resolve to the live host. Defaults to
  `https://{{DOMAIN}}` if unset.

## Commands (from ui/site/)

```bash
npm run dev          # tsx watch + tailwind watch (concurrently)
npm run build        # tsc + minified Tailwind
npm run start        # production app.ts
```

## What NOT to do

- Don't render strings like `Pular` directly — use
  `<%= t('common.skip') %>`. Even pt-BR strings go through i18n.
- Don't create `/en/` route variants by hand. The middleware does
  the URL rewriting; routes match the canonical path.
- Don't skip the `og:locale:alternate` tags. Facebook / LinkedIn
  read them; missing tags = wrong locale on social shares.
