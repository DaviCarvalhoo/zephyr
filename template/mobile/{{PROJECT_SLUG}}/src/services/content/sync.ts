/**
 * Content sync. Pulls the server's catalog into the local SQLite
 * `content_catalog` table when the server's version changes.
 *
 * The version probe is cheap (just a 16-byte hex string), so we run
 * it on every cold-start and on every foreground transition. The
 * full catalog payload is only fetched when the version actually
 * changed — almost always a no-op after the first run.
 *
 * Mental model: the client is the cache, the server is the source of
 * truth. UI screens read from SQLite, never the network.
 */

import { fetchApi } from '../fetch-api';
import { getDb } from '../db';

const VERSION_PREF_KEY = '@{{PROJECT_SLUG}}:content_version';

interface VersionResponse {
    ok: boolean;
    version: string;
    generatedAt: string;
}

interface CatalogItem {
    id: string;
    type: string;
    [key: string]: unknown;
}

interface CatalogResponse {
    ok: boolean;
    version: string;
    generatedAt: string;
    items: CatalogItem[];
}

let _firstSyncSettled = false;
let _firstSyncPromise: Promise<void> | null = null;
let _resolveFirstSync: (() => void) | null = null;

function markFirstSyncSettled() {
    if (_firstSyncSettled) {
        return;
    }
    _firstSyncSettled = true;
    _resolveFirstSync?.();
}

/**
 * Resolves once the first run of `syncAllContent()` settles —
 * success OR failure. Use from screens that need data on first
 * paint and don't want to render an empty state if the sync is
 * mid-flight at mount.
 */
export function ensureContentReady(): Promise<void> {
    if (_firstSyncSettled) {
        return Promise.resolve();
    }
    if (!_firstSyncPromise) {
        _firstSyncPromise = new Promise(resolve => {
            _resolveFirstSync = resolve;
        });
    }
    return _firstSyncPromise;
}

async function getLocalVersion(): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string | null }>(
        'SELECT value FROM prefs WHERE key = ?',
        [VERSION_PREF_KEY]
    );
    return row?.value ?? null;
}

async function setLocalVersion(version: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO prefs (key, value) VALUES (?, ?) '
        + 'ON CONFLICT(key) DO UPDATE SET '
        + 'value = excluded.value, '
        + "updated_at = datetime('now', 'localtime')",
        [VERSION_PREF_KEY, version]
    );
}

async function applyCatalog(items: CatalogItem[]): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
        // Replace strategy: clear + re-insert. Simple and correct;
        // the catalog is small (kilobytes, not megabytes).
        await db.runAsync('DELETE FROM content_catalog');
        for (const item of items) {
            await db.runAsync(
                'INSERT INTO content_catalog '
                + '(id, type, data, source) '
                + 'VALUES (?, ?, ?, ?)',
                [item.id, item.type, JSON.stringify(item), 'server']
            );
        }
    });
}

export async function syncAllContent(): Promise<{
    changed: boolean;
    version: string;
}> {
    try {
        const versionRes = await fetchApi<VersionResponse>(
            '/api/content/version',
            { timeoutMs: 5000 }
        );
        if (!versionRes.ok) {
            throw new Error('Version probe failed');
        }

        const localVersion = await getLocalVersion();
        if (localVersion === versionRes.version) {
            markFirstSyncSettled();
            return { changed: false, version: versionRes.version };
        }

        const catalog = await fetchApi<CatalogResponse>(
            '/api/content/catalog',
            { timeoutMs: 30_000 }
        );
        if (!catalog.ok) {
            throw new Error('Catalog fetch failed');
        }

        await applyCatalog(catalog.items);
        await setLocalVersion(catalog.version);
        markFirstSyncSettled();
        return { changed: true, version: catalog.version };
    } catch (err) {
        // Don't block the UI on a failed sync — the local cache (if
        // any) is still valid. Mark the first-sync gate settled so
        // ensureContentReady() callers stop waiting.
        markFirstSyncSettled();
        console.warn(
            '[contentSync] sync failed:',
            (err as Error).message
        );
        throw err;
    }
}
