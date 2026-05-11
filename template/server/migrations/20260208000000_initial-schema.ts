import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            utc_updated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            settings JSONB DEFAULT '{}',
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            utc_updated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE user_in_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, account_id)
        );

        CREATE TABLE password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN NOT NULL DEFAULT false,
            utc_created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_user_in_accounts_user ON user_in_accounts(user_id);
        CREATE INDEX idx_user_in_accounts_account ON user_in_accounts(account_id);
        CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.raw(`
        DROP TABLE IF EXISTS password_reset_tokens;
        DROP TABLE IF EXISTS user_in_accounts;
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS users;
    `);
}
