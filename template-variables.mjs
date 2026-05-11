/**
 * Template variables and theme generation for zephyr-cli.
 *
 * All template placeholders are defined here. When adding a new placeholder:
 * 1. Add a `{{PLACEHOLDER}}` in the template files
 * 2. Add the mapping in buildReplacements() below
 */

// ─── Placeholders ────────────────────────────────────────────────────────────
// These are the strings replaced in template files during project creation.
//
// {{PROJECT_NAME}}        — Display name (e.g. "Minha Empresa")
// {{PROJECT_NAME_UPPER}}  — Uppercased display name for wordmarks
// {{PROJECT_SLUG}}        — URL-safe name (e.g. "minha-empresa") — also used in filenames
// {{PROJECT_DESCRIPTION}} — Short description
// {{DOMAIN}}              — Production domain (e.g. "minhaempresa.com.br")
// {{DB_NAME}}             — PostgreSQL database name (e.g. "minha_empresa")
// {{ADMIN_EMAIL}}         — Seed admin email for console task
// {{ADMIN_PASSWORD}}      — Seed admin password for console task
// {{API_PORT}}             — Admin API port (default 4000)
// {{SITE_API_PORT}}        — Site API port (default 4001)
// {{ADMIN_UI_PORT}}        — Admin panel Vite port (default 5173)
// {{SITE_PORT}}            — Public site port (default 3000)
// {{LIGHT_THEME_CSS}}     — Generated CSS variables for light mode
// {{DARK_THEME_CSS}}      — Generated CSS variables for dark mode
// {{DEFAULT_THEME}}       — Default theme: "light", "dark", or "system"
// {{PRIMARY_COLOR}}        — Hex primary color (#xxxxxx)
// {{PRIMARY_COLOR_LIGHT}}  — Same color, ~10% alpha (rgba)
// {{PRIMARY_COLOR_DARK}}   — Lifted variant for dark mode
// {{PRIMARY_COLOR_DARK_LIGHT}} — Dark-variant color at ~10% alpha
// {{IOS_BUNDLE_ID}}        — iOS bundle identifier (com.brand.app)
// {{ANDROID_PACKAGE}}      — Android package (br.com.brand)
// {{MOBILE_SCHEME}}        — App URL scheme for deep links
// {{CONTENT_SECRET}}       — HMAC secret shared between server and
//                            mobile for signed content URLs (random
//                            per project)
// {{JWT_TOKEN_SECRET}}     — JWT signing secret (random per project)

// ─── Theme Generation ───────────────────────────────────────────────────────

function hexToHsl(hex) {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360 * 10) / 10,
        s: Math.round(s * 1000) / 10,
        l: Math.round(l * 1000) / 10,
    };
}

function hsl(h, s, l) {
    return `${h} ${s}% ${l}%`;
}

