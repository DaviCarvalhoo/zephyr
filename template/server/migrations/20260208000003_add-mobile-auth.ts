import type { Knex } from 'knex';

/**
 * Mobile auth additions.
 *
 * - refresh_tokens: long-lived tokens that allow mobile clients to rotate
 *   their short-lived JWTs without re-prompting for credentials. Rotated
 *   on every successful refresh; the old RT is deleted in the same
 *   transaction so a stolen RT becomes useless once the legit client
 *   uses theirs.
 * - users.provider / provider_user_id: track which OAuth provider
 *   created the account (null for password signups). The unique
 *   constraint guarantees one row per (provider, sub) pair.
 * - users.password_hash made nullable so OAuth-only users don't carry
 *   a fake password.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        CREATE TABLE refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            user_agent VARCHAR(512),
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            utc_last_used_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
        CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

        ALTER TABLE users
            ALTER COLUMN password_hash DROP NOT NULL,
            ADD COLUMN provider VARCHAR(32),
            ADD COLUMN provider_user_id VARCHAR(255),
            ADD COLUMN avatar_url VARCHAR(1024),
            ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN premium_until TIMESTAMP WITH TIME ZONE,
            ADD COLUMN premium_provider VARCHAR(32),
            ADD COLUMN premium_external_id VARCHAR(255);

        CREATE UNIQUE INDEX idx_users_provider_sub
            ON users(provider, provider_user_id)
            WHERE provider IS NOT NULL;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        DROP INDEX IF EXISTS idx_users_provider_sub;
        ALTER TABLE users
            DROP COLUMN IF EXISTS premium_external_id,
            DROP COLUMN IF EXISTS premium_provider,
            DROP COLUMN IF EXISTS premium_until,
            DROP COLUMN IF EXISTS is_premium,
            DROP COLUMN IF EXISTS avatar_url,
            DROP COLUMN IF EXISTS provider_user_id,
            DROP COLUMN IF EXISTS provider,
            ALTER COLUMN password_hash SET NOT NULL;

        DROP INDEX IF EXISTS idx_refresh_tokens_user;
        DROP INDEX IF EXISTS idx_refresh_tokens_token;
        DROP TABLE IF EXISTS refresh_tokens;
    `);
}
