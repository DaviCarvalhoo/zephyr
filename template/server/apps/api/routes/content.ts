import type { Express, Request, Response } from 'express';
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { buildHandler } from '#shared/utils.js';
import { ForbiddenError, ValidationError } from '#core/errors.js';
import { generateSignedUrl, headS3Object } from '#core/s3.js';
import { getContentCatalog, reloadContent } from '#core/content.js';
import logger from '#core/logger.js';

const router = express.Router();

const CONTENT_SECRET = process.env.CONTENT_SECRET ?? '';
const SIGNATURE_WINDOW_SECS = 300;

interface SignaturePieces {
    timestamp: string;
    signature: string;
}

function readSignature(req: Request): SignaturePieces {
    const ts = (req.headers['x-content-timestamp'] as string)
        ?? (req.query.ts as string)
        ?? '';
    const sig = (req.headers['x-content-signature'] as string)
        ?? (req.query.sig as string)
        ?? '';
    return { timestamp: String(ts), signature: String(sig) };
}

/**
 * Verify HMAC-SHA256(CONTENT_SECRET, "${ts}:${path}").
 *
 * Replay window: 5 minutes either side of `now`. Outside that, reject
 * — even with a valid signature — so a leaked signature has limited
 * useful life.
 *
 * `path` is the asset path the client wants to sign (e.g.
 * "covers/welcome.jpg"). It comes from the request body; we never
 * trust the URL path because the client could probe arbitrary keys.
 */
function verifyContentSignature(
    sig: SignaturePieces,
    contentPath: string
): boolean {
    if (!CONTENT_SECRET) {
        logger.error(
            '{content} CONTENT_SECRET not set — rejecting all requests'
        );
        return false;
    }
    if (!sig.timestamp || !sig.signature) {
        return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const ts = Number(sig.timestamp);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > SIGNATURE_WINDOW_SECS) {
        return false;
    }

    const expected = createHmac('sha256', CONTENT_SECRET)
        .update(`${sig.timestamp}:${contentPath}`)
        .digest('hex');

    try {
        return timingSafeEqual(
            Buffer.from(sig.signature),
            Buffer.from(expected)
        );
    } catch {
        // timingSafeEqual throws if buffers differ in length —
        // treat as failed verification.
        return false;
    }
}

async function handleVersion(
    _req: Request,
    res: Response
): Promise<void> {
    const catalog = getContentCatalog();
    res.json({
        ok: true,
        version: catalog.version,
        generatedAt: catalog.generatedAt
    });
}

async function handleCatalog(
    _req: Request,
    res: Response
): Promise<void> {
    res.json({ ok: true, ...getContentCatalog() });
}

const signSchema = z.object({
    path: z.string().min(1).max(512)
});

async function handleSign(
    req: Request,
    res: Response
): Promise<void> {
    const { path: contentPath } = signSchema.parse(req.body);
    const sig = readSignature(req);
    if (!verifyContentSignature(sig, contentPath)) {
        throw new ForbiddenError('Assinatura inválida');
    }

    // Probe the bucket — handing out a presigned URL for a missing
    // object would just produce a confusing 404 on the client.
    const head = await headS3Object(contentPath);
    if (!head) {
        throw new ValidationError('Conteúdo não encontrado');
    }

    const url = await generateSignedUrl(contentPath, 3600);
    res.json({ ok: true, url, size: head.size });
}

async function handleReload(
    _req: Request,
    res: Response
): Promise<void> {
    const catalog = reloadContent();
    res.json({
        ok: true,
        version: catalog.version,
        generatedAt: catalog.generatedAt
    });
}

router.get('/content/version', buildHandler(handleVersion));
router.get('/content/catalog', buildHandler(handleCatalog));
router.post('/content/sign', buildHandler(handleSign));
// Bound to the admin route in production — see middleware below.
router.post('/content/reload', buildHandler(handleReload));

export default function makeEndpoint(app: Express): void {
    app.use('/api', router);
}
