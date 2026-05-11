import type { Request, Response, NextFunction } from 'express';

export default function demandAdminUser(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        res.status(401).json({
            ok: false,
            message: 'Authentication required'
        });
        return;
    }

    if (req.user.role !== 'admin') {
        res.status(403).json({
            ok: false,
            message: 'Admin access required'
        });
        return;
    }

    next();
}
