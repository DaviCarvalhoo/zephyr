import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import BaseModel from './base.js';
import { sendEmail, isEmailConfigured } from '#core/email.js';
import logger from '#core/logger.js';
import {
    ValidationError,
    UnauthorizedError,
    NotFoundError
} from '#core/errors.js';

const REFRESH_TOKEN_TTL_DAYS = 60;
const ACCESS_TOKEN_TTL = '7d';

interface OAuthProfile {
    provider: 'google' | 'apple';
    providerUserId: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    utc_created_on: string;
}

export interface LoginResult {
    user: User;
    token: string;
}

export interface SignupResult {
    user: User;
    account: { id: string; name: string; status: string };
    token: string;
    existingUser?: false;
}

export interface SignupExistingUserResult {
    existingUser: true;
    account: { id: string; name: string; status: string };
}

class AuthModel extends BaseModel {
    generateToken(userId: string): string {
        return jwt.sign(
            { user_id: userId },
            process.env.JWT_TOKEN_SECRET as string,
            { expiresIn: ACCESS_TOKEN_TTL }
        );
    }

    /**
     * Mint a fresh refresh token, persist it, and return the raw value.
     * Caller delivers it to the client; server only ever stores the raw
     * token (rotated on every refresh).
     */
    async issueRefreshToken(
        userId: string,
        userAgent?: string
    ): Promise<string> {
        const token = crypto.randomBytes(48).toString('hex');
        const expiresAt = new Date(
            Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
        );
        await this.knex('refresh_tokens').insert({
            user_id: userId,
            token,
            expires_at: expiresAt,
            user_agent: userAgent ?? null
        });
        return token;
    }

    /**
     * Single-flight refresh: validate, rotate, return new pair. Throws
     * UnauthorizedError if the RT is unknown, expired, or already
     * rotated. Mobile clients must call this through a single-flight
     * guard on their side too — otherwise a race can interpret the
     * rotation as a logout.
     */
    async rotateRefreshToken(refreshToken: string): Promise<{
        user: User;
        token: string;
        refreshToken: string;
    }> {
        const row = await this.knex('refresh_tokens')
            .where({ token: refreshToken })
            .first();

        if (!row) {
            throw new UnauthorizedError('Refresh token inválido');
        }
        if (new Date(row.expires_at) < new Date()) {
            await this.knex('refresh_tokens')
                .where({ id: row.id })
                .del();
            throw new UnauthorizedError('Refresh token expirado');
        }

        const user = await this.knex('users')
            .select('id', 'email', 'name', 'role', 'utc_created_on')
            .where({ id: row.user_id })
            .first();
        if (!user) {
            throw new UnauthorizedError('Usuário não encontrado');
        }

        await this.knex('refresh_tokens')
            .where({ id: row.id })
            .del();

        const newToken = this.generateToken(user.id);
        const newRefresh = await this.issueRefreshToken(
            user.id,
            row.user_agent
        );

        return { user, token: newToken, refreshToken: newRefresh };
    }

    async revokeRefreshToken(refreshToken: string): Promise<void> {
        await this.knex('refresh_tokens')
            .where({ token: refreshToken })
            .del();
    }

    /**
     * Find an existing user by (provider, sub) or by email; create one
     * (with an account) if none exists. OAuth-only users have no
     * password_hash. Used by both Apple and Google flows.
     */
    async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
        const email = profile.email.toLowerCase().trim();

        const byProvider = await this.knex('users')
            .where({
                provider: profile.provider,
                provider_user_id: profile.providerUserId
            })
            .first();
        if (byProvider) {
            return this.toUser(byProvider);
        }

        const byEmail = await this.knex('users')
            .where({ email })
            .first();
        if (byEmail) {
            await this.knex('users')
                .where({ id: byEmail.id })
                .update({
                    provider: profile.provider,
                    provider_user_id: profile.providerUserId,
                    avatar_url: profile.avatarUrl ?? byEmail.avatar_url
                });
            return this.toUser({
                ...byEmail,
                provider: profile.provider,
                provider_user_id: profile.providerUserId
            });
        }

        const newUser = await this.context.user.create({
            email,
            password: null,
            name: profile.name || email,
            role: 'user',
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            avatarUrl: profile.avatarUrl ?? null
        });

        logger.info(
            `{auth} oauth signup provider=${profile.provider} `
            + `email=${email}`
        );

