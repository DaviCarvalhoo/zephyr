/**
 * OAuth provider verification — Apple Sign-In + Google.
 *
 * Both providers issue id_tokens (signed JWTs). We verify them by
 * fetching the issuer's public JWKS, matching `kid` in the JWT header
 * to a key, and verifying the RS256 signature.
 *
 * No external SDK — keeps the dependency footprint small and the
 * verification logic auditable. Cache the JWKS for 24h.
 */

import https from 'node:https';
import crypto from 'node:crypto';

interface Jwk {
    kid: string;
    kty: string;
    n: string;
    e: string;
    alg?: string;
}

interface JwksResponse {
    keys: Jwk[];
}

interface JwtPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
    [extra: string]: unknown;
}

interface JwtHeader {
    alg: string;
    kid: string;
    typ?: string;
}

const JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const _jwksCache = new Map<string, { keys: Jwk[]; expiresAt: number }>();

const APPLE_JWKS_URL  = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER    = 'https://appleid.apple.com';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS  = new Set([
    'https://accounts.google.com',
    'accounts.google.com'
]);

function fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data) as T);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

async function getJwks(url: string): Promise<Jwk[]> {
    const cached = _jwksCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.keys;
    }
    const res = await fetchJson<JwksResponse>(url);
    _jwksCache.set(url, {
        keys: res.keys,
        expiresAt: Date.now() + JWKS_CACHE_TTL_MS
    });
    return res.keys;
}

function base64UrlDecode(input: string): Buffer {
    const padded = input
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
    return Buffer.from(padded, 'base64');
}

function jwkToPem(jwk: Jwk): string {
    // Cast through unknown — node's JsonWebKey type has an index
    // signature for [key: string], which our minimal Jwk shape
    // doesn't (intentionally; we only consume the fields we trust).
    const key = crypto.createPublicKey({
        key: jwk as unknown as crypto.JsonWebKey,
        format: 'jwk'
    });
    return key.export({ type: 'spki', format: 'pem' }).toString();
}

async function verifyIdToken(
    idToken: string,
    jwksUrl: string,
    expectedIssuer: Set<string>,
    expectedAudience: string | string[]
): Promise<JwtPayload> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
        throw new Error('Malformed id_token');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(
        base64UrlDecode(headerB64).toString('utf8')
    ) as JwtHeader;
    const payload = JSON.parse(
        base64UrlDecode(payloadB64).toString('utf8')
    ) as JwtPayload;

    if (header.alg !== 'RS256') {
        throw new Error(`Unsupported alg: ${header.alg}`);
    }

    const keys = await getJwks(jwksUrl);
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) {
        throw new Error('Signing key not found');
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const sig = base64UrlDecode(signatureB64);

    const ok = verifier.verify(jwkToPem(jwk), sig);
    if (!ok) {
        throw new Error('Invalid signature');
    }

    if (!payload.iss || !expectedIssuer.has(payload.iss)) {
        throw new Error(`Bad issuer: ${payload.iss ?? 'missing'}`);
    }

    const audiences = Array.isArray(payload.aud)
        ? payload.aud
        : [payload.aud];
    const allowed = Array.isArray(expectedAudience)
        ? expectedAudience
        : [expectedAudience];
    const audMatch = audiences.some(a => a && allowed.includes(a));
    if (!audMatch) {
        throw new Error(`Bad audience: ${audiences.join(', ')}`);
    }

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
    }

    return payload;
}

export interface VerifiedAppleToken {
    sub: string;
    email?: string;
}

export async function verifyAppleIdToken(
    idToken: string,
    audience: string | string[]
): Promise<VerifiedAppleToken> {
    const payload = await verifyIdToken(
        idToken,
        APPLE_JWKS_URL,
        new Set([APPLE_ISSUER]),
        audience
    );
    if (!payload.sub) {
        throw new Error('Apple token missing sub');
    }
    return {
        sub: payload.sub,
        email: payload.email
    };
}

export interface VerifiedGoogleToken {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
}

export async function verifyGoogleIdToken(
    idToken: string,
    audience: string | string[]
): Promise<VerifiedGoogleToken> {
    const payload = await verifyIdToken(
        idToken,
        GOOGLE_JWKS_URL,
        GOOGLE_ISSUERS,
        audience
    );
    if (!payload.sub || !payload.email) {
        throw new Error('Google token missing sub or email');
    }
    if (
        payload.email_verified !== true
        && payload.email_verified !== 'true'
    ) {
        throw new Error('Google email not verified');
    }
    return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
    };
}

/**
 * Exchange an authorization code for tokens (server-side OAuth flow).
 * Used by /api/auth/google/callback when the browser redirects back
 * with `?code=...`.
 */
export async function exchangeGoogleCode(args: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}): Promise<{ id_token: string; access_token: string }> {
    const body = new URLSearchParams({
        code: args.code,
        client_id: args.clientId,
        client_secret: args.clientSecret,
        redirect_uri: args.redirectUri,
        grant_type: 'authorization_code'
    }).toString();

    return new Promise((resolve, reject) => {
        const req = https.request(
            'https://oauth2.googleapis.com/token',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body).toString()
                }
            },
            res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(
                                `Google token exchange failed: `
                                + `${parsed.error ?? data}`
                            ));
                            return;
                        }
                        resolve(parsed);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
