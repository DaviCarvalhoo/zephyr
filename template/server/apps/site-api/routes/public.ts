import type { Express, Request, Response } from 'express';
import express from 'express';
import { buildHandler } from '#shared/utils.js';

const router = express.Router();

async function handleHealthCheck(_req: Request, res: Response): Promise<void> {
    res.json({ ok: true, message: 'Site API is running' });
}

async function handleGetPublicInfo(req: Request, res: Response): Promise<void> {
    const accounts = await req.context.account.listPublic();
    res.json({ ok: true, accounts });
}

router.get('/health', buildHandler(handleHealthCheck));
router.get('/info', buildHandler(handleGetPublicInfo));

// Add public routes for your site here:
// router.get('/products', buildHandler(handleListProducts));
// router.get('/products/:slug', buildHandler(handleGetProduct));

export default function makeEndpoint(app: Express): void {
    app.use('/site', router);
}
