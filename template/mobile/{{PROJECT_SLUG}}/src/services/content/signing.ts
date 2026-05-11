/**
 * HMAC signing for content asset URLs.
 *
 * Wire format (matches server/apps/api/routes/content.ts):
 *   ts  = floor(Date.now() / 1000)
 *   sig = HMAC-SHA256(secret, "${ts}:${contentPath}") — hex
 *
 * The shared secret is symmetric — both the server (CONTENT_SECRET
 * env var) and the client (CONTENT_SECRET below) use the same value.
 * Rotate by changing both at once. The 5-minute replay window on the
 * server limits the useful life of any leaked signature.
 *
 * Pure JS so this works in Expo Go without any native modules.
 */

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

// CHANGE THIS to a long random string and keep it in sync with
// server/.env CONTENT_SECRET. Same value at both ends.
export const CONTENT_SECRET = '{{CONTENT_SECRET}}';

interface SignedHeaders {
    'X-Content-Timestamp': string;
    'X-Content-Signature': string;
    Accept: string;
}

function hmacHex(message: string): string {
    return bytesToHex(
        hmac(sha256, utf8ToBytes(CONTENT_SECRET), utf8ToBytes(message))
    );
}

export function signedHeaders(contentPath: string): SignedHeaders {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = hmacHex(`${ts}:${contentPath}`);
    return {
        'X-Content-Timestamp': ts,
        'X-Content-Signature': sig,
        Accept: 'application/json'
    };
}
