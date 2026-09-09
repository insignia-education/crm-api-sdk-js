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
export CRM_API_BASE_URL=https://your-instance.com
```

```js
import Crm from '@insignia-education/crm-api-sdk-js/src/index.js';

const sdk = new Crm(); // uses CRM_API_BASE_URL or defaults to a placeholder URL
```

### Explicit base URL

```js
const sdk = new Crm('https://your-instance.com');
```

**URL resolution priority:** explicit `baseUrl` → `CRM_API_BASE_URL` → placeholder default.

## Session management

`crm-api` issues its JWT as an httpOnly `token` cookie (`Set-Cookie`, not the response body) — every
request goes out with `credentials: 'include'`, so in the browser the cookie is attached and read
automatically; you never touch it directly.

In Node (no native cookie jar on `fetch`), the client captures `Set-Cookie` from each response into
an in-memory map and replays it as a `Cookie:` header on subsequent requests — this happens
automatically too, but `getCookie(name)`/`setCookie(name, value)` are available to persist or
rehydrate a session's cookie between runs (e.g. a test suite or script):

```js
sdk.getCookie('token');
sdk.setCookie('token', 'value-captured-earlier');
```

## Usage

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
await api.auth.register({
    email: 'user@example.com',
    username: 'someuser',
    name: 'Some User',
    password: 'secret',
    password_confirmation: 'secret',
});

// Login — sets the httpOnly session cookie, no token in the response
await api.auth.login({ email: 'user@example.com', password: 'secret' });

// Login with Google
await api.auth.googleLogin({ credential: 'google-id-token' });

// Refresh the session cookie
await api.auth.refresh();

// Get authenticated user
await api.auth.user();

// Logout — clears the session cookie server-side
await api.auth.logout();
```

---

## Resources

Only `auth` is wrapped right now — `crm-api`'s other routes are mid-rebuild. New resource classes
land here in the same task their matching `crm-api` route goes live (see `AGENTS.md`).

---

## Error handling

All methods return promises and throw on any non-2xx response, with `status` (HTTP code) and
`data` (the raw API error body) attached:

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
