import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        ALTER TABLE users ADD COLUMN avatar_key VARCHAR(500);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        ALTER TABLE users DROP COLUMN IF EXISTS avatar_key;
    `);
}
