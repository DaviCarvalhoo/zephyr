import type { Request, Response, NextFunction } from 'express';
import logger from '#core/logger.js';

/**
 * Resolves req.user from either:
 *   - `Authorization: Bearer <jwt>` header (mobile clients)
 *   - `auth_token` cookie (web clients)
 *
 * Header wins if both are present so a mobile dev tool can override
 * the cookie set by an in-browser session. Token validation failures
 * leave req.user undefined; the next middleware (e.g. demand-user)
 * decides whether to reject.
 */
export default async function trySetUserByToken(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Express types `req.headers.authorization` as
        // `string | string[] | undefined` because some headers (e.g.
        // Set-Cookie) can repeat. Authorization in practice is always
        // a single string; coerce safely so consumers see a string.
        const rawAuth = req.headers.authorization;
        const auth = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
        let token: string | null = null;
        if (auth && auth.startsWith('Bearer ')) {
            token = auth.slice('Bearer '.length).trim();
        } else if (req.cookies?.auth_token) {
            token = req.cookies.auth_token;
        }

        if (!token) {
            next();
            return;
        }

        const user = await req.context.auth.getUserByToken(token);
        if (user) {
            req.user = user;
        }
    } catch (err) {
        logger.error('{auth} token middleware error', err);
    }

    next();
}
