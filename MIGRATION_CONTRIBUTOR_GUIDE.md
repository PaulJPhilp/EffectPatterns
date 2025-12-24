# CLI Migration Guide for Contributors

## Overview

Effect-Patterns has migrated from scattered shell scripts and direct TypeScript execution to a unified `ep-admin` CLI interface. This guide helps contributors understand the new workflow.

## What Changed

### Before (Old Way)

```bash
# Direct script execution
bun run scripts/publish/validate-improved.ts
bun run scripts/publish/test-improved.ts
bun run scripts/publish/publish.ts
bun run ./scripts/qa/qa-process.sh
bun run scripts/ingest/ingest-pipeline-improved.ts
```

### After (New Way)

```bash
# Unified CLI
bun run ep:admin publish validate
bun run ep:admin publish test
bun run ep:admin publish publish
bun run ep:admin qa process
bun run ep:admin ingest pipeline
```

## Command Mapping

### Publishing Operations

| Old Command | New Command |
|------------|------------|
| `bun run scripts/publish/validate-improved.ts` | `bun run ep:admin publish validate` |
| `bun run scripts/publish/test-improved.ts` | `bun run ep:admin publish test` |
| `bun run scripts/publish/publish.ts` | `bun run ep:admin publish publish` |
| `bun run scripts/publish/generate.ts` | `bun run ep:admin publish generate` |
| `bun run scripts/publish/lint-effect-patterns.ts` | `bun run ep:admin publish lint` |
| `bun run scripts/publish/pipeline.ts` | `bun run ep:admin publish pipeline` |

### Ingestion Operations

| Old Command | New Command |
|------------|------------|
| `bun run scripts/ingest/process.ts` | `bun run ep:admin ingest process` |
| `bun run scripts/ingest/process-one.ts <file>` | `bun run ep:admin ingest process-one <file>` |
| `bun run scripts/ingest/ingest-pipeline-improved.ts` | `bun run ep:admin ingest pipeline` |
| `bun run scripts/ingest/test-new.ts` | `bun run ep:admin ingest test` |
| `bun run scripts/ingest/test-publish.ts` | `bun run ep:admin ingest test --publish` |

### QA Operations

| Old Command | New Command |
|------------|------------|
| `./scripts/qa/qa-process.sh` | `bun run ep:admin qa process` |
| `bun run scripts/qa/qa-status.ts` | `bun run ep:admin qa status` |
| `bun run scripts/qa/qa-report.ts` | `bun run ep:admin qa report` |
| `bun run scripts/qa/qa-repair.ts` | `bun run ep:admin qa repair` |
| `bun run scripts/qa/test-enhanced-qa.ts` | `bun run ep:admin qa test-enhanced` |
| `./scripts/qa/permissions-fix.sh` | `bun run ep:admin qa fix-permissions` |

### Database Operations

| Old Command | New Command |
|------------|------------|
| `bun run scripts/test-db.ts` | `bun run ep:admin db test` |
| `bun run scripts/test-db-quick.ts` | `bun run ep:admin db test-quick` |
| `bun run scripts/verify-migration.ts` | `bun run ep:admin db verify-migration` |
| `bun run scripts/mock-db.ts` | `bun run ep:admin db mock` |

## Using package.json Shortcuts

For convenience, common operations are aliased in `package.json`:

```bash
# Publish workflow
bun run publish              # Full publishing pipeline
bun run validate            # Validate patterns
bun run test                # Test TypeScript examples

# Ingest workflow
bun run ingest              # Full ingest pipeline

# QA operations
bun run qa                  # Full QA process
bun run qa:repair           # Repair QA issues

# Database
bun run db:test             # Test database
bun run db:verify           # Verify migration

# Health
bun run health-check        # System health check

# Skills
bun run generate:readme     # Generate README
```

## Option Changes

### Options are now more consistent

#### Before (Varied)
```bash
# Some scripts had options, some didn't
bun run scripts/publish/validate-improved.ts --verbose
./scripts/qa/qa-process.sh  # No options available
bun run scripts/qa/qa-repair.ts --dry-run
```

#### After (Consistent)
```bash
# All commands support standard options
bun run ep:admin publish validate --verbose
bun run ep:admin qa process --fix
bun run ep:admin qa repair --dry-run
bun run ep:admin db test --perf
```

### Common Options

- `-v, --verbose`: Show detailed output
- `--verbose`: Show detailed output
- `--dry-run`: Preview changes without applying
- `--fix`: Automatically fix issues
- `--format <format>`: Specify output format
- `--help`: Show command help

## Benefits of the Migration

### 1. Discoverability
```bash
# See all available commands
bun run ep:admin --help

# See all subcommands in a group
bun run ep:admin publish --help
```

