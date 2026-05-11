/**
 * Asset cache. Server hands out presigned S3 URLs; we cache them in
 * memory for ~55 minutes (the server expires them at 60 min) so a
 * given asset only triggers one server round-trip per session.
 *
 * For *bytes-on-disk* caching of large media, layer expo-file-system
 * on top of `getAssetUrl` — download once, then check the file before
 * re-resolving. This module is intentionally URL-only so the simple
 * case (image, small audio) works without any disk management.
 */

import { fetchApi } from '../fetch-api';
import { signedHeaders } from './signing';

interface SignResponse {
    ok: boolean;
    url: string;
    size?: number;
    message?: string;
}

const PRESIGN_TTL_MS = 55 * 60 * 1000;
const _cache = new Map<string, { url: string; expiresAt: number }>();

async function fetchPresigned(contentPath: string): Promise<string> {
    const res = await fetchApi<SignResponse>('/api/content/sign', {
        method: 'POST',
        body: { path: contentPath },
        headers: signedHeaders(contentPath) as
            unknown as Record<string, string>
    });
    if (!res.ok || !res.url) {
        const err = new Error(res.message ?? 'Sign failed') as Error & {
            status?: number;
        };
        throw err;
    }
    return res.url;
}

/**
 * Resolve a content path to a streaming-ready S3 URL. Cached for ~55
 * minutes per session. Retries once on transient failures (network or
 * 5xx) — permanent failures (4xx) bubble up immediately.
 */
export async function getAssetUrl(contentPath: string): Promise<string> {
    const cached = _cache.get(contentPath);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
    }

    let url: string;
    try {
        url = await fetchPresigned(contentPath);
    } catch (err) {
        const status = (err as { status?: number }).status;
        if (status && status < 500) {
            throw err;
        }
        await new Promise(r => setTimeout(r, 500));
        url = await fetchPresigned(contentPath);
    }

    _cache.set(contentPath, {
        url,
        expiresAt: Date.now() + PRESIGN_TTL_MS
    });
    return url;
}

/** Drop the entire cache. Useful for tests or after a sign-out. */
export function clearAssetCache(): void {
    _cache.clear();
}
