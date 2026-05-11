import type { Express, Request, Response } from 'express';
import express from 'express';
import trySetUserByTokenMiddleware
    from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import { buildHandler } from '#shared/utils.js';
import {
    generatePutUrl,
    generateSignedUrl,
    copyS3Object,
    deleteFromS3,
    headS3Object
} from '#core/s3.js';
import logger from '#core/logger.js';

const router = express.Router();

// All backups live under user/<userId>/. The mobile client never sees
// these keys — only the presigned URLs we hand back. Keep them
// predictable on the server so we can promote staging → canonical.
function realKey(userId: string): string {
    return `user/${userId}/data.json`;
}
function stagingKey(userId: string): string {
    return `user/${userId}/data.json.tmp`;
}

const URL_TTL_S = 600;

async function handleInfo(req: Request, res: Response): Promise<void> {
    const head = await headS3Object(realKey(req.user!.id));
    if (!head) {
        res.json({ ok: true, exists: false });
        return;
    }
    res.json({
        ok: true,
        exists: true,
        size: head.size,
        lastModified: head.lastModified
    });
}

async function handleUploadUrl(
    req: Request,
    res: Response
): Promise<void> {
    // Always issue a URL for the staging key — never the real key.
    // The two-phase flow guarantees the previous backup survives a
    // failed mid-upload.
    const url = await generatePutUrl(stagingKey(req.user!.id), {
        expiresIn: URL_TTL_S,
        contentType: 'application/json'
    });
    res.json({ ok: true, url });
}

async function handlePromote(
    req: Request,
    res: Response
): Promise<void> {
    const userId = req.user!.id;
    const src = stagingKey(userId);
    const dst = realKey(userId);

    try {
        await copyS3Object(src, dst);
    } catch (err) {
        logger.error('{backup} promote copy failed', err);
        res.status(500).json({
            ok: false,
            message: 'Falha ao consolidar backup.'
        });
        return;
    }

    // Best-effort cleanup — if delete fails, the next upload will
    // overwrite the staging key anyway. Don't surface to the client.
    deleteFromS3(src).catch(err => {
        logger.error('{backup} staging delete failed', err);
    });

    res.json({ ok: true });
}

async function handleDownloadUrl(
    req: Request,
    res: Response
): Promise<void> {
    const head = await headS3Object(realKey(req.user!.id));
    if (!head) {
        // No backup — the mobile client treats this as "first login,
        // nothing to restore" so just say so explicitly.
        res.json({ ok: false, message: 'No backup found.' });
        return;
    }
    const url = await generateSignedUrl(
        realKey(req.user!.id),
        URL_TTL_S
    );
    res.json({ ok: true, url, size: head.size });
}

router.get(
    '/backup/info',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleInfo)
);

router.post(
    '/backup/upload-url',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleUploadUrl)
);

router.post(
    '/backup/promote',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handlePromote)
);

router.get(
    '/backup/download-url',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleDownloadUrl)
);

export default function makeEndpoint(app: Express): void {
    app.use('/api', router);
}
