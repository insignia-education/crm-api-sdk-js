# Insignia Education — CRM API SDK (JavaScript)

## Requirements
- Node 25 (`nvm use 25`)

## Quick start
```bash
nvm use 25
npm install
npm test       # runs Jest test suite
npm run lint   # ESLint
```

## What this is
A zero-dependency JavaScript SDK that wraps the Insignia Education CRM API (`/api/v1`).
Consumed by `insignia-education/crm-front` via `@insignia-education/crm-api-sdk-js`.

## API versioning
The SDK is versioned to match the API:

- `src/index.js` — base client
- `src/api/index.js` — appends `/api` to the base URL
- `src/api/v1/index.js` — appends `/v1` → all requests land at `<host>/api/v1/...`
- **v1 is being finalized. Once stable it is permanently frozen.**
- A future v2 API will live in `src/api/v2/index.js` (new class, new resource modules).
- Never modify the URL construction logic in `v1/` to point at a different version.
- Tests for each version live in `tests/integration/api/v1/` — mirror this structure for v2+.
- The `upload(path, formData)` method on `Client` sends multipart — use `api.files.upload(fd)` for any file upload, never raw `fetch()` (once a `Files` resource exists — see "Never wrap ahead of the backend" below).

## Structure
```
src/
├── index.js            ← main export
├── api/v1/
│   ├── index.js        ← CrmApiV1 class (root client)
│   ├── Auth.js         ← /auth endpoints
│   └── ...             ← one file per API resource
```

## Usage pattern
```js
import CrmApiV1 from '@insignia-education/crm-api-sdk-js/api/v1';
const api = new CrmApiV1('http://localhost:8002');

api.auth.login({ email, password });
api.setToken(response.access_token);
api.auth.user();
```

## Conventions
- One class per API resource
- Methods match HTTP verbs: `get`, `post`, `put`, `patch`, `delete`
- No external runtime dependencies — only Node built-ins
- ESM modules (`"type": "module"`)
- Auth is bearer-token, not cookie: `client.setToken(token)`/`client.getToken()`, sent as
  `Authorization: Bearer <token>` — this is the one place this SDK's `Client.js` differs in
  *mechanism* (not just config) from `api-sdk-js`, because `crm-api` issues a JWT in the response
  body (`tymon/jwt-auth`), not a `Set-Cookie` header.

## Never wrap ahead of the backend

`crm-api`'s route surface is still being rebuilt (a past refactor stripped most of it down to just
`auth`). **Only add a resource method for a route that actually exists and responds in `crm-api`
right now** — check `crm-api/src/routes/api.php` and the matching controller before writing
anything. This SDK growing ahead of the backend is worse than it lagging behind: a method that
looks like it works but 404s in practice is a silent trap for `crm-front`.

## Adding a new resource
1. Confirm the route is live in `crm-api` (see above) — if it isn't, stop; this is `crm-api` work, not SDK work.
2. Create `src/api/v1/ResourceName.js` with a class that receives the client
3. Register it in `src/api/v1/index.js`
4. Write integration tests in `tests/integration/api/v1/resource-name.test.js`

Verify a new/changed method by running its integration test against a locally running `crm-api`
(`npm test`), not by scripting one-off `curl`/fetch calls in a shell. The integration test is the
artifact that proves the SDK and the API agree, and it's what keeps both repos in sync going
forward — a curl call proves nothing once the terminal closes.

`crm-api` has no seeded test user (unlike `api`'s base migration) — `tests/helpers.js`'s
`registerTestUser()` creates a throwaway account per test run via the live `register` endpoint
instead. Reuse that helper rather than adding fixture/seed data.

## Testing coverage requirements

Same pattern as `api`'s endpoint tests, applied per SDK method:

- **Missing/malformed params** — call each method with required params omitted and with wrong-format values; confirm the SDK surfaces the API's validation error correctly rather than swallowing it or throwing something unrelated.
- **Permissions** — exercise each method as every relevant user role (including unauthenticated) against the API and confirm the SDK surfaces 401/403 correctly — not just the happy-path success response for the one role the method was built for.

## Internationalisation (i18n)
The SDK is language-neutral — it must never contain human-readable strings.

- Do not include hardcoded error messages or labels in SDK source.
- Error objects thrown by the SDK must expose a machine-readable `status` (HTTP code) and `data` (raw API body). The consuming app handles translation.
- Do not add locale/language logic to the SDK — that belongs to the frontend.

## API ↔ SDK sync rule

**This SDK must stay in sync with [`insignia-education/crm-api`](../crm-api) at all times.** Any endpoint added, renamed, or removed in the API must be reflected here in the same task/commit — this rule exists from day one, not after some future point when the SDK "catches up."

- New endpoint in `crm-api` → new method in the correct `src/api/v1/*.js` class
- Removed endpoint → remove or deprecate the corresponding SDK method
- Never leave the SDK behind the API; the `crm-front` repo relies solely on this SDK for anything migrated off its old `API/` directory

## Every change bumps the version and propagates to `crm-front`

**Any change to this SDK — a new method, a signature change, even a doc-comment-only edit — must, in the same task:**

1. Bump `package.json`'s version (`npm version patch` for routine changes, `minor` only for a
   genuinely new capability — see "SDK version bumps" precedent; never bump `major`, v1 is frozen).
