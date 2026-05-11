import bcrypt from 'bcrypt';
import BaseModel from './base.js';
import logger from '#core/logger.js';
import {
    ValidationError,
    NotFoundError,
    ConflictError
} from '#core/errors.js';

export interface CreateUserData {
    email: string;
    // Null for OAuth-only users (Apple / Google) — they have no
    // password to bcrypt-hash and authenticate via provider tokens.
    password: string | null;
    name: string;
    role?: string;
    accountName?: string;
    skipAccountCreation?: boolean;
    provider?: 'google' | 'apple';
    providerUserId?: string;
    avatarUrl?: string | null;
}

export interface UserAccount {
    account: {
        id: string;
        name: string;
        status: string;
    };
    role: string;
}

export interface UserWithAccounts {
    id: string;
    name: string;
    email: string;
    role: string;
    utc_created_on: string;
    accounts: { id: string; name: string; role: string }[];
}

export interface PaginatedResult<T> {
    rows: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

class UserModel extends BaseModel {
    async create(data: CreateUserData) {
        const email = data.email.toLowerCase().trim();

        const existing = await this.knex('users')
            .where({ email })
            .first();

        if (existing) {
            throw new ConflictError('Este email já está em uso');
        }

        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 10)
            : null;

        const [user] = await this.knex('users')
            .insert({
                email,
                password_hash: passwordHash,
                name: data.name,
                role: data.role || 'user',
                provider: data.provider ?? null,
                provider_user_id: data.providerUserId ?? null,
                avatar_url: data.avatarUrl ?? null
            })
            .returning(['id', 'email', 'name', 'role', 'utc_created_on']);

        if (!data.skipAccountCreation) {
            const [account] = await this.knex('accounts')
                .insert({
                    name: data.accountName || data.name,
                    status: 'active',
                    settings: JSON.stringify({})
                })
                .returning(['id', 'name', 'status']);

            await this.knex('user_in_accounts').insert({
                user_id: user.id,
                account_id: account.id,
                role: 'owner'
            });

            logger.info(`{user} created user=${user.email} role=${user.role} account_id=${account.id}`);
        } else {
            logger.info(`{user} created user=${user.email} role=${user.role}`);
        }

        return user;
    }

    async findById(id: string) {
        const user = await this.knex('users')
            .select(
                'id',
                'name',
                'email',
                'role',
                'avatar_key',
                'is_premium',
                'premium_until',
                'premium_provider',
                'utc_created_on'
            )
            .where({ id })
            .first();

        if (!user) {
            throw new NotFoundError('Usuário não encontrado');
        }

        return user;
    }

    /**
     * Set the premium state for a user. Called from the IAP route
     * after server-side receipt validation succeeds (or from
     * /api/iap/simulate during dev). Returns the updated row.
     */
    async setPremium(
        userId: string,
        args: {
            active: boolean;
            until: Date | null;
            provider: 'apple' | 'google' | null;
            externalId: string | null;
        }
    ) {
        await this.findById(userId);
        await this.knex('users')
            .where({ id: userId })
            .update({
                is_premium: args.active,
                premium_until: args.until,
                premium_provider: args.provider,
                premium_external_id: args.externalId
            });
        logger.info(
            `{user} premium-${args.active ? 'on' : 'off'} `
            + `user_id=${userId} provider=${args.provider ?? 'none'}`
        );
        return this.findById(userId);
    }

    /**
     * Read just the premium fields. Used by /api/iap/status which
     * is hit on every foreground transition by the mobile app.
     */
    async getPremiumStatus(userId: string): Promise<{
        is_premium: boolean;
        premium_until: string | null;
    }> {
        const row = await this.knex('users')
            .select('is_premium', 'premium_until')
            .where({ id: userId })
            .first();
        return {
            is_premium: !!row?.is_premium,
            premium_until: row?.premium_until ?? null
        };
    }

    async updateAvatar(userId: string, avatarKey: string | null) {
        await this.findById(userId);
        await this.knex('users').where({ id: userId }).update({ avatar_key: avatarKey });
        logger.info(`{user} avatar-updated user_id=${userId}`);
        return this.findById(userId);
    }

