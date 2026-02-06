# ep CLI Guide

This document is the **user guide** for the `ep` CLI (the user-facing CLI).

Use `ep` to search, browse, and view patterns in the Effect Patterns Hub, and to
install AI coding rules into supported tools.

For repository administration tasks (publishing, ingest, QA, migrations, etc.),
use `ep-admin` instead:

- `docs/ep/EP_ADMIN.md`

---

## Prerequisites

- **Bun** (required)
- A clone of this repository with dependencies installed:

```bash
bun install
```

You can run `ep` without global linking via `bun run ep ...` from the repo root.

---

## Running the CLI

### From the repo root (recommended)

```bash
bun run ep --help
bun run ep <command> --help
bun run ep <command> [options]
```

### Global install (optional)

If you want a global `ep` binary:

```bash
bun link
ep --help
```

---

## Global Options

These options are available at the top-level and generally propagate to
subcommands:

- `--completions sh | bash | fish | zsh`
  - Print a completion script for a given shell.

- `--log-level all | trace | debug | info | warning | error | fatal | none`
  - Set the minimum log level.

- `-h, --help`
  - Show help.

- `--wizard`
  - Wizard mode (interactive) when supported.

- `--version`
  - Show CLI version.

---

## Commands

Run `ep --help` to see the authoritative list.

### `search <query>`

Search patterns by keyword.

```bash
bun run ep search scope
bun run ep search "retry"
```

### `list`

List patterns with optional filters.

Options:

- `-d, --difficulty <text>`
  - Filter by difficulty.

- `-c, --category <text>`
  - Filter by category.

- `--group-by <text>`
  - Group output by `category`, `difficulty`, or `none`.

Examples:

```bash
bun run ep list
bun run ep list --group-by category
bun run ep list --difficulty beginner
bun run ep list --category "Error Management"
```

### `show [--format <text>] <pattern-id>`

Show detailed pattern information.

Options:

- `--format <text>`
  - Display format. Supported values:
    - `full`
    - `summary`

Examples:

```bash
bun run ep show compose-scoped-layers
bun run ep show --format summary compose-scoped-layers
```

Tip: use `search` first to discover valid IDs:

```bash
bun run ep search scope
bun run ep show compose-scoped-layers
```

### `pattern`

Create new patterns with scaffolding.

Subcommands:

- `pattern new`
  - Interactive wizard to generate a new pattern with scaffolded files.

Examples:

```bash
bun run ep pattern --help
bun run ep pattern new
```

### `install`

Install Effect Patterns rules into supported AI tool configuration files.

Subcommands:

- `install list`
  - List supported tools and the file paths that will be written.

- `install add --tool <text> [--skill-level <text>] [--use-case <text>]`
  - Install rules from local published content into the target tool file.

- `install remove [<rule-id>]`
  - Currently disabled.

- `install diff <rule-id>`
  - Currently disabled.

Examples:

```bash
# Discover supported tools
bun run ep install list

# Install rules for Cursor
bun run ep install add --tool cursor

# Install only beginner rules
bun run ep install add --tool cursor --skill-level beginner

# Install only error-management rules
bun run ep install add --tool cursor --use-case error-management
```

---

## Shell Completions

Generate completion scripts:

```bash
bun run ep --completions zsh
bun run ep --completions bash
```

---

## Troubleshooting

### CLI produces no output

If `ep --help` prints nothing, it usually means the entrypoint is not executing
the command runner. In this repo, the entrypoint should run via
`NodeRuntime.runMain`.

### “Pattern not found”

`show` requires the pattern ID (slug). Use `search` to find IDs.

### Database / cleanup errors

Some `ep` commands may load data from the local database. If you see database
errors, ensure:

- Your environment is configured (e.g. `DATABASE_URL`)
- PostgreSQL is running (if required)

---

## Related Docs

- `docs/ep/SETUP.md`
  - Installation and setup

- `docs/ep/EP_ADMIN.md`
  - Repository administration CLI (`ep-admin`)

- `CLI_TEST_PLAN.md`
  - Command testing notes
