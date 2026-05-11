import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import { buildHandler } from '#shared/utils.js';
import { ForbiddenError, ValidationError } from '#core/errors.js';
import { createS3Upload, generateSignedUrl, deleteFromS3 } from '#core/s3.js';
import logger from '#core/logger.js';
import {
    verifyAppleIdToken,
    verifyGoogleIdToken,
    exchangeGoogleCode
} from '#core/oauth.js';

const router = express.Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
};

function setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, COOKIE_OPTIONS);
}

function clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', { path: '/' });
}

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória')
});

const signupSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().min(1, 'Nome é obrigatório'),
    account_name: z.string().optional()
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido')
});

const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const updateProfileSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido')
});

const changePasswordSchema = z.object({
    current_password: z.string().min(1, 'Senha atual é obrigatória'),
    new_password: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres')
});

const avatarUpload = createS3Upload({
    folder: 'avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    maxFileSize: 2 * 1024 * 1024, // 2MB
});

async function resolveAvatarUrl(avatarKey: string | null): Promise<string | null> {
    if (!avatarKey) return null;
    return generateSignedUrl(avatarKey, 3600);
}

async function userWithAvatar(user: any) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: await resolveAvatarUrl(user.avatar_key)
    };
}

// Mobile clients want both pieces returned in the JSON body so they can
// store them in AsyncStorage; web clients keep using the httpOnly cookie.
// Setting both is harmless — the cookie flows naturally to the browser
// and the body fields are simply ignored by web callers.
async function issueMobileTokens(
    req: Request,
    userId: string
): Promise<{ token: string; refreshToken: string }> {
    const token = req.context.auth.generateToken(userId);
    const ua = req.headers['user-agent'];
    const refreshToken = await req.context.auth.issueRefreshToken(
        userId,
        typeof ua === 'string' ? ua.slice(0, 512) : undefined
    );
    return { token, refreshToken };
}

async function handleLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = loginSchema.parse(req.body);
    const result = await req.context.auth.login(email, password);

    setAuthCookie(res, result.token);
    const fullUser = await req.context.user.findById(result.user.id);
    const tokens = await issueMobileTokens(req, result.user.id);
    res.json({
        ok: true,
        user: await userWithAvatar(fullUser),
        token: tokens.token,
        refreshToken: tokens.refreshToken
    });
}

async function handleSignup(req: Request, res: Response): Promise<void> {
    const { email, password, name, account_name } = signupSchema.parse(req.body);
    const result = await req.context.auth.signup({
        email, password, name, accountName: account_name
    });

    if (result.existingUser) {
        res.json({
            ok: true,
            existingUser: true,
            message: 'Uma nova conta foi criada. Como seu email já estava cadastrado, faça login para acessá-la.'
        });
        return;
    }

    setAuthCookie(res, result.token);
    const tokens = await issueMobileTokens(req, result.user.id);
    res.json({
        ok: true,
        user: result.user,
        account: result.account,
        token: tokens.token,
        refreshToken: tokens.refreshToken
    });
}

async function handleLogout(req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    const refreshToken = req.body?.refreshToken;
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
        try {
            await req.context.auth.revokeRefreshToken(refreshToken);
        } catch (err) {
            logger.error('{auth} revoke refresh token error', err);
        }
    }
    res.json({ ok: true });
}

const refreshSchema = z.object({
    refreshToken: z.string().min(10, 'Refresh token inválido')
});

async function handleRefresh(
    req: Request,
    res: Response
): Promise<void> {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await req.context.auth.rotateRefreshToken(refreshToken);
    res.json({
        ok: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
    });
}

// ── OAuth: Apple (mobile native flow) ────────────────────────────────
//
// Mobile sends the id_token from `expo-apple-authentication` plus the
// optional first/last name (Apple only sends these on first sign-in).
// We verify the token against Apple's JWKS, find-or-create the user,
// and return JWT + refresh.
const appleMobileSchema = z.object({
    id_token: z.string().min(10),
    firstName: z.string().nullable().optional(),
    lastName:  z.string().nullable().optional()
});

