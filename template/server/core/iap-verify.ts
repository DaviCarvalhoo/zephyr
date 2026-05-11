/**
 * IAP receipt verification helpers.
 *
 * NOTE — these are *barebones stubs* meant to wire up the route
 * surface. The real implementation needs:
 *
 *   - Apple: App Store Server API JWT auth (KEY_ID, ISSUER_ID, .p8
 *     signing key) + GET /inApps/v1/transactions/{transactionId}
 *     (sandbox + production endpoints).
 *   - Google: Service account credentials with the Google Play
 *     Developer API enabled + GET subscriptions.get
 *     (purchases.subscriptionsv2.get).
 *
 * Both APIs change shape periodically; pin a verified library or a
 * specific API version when you implement. Keeping this in a tiny
 * module isolates the secret-handling and version churn from the
 * route layer.
 *
 * For now: returns active=true with a 30-day expiry so the rest of
 * the flow works end-to-end during local development. Replace before
 * shipping anything that takes real money.
 */

interface VerifyResult {
    active: boolean;
    until: Date | null;
    externalId: string;
}

const STUB_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function verifyAppleTransaction(args: {
    originalTransactionId: string;
    transactionId: string;
}): Promise<VerifyResult> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Apple IAP verification is a stub. Implement '
            + 'verifyAppleTransaction with App Store Server API '
            + 'before deploying to production.'
        );
    }
    return {
        active: true,
        until: new Date(Date.now() + STUB_TTL_MS),
        externalId: args.originalTransactionId
    };
}

export async function verifyGooglePurchase(args: {
    purchaseToken: string;
    productId: string;
}): Promise<VerifyResult> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Google IAP verification is a stub. Implement '
            + 'verifyGooglePurchase with the Google Play Developer '
            + 'API before deploying to production.'
        );
    }
    return {
        active: true,
        until: new Date(Date.now() + STUB_TTL_MS),
        externalId: args.purchaseToken
    };
}
