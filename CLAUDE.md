# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Status: Active — the sole client for `insignia-education/crm-api`.**
> A thin, zero-runtime-dependency JavaScript SDK wrapping the Laravel 12 backend
> [`insignia-education/crm-api`](../crm-api). Consumed by
> [`insignia-education/crm-front`](../crm-front) (React 19 + Vite 8 SPA) — it doesn't call
> `crm-api` directly. Currently only wraps `crm-api`'s live `auth` endpoints; other resources are
> added here as `crm-api`'s own route rebuild lands them (see `AGENTS.md`'s "Scope right now").

---

> The canonical agent-readable version of these instructions is **`AGENTS.md`** (same directory). Both
> files are kept in sync; CLAUDE.md adds Claude Code–specific detail where needed. Read `AGENTS.md` first
> for versioning rules, structure, conventions, testing coverage requirements, the i18n rule, the
> API↔SDK sync rule, and the "Never do" list — none of that is repeated here.

---

## Related repos

| Repo | Role |
|---|---|
| [`crm-api`](../crm-api) | Laravel backend this SDK wraps. Any endpoint added, renamed, or removed there must be mirrored here in the same task — see `AGENTS.md`'s sync rule. |
| [`crm-front`](../crm-front) | The only consumer. Talks to `crm-api` exclusively through this package — a method missing here is a method `crm-front` cannot use. |
| [`api-sdk-js`](../api-sdk-js) | Sibling SDK for the unrelated `api` backend. Same conventions, different backend — useful as a reference for established patterns, not a dependency. |

This SDK has no independent purpose — it only exists to mirror `crm-api`. When in doubt about what
a method should do, the answer is "whatever the matching `crm-api` endpoint does," not a judgment
call made here.

## Deployment / publish (GitHub Actions — read this before touching `master`)

`.github/workflows/npm-publish.yml` runs on every push to `master`. It is **not** a manual
`npm publish` a human runs by hand — merging a PR to `master` is the trigger, and that merge is a
human action, so the "never publish on your own initiative" rule in `AGENTS.md` still applies to
*merging to master*, not just to running `npm publish` directly.

What the workflow actually does: installs, builds, then `npm publish`. That's it — it does **not**
bump the version (the pre-commit hook already forces that before the commit even lands), and it
does **not** touch `crm-front` or any other consumer repo.

**Practical implications:**
- The version published is exactly whatever `package.json` says at the commit that landed on
  `master`. If that version is already on npm (e.g. someone forgot to bump it), the publish step
  fails loudly — there's no silent overwrite or skip.
- Nothing else updates automatically: after a merge here, a human still has to pin the exact new
  version (no `^`/`~`) in `crm-front/package.json` and run `npm install` there — see this repo's
  `AGENTS.md` and `crm-front`'s own conventions for the API ↔ SDK sync rule.
- Publishes via npm's OIDC trusted publishing (`permissions: id-token: write`) — no `NPM_TOKEN` or
  other secret, and no cross-repo permissions, are needed.

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
