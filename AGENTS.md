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

Sibling of [`insignia-education/api-sdk-js`](../api-sdk-js) (same conventions, wraps a different
backend — `crm-api` instead of `api`). If you already know that repo, this one will look familiar
on purpose.

## API versioning
The SDK is versioned to match the API:

- `src/index.js` — base client
- `src/api/index.js` — appends `/api` to the base URL
- `src/api/v1/index.js` — appends `/v1` → all requests land at `<host>/api/v1/...`
- `v1` mirrors `crm-api`'s own `v1` prefix. Once `v1` is stable it should be treated as frozen,
  same discipline as `api-sdk-js`'s `v1` — a future `v2` would live in `src/api/v2/index.js`
  alongside it, never replacing it.
- Never modify the URL construction logic in `v1/` to point at a different version.
- Tests for each version live in `tests/integration/api/v1/` — mirror this structure for v2+.
- The `upload(path, formData)` method on `Client` sends multipart — use `api.files.upload(fd)` for
  any file upload, never raw `fetch()`.

## Structure
```
src/
├── index.js            ← main export
├── api/v1/
│   ├── index.js        ← CrmApiV1 class (root client)
│   ├── Auth.js         ← /auth endpoints
│   └── ...             ← one file per crm-api resource, added as crm-api's routes come online
```

## Scope right now — only what's actually live in `crm-api`

`crm-api/src/routes/api.php` currently only has the `auth` group registered (login, register,
refresh, logout, google login, login-register-check, user) — everything else is mid-rebuild. This
SDK only wraps `Auth` for the same reason `api-sdk-js` never wraps ahead of `api`: **if you can't
point at the route/controller in `crm-api` that justifies a method, don't add it.** Add a resource
class here in the same task its matching `crm-api` route actually gets built, not before.

## Usage pattern
```js
import CrmApiV1 from '@insignia-education/crm-api-sdk-js/api/v1';
const api = new CrmApiV1('http://localhost:8002');

await api.auth.login({ email, password });
await api.auth.user();
```

## Auth — httpOnly cookie, mirrors `api-sdk-js`

