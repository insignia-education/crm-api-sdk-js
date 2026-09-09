import { api, registerTestUser, login, logout } from '../../../helpers.js';

describe('Users', () => {
    test('get("me") returns the authenticated user', async () => {
        const user = await registerTestUser();
        await login(user);
        const me = await api.users.get('me');
        expect(me).toMatchObject({ username: user.username, email: user.email });
        await logout();
    });

    test('get(username) resolves the same user as "me"', async () => {
        const user = await registerTestUser();
        await login(user);
        const byUsername = await api.users.get(user.username);
        expect(byUsername).toMatchObject({ username: user.username });
        await logout();
    });

    test('get(username) 404s for a nonexistent username', async () => {
        const user = await registerTestUser();
        await login(user);
        await expect(api.users.get('nonexistent-user-xyz')).rejects.toMatchObject({ status: 404 });
        await logout();
    });

    test('get requires a session', async () => {
        await expect(api.users.get('me')).rejects.toMatchObject({ status: 401 });
    });

    test('edit updates name without requiring a password', async () => {
        const user = await registerTestUser();
        await login(user);
        const updated = await api.users.edit('me', {
            name: 'Updated Name',
            username: user.username,
            email: user.email,
        });
        expect(updated).toMatchObject({ name: 'Updated Name' });
        await logout();
    });

    test('organizations requires a session', async () => {
        await expect(api.users.organizations('me')).rejects.toMatchObject({ status: 401 });
    });

    test('organizations rejects a non-seller viewer, even for their own profile', async () => {
        // Freshly registered users are plain clients — this endpoint is
        // sellers-and-above only, a staff-facing view, not self-service.
        const user = await registerTestUser();
        await login(user);
        await expect(api.users.organizations('me')).rejects.toMatchObject({ status: 403 });
        await logout();
    });
});
