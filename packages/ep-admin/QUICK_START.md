# `ep-admin` Quick Start

Full documentation:

- [EP-ADMIN-CLI-README.md](../../EP-ADMIN-CLI-README.md)

## 1) Authenticate once on your machine

```bash
cd packages/ep-admin
bun src/index.ts auth init
bun src/index.ts auth login
```

## 2) Run a protected command

```bash
bun src/index.ts ops health-check
```

## 3) Use machine-readable output

```bash
bun src/index.ts ops health-check --json
```

## 4) CI/automation bypass

Configure service token during `auth init`, then in CI:

```bash
export EP_ADMIN_SERVICE_TOKEN="your-service-token"
bun src/index.ts db test-quick --json
```

## 5) Troubleshooting

- Not initialized: `bun src/index.ts auth init`
- Session expired/not logged in: `bun src/index.ts auth login`
- Wrong user: re-run init/login as your current OS user