async function handleAppleMobile(
    req: Request,
    res: Response
): Promise<void> {
    const { id_token, firstName, lastName } = appleMobileSchema.parse(
        req.body
    );

    const audience = process.env.APPLE_BUNDLE_ID;
    if (!audience) {
        throw new ValidationError(
            'APPLE_BUNDLE_ID não configurado no servidor'
        );
    }

    let verified;
    try {
        verified = await verifyAppleIdToken(id_token, audience);
    } catch (err) {
        logger.error('{auth} apple id_token verification failed', err);
        throw new ForbiddenError('Token Apple inválido');
    }

    if (!verified.email) {
        throw new ValidationError(
            'Apple não retornou e-mail. Permita o e-mail no consentimento.'
        );
    }

    const fullName = [firstName, lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null;

    const user = await req.context.auth.findOrCreateOAuthUser({
        provider: 'apple',
        providerUserId: verified.sub,
        email: verified.email,
        name: fullName
    });

    setAuthCookie(res, req.context.auth.generateToken(user.id));
    const tokens = await issueMobileTokens(req, user.id);
    const fullUser = await req.context.user.findById(user.id);
    res.json({
        ok: true,
        user: await userWithAvatar(fullUser),
        token: tokens.token,
        refreshToken: tokens.refreshToken
    });
}

// ── OAuth: Google (server-side flow with deep-link redirect) ─────────
//
// 1. Mobile opens /api/auth/google/app via WebBrowser.
// 2. We redirect to Google with state encoding the deep-link target.
// 3. Google redirects back to /api/auth/google/callback with ?code=...
// 4. We exchange code → id_token → find-or-create user → mint tokens.
// 5. We redirect to `<scheme>://auth?token=...&refreshToken=...`.

function googleAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
        redirect_uri:
            process.env.GOOGLE_REDIRECT_URI
            ?? 'http://localhost:{{API_PORT}}/api/auth/google/callback',
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'select_account'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function handleGoogleAppRedirect(
    _req: Request,
    res: Response
): Promise<void> {
    if (!process.env.GOOGLE_WEB_CLIENT_ID) {
        throw new ValidationError(
            'GOOGLE_WEB_CLIENT_ID não configurado no servidor'
        );
    }
    const state = Buffer
        .from(JSON.stringify({ kind: 'app' }))
        .toString('base64url');
    res.redirect(googleAuthUrl(state));
}

async function handleGoogleCallback(
    req: Request,
    res: Response
): Promise<void> {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    if (!code) {
        res.status(400).send('Missing code');
        return;
    }

    let parsedState: { kind?: string } = {};
    try {
        if (state) {
            parsedState = JSON.parse(
                Buffer.from(state, 'base64url').toString('utf8')
            );
        }
    } catch (err) {
        logger.error('{auth} google state parse error', err);
    }

    const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI
        ?? 'http://localhost:{{API_PORT}}/api/auth/google/callback';
    const mobileScheme = process.env.MOBILE_SCHEME ?? '{{MOBILE_SCHEME}}';

    if (!clientId || !clientSecret) {
        throw new ValidationError(
            'Google OAuth credentials não configuradas'
        );
    }

    let idToken: string;
    try {
        const exchanged = await exchangeGoogleCode({
            code,
            clientId,
            clientSecret,
            redirectUri
        });
        idToken = exchanged.id_token;
    } catch (err) {
        logger.error('{auth} google code exchange failed', err);
        const errMsg = encodeURIComponent('Falha na autenticação Google');
        if (parsedState.kind === 'app') {
            res.redirect(`${mobileScheme}://auth?error=${errMsg}`);
            return;
        }
        res.status(400).send('Auth failed');
        return;
    }

    let verified;
    try {
        verified = await verifyGoogleIdToken(idToken, clientId);
    } catch (err) {
        logger.error('{auth} google id_token verify failed', err);
        const errMsg = encodeURIComponent('Token Google inválido');
        if (parsedState.kind === 'app') {
            res.redirect(`${mobileScheme}://auth?error=${errMsg}`);
            return;
        }
        res.status(403).send('Invalid token');
        return;
    }

    const user = await req.context.auth.findOrCreateOAuthUser({
        provider: 'google',
        providerUserId: verified.sub,
        email: verified.email,
        name: verified.name ?? null,
        avatarUrl: verified.picture ?? null
    });

    const tokens = await issueMobileTokens(req, user.id);

    if (parsedState.kind === 'app') {
        const url = `${mobileScheme}://auth`
            + `?token=${encodeURIComponent(tokens.token)}`
            + `&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
        res.redirect(url);
        return;
    }

    setAuthCookie(res, tokens.token);
    res.redirect(
        process.env.BASE_UI_URL ?? 'http://localhost:{{ADMIN_UI_PORT}}'
    );
}

async function handleForgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = forgotPasswordSchema.parse(req.body);
    await req.context.auth.forgotPassword(email);
    res.json({ ok: true, message: 'Se o email existir, você receberá um link de recuperação' });
}

async function handleValidateResetToken(req: Request, res: Response): Promise<void> {
    const valid = await req.context.auth.validateResetToken((req.params.token as string));
    res.json({ ok: valid });
}

async function handleResetPassword(req: Request, res: Response): Promise<void> {
    const { password } = resetPasswordSchema.parse(req.body);
    await req.context.auth.resetPassword((req.params.token as string), password);
    res.json({ ok: true, message: 'Senha alterada com sucesso' });
}

async function handleAuth(req: Request, res: Response): Promise<void> {
    const rawUser = req.user!;
    const fullUser = await req.context.user.findById(rawUser.id);
    const user = await userWithAvatar(fullUser);
    const accountId = req.query.account as string | undefined;

    if (!accountId) {
        res.json({ ok: true, user });
        return;
    }

    const userAccount = await req.context.user.getAccount(
        rawUser.id, accountId, rawUser.role
    );

    if (!userAccount) {
        throw new ForbiddenError('Acesso negado a esta conta');
    }

    res.json({ ok: true, user, account: userAccount.account, role: userAccount.role });
}

async function handleGetAccounts(req: Request, res: Response): Promise<void> {
    const accounts = await req.context.user.getAccounts(req.user!.id);
    res.json({ ok: true, accounts });
}

async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
    const { name, email } = updateProfileSchema.parse(req.body);
    const user = await req.context.user.updateProfile(req.user!.id, { name, email });
    res.json({ ok: true, user });
}

async function handleChangePassword(req: Request, res: Response): Promise<void> {
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    await req.context.auth.changePassword(req.user!.id, current_password, new_password);
    res.json({ ok: true, message: 'Senha alterada com sucesso' });
}

async function handleUploadAvatar(req: Request, res: Response): Promise<void> {
    const file = req.file as Express.MulterS3.File | undefined;

    if (!file) {
        res.status(400).json({ ok: false, message: 'Nenhuma imagem enviada' });
        return;
    }

    // Delete old avatar from S3 if exists
    const currentUser = await req.context.user.findById(req.user!.id);
    if (currentUser.avatar_key) {
        try {
            await deleteFromS3(currentUser.avatar_key);
        } catch (err) {
            logger.error('{auth} failed to delete old avatar', err);
        }
    }

    const user = await req.context.user.updateAvatar(req.user!.id, file.key);
    res.json({ ok: true, user: await userWithAvatar(user) });
}

async function handleDeleteAvatar(req: Request, res: Response): Promise<void> {
    const currentUser = await req.context.user.findById(req.user!.id);

    if (currentUser.avatar_key) {
        try {
            await deleteFromS3(currentUser.avatar_key);
        } catch (err) {
            logger.error('{auth} failed to delete avatar', err);
        }
    }

    const user = await req.context.user.updateAvatar(req.user!.id, null);
    res.json({ ok: true, user: await userWithAvatar(user) });
}

router.post('/login', buildHandler(handleLogin));
router.post('/signup', buildHandler(handleSignup));
router.post('/logout', buildHandler(handleLogout));
router.post('/auth/refresh', buildHandler(handleRefresh));
router.post('/auth/apple/mobile', buildHandler(handleAppleMobile));
router.get('/auth/google/app', buildHandler(handleGoogleAppRedirect));
router.get('/auth/google/callback', buildHandler(handleGoogleCallback));
router.post('/forgot-password', buildHandler(handleForgotPassword));
router.get('/reset-password/:token', buildHandler(handleValidateResetToken));
router.post('/reset-password/:token', buildHandler(handleResetPassword));

router.get('/auth', trySetUserByTokenMiddleware, demandUserMiddleware, buildHandler(handleAuth));
router.get('/user/accounts', trySetUserByTokenMiddleware, demandUserMiddleware, buildHandler(handleGetAccounts));
router.post('/user/update-profile', trySetUserByTokenMiddleware, demandUserMiddleware, buildHandler(handleUpdateProfile));
router.post('/user/change-password', trySetUserByTokenMiddleware, demandUserMiddleware, buildHandler(handleChangePassword));
router.post('/user/avatar', trySetUserByTokenMiddleware, demandUserMiddleware, avatarUpload.single('avatar'), buildHandler(handleUploadAvatar));
router.delete('/user/avatar', trySetUserByTokenMiddleware, demandUserMiddleware, buildHandler(handleDeleteAvatar));

export default function makeEndpoint(app: Express): void {
    app.use('/api', router);
}
