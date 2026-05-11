/**
 * i18n setup for the public site. URL-based locale (best for SEO):
 *
 *   /             → pt-BR (default, no prefix — keeps clean URLs
 *                   for the primary audience and avoids redirects)
 *   /en/...       → English
 *
 * Best practices applied:
 *   - <html lang="..."> set per request (assistive tech + SEO).
 *   - <link rel="alternate" hreflang="..."> for every supported
 *     locale on every page → tells Google about translations.
 *   - <link rel="alternate" hreflang="x-default"> points at the
 *     default locale (recommended by Google for ambiguous markets).
 *   - <link rel="canonical"> per page → avoids duplicate content
 *     when the same content is reachable via multiple URLs.
 *   - <meta property="og:locale"> + og:locale:alternate.
 *   - sitemap.xml lists every locale variant of every page.
 */

import i18next from 'i18next';
import type { Request, Response, NextFunction } from 'express';

import ptBR from './locales/pt-BR.js';
import en from './locales/en.js';

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';

// Maps internal locale codes → URL prefix segment.
// Default locale has no prefix to keep URLs clean for the primary
// market. Only add to this when you also add a locale.
const PREFIX_BY_LOCALE: Record<SupportedLocale, string> = {
    'pt-BR': '',
    en: '/en'
};

// Hreflang values. Google expects ISO 639-1 / 3166-1 here, NOT
// internal i18n codes. Keep this map in sync with PREFIX_BY_LOCALE.
const HREFLANG_BY_LOCALE: Record<SupportedLocale, string> = {
    'pt-BR': 'pt-BR',
    en: 'en'
};

// Open Graph locale values. og:locale uses underscore separators.
const OG_LOCALE_BY_LOCALE: Record<SupportedLocale, string> = {
    'pt-BR': 'pt_BR',
    en: 'en_US'
};

void i18next.init({
    compatibilityJSON: 'v3',
    resources: {
        'pt-BR': { translation: ptBR },
        en: { translation: en }
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    returnNull: false
});

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation';
        resources: { translation: typeof ptBR };
    }
}

declare module 'express-serve-static-core' {
    interface Request {
        locale: SupportedLocale;
        /** Original path WITHOUT the locale prefix (e.g. "/about"). */
        canonicalPath: string;
    }

    /**
     * Express's Locals is permissive (extra props allowed), so we
     * just declare the i18n-specific fields we care about. They're
     * available to every render call as `<%= localeField %>`.
     */
    interface Locals {
        locale: SupportedLocale;
        t: (key: string, opts?: Record<string, unknown>) => string;
        urlForLocale: (locale: SupportedLocale) => string;
        hreflangAlternates: Array<{
            locale: SupportedLocale;
            hreflang: string;
            url: string;
        }>;
        ogLocale: string;
        ogLocaleAlternates: string[];
        canonicalUrl: string;
        htmlLang: string;
    }
}

/**
 * Strip the URL's locale prefix (if any) and resolve the request's
 * locale. Mounted before any route so handlers can rely on `req.url`
 * being the canonical path (no /en in front).
 */
export function localeMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    const m = req.url.match(/^\/(en)(\/|$|\?)/);
    if (m) {
        req.locale = 'en';
        req.url = req.url.replace(/^\/en/, '') || '/';
    } else {
        req.locale = DEFAULT_LOCALE;
    }
    // canonicalPath is the path BEFORE the prefix was stripped;
    // useful for canonical URL building.
    req.canonicalPath = req.url.split('?')[0];
    next();
}

/**
 * Populates res.locals with i18n helpers + SEO metadata for the
 * header partial. Mounted AFTER localeMiddleware.
 */
export function viewLocalsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const baseUrl = process.env.SITE_URL ?? '';
    const path = req.canonicalPath;

    function urlForLocale(locale: SupportedLocale): string {
        return `${baseUrl}${PREFIX_BY_LOCALE[locale]}${path}`;
    }

    const hreflangAlternates = SUPPORTED_LOCALES.map(locale => ({
        locale,
        hreflang: HREFLANG_BY_LOCALE[locale],
        url: urlForLocale(locale)
    }));

    res.locals.locale = req.locale;
    res.locals.htmlLang = HREFLANG_BY_LOCALE[req.locale];
    res.locals.t = (key: string, opts?: Record<string, unknown>) => {
        // i18next's overloaded signature is over-constrained for our
        // dynamic-key use case (template strings could query any
        // path). Erase the strict key-tuple via `unknown` so EJS
        // calls like t('hero.title') compile cleanly.
        const fn = i18next.t as unknown as (
            key: string,
            options?: Record<string, unknown>
        ) => string;
        return fn(key, { lng: req.locale, ...opts });
    };
    res.locals.urlForLocale = urlForLocale;
    res.locals.hreflangAlternates = hreflangAlternates;
    res.locals.canonicalUrl = urlForLocale(req.locale);
    res.locals.ogLocale = OG_LOCALE_BY_LOCALE[req.locale];
    res.locals.ogLocaleAlternates = SUPPORTED_LOCALES
        .filter(l => l !== req.locale)
        .map(l => OG_LOCALE_BY_LOCALE[l]);
    next();
}

export default i18next;