    async list(options: {
        page?: number;
        limit?: number;
        search?: string;
    } = {}): Promise<PaginatedResult<UserWithAccounts>> {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;
        const search = options.search?.trim();

        const baseQuery = this.knex('users');
        if (search) {
            baseQuery.where(function () {
                this.whereILike('name', `%${search}%`)
                    .orWhereILike('email', `%${search}%`);
            });
        }

        const [{ count }] = await baseQuery.clone().count('id as count');
        const total = parseInt(String(count), 10);

        const users = await baseQuery.clone()
            .select('id', 'name', 'email', 'role', 'utc_created_on')
            .orderBy('utc_created_on', 'desc')
            .limit(limit)
            .offset(offset);

        const userIds = users.map((u: any) => u.id);

        const accountLinks = userIds.length > 0
            ? await this.knex('user_in_accounts as ua')
                .join('accounts as a', 'a.id', 'ua.account_id')
                .whereIn('ua.user_id', userIds)
                .select(
                    'ua.user_id',
                    'ua.role as account_role',
                    'a.id as account_id',
                    'a.name as account_name'
                )
            : [];

        const accountsByUser: Record<string, any[]> = {};
        for (const link of accountLinks) {
            if (!accountsByUser[link.user_id]) {
                accountsByUser[link.user_id] = [];
            }
            accountsByUser[link.user_id].push({
                id: link.account_id,
                name: link.account_name,
                role: link.account_role
            });
        }

        const rows = users.map((u: any) => ({
            ...u,
            accounts: accountsByUser[u.id] || []
        }));

        return {
            rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async adminUpdate(
        id: string,
        data: { name?: string; email?: string; role?: string; password?: string }
    ) {
        await this.findById(id);

        const updateData: Record<string, string> = {};
        if (data.name) updateData.name = data.name;
        if (data.role) updateData.role = data.role;

        if (data.email) {
            const email = data.email.toLowerCase().trim();
            const existing = await this.knex('users')
                .where({ email })
                .whereNot({ id })
                .first();

            if (existing) {
                throw new ConflictError('Este email já está em uso');
            }
            updateData.email = email;
        }

        if (data.password) {
            if (data.password.length < 6) {
                throw new ValidationError(
                    'A senha deve ter pelo menos 6 caracteres'
                );
            }
            updateData.password_hash = await bcrypt.hash(data.password, 10);
        }

        if (Object.keys(updateData).length > 0) {
            await this.knex('users').where({ id }).update(updateData);
        }

        logger.info(`{user} admin-updated user_id=${id}`);

        return this.findById(id);
    }

    async delete(id: string, currentUserId: string): Promise<void> {
        if (id === currentUserId) {
            throw new ValidationError(
                'Você não pode excluir seu próprio usuário'
            );
        }

        await this.findById(id);

        await this.knex('user_in_accounts').where({ user_id: id }).del();
        await this.knex('password_reset_tokens').where({ user_id: id }).del();
        await this.knex('users').where({ id }).del();

        logger.info(`{user} deleted user_id=${id}`);
    }

    async updateProfile(
        userId: string,
        data: { name?: string; email?: string }
    ) {
        if (!data.name && !data.email) {
            throw new ValidationError(
                'Informe nome ou email para atualizar'
            );
        }

        const updateData: Record<string, string> = {};
        if (data.name) updateData.name = data.name;

        if (data.email) {
            const email = data.email.toLowerCase().trim();
            const existing = await this.knex('users')
                .where({ email })
                .whereNot({ id: userId })
                .first();

            if (existing) {
                throw new ConflictError('Este email já está em uso');
            }
            updateData.email = email;
        }

        if (Object.keys(updateData).length === 0) return this.findById(userId);

        await this.knex('users').where({ id: userId }).update(updateData);

        logger.info(`{user} profile-updated user_id=${userId}`);

        return this.findById(userId);
    }

    async getAccounts(userId: string): Promise<UserAccount[]> {
        const user = await this.knex('users')
            .select('role')
            .where({ id: userId })
            .first();

        if (user?.role === 'admin') {
            const accounts = await this.knex('accounts')
                .select('id', 'name', 'status')
                .orderBy('name');

            return accounts.map((account: any) => ({
                account,
                role: 'admin'
            }));
        }

        const rows = await this.knex('user_in_accounts as ua')
            .join('accounts as a', 'a.id', 'ua.account_id')
            .where('ua.user_id', userId)
            .select('a.id', 'a.name', 'a.status', 'ua.role');

        return rows.map((row: any) => ({
            account: {
                id: row.id,
                name: row.name,
                status: row.status
            },
            role: row.role
        }));
    }

    async getAccount(
        userId: string,
        accountId: string,
        userRole: string
    ): Promise<UserAccount | null> {
        if (userRole === 'admin') {
            const account = await this.knex('accounts')
                .where({ id: accountId })
                .first();

            if (!account) return null;

            return {
                account: {
                    id: account.id,
                    name: account.name,
                    status: account.status
                },
                role: 'admin'
            };
        }

        const row = await this.knex('user_in_accounts as ua')
            .join('accounts as a', 'a.id', 'ua.account_id')
            .where({ 'ua.user_id': userId, 'ua.account_id': accountId })
            .select('a.id', 'a.name', 'a.status', 'ua.role')
            .first();

        if (!row) return null;

        return {
            account: {
                id: row.id,
                name: row.name,
                status: row.status
            },
            role: row.role
        };
    }
}

export default UserModel;