// Lift a hex color toward white by `pct` (0..1) — used to derive the
// dark-mode primary so it stays legible against a near-black background.
function liftHex(hex, pct) {
    const clean = hex.replace(/^#/, '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const lift = (c) => Math.round(c + (255 - c) * pct);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(lift(r))}${toHex(lift(g))}${toHex(lift(b))}`;
}

function hexToRgba(hex, alpha) {
    const clean = hex.replace(/^#/, '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function randomSecret(bytes = 32) {
    const a = new Uint8Array(bytes);
    // Node 19+ exposes globalThis.crypto.getRandomValues
    globalThis.crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateThemeFromColor(hex) {
    const { h, s } = hexToHsl(hex);

    const light = {
        '--background': hsl(0, 0, 100),
        '--foreground': hsl(h, 10, 3.9),
        '--card': hsl(0, 0, 100),
        '--card-foreground': hsl(h, 10, 3.9),
        '--popover': hsl(0, 0, 100),
        '--popover-foreground': hsl(h, 10, 3.9),
        '--primary': hsl(h, s, 45),
        '--primary-foreground': hsl(0, 0, 98),
        '--secondary': hsl(h, Math.min(s, 10), 95.9),
        '--secondary-foreground': hsl(h, 10, 10),
        '--muted': hsl(h, Math.min(s, 10), 95.9),
        '--muted-foreground': hsl(h, 5, 46.1),
        '--accent': hsl(h, Math.min(s, 10), 95.9),
        '--accent-foreground': hsl(h, 10, 10),
        '--destructive': hsl(0, 84.2, 60.2),
        '--destructive-foreground': hsl(0, 0, 98),
        '--border': hsl(h, 10, 90),
        '--input': hsl(h, 10, 90),
        '--ring': hsl(h, s, 45),
        '--radius': '0.5rem',
        '--sidebar-background': hsl(0, 0, 98),
        '--sidebar-foreground': hsl(h, 10, 26.1),
        '--sidebar-primary': hsl(h, s, 45),
        '--sidebar-primary-foreground': hsl(0, 0, 98),
        '--sidebar-accent': hsl(h, Math.min(s, 10), 95.9),
        '--sidebar-accent-foreground': hsl(h, 10, 10),
        '--sidebar-border': hsl(h, 13, 91),
        '--sidebar-ring': hsl(h, s, 50),
        '--chart-1': hsl(h, Math.min(s, 76), 61),
        '--chart-2': hsl((h + 160) % 360, 58, 39),
        '--chart-3': hsl((h + 185) % 360, 37, 24),
        '--chart-4': hsl((h + 30) % 360, 74, 66),
        '--chart-5': hsl((h + 15) % 360, 87, 67),
    };

    const dark = {
        '--background': hsl(h, 10, 3.9),
        '--foreground': hsl(0, 0, 98),
        '--card': hsl(h, 10, 3.9),
        '--card-foreground': hsl(0, 0, 98),
        '--popover': hsl(h, 10, 3.9),
        '--popover-foreground': hsl(0, 0, 98),
        '--primary': hsl(h, s, 55),
        '--primary-foreground': hsl(h, 10, 5),
        '--secondary': hsl(h, 5, 15.9),
        '--secondary-foreground': hsl(0, 0, 98),
        '--muted': hsl(h, 5, 15.9),
        '--muted-foreground': hsl(h, 5, 64.9),
        '--accent': hsl(h, 5, 15.9),
        '--accent-foreground': hsl(0, 0, 98),
        '--destructive': hsl(0, 62.8, 30.6),
        '--destructive-foreground': hsl(0, 0, 98),
        '--border': hsl(h, 5, 15.9),
        '--input': hsl(h, 5, 15.9),
        '--ring': hsl(h, s, 55),
        '--sidebar-background': hsl(h, 10, 10),
        '--sidebar-foreground': hsl(h, 5, 95.9),
        '--sidebar-primary': hsl(h, s, 50),
        '--sidebar-primary-foreground': hsl(0, 0, 100),
        '--sidebar-accent': hsl(h, 5, 15.9),
        '--sidebar-accent-foreground': hsl(h, 5, 95.9),
        '--sidebar-border': hsl(h, 5, 15.9),
        '--sidebar-ring': hsl(h, s, 50),
        '--chart-1': hsl(h, Math.min(s, 70), 50),
        '--chart-2': hsl((h + 160) % 360, 60, 45),
        '--chart-3': hsl((h + 30) % 360, 80, 55),
        '--chart-4': hsl((h + 260) % 360, 65, 60),
        '--chart-5': hsl((h + 330) % 360, 75, 55),
    };

    return { light, dark };
}

function themeToCSS(vars, indent = '        ') {
    return Object.entries(vars)
        .map(([key, value]) => `${indent}${key}: ${value};`)
        .join('\n');
}

// ─── Replacements Builder ────────────────────────────────────────────────────

/**
 * Builds the full replacement map from project details.
 *
 * @param {object} details - Prompted project details
 * @param {string} details.name - Project display name
 * @param {string} details.slug - URL-safe project slug
 * @param {string} details.description - Short description
 * @param {string} details.domain - Production domain
 * @param {string} details.dbName - PostgreSQL database name
 * @param {string} details.adminEmail - Seed admin email
 * @param {string} details.adminPassword - Seed admin password
 * @param {string} details.apiPort - Admin API port (default "4000")
 * @param {string} details.siteApiPort - Site API port (default "4001")
 * @param {string} details.adminUiPort - Admin panel port (default "5173")
 * @param {string} details.sitePort - Public site port (default "3000")
 * @param {string} details.primaryColor - Hex color (e.g. "#2563eb")
 * @param {string} details.defaultTheme - "light", "dark", or "system"
 * @returns {Record<string, string>} Placeholder → value mapping
 */
export function buildReplacements(details) {
    const theme = generateThemeFromColor(details.primaryColor);
    const primaryDark = liftHex(details.primaryColor, 0.35);

    return {
        '{{PROJECT_NAME}}': details.name,
        '{{PROJECT_NAME_UPPER}}': details.name.toUpperCase(),
        '{{PROJECT_NAME_INITIAL}}': details.name.charAt(0).toUpperCase(),
        '{{PROJECT_SLUG}}': details.slug,
        '{{PROJECT_SLUG_UPPER}}': details.slug
            .toUpperCase()
            .replace(/-/g, '_'),
        '{{PROJECT_DESCRIPTION}}': details.description,
        '{{DOMAIN}}': details.domain,
        '{{DB_NAME}}': details.dbName,
        '{{ADMIN_EMAIL}}': details.adminEmail,
        '{{ADMIN_PASSWORD}}': details.adminPassword,
        '{{API_PORT}}': details.apiPort,
        '{{SITE_API_PORT}}': details.siteApiPort,
        '{{ADMIN_UI_PORT}}': details.adminUiPort,
        '{{SITE_PORT}}': details.sitePort,
        '{{LIGHT_THEME_CSS}}': themeToCSS(theme.light),
        '{{DARK_THEME_CSS}}': themeToCSS(theme.dark),
        '{{DEFAULT_THEME}}': details.defaultTheme,
        '{{PRIMARY_COLOR}}': details.primaryColor,
        '{{PRIMARY_COLOR_LIGHT}}': hexToRgba(details.primaryColor, 0.08),
        '{{PRIMARY_COLOR_DARK}}': primaryDark,
        '{{PRIMARY_COLOR_DARK_LIGHT}}': hexToRgba(primaryDark, 0.1),
        '{{IOS_BUNDLE_ID}}': details.iosBundleId,
        '{{ANDROID_PACKAGE}}': details.androidPackage,
        '{{MOBILE_SCHEME}}': details.mobileScheme,
        // Random secrets generated once per project. After scaffold,
        // the values are saved into the manifest so subsequent
        // `zephyr update` runs reuse them — otherwise every update
        // would regenerate the secret and break sessions / signed
        // URLs already issued by the running app.
        '{{CONTENT_SECRET}}': details.contentSecret ?? randomSecret(),
        '{{JWT_TOKEN_SECRET}}': details.jwtTokenSecret ?? randomSecret(),
    };
}
