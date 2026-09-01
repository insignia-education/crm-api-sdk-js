# @insignia-education/crm-api-sdk-js

JavaScript SDK for the Insignia Education CRM API.

## Installation

```bash
npm install @insignia-education/crm-api-sdk-js
```

## Configuration

### Environment variable (recommended)

Set `CRM_API_BASE_URL` in your environment and construct with no arguments:

```bash
export CRM_API_BASE_URL=http://localhost:8002
```

```js
import Crm from '@insignia-education/crm-api-sdk-js';

const sdk = new Crm(); // uses CRM_API_BASE_URL or falls back to a placeholder
```

### Explicit base URL

```js
const sdk = new Crm('http://localhost:8002');
```

**URL resolution priority:** explicit `baseUrl` → `CRM_API_BASE_URL` → placeholder default.

## Token management

`crm-api` issues a bearer JWT in the login/refresh response body (not a cookie):

```js
sdk.setToken('your-bearer-token');
sdk.getToken(); // 'your-bearer-token'
```

## Usage

All resources live under `sdk.api.v1` when constructed via the top-level export, or import the
`v1` client directly:

```js
import CrmApiV1 from '@insignia-education/crm-api-sdk-js/api/v1';
const api = new CrmApiV1('http://localhost:8002');
```

---

## Authentication

```js
// Check if email belongs to an existing user or a new registration
await api.auth.loginOrRegister('user@example.com'); // 'login' | 'register'

// Register a new user
await api.auth.register({ email, password, password_confirmation, name, username });

// Login
const { access_token } = await api.auth.login({ email, password });
api.setToken(access_token);

// Login with Google
const { access_token: googleToken } = await api.auth.googleLogin({ credential: googleIdToken });
api.setToken(googleToken);

// Refresh token
const { access_token: refreshed } = await api.auth.refresh();
api.setToken(refreshed);

// Logout
await api.auth.logout();

// Get authenticated user
await api.auth.user();
```

---

## Resources

Only `Auth` exists today — `crm-api`'s route surface is still being rebuilt after a past refactor
stripped most of it down. New resources land here as their `crm-api` routes come back online (see
`AGENTS.md`'s "Never wrap ahead of the backend").

---

## Error handling

All methods return promises. Errors expose a machine-readable `status` (HTTP code) and `data` (raw API body) — no hardcoded messages:

```js
try {
    const user = await api.auth.user();
    console.log(user);
} catch (err) {
    console.error(err.status, err.data);
}
```

---

## Running tests

```bash
npm test
```

## License

MIT
