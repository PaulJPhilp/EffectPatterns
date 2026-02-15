# EP-Admin CLI Master User Documentation

Canonical user documentation for `ep-admin` (Effect Patterns Admin CLI), version `0.2.2`.

This document is the source of truth for command surface, auth behavior, machine-readable output, and operator workflows.

## What `ep-admin` Is

`ep-admin` is the maintainer/admin CLI for Effect Patterns operations:

- local admin authentication/session management
- publishing and ingestion pipelines
- DB/migration operations
- operational checks and MCP governance utilities
- tool/rule/skill install workflows

Use `ep` for end-user pattern browsing and installs. Use `ep-admin` for maintainer and infrastructure workflows.

## Installation

From repo (local development):

```bash
bun install
cd packages/ep-admin
bun run build
```

Run from source:

```bash
cd packages/ep-admin
bun src/index.ts --help
```

## Mandatory Authentication Gate

All protected commands require either:

1. valid local login session, or
2. `EP_ADMIN_SERVICE_TOKEN` that matches configured token hash.

Auth-exempt commands:

- `auth ...`
- any invocation with `--help` / `-h`
- any invocation with `--version`

### Auth Commands

- `ep-admin auth init`
- `ep-admin auth login`
- `ep-admin auth logout`
- `ep-admin auth status`

Typical setup:

```bash
ep-admin auth init
ep-admin auth login
ep-admin ops health-check
```

Non-interactive setup (CI/bootstrap):

```bash
ep-admin auth init \
  --passphrase "correct-horse-battery" \
  --confirm-passphrase "correct-horse-battery" \
  --service-token "automation-token-123456"
```

### Auth Storage and Security

Default local files:

- config: `${XDG_CONFIG_HOME:-~/.config}/ep-admin/auth.json`
- session: `${XDG_STATE_HOME:-~/.local/state}/ep-admin/session.json`

Auth implementation:

- passphrase hash: PBKDF2-SHA256 with per-secret random salt
- service-token hash: PBKDF2-SHA256 with per-secret random salt
- compare: timing-safe comparison
- identity binding: OS username (`os.userInfo().username`)
- session TTL default: 12 hours
- restrictive perms: directories `0700`, files `0600`

## Environment Variables

### Auth and access control

| Variable | Purpose | Default |
|---|---|---|
| `EP_ADMIN_SERVICE_TOKEN` | Automation bypass token to unlock protected commands | unset |
| `EP_ADMIN_AUTH_CONFIG_FILE` | Override auth config file path | `${XDG_CONFIG_HOME:-~/.config}/ep-admin/auth.json` |
| `EP_ADMIN_AUTH_SESSION_FILE` | Override session state file path | `${XDG_STATE_HOME:-~/.local/state}/ep-admin/session.json` |
| `EP_ADMIN_AUTH_SESSION_TTL_HOURS` | Session TTL in hours | `12` |

### Runtime and display

| Variable | Purpose | Default |
|---|---|---|
| `LOG_LEVEL` | Fallback log level (`debug/info/warn/error`) | `info` |
| `NO_COLOR` | Disable ANSI colors | unset |
| `CI` | CI/non-interactive signal | unset |
| `TERM` | Terminal type (`dumb` disables color) | inherited |

