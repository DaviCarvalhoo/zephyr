/**
 * In-App Purchase service — wraps `react-native-iap` v15 with:
 *
 *  - Lazy-load via try/require so Expo Go (no NitroModules) gets
 *    graceful no-ops instead of crashing on import.
 *  - One source of truth for product IDs (PRODUCT_IDS below — change
 *    them to match what you set up in App Store Connect / Play Console).
 *  - Promise-based purchase flow that bridges the listener-based
 *    native API to async/await with a 60s safety timeout for cases
 *    where the user closes the store sheet without firing any callback.
 *  - Server validation step — receipts go to /api/iap/validate which
 *    talks to Apple/Google and flips the user's is_premium flag.
 */

import { Platform } from 'react-native';
import { fetchApi } from '../fetch-api';
import type { ApiUser } from '../api';

interface IAPNative {
    initConnection: () => Promise<unknown>;
    endConnection: () => unknown;
    fetchProducts: (args: {
        skus: string[];
        type: 'subs' | 'inapp';
    }) => Promise<RawProduct[]>;
    requestPurchase: (args: unknown) => Promise<unknown>;
    purchaseUpdatedListener: (
        cb: (purchase: NativePurchase) => void
    ) => { remove: () => void };
    purchaseErrorListener: (
        cb: (err: { code?: string; message?: string }) => void
    ) => { remove: () => void };
    finishTransaction: (args: {
        purchase: NativePurchase;
        isConsumable: boolean;
    }) => Promise<unknown>;
    getAvailablePurchases: () => Promise<NativePurchase[]>;
    deepLinkToSubscriptionsIOS?: () => Promise<unknown>;
    deepLinkToSubscriptions?: (args: {
        packageNameAndroid: string;
        skuAndroid: string;
    }) => Promise<unknown>;
}

let _iap: IAPNative | null = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _iap = require('react-native-iap') as IAPNative;
} catch {
    console.info(
        '[iap] react-native-iap not available (Expo Go) — IAP disabled'
    );
}

const isAvailable = !!_iap;

// ─── Product catalog ──────────────────────────────────────────────────
//
// Match these to what you create in App Store Connect (subscriptions →
// product IDs) and Google Play Console (Monetize → Subscriptions). The
// strings can be anything but must match across all three places.
export const PRODUCT_IDS = {
    monthly: '{{PROJECT_SLUG}}_premium_monthly',
    annual:  '{{PROJECT_SLUG}}_premium_annual'
} as const;

const PRODUCT_ID_LIST = Object.values(PRODUCT_IDS);

interface RawProduct {
    id: string;
    localizedPrice?: string;
    price?: string;
    subscriptionOfferDetails?: Array<{
        pricingPhases?: {
            pricingPhaseList?: Array<{
                priceAmountMicros?: string;
                formattedPrice?: string;
            }>;
        };
    }>;
}

export interface Product {
    id: string;
    localizedPrice: string;
    raw: RawProduct;
}

interface NativePurchase {
    transactionId?: string;
    originalTransactionIdentifierIOS?: string;
    purchaseToken?: string;
    productId?: string;
    dataAndroid?: string | null;
    signatureAndroid?: string | null;
}

let _connected = false;

export async function connectIAP(): Promise<boolean> {
    if (!isAvailable) {
        return false;
    }
    if (_connected) {
        return true;
    }
    try {
        await _iap!.initConnection();
        _connected = true;
        return true;
    } catch (err) {
        console.warn('[iap] initConnection failed:', err);
        return false;
    }
}

export function disconnectIAP(): void {
    if (!isAvailable) {
        return;
    }
    _iap!.endConnection();
    _connected = false;
}

function localizedPriceOf(product: RawProduct): string {
    if (Platform.OS === 'android') {
        const phase = product.subscriptionOfferDetails
            ?.[0]
            ?.pricingPhases
            ?.pricingPhaseList
            ?.[0];
        if (phase?.formattedPrice) {
            return phase.formattedPrice;
        }
    }
    return product.localizedPrice ?? product.price ?? '';
}

export async function fetchProducts(): Promise<Product[]> {
    if (!isAvailable) {
        return [];
    }
    await connectIAP();
    try {
        const subs = await _iap!.fetchProducts({
            skus: PRODUCT_ID_LIST as unknown as string[],
            type: 'subs'
        });
        return subs.map(raw => ({
            id: raw.id,
            localizedPrice: localizedPriceOf(raw),
            raw
        }));
    } catch (err) {
        console.warn('[iap] fetchProducts failed:', err);
        return [];
    }
}

const PURCHASE_TIMEOUT_MS = 60_000;