### 2. Type Safety
- All options are type-checked
- Invalid combinations are caught before execution
- Clear error messages with suggestions

### 3. Consistency
- Uniform option handling across all commands
- Same naming conventions everywhere
- Predictable behavior

### 4. Easier to Remember
```bash
# Logical grouping by function
bun run ep:admin publish <command>
bun run ep:admin ingest <command>
bun run ep:admin qa <command>
bun run ep:admin db <command>
```

### 5. Better Error Handling
```bash
# Clear error messages
bun run ep:admin publish validate
# ✅ Success
# ❌ Validation failed: patterns/my-pattern.ts has missing sections
```

## Updating Your Workflow

### If you run scripts locally

**Before:**
```bash
# Multiple commands to publish
bun run scripts/publish/validate-improved.ts
bun run scripts/publish/test-improved.ts
bun run scripts/publish/publish.ts
```

**After:**
```bash
# Single command
bun run ep:admin publish pipeline
```

### If you use GitHub Actions

**Before:**
```yaml
- name: Run publishing pipeline
  run: bun run scripts/publish/pipeline.ts
```

**After:**
```yaml
- name: Run publishing pipeline
  run: bun run ep:admin publish pipeline
```

### If you call scripts from CI/CD

**Before:**
```bash
#!/bin/bash
bun run scripts/publish/validate-improved.ts || exit 1
bun run scripts/publish/test-improved.ts || exit 1
./scripts/qa/qa-process.sh || exit 1
```

**After:**
```bash
#!/bin/bash
bun run ep:admin publish validate || exit 1
bun run ep:admin publish test || exit 1
bun run ep:admin qa process || exit 1
```

## Backward Compatibility

**Good news**: All original scripts remain unchanged and functional. You can:

- Continue using old scripts directly if needed
- Mix old and new approaches during transition
- Move to CLI commands at your own pace

Example:
```bash
# Still works
bun run scripts/publish/validate-improved.ts

# Also works (new way)
bun run ep:admin publish validate

# Both approaches work during transition
```

## Troubleshooting Migration Issues

### "command not found: ep:admin"

```bash
# Ensure dependencies are installed
bun install

# Build the CLI
bun run build:ep-admin
```

### "Script not found" errors

```bash
# Check that scripts still exist
ls scripts/publish/validate-improved.ts

# Verify CLI has proper script paths
cat packages/ep-admin/src/publish-commands.ts | grep "validate-improved"
```

### Options not recognized

```bash
# Check command options
bun run ep:admin <group> <command> --help

# Options vary by command
# Use --help to see what's available
```

## Contributing to the CLI

### Adding a New Command

1. Create command file in `packages/ep-admin/src/`
2. Export command group
3. Add to `adminSubcommands` in `index.ts`
4. Update CLI_REFERENCE.md

Example:
```typescript
// new-commands.ts
export const newCommand = Command.make("new").pipe(
  Command.withDescription("New operation"),
  Command.withSubcommands([newSubcommand1, newSubcommand2])
);

// index.ts
import { newCommand } from "./new-commands.js";
const adminSubcommands = [
  // ... existing commands
  newCommand,
];
```

### Updating Commands

Commands are in `packages/ep-admin/src/*-commands.ts` files:

- `publish-commands.ts` - Publishing operations
- `ingest-commands.ts` - Ingestion operations
- `qa-commands.ts` - QA operations
- `db-commands.ts` - Database operations
- `discord-commands.ts` - Discord operations
- `skills-commands.ts` - Skills generation
- `migrate-commands.ts` - Migrations
- `ops-commands.ts` - System operations
- `test-utils-commands.ts` - Test utilities

## Learning More

- Read [CLI_REFERENCE.md](CLI_REFERENCE.md) for complete command documentation
- Check [MIGRATION_PROGRESS.md](MIGRATION_PROGRESS.md) for migration status
- Review [SCRIPTS_TO_CLI_MIGRATION.md](SCRIPTS_TO_CLI_MIGRATION.md) for strategy details

## FAQ

**Q: Do I have to use the new CLI?**
A: No, original scripts still work. But CLI is recommended for new workflows.

**Q: Can I use both old and new approaches?**
A: Yes, they coexist. Mix approaches during transition.

**Q: How do I get help on a command?**
A: Use `--help` flag: `bun run ep:admin publish validate --help`

**Q: What if a command fails?**
A: Use `--verbose` flag for detailed output: `bun run ep:admin publish validate --verbose`

**Q: Are there any breaking changes?**
A: No, all original scripts remain functional.

## Summary

The CLI migration consolidates scattered scripts into a unified, discoverable, type-safe interface. It improves user experience, discoverability, and maintainability while maintaining full backward compatibility.

**Start using the new CLI today:**
```bash
bun run ep:admin --help
```
