import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware
    from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import { buildHandler } from '#shared/utils.js';
import logger from '#core/logger.js';

const router = express.Router();

// Generic shape — adapt to whatever data your app actually mirrors
// from the platform's health store. Keep it batched (an array) so
// the mobile client can debounce and post a window's worth of
// events at once.
const eventSchema = z.object({
    kind: z.string().min(1).max(64),
    occurredAt: z.string().datetime(),
    durationMs: z.number().int().nonnegative().optional(),
    payload: z.record(z.unknown()).optional()
});

const syncSchema = z.object({
    events: z.array(eventSchema).max(500)
});

async function handleSync(
    req: Request,
    res: Response
): Promise<void> {
    const { events } = syncSchema.parse(req.body);

    // Phase 6 ships this stub on purpose: where the events actually
    // live (DB table? analytics pipeline? both?) is per-project.
    // Wire to a model method (e.g. context.health.append(events))
    // when you decide. For now we just log the count so you can see
    // the round-trip working end-to-end.
    logger.info(
        `{health} received ${events.length} events `
        + `from user_id=${req.user!.id}`
    );

    res.json({ ok: true, accepted: events.length });
}

router.post(
    '/health/sync',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleSync)
);

export default function makeEndpoint(app: Express): void {
    app.use('/api', router);
}