export async function purchaseSubscription(
    productId: string,
    offerToken: string | null = null
): Promise<NativePurchase> {
    if (!isAvailable) {
        throw new Error('IAP não disponível neste build.');
    }

    const ok = await connectIAP();
    if (!ok) {
        throw new Error(
            'Não foi possível conectar à loja. Verifique sua conta.'
        );
    }

    const request = Platform.OS === 'ios'
        ? { ios: { sku: productId } }
        : {
            android: {
                skus: [productId],
                ...(offerToken
                    ? {
                        subscriptionOffers: [
                            { sku: productId, offerToken }
                        ]
                    }
                    : {})
            }
        };

    return new Promise<NativePurchase>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            updateSub.remove();
            errorSub.remove();
            clearTimeout(timer);
        };

        const timer = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(new Error(
                'Tempo esgotado. Feche e tente novamente.'
            ));
        }, PURCHASE_TIMEOUT_MS);

        const updateSub = _iap!.purchaseUpdatedListener(purchase => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            if (Platform.OS === 'ios') {
                _iap!.finishTransaction({ purchase, isConsumable: false })
                    .catch(() => { /* best-effort */ });
            }
            resolve(purchase);
        });

        const errorSub = _iap!.purchaseErrorListener(err => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            const code = err?.code;
            if (
                code === 'user-cancelled'
                || code === 'E_USER_CANCELLED'
            ) {
                reject(new Error('cancelled'));
                return;
            }
            if (
                code === 'already-owned'
                || code === 'E_ALREADY_OWNED'
            ) {
                _iap!.getAvailablePurchases()
                    .then(purchases => {
                        const match = purchases?.find(
                            p => p.productId === productId
                        ) ?? purchases?.[0];
                        if (match) {
                            resolve(match);
                            return;
                        }
                        reject(new Error(
                            'Você já tem uma assinatura ativa. '
                            + 'Toque em "Restaurar compra".'
                        ));
                    })
                    .catch(() => reject(new Error(
                        'Você já tem uma assinatura ativa. '
                        + 'Toque em "Restaurar compra".'
                    )));
                return;
            }
            reject(new Error(
                err?.message ?? `Erro na compra (${code ?? 'desconhecido'}).`
            ));
        });

        _iap!.requestPurchase({ request, type: 'subs' }).catch(err => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(new Error(
                (err as Error)?.message
                ?? 'Falha ao abrir a loja.'
            ));
        });
    });
}

export async function restorePurchases(): Promise<NativePurchase | null> {
    if (!isAvailable) {
        return null;
    }
    await connectIAP();
    try {
        const purchases = await _iap!.getAvailablePurchases();
        if (!purchases?.length) {
            return null;
        }
        const valid = purchases
            .filter(p => p.productId
                && PRODUCT_ID_LIST.includes(
                    p.productId as typeof PRODUCT_ID_LIST[number]
                )
            )
            .sort((a, b) => {
                const aT = (a as { transactionDate?: number })
                    .transactionDate ?? 0;
                const bT = (b as { transactionDate?: number })
                    .transactionDate ?? 0;
                return bT - aT;
            });
        return valid[0] ?? null;
    } catch (err) {
        console.warn('[iap] restorePurchases failed:', err);
        return null;
    }
}

export async function openSubscriptionManagement(): Promise<boolean> {
    if (!isAvailable) {
        return false;
    }
    try {
        if (Platform.OS === 'ios') {
            await _iap!.deepLinkToSubscriptionsIOS?.();
            return true;
        }
        await _iap!.deepLinkToSubscriptions?.({
            packageNameAndroid: '{{ANDROID_PACKAGE}}',
            skuAndroid: PRODUCT_IDS.annual
        });
        return true;
    } catch (err) {
        console.warn(
            '[iap] openSubscriptionManagement failed:',
            (err as Error)?.message
        );
        return false;
    }
}

interface ValidateResponse {
    ok: boolean;
    is_premium?: boolean;
    user?: ApiUser;
    message?: string;
}

/**
 * Send a purchase receipt to the server. Server talks to Apple/Google
 * and flips the user's is_premium flag. Returns the updated user on
 * success — caller plumbs that back into AuthContext via
 * `activatePremium(updatedUser)`.
 */
export async function validateWithServer(
    purchase: NativePurchase,
    token: string
): Promise<ValidateResponse> {
    let body: Record<string, unknown>;
    if (Platform.OS === 'ios') {
        // StoreKit 2 / react-native-iap v15 no longer exposes a
        // receipt blob — server validates via transactionId using the
        // App Store Server API.
        const originalTransactionId =
            purchase.originalTransactionIdentifierIOS
            ?? purchase.transactionId;
        const transactionId = purchase.transactionId;
        if (!transactionId) {
            return {
                ok: false,
                message: 'No transaction data on purchase'
            };
        }
        body = { platform: 'ios', originalTransactionId, transactionId };
    } else {
        body = {
            platform: 'android',
            purchaseToken: purchase.purchaseToken,
            productId: purchase.productId,
            purchaseData: purchase.dataAndroid ?? null,
            dataSignature: purchase.signatureAndroid ?? null
        };
    }

    try {
        return await fetchApi<ValidateResponse>('/api/iap/validate', {
            method: 'POST',
            token,
            body
        });
    } catch (err) {
        return {
            ok: false,
            message: (err as Error).message ?? 'Erro de rede.'
        };
    }
}

/**
 * Fetch the current premium status from the server. Use this on
 * foreground transitions to catch external cancellations (user
 * cancelled in App Store / Play Store outside the app).
 */
export async function fetchPremiumStatus(token: string): Promise<{
    ok: boolean;
    is_premium: boolean;
}> {
    try {
        return await fetchApi('/api/iap/status', { token });
    } catch (err) {
        console.warn(
            '[iap] fetchPremiumStatus failed:',
            (err as Error).message
        );
        return { ok: false, is_premium: false };
    }
}
