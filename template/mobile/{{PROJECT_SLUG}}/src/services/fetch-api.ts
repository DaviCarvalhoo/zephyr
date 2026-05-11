import config from '../config';

export interface ApiError extends Error {
    status?: number;
    payload?: unknown;
}

interface FetchApiOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    token?: string | null;
    timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 15_000;

/**
 * Tiny, typed wrapper around fetch.
 *
 * - Prepends `config.baseApiUrl` to relative paths
 * - JSON-serializes object bodies and sets Content-Type
 * - Adds Bearer auth when `token` is passed
 * - Throws `ApiError` on non-2xx with the parsed payload attached
 * - AbortController-backed timeout (default 15s)
 *
 * Mirrors ui/admin's fetchApi() helper so the mental model travels.
 */
export async function fetchApi<T = unknown>(
    path: string,
    opts: FetchApiOptions = {}
): Promise<T> {
    const { body, token, timeoutMs = DEFAULT_TIMEOUT, headers, ...rest } = opts;
    const url = path.startsWith('http')
        ? path
        : `${config.baseApiUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const finalHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...(headers as Record<string, string> | undefined)
    };

    let finalBody: BodyInit | undefined;
    if (body !== undefined) {
        if (body instanceof FormData) {
            finalBody = body;
        } else {
            finalHeaders['Content-Type'] = 'application/json';
            finalBody = JSON.stringify(body);
        }
    }

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(url, {
            ...rest,
            headers: finalHeaders,
            body: finalBody,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = text;
        }
    }

    if (!response.ok) {
        const message = (payload as { message?: string })?.message
            ?? `Request failed with status ${response.status}`;
        const err = new Error(message) as ApiError;
        err.status = response.status;
        err.payload = payload;
        throw err;
    }

    return payload as T;
}