        return newUser;
    }

    private toUser(row: Record<string, unknown>): User {
        return {
            id: row.id as string,
            email: row.email as string,
            name: row.name as string,
            role: row.role as string,
            utc_created_on: row.utc_created_on as string
        };
    }

    verifyToken(token: string): { user_id: string } {
        return jwt.verify(
            token,
            process.env.JWT_TOKEN_SECRET as string
        ) as { user_id: string };
    }

    async login(email: string, password: string): Promise<LoginResult> {
        if (!email || !password) {
            throw new ValidationError('Email e senha são obrigatórios');
        }

        const user = await this.knex('users')
            .where({ email: email.toLowerCase().trim() })
            .first();

        if (!user) {
            throw new UnauthorizedError('Email ou senha incorretos');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError('Email ou senha incorretos');
        }

        const token = this.generateToken(user.id);

        logger.info(`{auth} login for ${user.email}`);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                utc_created_on: user.utc_created_on
            },
            token
        };
    }

    async signup(data: {
        email: string;
        password: string;
        name: string;
        accountName?: string;
    }): Promise<SignupResult | SignupExistingUserResult> {
        if (!data.email || !data.password) {
            throw new ValidationError('Email e senha são obrigatórios');
        }
        if (!data.name) {
            throw new ValidationError('Nome é obrigatório');
        }
        if (data.password.length < 6) {
            throw new ValidationError(
                'A senha deve ter pelo menos 6 caracteres'
            );
        }

        const email = data.email.toLowerCase().trim();
        const existingUser = await this.knex('users').where({ email }).first();

        if (existingUser) {
            const [account] = await this.knex('accounts')
                .insert({
                    name: data.accountName || data.name,
                    status: 'active',
                    settings: JSON.stringify({})
                })
                .returning('*');

            await this.knex('user_in_accounts').insert({
                user_id: existingUser.id,
                account_id: account.id,
                role: 'owner'
            });

            logger.info(`{auth} signup existing user=${email}, new account=${account.name}`);

            return {
                existingUser: true,
                account: {
                    id: account.id,
                    name: account.name,
                    status: account.status
                }
            };
        }

        const user = await this.context.user.create({
            email: data.email,
            password: data.password,
            name: data.name,
            role: 'user',
            accountName: data.accountName
        });

        const account = await this.knex('user_in_accounts as ua')
            .join('accounts as a', 'a.id', 'ua.account_id')
            .where('ua.user_id', user.id)
            .select('a.id', 'a.name', 'a.status')
            .first();

        const token = this.generateToken(user.id);

        logger.info(`{auth} signup for ${user.email}, account=${account.name}`);

        if (isEmailConfigured()) {
            try {
                await sendEmail(user.email, 'Bem-vindo!', 'accountWelcome', {
                    user: { name: user.name || user.email }
                });
            } catch (emailError) {
                logger.error('Failed to send welcome email', {
                    error: emailError instanceof Error
                        ? emailError.message
                        : String(emailError)
                });
            }
        }

        return {
            user,
            account: {
                id: account.id,
                name: account.name,
                status: account.status
            },
            token
        };
    }

    async forgotPassword(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError('Email é obrigatório');
        }

        const user = await this.knex('users')
            .select('id', 'email', 'name')
            .where({ email: email.toLowerCase().trim() })
            .first();

        if (!user) {
            logger.info(`{auth} forgot-password for unknown email: ${email}`);
            return;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await this.knex('password_reset_tokens')
            .where({ user_id: user.id, used: false })
            .update({ used: true });

        await this.knex('password_reset_tokens').insert({
            user_id: user.id,
            token,
            expires_at: expiresAt
        });

        const baseUiUrl = process.env.BASE_UI_URL || 'http://localhost:{{ADMIN_UI_PORT}}';
        const recoverPasswordUrl = `${baseUiUrl}/recover/${token}`;

        if (!isEmailConfigured()) {
            logger.warn(
                '{auth} email not configured, skipping forgot-password email',
                { recoverPasswordUrl }
            );
            return;
        }

        logger.info(`{auth} sending forgot-password email to ${user.email}`);

        await sendEmail(user.email, 'Recupere sua senha', 'forgetPassword', {
            user: { name: user.name || user.email },
            recoverPasswordUrl
        });
    }

    async validateResetToken(token: string): Promise<boolean> {
        const resetToken = await this.knex('password_reset_tokens')
            .where({ token, used: false })
            .where('expires_at', '>', new Date())
            .first();

        return !!resetToken;
    }

    async resetPassword(token: string, password: string): Promise<void> {
        if (!token || !password || password.length < 6) {
            throw new ValidationError(
                'Token e senha válida são obrigatórios'
            );
        }

        const resetToken = await this.knex('password_reset_tokens')
            .where({ token, used: false })
            .where('expires_at', '>', new Date())
            .first();

        if (!resetToken) {
            throw new NotFoundError('Token inválido ou expirado');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await this.knex('users')
            .where({ id: resetToken.user_id })
            .update({ password_hash: passwordHash });

        await this.knex('password_reset_tokens')
            .where({ id: resetToken.id })
            .update({ used: true });

        logger.info(`{auth} password reset for user_id=${resetToken.user_id}`);
    }

    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        if (!currentPassword || !newPassword) {
            throw new ValidationError(
                'Senha atual e nova senha são obrigatórias'
            );
        }
        if (newPassword.length < 6) {
            throw new ValidationError(
                'A nova senha deve ter pelo menos 6 caracteres'
            );
        }

        const user = await this.knex('users')
            .select('id', 'password_hash')
            .where({ id: userId })
            .first();

        if (!user?.password_hash) {
            throw new NotFoundError('Usuário não encontrado');
        }

        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new ValidationError('Senha atual incorreta');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.knex('users')
            .where({ id: userId })
            .update({ password_hash: newHash });

        logger.info(`{auth} password changed for user_id=${userId}`);
    }

    async getUserByToken(token: string): Promise<User | null> {
        try {
            const decoded = this.verifyToken(token);
            const user = await this.knex('users')
                .select('id', 'email', 'name', 'role', 'utc_created_on')
                .where({ id: decoded.user_id })
                .first();

            return user || null;
        } catch {
            return null;
        }
    }
}

export default AuthModel;
