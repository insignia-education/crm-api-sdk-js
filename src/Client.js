export default class CrmClient {
    #baseUrl;
    #cookies = new Map();

    constructor(baseUrl) {
        this.#baseUrl = CrmClient._resolve(baseUrl);
    }

    /** For building direct links (e.g. a file-download endpoint meant for <a href>/window.open, not a JSON fetch). */
    get baseUrl() {
        return this.#baseUrl;
    }

    /** Node only — reads back a cookie captured from a prior response (e.g. to persist a session's JWT). */
    getCookie(name) {
        return this.#cookies.get(name) ?? null;
    }

    /** Node only — seeds a cookie onto this client (e.g. to rehydrate a session captured earlier) so it's sent on subsequent requests. */
    setCookie(name, value) {
        this.#cookies.set(name, value);
    }

    static _resolve(baseUrl) {
        const envBaseUrl = typeof process !== 'undefined'
            ? process.env?.CRM_API_BASE_URL ?? null
            : null;

        // Placeholder default — crm-api's production domain isn't finalized yet
        // (beta is api.beta.zubi.solutions). Real consumers should always pass
        // an explicit baseUrl or set CRM_API_BASE_URL.
        baseUrl = baseUrl ?? envBaseUrl ?? 'https://api.zubi.solutions';
        baseUrl = baseUrl.replace(/\/$/, '');
        return baseUrl;
    }

    #headers() {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        if (this.#baseUrl.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';

        const cookie = this.#cookieHeader();
        if (cookie) headers.Cookie = cookie;

        return headers;
    }

    #cookieHeader() {
        if (typeof window !== 'undefined' || this.#cookies.size === 0) return null;

        return Array.from(this.#cookies.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    #storeCookies(response) {
        if (typeof window !== 'undefined') return;

        const headers = response.headers;
        const setCookies = typeof headers?.getSetCookie === 'function'
            ? headers.getSetCookie()
            : [headers?.get?.('set-cookie')].filter(Boolean);

        for (const setCookie of setCookies) {
            const [pair] = setCookie.split(';');
            const separator = pair.indexOf('=');
            if (separator === -1) continue;

            this.#cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
    }

    async #parseResponse(response) {
        if ([204, 205].includes(response.status)) return null;

        try {
            if (typeof response.text === 'function') {
                const text = await response.text();
                return text === '' ? null : JSON.parse(text);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof SyntaxError && error.message.includes('Unexpected end')) {
                return null;
            }
            throw error;
        }
    }

    async #request(method, path, body = null) {
        const options = { method, headers: this.#headers(), credentials: 'include' };
        if (body !== null) options.body = JSON.stringify(body);
        const response = await fetch(`${this.#baseUrl}${path}`, options);
        this.#storeCookies(response);
        if (!response.ok) {
            const err = new Error(`HTTP ${response.status}`);
            err.status = response.status;
            try { err.data = await this.#parseResponse(response); } catch { /* body wasn't parseable — leave err.data unset */ }
            throw err;
        }
        const data = await this.#parseResponse(response);
        return data?.success ? data.response : data;
    }

    async upload(path, formData) {
        const headers = { 'Accept': 'application/json' };
        if (this.#baseUrl.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';
        const cookie = this.#cookieHeader();
        if (cookie) headers.Cookie = cookie;
        // POST, not PUT: PHP only parses multipart/form-data bodies into $_FILES for
        // POST requests — a PUT with the exact same body leaves $_FILES empty and the
        // raw body unread, so `$request->file(...)` is always null server-side.
        const response = await fetch(`${this.#baseUrl}${path}`, {
            method: 'POST', headers, credentials: 'include', body: formData,
        });
        this.#storeCookies(response);
        if (!response.ok) {
            const err = new Error(`HTTP ${response.status}`);
            err.status = response.status;
            try { err.data = await this.#parseResponse(response); } catch { /* body wasn't parseable — leave err.data unset */ }
            throw err;
        }
        const data = await this.#parseResponse(response);
        return data?.success ? data.response : data;
    }

    get(path, params = null) {
        if (params && typeof params === 'object') {
            const qs = new URLSearchParams(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
            ).toString();
            if (qs) path += (path.includes('?') ? '&' : '?') + qs;
        }
        return this.#request('GET', path);
    }
    post(path, body = null) { return this.#request('POST',   path, body); }
    put(path, body = null)  { return this.#request('PUT',    path, body); }
    patch(path, body = null){ return this.#request('PATCH',  path, body); }
    del(path, body = null)  { return this.#request('DELETE', path, body); }
}
