# ep-admin CLI Guide

This document is the **user guide** for the `ep-admin` CLI.

`ep-admin` is the repository administration CLI for Effect Patterns Hub. It is
built with `@effect/cli` and orchestrates publishing, ingest, QA, DB checks,
Discord utilities, and other repo maintenance tasks.

---

## Quick Start

Run via Bun from the repo root:

```bash
bun run ep:admin --help
bun run ep:admin <command> --help
bun run ep:admin <command> [options]
```

Common entry points:

```bash
bun run ep:admin validate
bun run ep:admin test
bun run ep:admin pipeline
```

---

## Global Options

Most commands accept these common options:

- `--log-level <level>`
  - One of: `debug | info | warn | error | silent` (varies by command)
- `--no-color`
  - Disable ANSI colors
- `--json`
  - Emit JSON output (where supported)
- `-v, --verbose`
  - More detailed output
- `-q, --quiet`
  - Reduce output
- `--debug`
  - Extra debugging output

Some top-level commands also provide:

- `--wizard`
  - Start wizard mode for the command
- `--version`
  - Show CLI version

---

## Command Reference

`ep-admin` is organized as a **flat command namespace** (not nested groups).
For example, you run `publish` directly as:

```bash
bun run ep:admin publish
```

### Core Publishing Pipeline

- `validate`
  - Validate patterns in the repo.
  - Example:

    ```bash
    bun run ep:admin validate --verbose
    ```

- `test`
  - Run TypeScript examples / checks used by the publishing pipeline.

- `pipeline`
  - Run the full publish pipeline.

- `generate`
  - Generate README / derived artifacts.

- `publish`
  - Move validated patterns into the published stage.

### Ingest Pipeline (`ingest`)

```bash
bun run ep:admin ingest --help
```

Subcommands:

- `ingest process`
  - Process raw MDX files into structured patterns.
  - Options: `--clean`, `--verbose`

- `ingest process-one`
  - Process a single pattern file.
  - Required: `--pattern-file <path>`

- `ingest validate`
  - Validate ingested patterns.
  - Option: `--fix`

- `ingest test`
  - Test ingest pipeline.
  - Option: `--publish`

- `ingest populate`
  - Populate ingest expectations.
  - Option: `--reset`

- `ingest status`
  - Show ingest pipeline status.

- `ingest pipeline`
  - Full ingest workflow.
  - Options: `--test`, `--clean`

### QA (`qa`)

```bash
bun run ep:admin qa --help
```

Subcommands:

- `qa process`
  - Full QA pipeline.
  - Option: `--fix`

- `qa status`
  - Display QA status.

- `qa report`
  - Generate QA report.
  - Option: `--format json | markdown | html`

- `qa repair`
  - Repair common QA issues.
  - Option: `--dry-run`

- `qa test-enhanced`
  - Enhanced QA tests.
  - Option: `--pattern <slug>`

- `qa test-single`
  - Test a single pattern file.
  - Required: `--pattern-file <path>`

- `qa fix-permissions`
  - Fix file permissions.

### Database (`db`)

```bash
bun run ep:admin db --help
```

Subcommands:

- `db test`
  - Full DB tests.
  - Option: `--perf`

- `db test-quick`
  - Quick connectivity check.

- `db verify-migration`
  - Verify schema state.
  - Option: `--fix`

- `db mock`
  - Create mock DB.
  - Option: `--seed`

### Discord (`discord`)

```bash
bun run ep:admin discord --help
```

Subcommands:

- `discord ingest`
  - Ingest content from Discord.
  - Option: `--channel <name>`

- `discord test`
  - Validate Discord configuration.

- `discord flatten`
  - Flatten Discord messages.
  - Option: `--file <path>`

### Skills (`skills`)

```bash
bun run ep:admin skills --help
```

Subcommands:

- `skills generate`
  - Generate skills.
  - Option: `--format json | markdown | yaml`

- `skills skill-generator`
  - Interactive generator.

- `skills generate-readme`
  - Generate skills README.
  - Options: `--skill-level <text>`, `--use-case <text>`

### Migrations (`migrate`)

```bash
bun run ep:admin migrate --help
```

Subcommands typically include:

- `migrate postgres`
- `migrate state`

### Ops (`ops`)

```bash
bun run ep:admin ops --help
```

Examples:

- `ops health-check`
- `ops rotate-api-key`

### Test Utilities (`test-utils`)

```bash
bun run ep:admin test-utils --help
```

Includes:

- `test-utils patterns`
- `test-utils models`
- `test-utils llm`
- `test-utils supermemory`
- `test-utils harness`

### Data Utilities (`utils`)

```bash
bun run ep:admin utils --help
```

Includes:

- `utils add-seqid`
  - Options: `--file`, `--start`, `--backup`, `--dry-run`, `--keep`

- `utils renumber-seqid`
  - Option: `--file`

### Autofix (`autofix`)

```bash
bun run ep:admin autofix --help
```

Includes:

- `autofix prepublish`
  - Options include:
    - `--report <path>`
    - `--only <text>`
    - `--limit <int>`
    - `--dry-run`
    - `--write`
    - `--ai`, `--ai-call`
    - `--provider <text>`, `--model <text>`
    - `--attempts <int>`
    - `--style-gate`

### Rules (`rules`)

- `rules generate`
  - Generate AI coding rules from patterns.

### Release (`release`)

- `release preview`
- `release create`

### Pipeline State (`pipeline-state`)

- `pipeline-state status`
  - Option: `-p, --pattern <text>`

- `pipeline-state retry`
  - Args: `<step> [<pattern>]`
  - Option: `-a, --all`

- `pipeline-state resume`

### Locking

- `lock [--type <text>] <identifier>`
- `unlock [--type <text>] <identifier>`

### Shell Completions (`completions`)

- `completions generate <shell>`
- `completions install <shell>`

---

## Recommended Workflows

### Validate → Test → Publish → Generate

```bash
bun run ep:admin validate
bun run ep:admin test
bun run ep:admin publish
bun run ep:admin generate
```

Or run the orchestrated pipeline:

```bash
bun run ep:admin pipeline
```

### Ingest New Content

```bash
bun run ep:admin ingest process
bun run ep:admin ingest validate
bun run ep:admin ingest test
```

---

## Required Files and Repo State

Some commands require specific repo state to succeed.

- `ingest process`
  - Expects certain directories to exist and may require a clean workspace.

- `utils add-seqid`, `discord flatten`
  - Require an input JSON file, e.g. `packages/data/discord-qna.json`.

- `autofix prepublish`
  - Requires a prepublish report JSON (default may be
    `prepublish-report.json`).

- `migrate state`
  - Intended to run once. It may fail if the target state file already exists.

---

## Troubleshooting

### "Invalid subcommand" errors

`ep-admin` uses a flat command namespace. Run:

```bash
bun run ep:admin --help
```

Then choose one of the listed commands.

### Effect version warnings

You may see warnings about Effect runtime version mismatches. These are often
non-blocking but indicate a dependency dedupe opportunity.

### Script execution failures

Most commands ultimately execute scripts. Run with verbose output:

```bash
bun run ep:admin <command> --verbose
```

---

## Related Docs

- `CLI_TEST_PLAN.md`
  - Command-by-command testing notes and environment requirements.

- `CLI_MIGRATION_COMPLETE.md`
  - Summary of what moved from scripts into `ep-admin`.

- `docs/PUBLISHING_PIPELINE.md`
- `docs/QA_PROCESS.md`
- `docs/PIPELINE_STATE.md`
