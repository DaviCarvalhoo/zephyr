import { getDb, USER_TABLES } from '../db';

const BACKUP_VERSION = 1;

export interface BackupPayload {
    version: number;
    exportedAt: string;
    tables: Record<string, Record<string, unknown>[]>;
}

/**
 * Serialize every USER_TABLES row to a plain JSON object. Stable row
 * order (id ASC) so consecutive backups produce byte-identical output
 * when nothing's changed — handy for diffing.
 */
export async function exportUserTables(): Promise<BackupPayload> {
    const db = await getDb();
    const tables: BackupPayload['tables'] = {};

    for (const table of USER_TABLES) {
        try {
            tables[table] = await db.getAllAsync<Record<string, unknown>>(
                `SELECT * FROM ${table} ORDER BY id ASC`
            );
        } catch {
            // Table may not exist yet (e.g. fresh user, migration not
            // applied). Empty array is a safe default.
            tables[table] = [];
        }
    }

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables
    };
}

/**
 * Replace the contents of every USER_TABLES table with the rows from
 * `backup`. One transaction per import so a partial failure leaves
 * everything untouched.
 */
export async function importUserTables(
    backup: BackupPayload
): Promise<void> {
    if (!backup?.tables) {
        throw new Error('Invalid backup format');
    }

    const db = await getDb();
    await db.withTransactionAsync(async () => {
        for (const table of USER_TABLES) {
            const rows = backup.tables[table];
            if (!Array.isArray(rows)) {
                continue;
            }

            await db.runAsync(`DELETE FROM ${table}`);

            for (const row of rows) {
                const cols = Object.keys(row);
                if (cols.length === 0) {
                    continue;
                }
                const placeholders = cols.map(() => '?').join(', ');
                const values = cols.map(c => row[c]) as
                    SqliteParam[];
                await db.runAsync(
                    `INSERT INTO ${table} (${cols.join(', ')}) `
                    + `VALUES (${placeholders})`,
                    values
                );
            }
        }
    });
}

type SqliteParam = string | number | boolean | null | Uint8Array;
