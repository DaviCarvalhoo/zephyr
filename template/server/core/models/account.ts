import BaseModel from './base.js';
import logger from '#core/logger.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '#core/errors.js';

interface PaginatedResult<T> {
    rows: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

class AccountModel extends BaseModel {
    async list(options: {
        page?: number;
        limit?: number;
        search?: string;
    } = {}): Promise<PaginatedResult<{
        id: string;
        name: string;
        status: string;
        utc_created_on: string;
    }>> {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;
        const search = options.search?.trim();

        const baseQuery = this.knex('accounts');
        if (search) {
            baseQuery.whereILike('name', `%${search}%`);
        }

        const [{ count }] = await baseQuery.clone().count('id as count');
        const total = parseInt(String(count), 10);

        const rows = await baseQuery.clone()
            .select('id', 'name', 'status', 'utc_created_on')
            .orderBy('utc_created_on', 'desc')
            .limit(limit)
            .offset(offset);

        return {
            rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async listPublic() {
        return this.knex('accounts')
            .select('id', 'name')
            .where({ status: 'active' })
            .limit(10);
    }

    async findById(id: string) {
        const account = await this.knex('accounts')
            .where({ id })
            .first();

        if (!account) {
            throw new NotFoundError('Conta não encontrada');
        }

        return {
            id: account.id,
            name: account.name,
            status: account.status,
            settings: typeof account.settings === 'string'
                ? JSON.parse(account.settings || '{}')
                : (account.settings || {})
        };
    }

    async update(id: string, data: { name?: string; settings?: Record<string, unknown> }) {
        await this.findById(id);

        const updateData: Record<string, unknown> = {};
        if (data.name) updateData.name = data.name;
        if (data.settings) updateData.settings = JSON.stringify(data.settings);

        if (Object.keys(updateData).length > 0) {
            await this.knex('accounts').where({ id }).update(updateData);
        }

        logger.info(`{account} updated account_id=${id}`);

        return this.findById(id);
    }

    async delete(id: string, userId: string, userRole: string) {
        if (userRole !== 'owner' && userRole !== 'admin') {
            throw new ForbiddenError('Apenas proprietários podem excluir contas');
        }

        await this.findById(id);

        // Delete related data first
        await this.knex('user_in_accounts').where({ account_id: id }).delete();
        await this.knex('accounts').where({ id }).delete();

        logger.info(`{account} deleted account_id=${id} by user_id=${userId}`);
    }

    async listMembers(accountId: string, options: {
        page?: number;
        limit?: number;
        search?: string;
    } = {}): Promise<PaginatedResult<{
        id: string;
        name: string;
        email: string;
        role: string;
        utc_created_on: string;
    }>> {
        await this.findById(accountId);

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const offset = (page - 1) * limit;
        const search = options.search?.trim();

        const baseQuery = this.knex('user_in_accounts as ua')
            .join('users as u', 'u.id', 'ua.user_id')
            .where('ua.account_id', accountId);

        if (search) {
            baseQuery.where(function () {
                this.whereILike('u.name', `%${search}%`)
                    .orWhereILike('u.email', `%${search}%`);
            });
        }

        const [{ count }] = await baseQuery.clone().count('ua.user_id as count');
        const total = parseInt(String(count), 10);

        const rows = await baseQuery.clone()
            .select(
                'u.id',
                'u.name',
                'u.email',
                'ua.role',
                'ua.utc_created_on'
            )
            .orderBy('ua.utc_created_on', 'asc')
            .limit(limit)
            .offset(offset);

        return {
            rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async addMember(
        accountId: string,
        data: { email: string; role: string; name?: string; password?: string }
    ) {
        await this.findById(accountId);

        const email = data.email.toLowerCase().trim();
        let user = await this.knex('users').where({ email }).first();

        if (!user) {
            if (!data.password || data.password.length < 6) {
                throw new ValidationError(
                    'Senha é obrigatória (mínimo 6 caracteres) para novos usuários'
                );
            }
            if (!data.name) {
                throw new ValidationError('Nome é obrigatório para novos usuários');
            }

            user = await this.context.user.create({
                email,
                password: data.password,
                name: data.name,
                role: 'user',
                skipAccountCreation: true
            });
        }

        const existing = await this.knex('user_in_accounts')
            .where({ user_id: user.id, account_id: accountId })
            .first();

        if (existing) {
            throw new ConflictError('Este usuário já faz parte desta conta');
        }

        await this.knex('user_in_accounts').insert({
            user_id: user.id,
            account_id: accountId,
            role: data.role || 'user'
        });

        logger.info(`{account} added member user_id=${user.id} to account_id=${accountId} role=${data.role}`);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: data.role || 'user'
        };
    }

    async updateMemberRole(accountId: string, userId: string, role: string) {
        const member = await this.knex('user_in_accounts')
            .where({ user_id: userId, account_id: accountId })
            .first();

        if (!member) {
            throw new NotFoundError('Membro não encontrado nesta conta');
        }

        await this.knex('user_in_accounts')
            .where({ user_id: userId, account_id: accountId })
            .update({ role });

        logger.info(`{account} updated member role user_id=${userId} account_id=${accountId} role=${role}`);
    }

    async removeMember(accountId: string, userId: string) {
        const member = await this.knex('user_in_accounts')
            .where({ user_id: userId, account_id: accountId })
            .first();

        if (!member) {
            throw new NotFoundError('Membro não encontrado nesta conta');
        }

        if (member.role === 'owner') {
            throw new ForbiddenError('Não é possível remover o proprietário da conta');
        }

        await this.knex('user_in_accounts')
            .where({ user_id: userId, account_id: accountId })
            .delete();

        logger.info(`{account} removed member user_id=${userId} from account_id=${accountId}`);
    }

    async getAccountDashboard(accountId: string) {
        const [membersCount] = await this.knex('user_in_accounts')
            .where({ account_id: accountId })
            .count('user_id as count');

        const membersByDay = await this.knex.raw(`
            SELECT
                d::date as date,
                COUNT(ua.user_id)::int as count
            FROM generate_series(
                CURRENT_DATE - INTERVAL '13 days',
                CURRENT_DATE,
                '1 day'
            ) d
            LEFT JOIN user_in_accounts ua
                ON ua.utc_created_on::date = d::date
                AND ua.account_id = ?
            GROUP BY d::date
            ORDER BY d::date ASC
        `, [accountId]);

        return {
            stats: {
                members: parseInt(String(membersCount.count), 10)
            },
            membersByDay: membersByDay.rows
        };
    }

    async getDashboardStats() {
        const [usersCount] = await this.knex('users').count('id as count');
        const [accountsCount] = await this.knex('accounts').count('id as count');

        const recentUsers = await this.knex('users')
            .select('id', 'name', 'email', 'role', 'utc_created_on')
            .orderBy('utc_created_on', 'desc')
            .limit(5);

        const recentAccounts = await this.knex('accounts')
            .select('id', 'name', 'status', 'utc_created_on')
            .orderBy('utc_created_on', 'desc')
            .limit(5);

        // Users created per day (last 14 days)
        const usersByDay = await this.knex.raw(`
            SELECT
                d::date as date,
                COUNT(u.id)::int as count
            FROM generate_series(
                CURRENT_DATE - INTERVAL '13 days',
                CURRENT_DATE,
                '1 day'
            ) d
            LEFT JOIN users u ON u.utc_created_on::date = d::date
            GROUP BY d::date
            ORDER BY d::date ASC
        `);

        return {
            stats: {
                users: parseInt(String(usersCount.count), 10),
                accounts: parseInt(String(accountsCount.count), 10)
            },
            recentUsers,
            recentAccounts,
            usersByDay: usersByDay.rows
        };
    }
}

export default AccountModel;
