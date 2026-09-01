import CrmApiV1 from '../src/api/v1/index.js';

export const api = new CrmApiV1(process.env.CRM_API_BASE_URL);

// crm-api has no seeded test user (unlike api-sdk-js's TEST_EMAIL, which relies on a seed
// baked into api's base migration) — register() is a live route, so tests create their own
// throwaway user per run instead. email:rfc,dns validation needs a domain with real MX
// records, hence @example.com rather than a made-up TLD.
export const registerTestUser = () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const user = {
        email: `sdk-test-${unique}@example.com`,
        username: `sdk-test-${unique}`,
        name: 'SDK Test User',
        password: 'password123',
        password_confirmation: 'password123',
    };
    return api.auth.register(user).then(() => user);
};

export const login = ({ email, password }) => api.auth.login({ email, password });

export const logout = () => api.auth.logout();
