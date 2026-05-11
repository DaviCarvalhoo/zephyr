/**
 * SQLite migrations.
 *
 * Each entry runs exactly once per device, in order. Never edit a
 * migration after it ships — add a new one. The `schema_migrations`
 * table tracks which versions have run.
 *
 * Two table classes:
 *   USER       data tied to a specific account. Cleared on logout
 *              (clearUserData) so the next account starts fresh.
 *              Backed up to the cloud for premium users (Phase 2).
 *   SHARED     content/cache that's the same regardless of who's
 *              signed in (e.g. content_catalog populated by
 *              contentSync). Persists across logout — saves a re-sync
 *              on the next login.
 *
 * Mark each table by adding it to USER_TABLES or SHARED_TABLES below.
 */

export interface Migration {
    version: number;
    description: string;
    up: string;
}

export const MIGRATIONS: Migration[] = [
    {
        version: 1,
        description: 'Initial schema — example user-scoped tables',
        up: `
            CREATE TABLE IF NOT EXISTS prefs (
                key         TEXT NOT NULL PRIMARY KEY,
                value       TEXT,
                updated_at  TEXT NOT NULL
                    DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                kind        TEXT NOT NULL,
                payload     TEXT,
                created_at  TEXT NOT NULL
                    DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_activity_log_kind
                ON activity_log(kind, created_at);
        `
    },
    {
        version: 2,
        description: 'Shared content catalog (populated by contentSync)',
        up: `
            CREATE TABLE IF NOT EXISTS content_catalog (
                id          TEXT NOT NULL,
                type        TEXT NOT NULL,
                data        TEXT NOT NULL,
                version     INTEGER NOT NULL DEFAULT 1,
                source      TEXT NOT NULL DEFAULT 'local',
                synced_at   TEXT NOT NULL
                    DEFAULT (datetime('now', 'localtime')),
                PRIMARY KEY (id, type)
            );

            CREATE INDEX IF NOT EXISTS idx_content_catalog_type
                ON content_catalog(type);
        `
    }
];

// User-scoped: cleared on logout, backed up to cloud.
// Edit this list whenever you add a user-scoped table in a migration.
export const USER_TABLES = [
    'prefs',
    'activity_log'
] as const;

// Shared / re-syncable: content_catalog can be wiped + re-pulled from
// the server. schema_migrations tracks migration state and is rebuilt
// on initDb if cleared.
export const SHARED_TABLES = [
    'content_catalog',
    'schema_migrations'
] as const;
