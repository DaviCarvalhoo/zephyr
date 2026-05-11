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

// All server-side dates use UTC. Don't let the host's TZ leak into
// timestamps written to the DB or formatted in logs — frontends do
// their own conversion.
process.env.TZ = 'UTC';

// Crash on uncaught errors instead of silently corrupting state.
// systemd / pm2 / docker will restart the process; better to die
// loudly than serve broken responses for hours.
function fatalHandler(err: Error) {
    logger.error(err, { FATAL: true });
    process.exit(1);
}
process.on('uncaughtException', fatalHandler);
process.on('unhandledRejection', fatalHandler);

const app = express();
const port = parseInt(process.env.PORT || '{{API_PORT}}', 10);

// Behind nginx / Cloudflare / a load balancer. Tells Express to
// honor X-Forwarded-* headers — `req.ip` becomes the real client
// IP, not the upstream proxy's.
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.DOMAIN || 'http://localhost:{{ADMIN_UI_PORT}}',
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

// Context injection — fresh Context per request. Models reach across
// other models via `req.context.<other>` rather than singletons.
app.use((
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
) => {
    req.context = new Context();
    next();
});

makeRoutes(app);

// Error handler must be the LAST app.use().
app.use(errorHandler);

app.listen(port, () => {
    logger.info(`Admin API server running on port ${port}`);
});

export default app;