`crm-api` issues its JWT (`tymon/jwt-auth`) as an httpOnly `token` cookie via `Set-Cookie` — never
in the response body. Every `Client` request goes out with `credentials: 'include'`, so in the
browser the cookie is attached/read automatically and is never visible to JS. In Node (no native
cookie jar on `fetch`), `Client` captures `Set-Cookie` into an in-memory map and replays it as a
`Cookie:` header on later requests from the same instance — this is automatic, not something a
caller has to wire up. `getCookie(name)`/`setCookie(name, value)` exist only for persisting or
rehydrating a session's cookie across script/test runs in Node. The SDK itself does no storage
beyond that in-memory replay, no redirect, no retry — session-derived UI state (e.g. "is the user
logged in?") is `crm-front`'s job, resolved by calling `auth.user()` and reacting to success/401,
exactly like `front` does against `api`.

## Conventions
- One class per API resource
- Methods match HTTP verbs: `get`, `post`, `put`, `patch`, `delete`
- No external runtime dependencies — only Node built-ins
- ESM modules (`"type": "module"`)

## Adding a new resource
1. Confirm the route is actually live in `crm-api/src/routes/api.php` (and its controller exists
   under `app/Http/Controllers/Api/V1/`) — don't build ahead of the backend.
2. Create `src/api/v1/ResourceName.js` with a class that receives the client
3. Register it in `src/api/v1/index.js`
4. Write an integration test in `tests/integration/api/v1/resource-name.test.js`

Verify a new/changed method by running its integration test against a locally running `crm-api`
(`npm test`), not by scripting one-off `curl`/fetch calls in a shell. The integration test is the
artifact that proves the SDK and the API agree, and it's what keeps both repos in sync going
forward — a curl call proves nothing once the terminal closes.

`crm-api` has no seeded test user (unlike `api`'s base migration) — integration tests register
their own throwaway user via the live `register` endpoint (see `tests/helpers.js`'s
`registerTestUser()`), not fixed credentials.

## Testing coverage requirements

Same pattern as `api-sdk-js`, applied per SDK method:

- **Missing/malformed params** — call each method with required params omitted and with wrong-format
  values; confirm the SDK surfaces the API's validation error correctly rather than swallowing it or
  throwing something unrelated.
- **Permissions** — exercise each method as every relevant user role (including unauthenticated)
  against the API and confirm the SDK surfaces 401/403 correctly — not just the happy-path success
  response for the one role the method was built for.

## Internationalisation (i18n)
The SDK is language-neutral — it must never contain human-readable strings.

- Do not include hardcoded error messages or labels in SDK source.
- Error objects thrown by the SDK must expose a machine-readable `status` (HTTP code) and `data`
  (raw API body). The consuming app handles translation.
- Do not add locale/language logic to the SDK — that belongs to the frontend.

## API ↔ SDK sync rule

**This SDK must stay in sync with [`insignia-education/crm-api`](../crm-api) at all times.** Any
endpoint added, renamed, or removed in `crm-api` must be reflected here in the same task/commit —
same rule `api`/`api-sdk-js` follow.

- New endpoint in `crm-api` → new method in the correct `src/api/v1/*.js` class
- Removed endpoint → remove or deprecate the corresponding SDK method
- Never leave the SDK behind the API; `crm-front` relies solely on this SDK

## Every change bumps the version and propagates to `crm-front`

**Any change to this SDK — a new method, a signature change, even a doc-comment-only edit — must,
in the same task:**

1. Bump `package.json`'s version (`npm version patch` for routine changes, `minor` only for a
   genuinely new capability; never bump `major` once `v1` is frozen). **Do this for every commit
   that touches SDK source, with no exceptions** — including a second commit landing shortly after
   a first one in the same session. A version left unbumped across two commits is exactly what
   makes the *next* push fail with "cannot publish over the previously published version": the
   check only compares `package.json`'s version against the registry at commit time, so it can't
   catch "this was already bumped once this session, but not again for this commit."
2. Commit the bump alongside the code change (not as a separate, later task) and push to `master`.
3. **Confirm the publish actually succeeded before touching `crm-front`** — check the
   `npm-publish.yml` workflow run (`gh run list`/`gh run view`) or the registry itself. Do not pin
   the new version into `crm-front` on the assumption that pushing necessarily published it — the
   workflow can fail (most commonly on exactly the "already published" error step 1 exists to
   prevent), and pinning a version that never actually landed on the registry breaks `crm-front`'s
   next `npm install` with no clue why.
4. Once confirmed published, pin the exact new version (no `^`/`~`) in `crm-front/package.json`
   and run `npm install` there.

Skipping step 1 is what makes `npm publish`/CI publish fail with "cannot publish over the
previously published version" — the version in `package.json` must always be higher than what's
already on the registry, with no exceptions for "small" changes, and no exception for "I already
bumped it earlier this session." Skipping step 3 risks pinning `crm-front` to a version that isn't
actually there. Skipping step 4 leaves `crm-front` silently running stale SDK code with no error.

## Consumption — never symlink

`crm-front` must install this package the normal npm way — **never** via a symlink (`npm link`, a
manual `ln -s` into `node_modules`, etc.), even for local iteration.

- A symlinked package looks like it works, but an `npm install`/`npm ci` in `crm-front` can silently
  replace the link with a stale registry copy — it keeps running old SDK code with no error, and
  edits stop propagating until someone notices at runtime.
- Instead: bump this package's version (`npm version patch|minor` — the pre-commit hook rejects a
  commit whose version is already published, so this can't be skipped) and commit it. CI
  (`.github/workflows/npm-publish.yml`) publishes automatically on push to master — it does **not**
  bump the version itself, and it does **not** touch `crm-front`, so pin the exact new version (no
  `^`/`~`) in `crm-front`'s `package.json` and run `npm install` there yourself.
- Never publish on your own initiative — pushing the version-bump commit to master is what triggers
  it; don't run `npm publish` by hand.

## Never do
- Don't add runtime dependencies
- Don't change the constructor signature of `CrmApiV1`
- Don't hardcode API base URLs — always receive from constructor
- Don't let the SDK lag behind `crm-api` — update both in the same task
- Don't symlink this package into `crm-front`'s `node_modules` — publish it instead
- Don't commit an SDK change without bumping the version and pinning/installing it in `crm-front` in
  the same task
- Don't pin a new SDK version into `crm-front` before confirming the publish actually succeeded
- Don't wrap a `crm-api` endpoint that doesn't exist yet — see "Scope right now" above


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

## NEVER TOUCH `insignia-education/infra/envs`

**Read-only. Never create, edit, move, or delete anything under
`insignia-education/infra/envs/` — not one line, for any reason.**

That directory is the owner's personal record of the deployed environments,
kept manually on their machine. It is gitignored, so there is no history and
**nothing there can be recovered from git.** A prod env file was already lost
once this way.

- Need to know what a deployed env contains? Read it, don't write it.
- An env var needs to change? Say so and let the owner make the edit.
- Recovering a lost env: the deploy pipeline stores the authoritative copy in
  AWS SSM Parameter Store (e.g. `/ie/api/env-prod`), and the EC2 host holds a
  `chmod 600` copy at the deploy's `ENV_FILE_PATH`. Restore from SSM, and hand
  the file to the owner rather than writing into `envs/` yourself.
