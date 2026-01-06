# Effect-Patterns CLI Reference Guide

## Overview

The `ep-admin` CLI provides a unified interface for managing Effect-Patterns operations. Built with [@effect/cli](https://effect.website/), it offers type-safe commands for publishing, ingesting, QA, database, Discord, skills, migrations, and operations management.

## ep-admin User Guide

For a complete, user-focused guide (setup, global flags, command reference,
workflows, safety notes, and troubleshooting), see:

- `docs/ep/EP_ADMIN.md`

## Quick Start

```bash
# View all available commands
bun run ep:admin --help

# View help for a specific command group
bun run ep:admin <group> --help

# View help for a specific command
bun run ep:admin <group> <command> --help

# Run a command
bun run ep:admin <group> <command> [options]
```

## Command Groups

### 1. Publish Pipeline (`ep:admin publish`)

Manage pattern publishing workflow from validation through documentation generation.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `validate` | Validate all patterns for correctness | `bun run ep:admin publish validate --verbose` |
| `test` | Run TypeScript examples and type checks | `bun run ep:admin publish test --verbose` |
| `publish` | Move validated patterns to published/ | `bun run ep:admin publish publish` |
| `generate` | Generate README and documentation | `bun run ep:admin publish generate --verbose` |
| `lint` | Check for Effect-TS best practices | `bun run ep:admin publish lint` |
| `pipeline` | Full workflow (validate → test → publish → generate) | `bun run ep:admin publish pipeline --verbose` |

#### Examples

```bash
# Validate patterns before publishing
bun run ep:admin publish validate

# Run tests with detailed output
bun run ep:admin publish test --verbose

# Generate all documentation
bun run ep:admin publish generate

# Full publishing pipeline
bun run ep:admin publish pipeline
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--pattern <name>`: Target specific pattern (where applicable)

---

### 2. Ingest Pipeline (`ep:admin ingest`)

Manage pattern ingestion from raw MDX files to processed patterns.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `process` | Process all raw MDX files | `bun run ep:admin ingest process --clean` |
| `process-one` | Process a single pattern file | `bun run ep:admin ingest process-one pattern.mdx` |
| `validate` | Validate ingested patterns | `bun run ep:admin ingest validate --fix` |
| `test` | Test ingest pipeline | `bun run ep:admin ingest test --publish` |
| `populate` | Populate test expectations | `bun run ep:admin ingest populate --reset` |
| `status` | Show current ingest status | `bun run ep:admin ingest status --verbose` |
| `pipeline` | Full workflow (process → validate → test) | `bun run ep:admin ingest pipeline --clean --test` |

#### Examples

```bash
# Process all raw patterns
bun run ep:admin ingest process

# Clean and reprocess
bun run ep:admin ingest process --clean

# Process single pattern
bun run ep:admin ingest process-one my-pattern.mdx

# Full ingest workflow
bun run ep:admin ingest pipeline --test

# Check ingest status
bun run ep:admin ingest status
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--clean`: Clean before processing
- `--test`: Run tests after processing
- `--publish`: Test publishing of ingested patterns
- `--reset`: Reset expectations before populating
- `--fix`: Automatically fix issues

---

### 3. QA Operations (`ep:admin qa`)

Quality assurance operations for pattern validation and repair.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `process` | Full QA pipeline (validate → test → report) | `bun run ep:admin qa process --fix` |
| `status` | Show current QA status | `bun run ep:admin qa status --verbose` |
| `report` | Generate QA report | `bun run ep:admin qa report --format markdown` |
| `repair` | Fix common QA issues | `bun run ep:admin qa repair --dry-run` |
| `test-enhanced` | Run enhanced QA tests | `bun run ep:admin qa test-enhanced --verbose` |
| `test-single` | Test single pattern | `bun run ep:admin qa test-single pattern.mdx` |
| `fix-permissions` | Fix file permissions | `bun run ep:admin qa fix-permissions` |

#### Examples

```bash
# Check QA status
bun run ep:admin qa status

# Full QA process with auto-fix
bun run ep:admin qa process --fix

# Generate QA report
bun run ep:admin qa report --format json

# Preview changes before fixing
bun run ep:admin qa repair --dry-run

# Apply fixes
bun run ep:admin qa repair

# Test single pattern
bun run ep:admin qa test-single my-pattern.mdx

# Run enhanced tests
bun run ep:admin qa test-enhanced --pattern error-handling
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--format <format>`: Report format (json, markdown, html)
- `--fix`: Automatically fix issues
- `--dry-run`: Preview changes without applying
- `--pattern <name>`: Target specific pattern

---

### 4. Database Operations (`ep:admin db`)

Database testing, verification, and migration operations.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `test` | Full database tests | `bun run ep:admin db test --perf` |
| `test-quick` | Quick connectivity test | `bun run ep:admin db test-quick` |
| `verify-migration` | Verify schema migration | `bun run ep:admin db verify-migration --fix` |
| `mock` | Create mock database | `bun run ep:admin db mock --seed` |

#### Examples

```bash
# Test database connectivity
bun run ep:admin db test-quick

# Run full test suite with performance tests
bun run ep:admin db test --perf

# Verify migration
bun run ep:admin db verify-migration

# Auto-fix migration issues
bun run ep:admin db verify-migration --fix

# Create test database with seed data
bun run ep:admin db mock --seed
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--perf`: Include performance tests
- `--fix`: Automatically fix issues
- `--seed`: Seed with test data

---

### 5. Discord Integration (`ep:admin discord`)

Discord bot operations for pattern management and ingestion.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `ingest` | Ingest from Discord channels | `bun run ep:admin discord ingest --channel patterns` |
| `test` | Test Discord connection | `bun run ep:admin discord test --verbose` |

#### Examples

```bash
# Test Discord connection
bun run ep:admin discord test

# Ingest from all channels
bun run ep:admin discord ingest

# Ingest from specific channel
bun run ep:admin discord ingest --channel feedback
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--channel <name>`: Specific Discord channel to ingest from

---

### 6. Skills Generation (`ep:admin skills`)

Generate AI skills for different platforms from patterns.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `generate` | Generate all skills | `bun run ep:admin skills generate --format json` |
| `skill-generator` | Interactive skill generator | `bun run ep:admin skills skill-generator --verbose` |
| `generate-readme` | Generate README by skill/use-case | `bun run ep:admin skills generate-readme --skill-level intermediate` |

#### Examples

```bash
# Generate all skills in JSON format
bun run ep:admin skills generate --format json

# Interactive skill generation
bun run ep:admin skills skill-generator

# Generate README for intermediate patterns
bun run ep:admin skills generate-readme --skill-level intermediate

# Generate README for error-handling use cases
bun run ep:admin skills generate-readme --use-case error-handling
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--format <format>`: Output format (json, markdown, yaml)
- `--skill-level <level>`: Filter by skill level (beginner, intermediate, advanced)
- `--use-case <name>`: Filter by use case

---

### 7. Migrations (`ep:admin migrate`)

Database migration and state management operations.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `migrate-postgres` | Migrate to PostgreSQL | `bun run ep:admin migrate migrate-postgres --verbose` |
| `migrate-state` | Migrate state data | `bun run ep:admin migrate migrate-state --backup` |

#### Examples

```bash
# Migrate to PostgreSQL
bun run ep:admin migrate migrate-postgres

# With detailed logging
bun run ep:admin migrate migrate-postgres --verbose

# Migrate state with backup
bun run ep:admin migrate migrate-state --backup
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--backup`: Create backup before migrating

---

### 8. Operations (`ep:admin ops`)

System operations like health checks and API key rotation.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `health-check` | System health check | `bun run ep:admin ops health-check --detailed` |
| `rotate-key` | Rotate API keys | `bun run ep:admin ops rotate-key --force` |

#### Examples

```bash
# Check system health
bun run ep:admin ops health-check

# Detailed health report
bun run ep:admin ops health-check --detailed

# Rotate API keys
bun run ep:admin ops rotate-key

# Force rotation without confirmation
bun run ep:admin ops rotate-key --force
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--detailed`: Show detailed health information
- `--force`: Skip confirmation prompts

---

### 9. Test Utilities (`ep:admin test`)

Test harnesses and utility testing operations.

#### Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| `test-harness` | Run test harness | `bun run ep:admin test test-harness --verbose` |
| `test-models` | Test LLM models | `bun run ep:admin test test-models --provider openai` |
| `test-patterns` | Test all patterns | `bun run ep:admin test test-patterns` |
| `test-chat-app` | Test chat app core | `bun run ep:admin test test-chat-app --verbose` |
| `test-supermemory` | Test Supermemory integration | `bun run ep:admin test test-supermemory` |

#### Examples

```bash
# Run test harness
bun run ep:admin test test-harness

# Test LLM models
bun run ep:admin test test-models

# Test OpenAI specifically
bun run ep:admin test test-models --provider openai

# Test all patterns
bun run ep:admin test test-patterns

# Test chat app with verbose output
bun run ep:admin test test-chat-app --verbose
```

**Options:**
- `-v, --verbose`: Show detailed output
- `--provider <name>`: Specific provider to test

---

## Common Workflows

### Publishing Patterns

```bash
# 1. Validate patterns are correct
bun run ep:admin publish validate

# 2. Test TypeScript examples
bun run ep:admin publish test

# 3. Move to published directory
bun run ep:admin publish publish

# 4. Generate documentation
bun run ep:admin publish generate

# Or in one command:
bun run ep:admin publish pipeline
```

### Ingesting New Patterns

```bash
# 1. Process raw MDX files
bun run ep:admin ingest process --clean

# 2. Validate ingested patterns
bun run ep:admin ingest validate

# 3. Test ingest pipeline
bun run ep:admin ingest test

# Or all at once:
bun run ep:admin ingest pipeline --clean --test
```

### QA and Repair

```bash
# 1. Check QA status
bun run ep:admin qa status

# 2. Preview issues to fix
bun run ep:admin qa report --format markdown

# 3. Preview changes
bun run ep:admin qa repair --dry-run

# 4. Apply fixes
bun run ep:admin qa repair

# Or full process:
bun run ep:admin qa process --fix
```

### Database Operations

```bash
# Quick health check
bun run ep:admin db test-quick

# Full test suite
bun run ep:admin db test --perf

# Verify migration
bun run ep:admin db verify-migration

# Create test database
bun run ep:admin db mock --seed
```

---

## Package.json Shortcuts

The main `package.json` includes shortcuts for common operations:

```json
{
  "scripts": {
    "publish": "bun run ep:admin publish pipeline",
    "validate": "bun run ep:admin publish validate",
    "test": "bun run ep:admin publish test",
    "ingest": "bun run ep:admin ingest pipeline",
    "qa": "bun run ep:admin qa process",
    "qa:repair": "bun run ep:admin qa repair",
    "health-check": "bun run ep:admin ops health-check",
    "db:test": "bun run ep:admin db test",
    "db:verify": "bun run ep:admin db verify-migration",
    "generate:readme": "bun run ep:admin skills generate-readme"
  }
}
```

**Usage:**
```bash
bun run publish
bun run validate
bun run ingest
bun run qa
bun run health-check
```

---

## Error Handling

All commands include comprehensive error handling:

```bash
# Commands return non-zero exit code on failure
bun run ep:admin publish validate || echo "Validation failed"

# View detailed error messages
bun run ep:admin publish validate --verbose

# Check logs for more information
# Errors are logged to console with context
```

---

## Tips and Best Practices

1. **Use `--verbose` for debugging**: Get detailed output when troubleshooting
2. **Run `--help` for options**: Each command has comprehensive help text
3. **Use `--dry-run` before applying changes**: Preview changes before executing
4. **Chain operations**: Use `&&` to run multiple commands sequentially
5. **Run pipeline commands for full workflows**: More efficient than running individual steps

---

## Troubleshooting

### Command not found

```bash
# Ensure dependencies are installed
bun install

# Verify ep-admin is built
bun run build:ep-admin
```

### Permission denied

```bash
# Fix file permissions
bun run ep:admin qa fix-permissions
```

### Database connection errors

```bash
# Check database is running and accessible
bun run ep:admin db test-quick --verbose
```

### Script execution failures

```bash
# Get detailed error output
bun run ep:admin <command> --verbose

# Check if required files exist
bun run ep:admin <command> --verbose 2>&1 | tail -20
```

---

## Environment Variables

CLI respects these environment variables:

```bash
# Pattern directories
PATTERNS_DIR=content/new
PUBLISHED_DIR=content/published

# Database
DATABASE_URL=postgres://user:password@localhost/effectpatterns
DB_NAME=effectpatterns

# Discord
DISCORD_BOT_TOKEN=your_token_here
DISCORD_GUILD_ID=your_guild_id

# Logging
LOG_LEVEL=info  # debug, info, warn, error
VERBOSE=true    # Enable verbose output
```

---

## Related Documentation

- [MIGRATION_PROGRESS.md](MIGRATION_PROGRESS.md) - CLI migration status
- [SCRIPTS_TO_CLI_MIGRATION.md](SCRIPTS_TO_CLI_MIGRATION.md) - Migration strategy
- [Effect-Patterns AI Instructions](.github/copilot-instructions.md) - AI coding guidelines
- [@effect/cli documentation](https://effect.website/docs/data-types/effect) - CLI framework details

---

## Support

For issues or questions:

1. Check the command's help: `bun run ep:admin <command> --help`
2. Review troubleshooting section above
3. Check MIGRATION_PROGRESS.md for known issues
4. Review GitHub issues and discussions
