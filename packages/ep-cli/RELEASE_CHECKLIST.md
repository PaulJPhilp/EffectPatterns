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

1. Go to GitHub Actions → "Publish to npm" → Run workflow
2. First run with `dry-run: true` to verify
3. Then run with `dry-run: false` to publish

Publish order (handled by workflow): toolkit → ep-shared-services → ep-cli

## Post-Publish Verification

- [ ] Verify package is on npm:
  ```bash
  npm view @effect-patterns/ep-cli
  ```
- [ ] Install and test:
  ```bash
  bunx @effect-patterns/ep-cli --version
  bunx @effect-patterns/ep-cli search "error handling"
  ```
