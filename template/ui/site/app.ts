import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    localeMiddleware,
    viewLocalsMiddleware,
    SUPPORTED_LOCALES
} from './i18n/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = parseInt(process.env.PORT || '{{SITE_PORT}}', 10);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// i18n: extract locale from URL prefix, then populate template
// helpers. Order matters — localeMiddleware rewrites req.url so
// subsequent routes match cleanly without a /en prefix.
app.use(localeMiddleware);

// App-wide locals available in every template.
app.use((_req, res, next) => {
    res.locals.baseAdminUrl = process.env.BASE_ADMIN_URL
        ?? 'http://localhost:{{ADMIN_UI_PORT}}';
    res.locals.currentYear = new Date().getFullYear();
    next();
});

app.use(viewLocalsMiddleware);

// Pages — add new ones below. Each renders a single template; the
// /en variant works automatically because localeMiddleware stripped
// the prefix before this match runs.
app.get('/', (_req, res) => {
    res.render('pages/home');
});
//
//   app.get('/funcionalidades', (_req, res) => {
//       res.render('pages/features');
//   });
//   app.get('/planos', (_req, res) => res.render('pages/pricing'));
//   app.get('/contato', (_req, res) => res.render('pages/contact'));

// Per-locale sitemap. Lists every page in every supported locale so
// search engines discover both versions of every URL. Update the
// `paths` array whenever you add a public page above.
const PUBLIC_PATHS = ['/'];

app.get('/sitemap.xml', (_req, res) => {
    const baseUrl = process.env.SITE_URL ?? 'https://{{DOMAIN}}';

    const urls: string[] = [];
    for (const p of PUBLIC_PATHS) {
        for (const locale of SUPPORTED_LOCALES) {
            const prefix = locale === 'pt-BR' ? '' : `/${locale}`;
            const alts = SUPPORTED_LOCALES.map(alt => {
                const altPrefix = alt === 'pt-BR' ? '' : `/${alt}`;
                return `<xhtml:link rel="alternate" `
                    + `hreflang="${alt}" `
                    + `href="${baseUrl}${altPrefix}${p}" />`;
            }).join('');
            urls.push(
                '<url>'
                + `<loc>${baseUrl}${prefix}${p}</loc>`
                + alts
                + '</url>'
            );
        }
    }

    res.set('Content-Type', 'application/xml');
    res.send(
        '<?xml version="1.0" encoding="UTF-8"?>'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        + 'xmlns:xhtml="http://www.w3.org/1999/xhtml">'
        + urls.join('')
        + '</urlset>'
    );
});

// robots.txt — points at the sitemap so crawlers find it.
app.get('/robots.txt', (_req, res) => {
    const baseUrl = process.env.SITE_URL ?? 'https://{{DOMAIN}}';
    res.type('text/plain').send(
        `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
});

// 404 — render the not-found template in the requested locale.
app.use((_req, res) => {
    res.status(404).render('pages/not-found');
});

app.listen(port, () => {
    console.log(`Site running on http://localhost:${port}`);
});
