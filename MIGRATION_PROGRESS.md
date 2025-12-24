# Scripts to CLI Migration Progress

**Status**: In Progress - Phase 2 Complete (28 of 50+ scripts migrated)

## Overview

Migration of all repository scripts to unified CLI commands via `ep-admin`. This consolidates scattered shell scripts and TypeScript files into a coherent command-line interface built with `@effect/cli`.

## Completed Phases

### Phase 1: Planning & Setup ✅
- [x] Audited all existing scripts (50+ identified)
- [x] Created migration strategy document
- [x] Established command architecture patterns
- [x] Set up execution service layer (executeScriptWithTUI)

### Phase 2: Core Pipeline Commands ✅

#### ✅ Publish Pipeline (6 commands)
```bash
bun run ep-admin publish validate      # Validate patterns
bun run ep-admin publish test         # Run TypeScript examples
bun run ep-admin publish publish      # Move to published/
bun run ep-admin publish generate     # Create README/rules
bun run ep-admin publish lint         # Check Effect-TS best practices
bun run ep-admin publish pipeline     # Full orchestration
```

**Scripts wrapped:**
- `scripts/publish/validate-improved.ts`
- `scripts/publish/test-improved.ts`
- `scripts/publish/publish.ts`
- `scripts/publish/generate.ts`
- `scripts/publish/rules-improved.ts`
- `scripts/publish/pipeline.ts`

#### ✅ Ingest Pipeline (7 commands)
```bash
bun run ep-admin ingest process           # Process raw MDX files
bun run ep-admin ingest process-one FILE  # Process single pattern
bun run ep-admin ingest validate          # Validate ingest data
bun run ep-admin ingest test             # Test pipeline
bun run ep-admin ingest populate         # Populate test expectations
bun run ep-admin ingest status           # Show ingest status
bun run ep-admin ingest pipeline         # Full workflow
```

**Scripts wrapped:**
- `scripts/ingest/process.ts`
- `scripts/ingest/process-one.ts`
- `scripts/ingest/validate.ts`
- `scripts/ingest/test-new.ts` / `test-publish.ts`
- `scripts/ingest/populate-expectations.ts`
- `scripts/ingest/run.ts`
- `scripts/ingest/ingest-pipeline-improved.ts`

#### ✅ QA Operations (7 commands)
```bash
bun run ep-admin qa process            # Full QA pipeline
bun run ep-admin qa status             # Show QA status
bun run ep-admin qa report             # Generate QA report
bun run ep-admin qa repair             # Fix common issues
bun run ep-admin qa test-enhanced      # Enhanced QA tests
bun run ep-admin qa test-single FILE   # Test single pattern
bun run ep-admin qa fix-permissions    # Fix file permissions
```

**Scripts wrapped:**
- `scripts/qa/qa-process.sh`
- `scripts/qa/qa-status.ts`
- `scripts/qa/qa-report.ts`
- `scripts/qa/qa-repair.ts`
- `scripts/qa/test-enhanced-qa.ts`
- `scripts/qa/test-single-pattern.sh`
- `scripts/qa/permissions-fix.sh`

#### ✅ Database Operations (4 commands)
```bash
bun run ep-admin db test               # Full database tests
bun run ep-admin db test-quick         # Quick connectivity test
bun run ep-admin db verify-migration   # Verify schema migration
bun run ep-admin db mock               # Create mock database
```

**Scripts wrapped:**
- `scripts/test-db.ts`
- `scripts/test-db-quick.ts`
- `scripts/verify-migration.ts`
- `scripts/mock-db.ts`

#### ✅ Discord Integration (2 commands)
```bash
bun run ep-admin discord ingest        # Ingest from Discord
bun run ep-admin discord test          # Test Discord connection
```

**Scripts wrapped:**
- `scripts/ingest-discord.ts`
- `scripts/test-discord-simple.ts`

#### ✅ Skills Generation (3 commands)
```bash
bun run ep-admin skills generate       # Generate all skills
bun run ep-admin skills skill-generator # Interactive generator
bun run ep-admin skills generate-readme # Generate README by skill/use-case
```

**Scripts wrapped:**
- `scripts/generate-skills.ts`
- `scripts/skill-generator.ts`
- `scripts/generate_readme_by_skill_usecase.ts`

## Remaining Work

### Phase 3: Utility Commands (~10-15 scripts)
Scripts to migrate:
- [ ] Health checks (`health-check.sh`)
- [ ] API key rotation (`rotate-api-key.sh`)
- [ ] Database migrations (`migrate-to-postgres.ts`, `migrate-state.ts`)
- [ ] Test harnesses (`test-harness.ts`, `test-harness-cli.ts`, etc.)
- [ ] LLM/Model tests (`test-llm-service.ts`, `test-models.ts`)
- [ ] App tests (`test-chat-app-core.ts`, `test-patterns.ts`)
- [ ] Integration tests (`integration.test.ts`)

