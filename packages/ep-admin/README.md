# `ep-admin` (Effect Patterns Admin CLI)

Maintainer/admin CLI for Effect Patterns operations.

Canonical docs:

- [EP-ADMIN-CLI-README.md](../../EP-ADMIN-CLI-README.md)

This package README is intentionally brief. Use the master doc above for:

- complete command reference
- mandatory auth/login gate behavior
- JSON/stdout-stderr contracts
- CI service-token bypass
- migration aliases and deprecation guidance

## Local Development

```bash
cd packages/ep-admin
bun run typecheck
bun run test
```

Run CLI from source:

```bash
cd packages/ep-admin
bun src/index.ts --help
```
