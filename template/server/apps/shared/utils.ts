import type { Request, Response, NextFunction } from 'express';
import { AppError } from '#core/errors.js';
import { ZodError } from 'zod';
import logger from '#core/logger.js';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export function buildHandler(handler: AsyncHandler) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res);
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map((e) => e.message).join(', ');
                logger.warn(`{route} ValidationError: ${messages}`, {
                    path: req.originalUrl,
                    method: req.method,
                    userId: req.user?.id
                });
                res.status(400).json({
                    ok: false,
                    message: messages,
                    errors: error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }

            if (error instanceof AppError) {
                if (error.statusCode >= 500) {
                    logger.error(error.message, {
                        status: String(error.statusCode),
                        path: req.originalUrl,
                        method: req.method,
                        userId: req.user?.id,
                        ip: req.ip,
                        stack: error.stack
                    });
                } else {
                    logger.warn(`{route} ${error.name}: ${error.message}`, {
                        status: String(error.statusCode),
                        path: req.originalUrl,
                        method: req.method,
                        userId: req.user?.id
                    });
                }

                res.status(error.statusCode).json({
                    ok: false,
                    message: error.message
                });
                return;
            }

            logger.error(
                error instanceof Error ? error.message : String(error),
                {
                    path: req.originalUrl,
                    method: req.method,
                    userId: req.user?.id,
                    ip: req.ip,
                    stack: error instanceof Error ? error.stack : undefined
                }
            );

            next(error);
        }
    };
}
