import { fetchApi } from './fetch-api';

export interface ApiUser {
    id: string;
    email: string;
    name?: string;
    display_name?: string;
    avatar_id?: string;
    is_premium?: boolean;
    [extra: string]: unknown;
}

interface AuthResponse {
    ok: boolean;
    user?: ApiUser;
    token?: string;
    refreshToken?: string;
    message?: string;
}

interface OkResponse {
    ok: boolean;
    user?: ApiUser;
    message?: string;
}

export const api = {
    login(email: string, password: string) {
        return fetchApi<AuthResponse>('/api/login', {
            method: 'POST',
            body: { email, password }
        });
    },
    signup(email: string, password: string, name: string) {
        return fetchApi<AuthResponse>('/api/signup', {
            method: 'POST',
            body: { email, password, name }
        });
    },
    forgotPassword(email: string) {
        return fetchApi<OkResponse>('/api/forgot-password', {
            method: 'POST',
            body: { email }
        });
    },
    me(token: string) {
        return fetchApi<OkResponse>('/api/auth', { token });
    },
    refresh(refreshToken: string) {
        return fetchApi<AuthResponse>('/api/auth/refresh', {
            method: 'POST',
            body: { refreshToken }
        });
    },
    logout(token: string, refreshToken: string | null) {
        return fetchApi<OkResponse>('/api/logout', {
            method: 'POST',
            token,
            body: { refreshToken }
        });
    },
    appleMobile(payload: {
        id_token: string;
        firstName?: string | null;
        lastName?: string | null;
    }) {
        return fetchApi<AuthResponse>('/api/auth/apple/mobile', {
            method: 'POST',
            body: payload
        });
    }
};
