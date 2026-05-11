import type { Request, Response, NextFunction } from 'express';
import { AppError } from '#core/errors.js';
import logger from '#core/logger.js';

export default function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    logger.error(err.message, {
        stack: err.stack,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id
    });

    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = statusCode === 500
        ? 'Erro interno do servidor'
        : err.message;

    res.status(statusCode).json({
        ok: false,
        message
    });
}
