import { api, registerTestUser, logout } from '../../../helpers.js';

describe('auth', () => {
    test('loginOrRegister reports "register" for an email with no account', async () => {
        const email = `no-such-user-${Date.now()}@example.com`;
        const result = await api.auth.loginOrRegister(email);
        expect(result).toBe('register');
    });

    test('register creates a user, then loginOrRegister reports "login" for that email', async () => {
        const user = await registerTestUser();
        const result = await api.auth.loginOrRegister(user.email);
        expect(result).toBe('login');
    });

    test('register rejects a duplicate email', async () => {
        const user = await registerTestUser();
        await expect(api.auth.register(user)).rejects.toMatchObject({ status: expect.any(Number) });
    });

    test('login with valid credentials returns a bearer token, and user() then returns the account', async () => {
        const user = await registerTestUser();
        const session = await api.auth.login({ email: user.email, password: user.password });
        expect(session).toMatchObject({ access_token: expect.any(String), token_type: 'bearer' });

        api.setToken(session.access_token);
        const me = await api.auth.user();
        expect(me).toMatchObject({ email: user.email, username: user.username });

        await logout();
        api.setToken(null);
    });

    test('login with a wrong password is rejected', async () => {
        const user = await registerTestUser();
        await expect(
            api.auth.login({ email: user.email, password: 'not-the-right-password' })
        ).rejects.toMatchObject({ status: expect.any(Number) });
    });

    test('user() without a token is rejected', async () => {
        api.setToken(null);
        await expect(api.auth.user()).rejects.toMatchObject({ status: 401 });
    });

    test('refresh issues a new token for an authenticated session', async () => {
        const user = await registerTestUser();
        const session = await api.auth.login({ email: user.email, password: user.password });
        api.setToken(session.access_token);

        const refreshed = await api.auth.refresh();
        expect(refreshed).toMatchObject({ access_token: expect.any(String), token_type: 'bearer' });

        await logout();
        api.setToken(null);
    });
});