2. Commit the bump alongside the code change (not as a separate, later task) and push to `master`
   so CI publishes it (see `CLAUDE.md`'s Deployment section).
3. Pin the exact new version (no `^`/`~`) in `crm-front/package.json` and run `npm install` there.

Skipping step 1 is what makes `npm publish`/CI publish fail with "cannot publish over the
previously published version" — the version in `package.json` must always be higher than what's
already on the registry, with no exceptions for "small" changes. Skipping step 3 leaves that
consumer silently running stale SDK code with no error.

## Consumption — never symlink

`crm-front` must install this package the normal npm way — **never** via a symlink
(`npm link`, a manual `ln -s` into a consumer's `node_modules`, etc.), even for local iteration.

- A symlinked package looks like it works, but an `npm install`/`npm ci` in the consumer repo can
  silently replace the link with a stale registry copy — the consumer keeps running old SDK code
  with no error, and edits stop propagating until someone notices at runtime.
- Instead: bump this package's version (`npm version patch|minor` — the pre-commit hook rejects a
  commit whose version is already published, so this can't be skipped) and commit it. CI
  (`.github/workflows/npm-publish.yml`) publishes automatically on push to
  master — it does **not** bump the version itself, and it does **not** touch any consumer repo,
  so pin the exact new version (no `^`/`~`) in the consumer's `package.json` and run
  `npm install` there yourself.
- Never publish on your own initiative — pushing the version-bump commit to master is what
  triggers it; don't run `npm publish` by hand.

## Never do
- Don't add runtime dependencies
- Don't change the constructor signature of `CrmApiV1`
- Don't hardcode API base URLs — always receive from constructor
- Don't add a resource method for a route that doesn't exist in `crm-api` yet
- Don't let the SDK lag behind `crm-api` — update both in the same task
- Don't symlink this package into a consumer's `node_modules` — publish it instead
- Don't commit an SDK change without bumping the version and pinning/installing it in `crm-front` in the same task


---

## Working Style

- **Think before coding.** State your assumptions out loud. If the request is ambiguous, ask. If a simpler approach exists, push back. Stop when confused — name what is unclear; do not pick one interpretation and run.
- **Simplicity first.** Write the minimum code that solves the problem. No speculative abstractions. No flexibility nobody asked for. The test: would a senior engineer call this overcomplicated?
- **Surgical changes.** Touch only what the task requires. Do not improve neighboring code. Do not refactor what is not broken. Every changed line must trace back to the request.
- **Goal-driven execution.** Turn vague instructions into verifiable targets before writing a line. "Add validation" becomes "write tests for invalid inputs, then make them pass."
## Git

- **NEVER commit in the agent's or Claude's name.** All commits must be authored solely by the human developer. Do not add `Co-Authored-By` trailers that name Claude or any AI agent — in shared/collaborative repositories this would falsely attribute work and obscure accountability.


## Communication style
- Respond as briefly as possible. Caveman mode: shortest answer that works. No fluff, no summaries, no "here is what I did".

---

## Git safety (CRITICAL — read every session)

**DO NOT MESS WITH GIT.** DO NOT run `git checkout`, `git stash`, `git reset`, `git restore`,
`git clean`, or any command that discards or overwrites working-tree changes. These repos often
carry large amounts of **uncommitted** work, and these commands will destroy it irreversibly.

If you need to change the current branch: **commit the work first, or ask the user to commit.**
Never revert, discard, or overwrite changes via git without explicit permission from the user.
