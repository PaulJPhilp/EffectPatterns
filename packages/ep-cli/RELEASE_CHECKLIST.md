# ep-cli Release Checklist

## Pre-Release

- [ ] Version in `package.json` is correct (single source of truth — `constants.ts` imports it)
- [ ] Run preflight checks:
  ```bash
  bun run ep:preflight
  ```
- [ ] Run workspace-wide checks:
  ```bash
  bun run typecheck
  bun run lint:all
  ```
- [ ] Smoke-test the built binary:
  ```bash
  bun run ep:smoke-test
  ```
- [ ] Dry-run publish to verify package contents:
  ```bash
  cd packages/ep-cli && npm publish --dry-run
  ```

## Publish

Publish order: toolkit → ep-shared-services → ep-cli

1. Build all packages:
   ```bash
   bun run build
   ```
2. Publish dependencies first (skip if versions haven't changed):
   ```bash
   cd packages/toolkit && npm publish --access public
   cd ../ep-shared-services && npm publish --access public
   ```
3. Temporarily pin workspace deps in `packages/ep-cli/package.json`:
   ```diff
   - "@effect-patterns/ep-shared-services": "workspace:*",
   - "@effect-patterns/toolkit": "workspace:*",
   + "@effect-patterns/ep-shared-services": "<version>",
   + "@effect-patterns/toolkit": "<version>",
   ```
4. Publish ep-cli:
   ```bash
   cd packages/ep-cli && npm publish --access public
   ```
5. Revert workspace deps back to `workspace:*`

## Post-Publish Verification

- [ ] Verify package is on npm:
  ```bash
  npm view @effect-patterns/ep-cli
  ```
- [ ] Install globally and test:
  ```bash
  bun add -g @effect-patterns/ep-cli
  ep --version
  ep list
  ep search "retry"
  ```
- [ ] Update CHANGELOG.md with new version entry
