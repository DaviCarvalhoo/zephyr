import { API_BASE_URL } from './config';

export { API_BASE_URL };

class FetchApi {
    private abortController?: AbortController;
    public error: Error | null = null;
    public isLoading = false;

    constructor(abortController?: AbortController) {
        this.abortController = abortController;
    }

    async doRequest(
        url: string,
        body: unknown,
        method: 'GET' | 'POST' | 'DELETE',
        headers: Record<string, string> = {}
    ): Promise<any> {
        const isFormData = body instanceof FormData;

        if (!isFormData) {
            headers['Accept'] = 'application/json';
            headers['Content-Type'] = 'application/json';
        }

        let parsedBody = body;

        if (parsedBody && typeof parsedBody === 'string') {
            parsedBody = JSON.parse(parsedBody);
        }

        let requestUrl = `${API_BASE_URL}/api/${url}`;
        let requestBody: string | FormData | null = null;

        if (method === 'GET' && parsedBody) {
            requestUrl = `${requestUrl}?${new URLSearchParams(parsedBody as Record<string, string>)}`;
        } else if (parsedBody) {
            requestBody = isFormData
                ? (parsedBody as FormData)
                : JSON.stringify(parsedBody);
        }

        const errorStack = new Error();

        try {
            this.isLoading = true;

            const response = await fetch(requestUrl, {
                method,
                credentials: 'include',
                headers,
                body: requestBody,
                signal: this.abortController?.signal
            });

            if (response.ok) {
                return await response.json();
            }

            throw response;
        } catch (ex: any) {
            console.error(ex);
            this.error = ex;

            if (ex.body) {
                try {
                    const json = await ex.json();
                    ex.message = json.message || json.msg;
                } catch {
                    // ignore parse error
                }
            }

            if (ex.status === 401 || ex.status === 403) {
                if (!window.location.pathname.includes('/login')) {
                    sessionStorage.clear();
                    localStorage.removeItem('lastAccountId');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            }

            errorStack.message = ex.message || ex.statusText;
            throw errorStack;
        } finally {
            this.isLoading = false;
        }
    }
}

export default function fetchApi(
    url: string,
    body?: unknown,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    headers?: Record<string, string>,
    abortController?: AbortController
): Promise<any> {
    const instance = new FetchApi(abortController);
    return instance.doRequest(url, body, method, headers || {});
}
