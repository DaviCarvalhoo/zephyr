import type { Express, Request, Response } from 'express';
import express from 'express';
import { z } from 'zod';
import trySetUserByTokenMiddleware
    from '#shared/middlewares/try-set-user-by-token.js';
import demandUserMiddleware from '#shared/middlewares/demand-user.js';
import { buildHandler } from '#shared/utils.js';
import { ValidationError, ForbiddenError } from '#core/errors.js';
import {
    verifyAppleTransaction,
    verifyGooglePurchase
} from '#core/iap-verify.js';
import logger from '#core/logger.js';

const router = express.Router();

const validateSchema = z.discriminatedUnion('platform', [
    z.object({
        platform: z.literal('ios'),
        originalTransactionId: z.string().min(1),
        transactionId: z.string().min(1)
    }),
    z.object({
        platform: z.literal('android'),
        purchaseToken: z.string().min(1),
        productId: z.string().min(1),
        purchaseData: z.string().nullable().optional(),
        dataSignature: z.string().nullable().optional()
    })
]);

async function handleValidate(
    req: Request,
    res: Response
): Promise<void> {
    const body = validateSchema.parse(req.body);

    let verified: {
        active: boolean;
        until: Date | null;
        externalId: string;
    };

    try {
        if (body.platform === 'ios') {
            verified = await verifyAppleTransaction({
                originalTransactionId: body.originalTransactionId,
                transactionId: body.transactionId
            });
        } else {
            verified = await verifyGooglePurchase({
                purchaseToken: body.purchaseToken,
                productId: body.productId
            });
        }
    } catch (err) {
        logger.error('{iap} verification error', err);
        throw new ForbiddenError('Não foi possível validar a compra');
    }

    if (!verified.active) {
        throw new ValidationError('Compra inativa ou expirada');
    }

    const updated = await req.context.user.setPremium(req.user!.id, {
        active: true,
        until: verified.until,
        provider: body.platform === 'ios' ? 'apple' : 'google',
        externalId: verified.externalId
    });

    res.json({
        ok: true,
        is_premium: updated.is_premium,
        user: updated
    });
}

async function handleStatus(
    req: Request,
    res: Response
): Promise<void> {
    const row = await req.context.user.getPremiumStatus(req.user!.id);

    // If premium_until is set and elapsed, lazily expire here. Cheaper
    // than a cron — the only place expiry matters is when a client
    // actually asks for status.
    if (
        row.is_premium
        && row.premium_until
        && new Date(row.premium_until) < new Date()
    ) {
        await req.context.user.setPremium(req.user!.id, {
            active: false,
            until: null,
            provider: null,
            externalId: null
        });
        res.json({ ok: true, is_premium: false });
        return;
    }

    res.json({
        ok: true,
        is_premium: row.is_premium,
        premium_until: row.premium_until
    });
}

const simulateSchema = z.object({
    active: z.boolean()
});

/**
 * Dev-only endpoint to flip premium without going through the store.
 * Useful for QA and for the "Simulate Premium" toggle on a debug
 * screen. Production builds should remove this — see the env gate.
 */
async function handleSimulate(
    req: Request,
    res: Response
): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenError('Simulação não disponível em produção');
    }
    const { active } = simulateSchema.parse(req.body);
    const user = await req.context.user.setPremium(req.user!.id, {
        active,
        until: null,
        provider: null,
        externalId: null
    });
    res.json({ ok: true, is_premium: active, user });
}

router.post(
    '/iap/validate',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleValidate)
);

router.get(
    '/iap/status',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleStatus)
);

router.post(
    '/iap/simulate',
    trySetUserByTokenMiddleware,
    demandUserMiddleware,
    buildHandler(handleSimulate)
);

export default function makeEndpoint(app: Express): void {
    app.use('/api', router);
}
