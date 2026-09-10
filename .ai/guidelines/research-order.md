# Research Order

Before writing or changing a resource method, follow this lookup sequence. This repo has no
business logic of its own — it only mirrors `crm-api` — so the order below front-loads "does the
real endpoint actually exist yet" before any SDK code gets touched.

### 1. Define Terms & Understand Structure (`AGENTS.md`)
* **`AGENTS.md`** (repo root) — Start here for API versioning rules, the resource-class
  convention, method-naming (HTTP verbs), the httpOnly-cookie auth model, testing coverage
  requirements, and the "Never do" list.

### 2. Check the matching endpoint in `crm-api`
* This SDK exists purely to mirror [`insignia-education/crm-api`](../crm-api). Before writing or
  changing a method, find the real endpoint it wraps — route (`src/routes/api.php`), controller,
  and response shape — in the `crm-api` repo. The SDK method's params, path, and error surface
  must match what's actually there, not what seems plausible.
* `crm-api`'s route file is mid-rebuild (see `AGENTS.md`'s "Scope right now") — only the `auth`
  group is live as of this writing. If the endpoint doesn't exist yet, stop — do not add a
  speculative SDK method ahead of the backend.

### 3. Check sibling resource files (`src/api/v1/*.js`)
* Once the target endpoint is confirmed, look at `src/api/v1/Auth.js` (currently the only
  resource) for the established shape — constructor pattern, method naming, how query params vs.
  path params vs. body are handled. Match the established pattern rather than inventing a new one.

### 4. Compare against `api-sdk-js` when a pattern is genuinely new
* [`insignia-education/api-sdk-js`](../api-sdk-js) is the mature sibling for the unrelated `api`
  backend, same conventions. Useful as a reference for a pattern this repo hasn't needed yet
  (e.g. file uploads), not a dependency.

### 5. Explore further only if still unclear
* `src/index.js` and `src/api/index.js` for the base client / URL-construction / cookie-replay
  behavior.
* `tests/integration/api/v1/` for an existing test against the same or a similar endpoint, as a
  template for the new/changed test.
