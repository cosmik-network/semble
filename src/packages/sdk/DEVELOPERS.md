# Releasing `@semble.so/api`

This package is published to npm via the `.github/workflows/publish-sdk.yml` GitHub Actions workflow, triggered by pushing a `sdk-v*` git tag.

## One-time setup

1. **npm org access** — make sure your npm account is a member of the `@semble.so` org with publish rights to `@semble.so/api`.
2. **Repo secret `NPM_TOKEN`** — a granular npm access token with:
   - Read and write access to packages
   - Scoped to `@semble.so/api` only
   - Saved as the `NPM_TOKEN` repository secret in GitHub.
3. **Provenance** — the workflow uses npm provenance (`--provenance`). This requires no extra setup beyond `id-token: write` in the workflow (already configured) and a public GitHub repo. npm will display a "Built and signed on GitHub Actions" badge on the published version.

## Releasing a new version

1. Make sure `main` is green and contains the changes you want to ship.

2. Bump the version in `src/packages/sdk/package.json`. Pick a semver level:
   - `patch` — bug fixes, no API changes (`0.1.0` → `0.1.1`)
   - `minor` — new features, backward-compatible (`0.1.0` → `0.2.0`)
   - `major` — breaking changes (`0.1.0` → `1.0.0`)
   - Pre-releases — use a suffix like `-beta.0` (e.g. `0.2.0-beta.0`). The workflow publishes these under the `next` dist-tag instead of `latest`.

3. (Optional) Sanity-check the build locally:

   ```bash
   npm run build:sdk
   cd src/packages/sdk
   npm pack --dry-run
   ```

   Inspect the file list. `dist/index.js` and `dist/index.cjs` should contain the inlined `@semble/contract` code (the SDK's `tsup.config.ts` bundles workspace dependencies via `noExternal`). The packed `package.json` should not reference `@semble/contract`.

4. Commit the version bump:

   ```bash
   git add src/packages/sdk/package.json
   git commit -m "chore(sdk): release v0.1.0"
   git push origin main
   ```

5. Tag and push:

   ```bash
   git tag sdk-v0.1.0
   git push origin sdk-v0.1.0
   ```

   The tag version (after stripping `sdk-v`) must exactly match the `version` field in `src/packages/sdk/package.json`. The workflow fails fast if they differ.

6. Watch the `Publish SDK` workflow in the Actions tab. When it succeeds:
   - `npm view @semble.so/api version` shows the new version.
   - The version page on npmjs.com shows the provenance badge.

## What the workflow does

1. Checks out the tagged commit.
2. Installs deps with `npm ci`.
3. Verifies the tag version matches `src/packages/sdk/package.json`.
4. Decides the dist-tag: `next` for pre-releases (version contains `-`), otherwise `latest`.
5. Builds the SDK via `npm run build:sdk` (which builds `@semble/types`, then `@semble/contract`, then bundles them into the SDK output with tsup).
6. Publishes from `src/packages/sdk` with `npm publish --access public --provenance --tag <dist-tag>`.

## Troubleshooting

- **"Tag version (X) does not match package.json version (Y)"** — you tagged a commit whose `package.json` doesn't match. Either retag the right commit or push a new commit bumping the version, then re-tag.
- **"You cannot publish over the previously published versions"** — npm rejects republishing the same version. Bump the version and tag again.
- **`NPM_TOKEN` errors / 401 / 403** — the token is missing, expired, or doesn't have write access to `@semble.so/api`. Regenerate and update the repo secret.
- **Provenance errors** — typically caused by missing `id-token: write` permission in the workflow, or the repo being private without npm provenance enabled. The workflow already grants the permission; check that the workflow file hasn't been edited to drop it.
- **Workspace dependency leaks into the published package** — confirm `src/packages/sdk/tsup.config.ts` still has both:
  - `noExternal: ['@semble/contract', '@semble/types']` — inlines runtime code into `dist/index.js` and `dist/index.cjs`.
  - `dts: { resolve: ['@semble/contract', '@semble/types'] }` — inlines type declarations into `dist/index.d.ts`. Without this, the generated `.d.ts` keeps `import ... from '@semble/contract'`, which consumers cannot resolve.

  To verify, run `grep '@semble/contract' src/packages/sdk/dist/index.*` — it must return zero matches across all four files (`.js`, `.cjs`, `.d.ts`, `.d.cts`).

## Pre-releases

Tag with a pre-release suffix:

```bash
# After setting version to "0.2.0-beta.0" in package.json:
git tag sdk-v0.2.0-beta.0
git push origin sdk-v0.2.0-beta.0
```

Consumers opt in with:

```bash
npm install @semble.so/api@next
```

The stable `latest` dist-tag is untouched.
