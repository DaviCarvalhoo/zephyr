import type { Express } from 'express';
import express from 'express';
import trySetUserByTokenMiddleware from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';

const router = express.Router();

// Add user-scoped routes here (profile, notifications, preferences, etc.)

export default function makeEndpoint(app: Express): void {
    app.use(
        '/api/user',
        trySetUserByTokenMiddleware,
        demandUserMiddleware,
        router
    );
}
