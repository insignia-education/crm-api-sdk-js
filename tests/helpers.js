import CrmApiV1 from '../src/api/v1/index.js';

export const api = new CrmApiV1(process.env.CRM_API_BASE_URL);

// crm-api has no seeded test user (unlike api-sdk-js's TEST_EMAIL, which relies on a seed
// baked into api's base migration) — register() is a live route, so tests create their own
// throwaway user per run instead. email:rfc,dns validation needs a domain that clears
// crm-api's DNS check — example.com does not (verified against a live crm-api instance),
// gmail.com does.
export const registerTestUser = () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    // crm-api's UserService::sanitizeUsername() truncates to 20 chars — "sdk-" (4) leaves
    // 16 for a base36 timestamp+random suffix, well under the cap and still unique per run.
    const shortUnique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const user = {
        email: `sdk-test-${unique}@gmail.com`,
        username: `sdk-${shortUnique}`,
        name: 'SDK Test User',
        password: 'password123',
        password_confirmation: 'password123',
    };
    return api.auth.register(user).then(() => user);
};

export const login = ({ email, password }) => api.auth.login({ email, password });

export const logout = () => api.auth.logout();
