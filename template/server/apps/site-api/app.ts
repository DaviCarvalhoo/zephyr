import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Context from '#core/context.js';
import logger from '#core/logger.js';
import makeRoutes from './routes/index.js';
import requestLoggerMiddleware from '#shared/middlewares/request-logger.js';
import errorHandler from '#shared/middlewares/error-handler.js';

process.env.TZ = 'UTC';

function fatalHandler(err: Error) {
    logger.error(err, { FATAL: true });
    process.exit(1);
}
process.on('uncaughtException', fatalHandler);
process.on('unhandledRejection', fatalHandler);

const app = express();
const port = parseInt(
    process.env.SITE_API_PORT || '{{SITE_API_PORT}}', 10
);

app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.SITE_DOMAIN || 'http://localhost:{{SITE_PORT}}',
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

app.use((
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
) => {
    req.context = new Context();
    next();
});

makeRoutes(app);

app.use(errorHandler);

app.listen(port, () => {
    logger.info(`Site API server running on port ${port}`);
});

export default app;
