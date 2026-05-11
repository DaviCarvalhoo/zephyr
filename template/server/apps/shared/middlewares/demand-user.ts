import type { Request, Response, NextFunction } from 'express';

export default function demandUser(
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

    next();
}
