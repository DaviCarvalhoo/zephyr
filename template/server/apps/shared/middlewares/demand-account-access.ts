import type { Request, Response, NextFunction } from 'express';

export default async function demandAccountAccess(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            ok: false,
            message: 'Authentication required'
        });
        return;
    }

    // req.params is typed `string | string[]` (Express); coerce to a
    // single string via Array.isArray since our route patterns never
    // produce repeated path params.
    const rawParam = req.params.accountId;
    const fromParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    const fromQuery = typeof req.query.accountId === 'string'
        ? req.query.accountId
        : undefined;
    const accountId = fromParam || fromQuery;

    if (!accountId) {
        res.status(400).json({
            ok: false,
            message: 'Account ID is required'
        });
        return;
    }

    // Admin users have access to all accounts
    if (req.user.role === 'admin') {
        req.accountId = accountId;
        req.accountRole = 'admin';
        next();
        return;
    }

    // Check user has access to this account
    const userAccount = await req.context.user.getAccount(
        req.user.id,
        accountId,
        req.user.role
    );

    if (!userAccount) {
        res.status(403).json({
            ok: false,
            message: 'Access to this account is forbidden'
        });
        return;
    }

    req.accountId = accountId;
    req.accountRole = userAccount.role;
    next();
}
