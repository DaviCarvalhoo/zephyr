/**
 * Example user-scoped data-access functions backed by the `prefs`
 * table. Mirror this shape for every domain table you add:
 *
 *   1. Read functions don't gate on _signed — let everyone see their
 *      cached data.
 *   2. Write functions call demandSigned() and silently no-op if false.
 *
 * The `prefs` table is intentionally generic — it's a key/value store
 * for "small bag of settings" data. For structured domain data, add a
 * proper table in migrations.ts and write typed accessors here.
 */

import { getDb, demandSigned } from './index';

export async function getPref(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string | null }>(
        'SELECT value FROM prefs WHERE key = ?',
        [key]
    );
    return row?.value ?? null;
}

export async function setPref(
    key: string,
    value: string | null
): Promise<void> {
    if (!demandSigned()) {
        return;
    }
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO prefs (key, value) VALUES (?, ?) '
        + 'ON CONFLICT(key) DO UPDATE SET '
        + 'value = excluded.value, '
        + "updated_at = datetime('now', 'localtime')",
        [key, value]
    );
}

export async function deletePref(key: string): Promise<void> {
    if (!demandSigned()) {
        return;
    }
    const db = await getDb();
    await db.runAsync('DELETE FROM prefs WHERE key = ?', [key]);
}

export interface ActivityEntry {
    id: number;
    kind: string;
    payload: string | null;
    created_at: string;
}

/**
 * Append an activity-log entry. Use freely — it's an example of a
 * write-heavy user-scoped table that gets backed up on logout.
 */
export async function logActivity(
    kind: string,
    payload: object | null = null
): Promise<void> {
    if (!demandSigned()) {
        return;
    }
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO activity_log (kind, payload) VALUES (?, ?)',
        [kind, payload ? JSON.stringify(payload) : null]
    );
}

export async function getRecentActivity(
    limit = 50
): Promise<ActivityEntry[]> {
    const db = await getDb();
    return db.getAllAsync<ActivityEntry>(
        'SELECT id, kind, payload, created_at FROM activity_log '
        + 'ORDER BY id DESC LIMIT ?',
        [limit]
    );
}