### Service/config variables used by command families

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | DB connectivity for DB/content workflows |
| `MCP_SERVER_URL` | MCP service endpoint for MCP/remote DB operations |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` | Provider keys used by related flows |
| `DISCORD_TOKEN` | Discord ingest/testing flows |

## Global CLI Behavior

Global options (from CLI framework):

- `--completions sh|bash|fish|zsh`
- `--log-level all|trace|debug|info|warning|error|fatal|none`
- `-h, --help`
- `--wizard`
- `--version`

Shared command options (most command handlers):

- `--no-color`
- `--json`
- `-v, --verbose`
- `-q, --quiet`
- `--debug`

Log level precedence:

1. `--debug`
2. `--quiet`
3. CLI `--log-level ...`
4. `LOG_LEVEL`
5. default `info`

## JSON and Streams Contract

When `--json` is used on supported commands:

- primary payload is emitted to `stdout` only
- diagnostics/human hints go to `stderr`
- output is parseable JSON with no ANSI escapes in payload

Implemented high-value JSON families:

- `publish ...`
- `data ingest ...`
- `db ...`
- `ops ...`
- `config install ...`
- `pattern search`
- `pattern skills ...`
- `auth ...`

## Legacy Alias Normalization

Supported legacy inputs are normalized and warned with deprecation guidance.

Examples:

- `ep-admin search ...` -> `ep-admin pattern search ...`
- `ep-admin ingest ...` -> `ep-admin data ingest ...`
- `ep-admin install ...` -> `ep-admin config install ...`
- `ep-admin show ...` -> `ep-admin db show ...`
- `ep-admin mcp ...` -> `ep-admin ops mcp ...`

Deprecation warnings are printed to `stderr`.

## Command Reference

Top-level groups:

- `auth`
- `publish`
- `pattern`
- `data`
- `db`
- `dev`
- `ops`
- `config`
- `system`
- `release`

### `auth`

- `auth init [--force] [--passphrase text] [--confirm-passphrase text] [--service-token text]`
- `auth login [--passphrase text]`
- `auth logout`
- `auth status`

### `publish`

- `publish validate [--pattern text]`
- `publish test [--pattern text]`
- `publish run [--pattern text] [--force|-f]`
- `publish generate [--readme] [--rules]`
- `publish lint [--fix]`
- `publish pipeline [--skip-validation] [--skip-tests]`

### `pattern`

- `pattern search <query>`
- `pattern new`
- `pattern skills generate [--format json|markdown|yaml] [--output text]`
- `pattern skills generate-from-db [--dry-run] [--write-files] [--category text]`
- `pattern skills skill-generator`
- `pattern skills generate-readme [--skill-level text] [--use-case text]`

### `data`

- `data ingest process [--clean]`
- `data ingest process-one --pattern-file text`
- `data ingest validate [--fix]`
- `data ingest test [--publish]`
- `data ingest populate [--reset]`
- `data ingest status`
- `data ingest pipeline [--test] [--clean]`
- `data discord ingest [--channel text]`
- `data discord test`
- `data discord flatten [--file text]`
- `data qa validate [--concurrency integer]`
- `data qa process [--fix] [--new]`
- `data qa status [--new]`
- `data qa report [--format json|markdown|html] [--new]`
- `data qa repair [--dry-run] [--new]`
- `data qa test-enhanced [--pattern text] [--new]`
- `data qa test-single --pattern-file text`
- `data qa fix-permissions`

### `db`

- `db show all`
- `db show patterns`
- `db show skills`
- `db test [--perf]`
- `db test-quick`
- `db verify-migration [--fix]`
- `db mock [--seed]`
- `db status`
- `db migrate-remote`
- `db migrate state [--backup] [--dry-run]`
- `db migrate postgres [--backup] [--dry-run]`

### `dev`

- `dev test-utils chat-app`
- `dev test-utils harness [--suite text]`
- `dev test-utils harness-cli`
- `dev test-utils llm`
- `dev test-utils models`
- `dev test-utils patterns`
- `dev test-utils supermemory`
- `dev autofix prepublish [--report text] [--only text] [--limit integer] [--dry-run] [--write] [--ai] [--ai-call] [--provider text] [--model text] [--attempts integer] [--style-gate]`

### `ops`

- `ops health-check`
- `ops rotate-api-key [--backup]`
- `ops upgrade-baseline [--confirm]`
- `ops mcp list-rules`
- `ops mcp list-fixes`

### `config`

- `config install add --tool text [--skill-level text] [--use-case text]`
- `config install list`
- `config install skills [--category text] [--format text]`
- `config rules generate [-v|--verbose]` (legacy)
- `config utils add-seqid [--file text] [--start integer] [--backup] [--dry-run] [--keep text]`
- `config utils renumber-seqid [--file text]`
- `config entities lock [--type text] <identifier>`
- `config entities unlock [--type text] <identifier>`

### `system`

- `system completions generate <shell>`
- `system completions install <shell>`

### `release`

- `release preview`
- `release create`

## Operator Workflows

### Local maintainer flow

```bash
ep-admin auth init
ep-admin auth login
ep-admin publish validate
ep-admin publish test
ep-admin publish pipeline
```

### CI flow (service token bypass)

```bash
export EP_ADMIN_SERVICE_TOKEN="automation-token-123456"
ep-admin ops health-check --json
ep-admin db test-quick --json
```

## Error and Troubleshooting

Common actionable auth errors:

- not initialized: run `ep-admin auth init`
- not logged in / expired: run `ep-admin auth login`
- wrong OS user: switch user or reinitialize as current OS account
- invalid service token: rotate/reset token via `ep-admin auth init --force`

If help text seems confusing due legacy paths, prefer canonical grouped commands from this doc.

## Compatibility Notes

- Legacy aliases are normalized with deprecation warnings.
- Alias compatibility is temporary and intended for migration safety.
- Scripts should migrate to canonical grouped command paths.
