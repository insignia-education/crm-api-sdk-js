import { api, registerTestUser, login, logout } from '../../../helpers.js';

describe('Webauthn', () => {
    test('credentials list is empty for a fresh user', async () => {
        const user = await registerTestUser();
        await login(user);
        const list = await api.webauthn.credentials();
        expect(list).toEqual([]);
        await logout();
    });

    test('registerOptions returns browser-ready creation options', async () => {
        const user = await registerTestUser();
        await login(user);
        const options = await api.webauthn.registerOptions();
        expect(typeof options.challenge).toBe('string');
        expect(options.rp).toMatchObject({ id: expect.any(String) });
        expect(options.user).toMatchObject({ name: user.username });
        expect(Array.isArray(options.pubKeyCredParams)).toBe(true);
        await logout();
    });

    test('register rejects a malformed credential', async () => {
        const user = await registerTestUser();
        await login(user);
        await api.webauthn.registerOptions();
        await expect(api.webauthn.register({ not: 'a real credential' })).rejects.toBeTruthy();
        await logout();
    });

    test('deleteCredential 404s for a nonexistent id', async () => {
        const user = await registerTestUser();
        await login(user);
        await expect(api.webauthn.deleteCredential(999999)).rejects.toMatchObject({ status: 404 });
        await logout();
    });

    test('requires a session', async () => {
        await expect(api.webauthn.credentials()).rejects.toMatchObject({ status: 401 });
    });
});
