/**
 * Content catalog source. Reads from server/content/catalog.json,
 * caches the parsed payload + a stable version hash in memory.
 *
 * The hash is computed from the raw file bytes — every byte change
 * (whitespace included) produces a new version, which is what we
 * want: the mobile client treats *any* change as a sync trigger.
 *
 * Reload by calling `reloadContent()` (e.g. from a console task or
 * after a deploy) — or restart the process.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dirname from '#root/dirname.js';

// Anchor to server/ root via dirname.ts so the catalog path is stable
// regardless of where node was invoked from.
const CATALOG_PATH = path.resolve(dirname, 'content', 'catalog.json');

export interface ContentItem {
    id: string;
    type: string;
    [key: string]: unknown;
}

export interface ContentCatalog {
    version: string;
    generatedAt: string;
    items: ContentItem[];
}

let _cache: ContentCatalog | null = null;

function loadFromDisk(): ContentCatalog {
    const raw = fs.readFileSync(CATALOG_PATH);
    const parsed = JSON.parse(raw.toString('utf8')) as {
        version?: number;
        items?: ContentItem[];
    };

    // The bundle's declared version is informational; the client
    // authoritative version is the file content hash so any edit
    // (even cosmetic) triggers a re-sync.
    const hash = crypto
        .createHash('sha256')
        .update(raw)
        .digest('hex')
        .slice(0, 16);

    return {
        version: hash,
        generatedAt: new Date().toISOString(),
        items: parsed.items ?? []
    };
}

export function getContentCatalog(): ContentCatalog {
    if (!_cache) {
        _cache = loadFromDisk();
    }
    return _cache;
}

export function reloadContent(): ContentCatalog {
    _cache = loadFromDisk();
    return _cache;
}
