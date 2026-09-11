# Deployment / publish (GitHub Actions)

`.github/workflows/npm-publish.yml` runs on every push to `master`. It is **not** a manual
`npm publish` a human runs by hand — merging a PR to `master` is the trigger, and that merge is a
human action, so AGENTS.md's "never publish on your own initiative" rule still applies to *merging
to master*, not just to running `npm publish` directly.

What the workflow actually does: installs, builds, then `npm publish`. That's it — it does **not**
bump the version (the pre-commit hook already forces that before the commit even lands), and it
does **not** touch `crm-front` or any other consumer repo.

**Practical implications:**
- The version published is exactly whatever `package.json` says at the commit that landed on
  `master`. If that version is already on npm (e.g. someone forgot to bump it), the publish step
  fails loudly — there's no silent overwrite or skip.
- Nothing else updates automatically: after a merge here, a human still has to pin the exact new
  version (no `^`/`~`) in `crm-front/package.json` and run `npm install` there — see AGENTS.md's
  "Every change bumps the version and propagates to `crm-front`" section.
- Publishes via npm's OIDC trusted publishing (`permissions: id-token: write`) — no `NPM_TOKEN` or
  other secret, and no cross-repo permissions, are needed.

## One-time bootstrap exception

OIDC trusted publishing can create new versions of an *existing* scoped package, but cannot
create a brand-new scoped package on the registry for the first time. So the very first publish
of this package has to happen some other way: `make publish-force` bypasses the CI-only guard
(package.json's `prepublishOnly` script) via `--ignore-scripts`, publishing under your own npm
login instead of through the GitHub Actions OIDC flow.

Once the package exists on the registry, go back to the normal
version-bump-commit-push-to-master flow (`make publish` is never run by hand either way — CI
handles it) for every version after the first — and register this package as a Trusted Publisher
on npmjs.com (org → this package → Trusted Publisher → this repo's `npm-publish.yml`) so that flow
keeps working without ever needing `make publish-force` again.
