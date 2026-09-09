import CrmClient from '../src/Client.js';

const BASE = 'http://localhost:8002';

function mockFetch(json = {}) {
    return jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(json) });
}

beforeEach(() => {
    delete process.env.CRM_API_BASE_URL;
});

afterEach(() => {
    delete global.fetch;
    delete process.env.CRM_API_BASE_URL;
});

// ─── baseUrl resolution ───────────────────────────────────────────────────────

describe('baseUrl resolution', () => {
    test('uses explicit baseUrl when provided', async () => {
        global.fetch = mockFetch();
        const client = new CrmClient('https://custom.example.com');
        await client.get('/test');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://custom.example.com/test',
            expect.any(Object)
        );
    });

    test('strips trailing slash from explicit baseUrl', async () => {
        global.fetch = mockFetch();
        const client = new CrmClient('https://custom.example.com/');
        await client.get('/test');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://custom.example.com/test',
            expect.any(Object)
        );
    });

    test('uses CRM_API_BASE_URL env var when baseUrl is null', async () => {
        process.env.CRM_API_BASE_URL = 'https://env.example.com';
        global.fetch = mockFetch();
        const client = new CrmClient(null);
        await client.get('/test');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://env.example.com/test',
            expect.any(Object)
        );
    });

    test('baseUrl getter exposes the resolved base URL', () => {
        const client = new CrmClient('https://custom.example.com/');
        expect(client.baseUrl).toBe('https://custom.example.com');
    });

    test('explicit baseUrl takes precedence over env var', async () => {
        process.env.CRM_API_BASE_URL = 'https://env.example.com';
        global.fetch = mockFetch();
        const client = new CrmClient('https://explicit.example.com');
        await client.get('/test');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://explicit.example.com/test',
            expect.any(Object)
        );
    });
});

// ─── HTTP methods ─────────────────────────────────────────────────────────────

describe('HTTP methods', () => {
    let client;

    beforeEach(() => {
        global.fetch = mockFetch();
        client = new CrmClient(BASE);
    });

    test('get() sends GET with no body', async () => {
        await client.get('/path');
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${BASE}/path`);
        expect(options.method).toBe('GET');
        expect(options.body).toBeUndefined();
    });

    test('get() appends query params, dropping null/undefined', async () => {
        await client.get('/path', { a: 1, b: null, c: undefined });
        const [url] = global.fetch.mock.calls[0];
        expect(url).toBe(`${BASE}/path?a=1`);
    });

    test('post() sends POST with body', async () => {
        await client.post('/path', { key: 'val' });
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${BASE}/path`);
        expect(options.method).toBe('POST');
        expect(options.body).toBe(JSON.stringify({ key: 'val' }));
    });

    test('post() sends POST with no body when not provided', async () => {
        await client.post('/path');
        const [, options] = global.fetch.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(options.body).toBeUndefined();
    });

    test('put() sends PUT with body', async () => {
        await client.put('/path', { key: 'val' });
        const [, options] = global.fetch.mock.calls[0];
        expect(options.method).toBe('PUT');
        expect(options.body).toBe(JSON.stringify({ key: 'val' }));
    });

    test('patch() sends PATCH with body', async () => {
        await client.patch('/path', { key: 'val' });
        const [, options] = global.fetch.mock.calls[0];
        expect(options.method).toBe('PATCH');
        expect(options.body).toBe(JSON.stringify({ key: 'val' }));
    });

    test('del() sends DELETE with no body', async () => {
        await client.del('/path');
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${BASE}/path`);
        expect(options.method).toBe('DELETE');
        expect(options.body).toBeUndefined();
    });

    test('JSON headers are always sent', async () => {
        await client.get('/path');
        const [, options] = global.fetch.mock.calls[0];
        expect(options.headers.Accept).toBe('application/json');
        expect(options.headers['Content-Type']).toBe('application/json');
    });

    test('credentials is always include', async () => {
        await client.get('/path');
        const [, options] = global.fetch.mock.calls[0];
        expect(options.credentials).toBe('include');
    });

    test('stores response cookies and sends them on later requests in Node', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: {
                    getSetCookie: () => ['token=abc123; Path=/; HttpOnly; SameSite=Lax'],
                },
                json: () => Promise.resolve({ success: 'ok' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ id: 1 }),
            });
        client = new CrmClient(BASE);

        await client.post('/auth/login', { email: 'admin@example.com', password: 'secret' });
        await client.get('/organizations/mine');

        const [, options] = global.fetch.mock.calls[1];
        expect(options.headers.Cookie).toBe('token=abc123');
    });

    test('returns parsed JSON from response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: 1, name: 'test' }),
        });
        client = new CrmClient(BASE);
        const result = await client.get('/path');
        expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('unwraps the crm-api response envelope when success is true', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify({ success: true, response: { success: 'ok' } })),
        });
        client = new CrmClient(BASE);
        const result = await client.post('/auth/login', { email: 'a@b.com', password: 'secret' });
        expect(result).toEqual({ success: 'ok' });
    });

    test('returns null for empty response text', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(''),
        });
        client = new CrmClient(BASE);
        const result = await client.get('/path');
        expect(result).toBeNull();
    });

    test('returns null for no-content responses', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 204,
            json: jest.fn(),
        });
        client = new CrmClient(BASE);
        const result = await client.del('/path');
        expect(result).toBeNull();
    });

    test('upload() sends a POST with the raw FormData body and credentials included, no Content-Type', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify({ success: true, response: { id: 1 } })),
        });
        client = new CrmClient(BASE);
        const formData = { append: jest.fn() };
        const result = await client.upload('/files/upload', formData);

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${BASE}/files/upload`);
        expect(options.method).toBe('POST');
        expect(options.body).toBe(formData);
        expect(options.credentials).toBe('include');
        expect(options.headers['Content-Type']).toBeUndefined();
        expect(result).toEqual({ id: 1 });
    });

    test('upload() throws with status and data on a non-2xx response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 422,
            text: () => Promise.resolve(JSON.stringify({ success: false, errors: 'Invalid file' })),
        });
        client = new CrmClient(BASE);
        await expect(client.upload('/files/upload', {})).rejects.toMatchObject({
            status: 422,
            data: { success: false, errors: 'Invalid file' },
        });
    });

    test('throws with status and data on a non-2xx response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: () => Promise.resolve(JSON.stringify({ success: false, errors: 'Unauthorized' })),
        });
        client = new CrmClient(BASE);
        await expect(client.get('/auth/user')).rejects.toMatchObject({
            status: 401,
            data: { success: false, errors: 'Unauthorized' },
        });
    });
});

// ─── getCookie / setCookie ─────────────────────────────────────────────────────

describe('getCookie / setCookie', () => {
    test('getCookie returns null when the cookie was never set', () => {
        const client = new CrmClient(BASE);
        expect(client.getCookie('token')).toBeNull();
    });

    test('setCookie seeds a cookie that is sent on the next request', async () => {
        global.fetch = mockFetch();
        const client = new CrmClient(BASE);
        client.setCookie('token', 'abc123');

        await client.get('/path');

        const [, options] = global.fetch.mock.calls[0];
        expect(options.headers.Cookie).toBe('token=abc123');
    });

    test('getCookie reads back a cookie captured from a response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { getSetCookie: () => ['token=abc123; Path=/; HttpOnly'] },
            json: () => Promise.resolve({ success: 'ok' }),
        });
        const client = new CrmClient(BASE);

        await client.post('/auth/login', { email: 'admin@example.com', password: 'secret' });

        expect(client.getCookie('token')).toBe('abc123');
    });
});
