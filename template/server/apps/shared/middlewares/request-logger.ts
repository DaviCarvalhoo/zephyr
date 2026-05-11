import type { Request, Response, NextFunction } from 'express';
import logger from '#core/logger.js';

export default function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const { ip, method, url } = req;
    const started = Date.now();

    const userId = req.user?.id;
    let idsMsg = '';
    if (userId) {
        idsMsg = ` u=${userId}`;
    }

    if (process.env.DEBUG) {
        logger.debug(`[${ip}] {${method}} Receiving ${url}${idsMsg}`);
    }

    res.on('finish', () => {
        const usr = req.user?.id;
        if (usr && !idsMsg) {
            idsMsg = ` u=${usr}`;
        }

        const msg = `{req} [${ip}] ${method} ${url}${idsMsg} : http=${res.statusCode} ${Date.now() - started}ms`;

        if (res.statusCode >= 500) {
            logger.error(msg);
        } else if (res.statusCode >= 400) {
            logger.warn(msg);
        } else {
            logger.info(msg);
        }
    });

    next();
}
