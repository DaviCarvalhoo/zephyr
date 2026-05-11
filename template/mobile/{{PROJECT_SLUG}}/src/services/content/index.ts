/**
 * Read-side accessors over the local content_catalog table. UI screens
 * import from here — never from sync.ts directly. This keeps the
 * sync/cache concerns invisible to view code: as far as the UI is
 * concerned, content is local data.
 */

import { getDb } from '../db';

export interface CatalogItem {
    id: string;
    type: string;
    [key: string]: unknown;
}

interface CatalogRow {
    id: string;
    type: string;
    data: string;
}

function parseRow(row: CatalogRow): CatalogItem {
    try {
        return { ...JSON.parse(row.data), id: row.id, type: row.type };
    } catch {
        // Corrupt JSON in the cache row. Surface enough metadata for
        // the UI to render *something* rather than crashing the screen.
        return { id: row.id, type: row.type };
    }
}

export async function getContentItem(
    type: string,
    id: string
): Promise<CatalogItem | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<CatalogRow>(
        'SELECT id, type, data FROM content_catalog '
        + 'WHERE id = ? AND type = ?',
        [id, type]
    );
    return row ? parseRow(row) : null;
}

export async function getContentByType(
    type: string
): Promise<CatalogItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CatalogRow>(
        'SELECT id, type, data FROM content_catalog WHERE type = ?',
        [type]
    );
    return rows.map(parseRow);
}

export async function getContentTypes(): Promise<string[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ type: string }>(
        'SELECT DISTINCT type FROM content_catalog ORDER BY type ASC'
    );
    return rows.map(r => r.type);
}

export { syncAllContent, ensureContentReady } from './sync';
export { getAssetUrl, clearAssetCache } from './assetCache';