Proposed command structure:
```bash
bun run ep-admin health check          # System health check
bun run ep-admin security rotate-key   # Rotate API key
bun run ep-admin test-harness          # Run test harnesses
bun run ep-admin test-models           # Test LLM/models
```

### Phase 4: package.json Scripts Update
Replace in `package.json`:
```json
{
  "scripts": {
    "publish": "bun run ep-admin publish pipeline",
    "ingest": "bun run ep-admin ingest pipeline",
    "qa": "bun run ep-admin qa process",
    "db:test": "bun run ep-admin db test",
    "discord:ingest": "bun run ep-admin discord ingest",
    "skills:generate": "bun run ep-admin skills generate"
  }
}
```

### Phase 5: Update CI/CD
Update GitHub Actions workflows to use CLI commands instead of direct script calls.

### Phase 6: Documentation
- [ ] Update README with new CLI command documentation
- [ ] Create CLI usage guide
- [ ] Update contribution guidelines

## Architecture Details

### Command Structure
Each command group follows this pattern:
```typescript
export const <name>Command = Command.make("<name>", {
    options: { /* ... */ },
    positional: { /* ... */ },
}).pipe(
    Command.withDescription("..."),
    Command.withHandler(({ options, positional }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/..."),
                "Task description",
                { /* options */ }
            );
            yield* showSuccess("Success message!");
        }) as any
    )
);

export const <groupName>Command = Command.make("<group>").pipe(
    Command.withDescription("Group description"),
    Command.withSubcommands([
        <name>Command,
        // ... other subcommands
    ])
);
```

### Key Benefits
1. **Unified Interface**: All operations through single CLI
2. **Type Safety**: Full TypeScript support with Effect-TS patterns
3. **Composability**: Commands can be chained with Effect combinators
4. **Consistency**: Standardized error handling and output formatting
5. **Discoverability**: `bun run ep-admin --help` shows all options
6. **Backward Compatibility**: Existing scripts remain untouched until fully migrated

### Service Layer
- `services/execution.js`: `executeScriptWithTUI` - Wraps script execution with spinner
- `services/display.js`: `showSuccess`, `showError`, `showInfo`, `showPanel` - Formatted output

## Migration Metrics

**Completed:**
- ✅ 28 subcommands across 6 categories
- ✅ 6 command files created
- ✅ All wrapped scripts remain intact (backward compatible)
- ✅ Full TypeScript compilation

**In Progress:**
- 🟡 Testing individual commands
- 🟡 Remaining utility scripts

**Remaining:**
- ❌ ~20+ utility scripts
- ❌ package.json updates
- ❌ CI/CD pipeline updates
- ❌ Documentation updates

## Testing Checklist

Commands ready for testing:
- [ ] `bun run ep-admin publish --help`
- [ ] `bun run ep-admin ingest --help`
- [ ] `bun run ep-admin qa --help`
- [ ] `bun run ep-admin db --help`
- [ ] `bun run ep-admin discord --help`
- [ ] `bun run ep-admin skills --help`

Sample test commands:
```bash
# Test publish validation
bun run ep-admin publish validate --verbose

# Test ingest processing
bun run ep-admin ingest process --clean

# Test QA pipeline
bun run ep-admin qa process --fix

# Test database
bun run ep-admin db test --perf

# Test Discord
bun run ep-admin discord test

# Test skills generation
bun run ep-admin skills generate --format=json
```

## Next Steps

1. **Run Tests**: Execute sample commands to verify functionality
2. **Utility Commands**: Migrate remaining ~15 utility scripts
3. **package.json**: Update scripts to use new CLI commands
4. **CI/CD**: Update GitHub Actions workflows
5. **Documentation**: Create comprehensive CLI usage guide
6. **Decommission**: Archive old scripts after full migration

## Related Files

- [SCRIPTS_TO_CLI_MIGRATION.md](SCRIPTS_TO_CLI_MIGRATION.md) - Initial strategy document
- [packages/ep-admin/src/index.ts](packages/ep-admin/src/index.ts) - Main CLI entry point
- [packages/ep-admin/src/publish-commands.ts](packages/ep-admin/src/publish-commands.ts)
- [packages/ep-admin/src/ingest-commands.ts](packages/ep-admin/src/ingest-commands.ts)
- [packages/ep-admin/src/qa-commands.ts](packages/ep-admin/src/qa-commands.ts)
- [packages/ep-admin/src/db-commands.ts](packages/ep-admin/src/db-commands.ts)
- [packages/ep-admin/src/discord-commands.ts](packages/ep-admin/src/discord-commands.ts)
- [packages/ep-admin/src/skills-commands.ts](packages/ep-admin/src/skills-commands.ts)
