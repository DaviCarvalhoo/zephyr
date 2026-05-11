import {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiUser } from '../services/api';
import {
    initDb,
    setDbSigned,
    clearUserData
} from '../services/db';
import { restoreFromCloud, backupToCloud } from '../services/backup';
import { fetchPremiumStatus } from '../services/iap';

// AsyncStorage key namespace — all auth-scoped keys live under this prefix so
// `clearAuth` can list-and-remove without missing one.
const KEYS = {
    token:           '@{{PROJECT_SLUG}}:token',
    refresh:         '@{{PROJECT_SLUG}}:refresh_token',
    user:            '@{{PROJECT_SLUG}}:user',
    lastUserId:      '@{{PROJECT_SLUG}}:last_user_id',
    onboardingDone:  '@{{PROJECT_SLUG}}:onboarding_done',
    onboardingData:  '@{{PROJECT_SLUG}}:onboarding_data'
} as const;

type AuthResult = { success: true } | { success: false; error: string };

interface AuthContextValue {
    signed: boolean;
    user: ApiUser | null;
    token: string | null;
    loading: boolean;
    isPremium: boolean;
    dataVersion: number;
    hasCompletedOnboarding: boolean;
    bumpDataVersion: () => void;
    signIn: (email: string, password: string) => Promise<AuthResult>;
    signUp: (
        email: string,
        password: string,
        name: string
    ) => Promise<AuthResult>;
    forgotPassword: (email: string) => Promise<AuthResult>;
    signOut: () => Promise<void>;
    ensureFreshToken: () => Promise<string | null>;
    continueWithToken: (
        jwt: string,
        refreshToken?: string | null
    ) => Promise<AuthResult>;
    signInWithApple: (payload: {
        id_token: string;
        firstName?: string | null;
        lastName?: string | null;
    }) => Promise<AuthResult>;
    activatePremium: (updatedUser: ApiUser) => Promise<void>;
    refreshPremiumStatus: () => Promise<void>;
    /**
     * Mark onboarding done. Persists the answers so screens / server
     * can read them later. Flips the route gate so the next render
     * shows the main tabs instead of the onboarding stack.
     */
    completeOnboarding: (data?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Single-flight guard for refresh token rotation.
// Refresh tokens are rotated server-side on every successful refresh: the old
// RT is deleted. If two callers raced with the same RT, the second would hit
// the server with a now-deleted token, get 401, and we'd clearAuth → false
// logout. This guard makes concurrent callers share one in-flight Promise so
// only one request actually hits /api/auth/refresh.
let _refreshInFlight: Promise<RefreshOutcome> | null = null;

type RefreshOutcome = 'ok' | 'invalid' | 'network';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser]               = useState<ApiUser | null>(null);
    const [token, setToken]             = useState<string | null>(null);
    const [loading, setLoading]         = useState<boolean>(true);
    const [dataVersion, setDataVersion] = useState<number>(0);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] =
        useState<boolean>(false);

    useEffect(() => {
        loadStorage();
    }, []);

    async function loadStorage() {
        try {
            // Always run migrations first — tables must exist before
            // any sync runs and before any UI tries to read.
            await initDb();

            const [
                storedToken,
                storedRefresh,
                storedUser,
                onboardingDone
            ] = await Promise.all([
                AsyncStorage.getItem(KEYS.token),
                AsyncStorage.getItem(KEYS.refresh),
                AsyncStorage.getItem(KEYS.user),
                AsyncStorage.getItem(KEYS.onboardingDone)
            ]);

            if (onboardingDone === 'true') {
                setHasCompletedOnboarding(true);
            }

            // Restore cached session immediately so the UI doesn't flash to
            // the auth stack on every cold start.
            if (storedUser) {
                setUser(JSON.parse(storedUser) as ApiUser);
                if (storedToken) {
                    setToken(storedToken);
                }
                setDbSigned(true);
            }

            if (!storedToken && !storedRefresh) {
                return;
            }

            // Background-refresh against the server: if it confirms the token
            // is invalid AND we have a refresh token, rotate; otherwise keep
            // the cached session alive (network errors shouldn't log users
            // out).
            void refreshSessionInBackground(storedToken, storedRefresh);
        } catch (err) {
            console.warn('[auth] loadStorage error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function refreshSessionInBackground(
        storedToken: string | null,
        storedRefresh: string | null
    ) {
        if (!storedToken) {
            // No access token but maybe a refresh token — try rotating.
            if (storedRefresh) {
                const result = await doRefresh(storedRefresh);
                if (result === 'invalid') {
                    await clearAuth();
                }
            }
            return;
        }

        let invalid = false;
        try {
            const res = await api.me(storedToken);
            if (res.ok && res.user) {
                applyServerUser(res.user);
                return;
            }
            invalid = true;
        } catch (err) {
            const status = (err as { status?: number }).status;
            if (status === 401 || status === 403) {
                invalid = true;
            } else {
                // Network / 5xx — keep cached session, don't log the user out
                return;
            }
        }

        if (!invalid) {
            return;
        }

        if (storedRefresh) {
            const result = await doRefresh(storedRefresh);
            if (result === 'invalid') {
                await clearAuth();
            }
        } else {
            await clearAuth();
        }
    }

    function applyServerUser(userData: ApiUser) {
        setUser(userData);
        AsyncStorage
            .setItem(KEYS.user, JSON.stringify(userData))
            .catch(() => { /* persistence is best-effort */ });
    }

    async function doRefresh(refreshToken: string): Promise<RefreshOutcome> {
        if (_refreshInFlight) {
            return _refreshInFlight;
        }
        _refreshInFlight = (async () => {
            try {
                const data = await api.refresh(refreshToken);
                if (!data.ok || !data.token || !data.user) {
                    return 'invalid';
                }
                await persistAuth(data.user, data.token, data.refreshToken);
                return 'ok';
            } catch (err) {
                const status = (err as { status?: number }).status;
                if (status === 401 || status === 403) {
                    return 'invalid';
                }
                return 'network';
            } finally {
                _refreshInFlight = null;
            }
        })();
        return _refreshInFlight;
    }

    async function persistAuth(
        userData: ApiUser,
        userToken: string,
        userRefreshToken?: string | null
    ) {
        // If the incoming user differs from the last account that signed in
        // on this device, wipe user-scoped SQLite data BEFORE initDb runs
        // again so the new account starts from a known-empty baseline.
        // Same-user re-login keeps local history intact — that's why we
        // don't clear on logout, only on user-switch.
        const prevUserId = await AsyncStorage.getItem(KEYS.lastUserId);
        const nextUserId = userData?.id != null ? String(userData.id) : null;
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
            await clearUserData();
        }

        // Re-init now that the gate is open and tables (re)exist.
        setDbSigned(true);
        try {
            await initDb();
        } catch (err) {
            console.warn('[auth] initDb after persist error:', err);
        }

        const items: [string, string][] = [
            [KEYS.token, userToken],
            [KEYS.user,  JSON.stringify(userData)]
        ];
        if (userRefreshToken) {
            items.push([KEYS.refresh, userRefreshToken]);
        }
        if (nextUserId) {
            items.push([KEYS.lastUserId, nextUserId]);
        }
        await AsyncStorage.multiSet(items);

        setToken(userToken);
        setUser(userData);

        // Premium users: pull the latest cloud backup. Bumping
        // dataVersion lets every screen re-render its useFocusEffect
        // queries to pick up restored rows.
        if (userData.is_premium && !userToken.startsWith('mock_')) {
            restoreFromCloud(userToken)
                .then((res) => {
                    if (res) {
                        setDataVersion(v => v + 1);
                    }
                })
                .catch(err => {
                    console.warn(
                        '[auth] backup restore failed:',
                        (err as Error).message
                    );
                });
        }
    }

    async function clearAuth() {
        // Close the write gate FIRST so any in-flight render that fires
        // off a write between here and the table drop is rejected by
        // demandSigned(). Order matters — flipping after clearUserData
        // leaves a window where the just-logged-out user can re-create
        // rows in tables we just dropped.
        setDbSigned(false);
        try {
            await clearUserData();
        } catch (err) {
            console.warn('[auth] clearUserData error:', err);
        }
        // Clear onboarding state too: signing out should send the next
        // person back through Welcome → Onboarding → FirstAction. Same
        // pattern tranqs uses — onboarding is per-account, not
        // per-device.
        await AsyncStorage.multiRemove([
            KEYS.token,
            KEYS.refresh,
            KEYS.user,
            KEYS.lastUserId,
            KEYS.onboardingDone,
            KEYS.onboardingData
        ]);
        setToken(null);
        setUser(null);
        setHasCompletedOnboarding(false);
    }

    // ── Sign in / out ─────────────────────────────────────────────────────

    async function signIn(
        email: string,
        password: string
    ): Promise<AuthResult> {
        try {
            const data = await api.login(email, password);
            if (!data.ok || !data.user || !data.token) {
                return {
                    success: false,
                    error: data.message ?? 'Credenciais inválidas.'
                };
            }
            await persistAuth(data.user, data.token, data.refreshToken);
            return { success: true };
        } catch (err) {
            const status = (err as { status?: number }).status;
            if (status === 401 || status === 403) {
                return { success: false, error: 'Credenciais inválidas.' };
            }
            return {
                success: false,
                error: 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    async function signUp(
        email: string,
        password: string,
        name: string
    ): Promise<AuthResult> {
        try {
            const data = await api.signup(email, password, name);
            if (!data.ok || !data.user || !data.token) {
                return {
                    success: false,
                    error: data.message ?? 'Erro ao criar conta.'
                };
            }
            await persistAuth(data.user, data.token, data.refreshToken);
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error:
                    (err as Error).message
                    ?? 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    async function forgotPassword(email: string): Promise<AuthResult> {
        try {
            const data = await api.forgotPassword(email);
            if (!data.ok) {
                return {
                    success: false,
                    error: data.message ?? 'Erro ao enviar email.'
                };
            }
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error:
                    (err as Error).message
                    ?? 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    /**
     * Accept a token + (optional) refresh token from an external auth flow
     * (Google web-OAuth, deep link, etc.) and hydrate the session.
     * The token is verified by hitting /api/auth — same path as cold-start.
     */
    async function continueWithToken(
        jwt: string,
        refreshToken?: string | null
    ): Promise<AuthResult> {
        try {
            const data = await api.me(jwt);
            if (!data.ok || !data.user) {
                return { success: false, error: 'Token inválido.' };
            }
            await persistAuth(data.user, jwt, refreshToken ?? null);
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error:
                    (err as Error).message
                    ?? 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    async function signInWithApple(payload: {
        id_token: string;
        firstName?: string | null;
        lastName?: string | null;
    }): Promise<AuthResult> {
        try {
            const data = await api.appleMobile(payload);
            if (!data.ok || !data.user || !data.token) {
                return {
                    success: false,
                    error: data.message ?? 'Falha ao entrar com Apple.'
                };
            }
            await persistAuth(data.user, data.token, data.refreshToken);
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error:
                    (err as Error).message
                    ?? 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    async function signOut(): Promise<void> {
        try {
            if (token) {
                // Premium: best-effort backup before we wipe locally.
                // We swallow errors — a failed backup shouldn't block
                // the user's logout intention.
                if (user?.is_premium && !token.startsWith('mock_')) {
                    try {
                        const fresh =
                            await ensureFreshToken().catch(() => token);
                        if (fresh) {
                            await backupToCloud(fresh);
                        }
                    } catch (err) {
                        console.warn(
                            '[auth] backup on logout failed:',
                            (err as Error).message
                        );
                    }
                }
                const refresh = await AsyncStorage.getItem(KEYS.refresh);
                api.logout(token, refresh).catch(err => {
                    console.warn('[auth] logout request failed:', err);
                });
            }
        } finally {
            await clearAuth();
        }
    }

    // ── Token freshness ───────────────────────────────────────────────────

    /**
     * Returns a valid access token, refreshing proactively if it expires
     * within 5 minutes. Use this before any authenticated API call instead
     * of reading `token` directly. Returns null if no session.
     */
    async function ensureFreshToken(): Promise<string | null> {
        const current = token;
        if (!current) {
            return null;
        }

        try {
            const parts = current.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1])) as { exp?: number };
                const expiresAt = (payload.exp ?? 0) * 1000;
                const fiveMinutes = 5 * 60 * 1000;
                if (expiresAt - Date.now() > fiveMinutes) {
                    return current;
                }
            }
        } catch {
            // Couldn't decode — fall through to refresh.
        }

        const stored = await AsyncStorage.getItem(KEYS.refresh);
        if (!stored) {
            return current;
        }
        const result = await doRefresh(stored);
        if (result === 'invalid') {
            await clearAuth();
            return null;
        }
        const fresh = await AsyncStorage.getItem(KEYS.token);
        return fresh ?? current;
    }

    function bumpDataVersion() {
        setDataVersion(v => v + 1);
    }

    async function completeOnboarding(
        data?: Record<string, unknown>
    ): Promise<void> {
        const items: [string, string][] = [
            [KEYS.onboardingDone, 'true']
        ];
        if (data) {
            items.push([KEYS.onboardingData, JSON.stringify(data)]);
        }
        await AsyncStorage.multiSet(items);
        setHasCompletedOnboarding(true);
    }

    /**
     * Apply a user object that came back from /api/iap/validate. The
     * server has already confirmed premium with Apple/Google, so we
     * trust it and just persist locally.
     */
    async function activatePremium(updatedUser: ApiUser): Promise<void> {
        const merged: ApiUser = {
            ...(user ?? {}),
            ...updatedUser,
            is_premium: true
        };
        setUser(merged);
        await AsyncStorage.setItem(KEYS.user, JSON.stringify(merged));
    }

    /**
     * Re-check premium status against the server. Catches the case
     * where the user cancelled their subscription externally (App
     * Store / Play Store / website) — Apple and Google never push us
     * a notification, so we have to poll. Routes runs this on every
     * foreground transition.
     */
    async function refreshPremiumStatus(): Promise<void> {
        if (!token || token.startsWith('mock_')) {
            return;
        }
        const res = await fetchPremiumStatus(token);
        if (!res.ok) {
            return;
        }
        const next = !!res.is_premium;
        if (next === !!user?.is_premium) {
            return;
        }
        const merged: ApiUser = {
            ...(user ?? { id: '', email: '' } as ApiUser),
            is_premium: next
        };
        setUser(merged);
        AsyncStorage
            .setItem(KEYS.user, JSON.stringify(merged))
            .catch(() => { /* persistence is best-effort */ });
    }

    return (
        <AuthContext.Provider value={{
            signed: !!user,
            user,
            token,
            loading,
            isPremium: !!user?.is_premium,
            dataVersion,
            bumpDataVersion,
            signIn,
            signUp,
            signOut,
            forgotPassword,
            ensureFreshToken,
            continueWithToken,
            signInWithApple,
            activatePremium,
            refreshPremiumStatus,
            hasCompletedOnboarding,
            completeOnboarding
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}

export default AuthContext;
