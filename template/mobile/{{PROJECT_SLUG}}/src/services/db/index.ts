/**
 * Offline-first SQLite. Single source of truth for user data; synced
 * to the server only as a backup (see ../backup).
 *
 * Lifecycle:
 *   1. App boot calls `initDb()` once. Idempotent — concurrent calls
 *      share the same Promise (matters during fast-refresh).
 *   2. AuthContext flips the gate via `setDbSigned(true)` on login,
 *      `setDbSigned(false)` on logout. User-scoped writes are
 *      rejected when the gate is closed; reads always work.
 *   3. On logout, `clearUserData()` drops every USER_TABLES entry and
 *      resets the migration state so initDb re-creates them.
 *
 * Mental model: SQLite is the database; the server is just a backup
 * destination. UI screens never wait on the network for user data.
 */

import * as SQLite from 'expo-sqlite';
import {
    MIGRATIONS,
    USER_TABLES,
    SHARED_TABLES,
    Migration
} from './migrations';

const DB_FILENAME = '{{PROJECT_SLUG}}.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;
let _signed = false;

/**
 * Toggle write-permissions for user-scoped data.
 *
 * - true  on successful login (token+user persisted)
 * - false at the very start of logout (BEFORE clearUserData) so any
 *   in-flight render that fires off a write between here and the
 *   table drop is rejected.
 */
export function setDbSigned(value: boolean): void {
    _signed = value;
}

export function isDbSigned(): boolean {
    return _signed;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (_db) {
        return _db;
    }
    _db = await SQLite.openDatabaseAsync(DB_FILENAME);
    await _db.execAsync('PRAGMA journal_mode = WAL;');
    return _db;
}

async function runMigrations(
    db: SQLite.SQLiteDatabase
): Promise<void> {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version     INTEGER PRIMARY KEY,
            description TEXT,
            ran_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
    `);

    const applied = await db.getAllAsync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedSet = new Set(applied.map(r => r.version));

    for (const migration of MIGRATIONS) {
        if (appliedSet.has(migration.version)) {
            continue;
        }
        await db.execAsync(migration.up);
        await db.runAsync(
            'INSERT OR IGNORE INTO schema_migrations '
            + '(version, description) VALUES (?, ?)',
            [migration.version, migration.description]
        );
    }
}

export function initDb(): Promise<void> {
    if (!_initPromise) {
        _initPromise = (async () => {
            const db = await getDb();
            await runMigrations(db);
        })();
    }
    return _initPromise;
}

/**
 * Drop USER_TABLES + schema_migrations so the next initDb() recreates
 * them empty. SHARED_TABLES are kept on disk — they're re-syncable so
 * the next user skips re-downloading the content catalog.
 *
 * Call AFTER setDbSigned(false). If you call it before, in-flight
 * writes from the just-logged-out user can re-create rows in tables
 * we're about to drop, leaving stale data for the next account.
 */
export async function clearUserData(): Promise<void> {
    try {
        const db = await getDb();
        const drops = [...USER_TABLES, 'schema_migrations']
            .map(t => `DROP TABLE IF EXISTS ${t};`)
            .join('\n');
        await db.execAsync(drops);
    } catch (err) {
        console.warn('[db] clearUserData error:', err);
    } finally {
        _db = null;
        _initPromise = null;
    }
}

/**
 * Wipe absolutely everything. Use sparingly — kills cached shared
 * content too, so the next sync has to refetch the whole catalog.
 */
export async function clearAllData(): Promise<void> {
    try {
        const db = await getDb();
        const all = [...USER_TABLES, ...SHARED_TABLES];
        const drops = all
            .map(t => `DROP TABLE IF EXISTS ${t};`)
            .join('\n');
        await db.execAsync(drops);
    } catch (err) {
        console.warn('[db] clearAllData error:', err);
    } finally {
        _db = null;
        _initPromise = null;
    }
}

/**
 * Guard for user-scoped writes. Call at the top of every write
 * function:
 *
 *   export async function savePref(...) {
 *       if (!demandSigned()) { return; }
 *       ...
 *   }
 *
 * Returns false if writes are gated off. Doesn't throw — the call site
 * usually wants to no-op silently rather than crash.
 */
export function demandSigned(): boolean {
    return _signed;
}

export { MIGRATIONS, USER_TABLES, SHARED_TABLES };
export type { Migration };
