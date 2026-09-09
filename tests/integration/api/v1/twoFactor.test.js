import { api, registerTestUser, login, logout } from '../../../helpers.js';
import { totp } from '../../../totp.js';

describe('TwoFactor', () => {
    test('status is disabled for a fresh user', async () => {
        const user = await registerTestUser();
        await login(user);
        const status = await api.twoFactor.status();
        expect(status).toEqual({ enabled: false });
        await logout();
    });

    test('setup returns a secret and otpauth_url', async () => {
        const user = await registerTestUser();
        await login(user);
        const setup = await api.twoFactor.setup();
        expect(typeof setup.secret).toBe('string');
        expect(setup.otpauth_url).toContain('otpauth://totp/');
        await logout();
    });

    test('enable rejects an invalid code', async () => {
        const user = await registerTestUser();
        await login(user);
        await api.twoFactor.setup();
        await expect(api.twoFactor.enable({ pin: '000000' })).rejects.toMatchObject({ status: 422 });
        await logout();
    });

    test('full cycle: setup, enable, login requires 2FA, exchange, disable', async () => {
        const user = await registerTestUser();
        await login(user);
        const { secret } = await api.twoFactor.setup();
        const enable = await api.twoFactor.enable({ pin: totp(secret) });
        expect(enable).toEqual({ enabled: true });

        const statusOn = await api.twoFactor.status();
        expect(statusOn).toEqual({ enabled: true });

        await logout();

        // Fresh login now requires the second factor instead of a real session.
        const loginResult = await login(user);
        expect(loginResult).toEqual({ two_factor_required: true });
        await expect(api.auth.user()).rejects.toMatchObject({ status: 401 });

        const exchange = await api.auth.twoFactor({ pin: totp(secret) });
        expect(exchange).toEqual({ success: 'ok' });

        const me = await api.auth.user();
        expect(me).toMatchObject({ email: user.email });

        const disable = await api.twoFactor.disable({ pin: totp(secret) });
        expect(disable).toEqual({ enabled: false });

        await logout();
    });

    test('disable rejects when not enabled', async () => {
        const user = await registerTestUser();
        await login(user);
        await expect(api.twoFactor.disable({ pin: '123456' })).rejects.toMatchObject({ status: 422 });
        await logout();
    });
});
