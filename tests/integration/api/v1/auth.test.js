import { api, registerTestUser, login, logout } from '../../../helpers.js';

describe('Auth', () => {
    test('loginOrRegister reflects whether the email belongs to an existing user', async () => {
        const user = await registerTestUser();
        await logout();
        const result = await api.auth.loginOrRegister(user.email);
        expect(result).toEqual(['login']);
    });

    test('loginOrRegister returns register for an email with no account', async () => {
        const result = await api.auth.loginOrRegister(`nobody-${Date.now()}@gmail.com`);
        expect(result).toEqual(['register']);
    });

    test('register creates a user, logs them in, and returns the user', async () => {
        // username gets truncated to 20 chars by crm-api — "sdk-register-" (13) + unique must fit.
        const unique = `${Date.now()}`.slice(-7);
        const result = await api.auth.register({
            email: `sdk-register-${unique}@gmail.com`,
            username: `sdk-register-${unique}`,
            name: 'SDK Register Test',
            password: 'password123',
            password_confirmation: 'password123',
        });
        expect(result).toMatchObject({ username: `sdk-register-${unique}` });
        // register() logs the user in immediately (crm-api sets the `token` cookie
        // on the same response), so a follow-up authenticated call should work
        // without a separate login().
        const me = await api.auth.user();
        expect(me).toMatchObject({ username: `sdk-register-${unique}` });
        await logout();
    });

    test('register surfaces a validation error for a missing required field', async () => {
        await expect(api.auth.register({ email: 'missing-fields@gmail.com' })).rejects.toMatchObject({
            status: 422,
        });
    });

    test('login sets the session cookie for valid credentials', async () => {
        const user = await registerTestUser();
        await logout();
        const result = await login(user);
        expect(result).toMatchObject({ success: 'ok' });
        const me = await api.auth.user();
        expect(me).toMatchObject({ email: user.email });
        await logout();
    });

    test('login rejects an unknown email/password combination', async () => {
        await expect(login({ email: 'nobody@gmail.com', password: 'wrong' })).rejects.toBeTruthy();
    });

    test('user() returns the authenticated user once logged in', async () => {
        const user = await registerTestUser();
        await login(user);
        const me = await api.auth.user();
        expect(me).toMatchObject({ email: user.email });
        await logout();
    });

    test('user() rejects without a session', async () => {
        await expect(api.auth.user()).rejects.toMatchObject({ status: 401 });
    });

    test('refresh issues a new session cookie for an authenticated session', async () => {
        const user = await registerTestUser();
        await login(user);
        const refreshed = await api.auth.refresh();
        expect(refreshed).toMatchObject({ token_type: 'bearer' });
        const me = await api.auth.user();
        expect(me).toMatchObject({ email: user.email });
        await logout();
    });

    test('logout invalidates the current session', async () => {
        const user = await registerTestUser();
        await login(user);
        await logout();
        await expect(api.auth.user()).rejects.toMatchObject({ status: 401 });
    });
});
