# Scripts to CLI Migration Audit

## Already Migrated to CLI ✅

### Publish Commands (`ep-admin publish`)
- ✅ validate-improved.ts → `ep-admin publish validate`
- ✅ test-improved.ts → `ep-admin publish test`
- ✅ publish.ts → `ep-admin publish publish`
- ✅ generate.ts → `ep-admin publish generate`
- ✅ rules-improved.ts → `ep-admin publish lint`
- ✅ pipeline.ts → `ep-admin publish pipeline`

### Ingest Commands (`ep-admin ingest`)
- ✅ process.ts → `ep-admin ingest process`
- ✅ process-one.ts → `ep-admin ingest process-one`
- ✅ validate.ts → `ep-admin ingest validate`
- ✅ test-new.ts / test-publish.ts → `ep-admin ingest test`
- ✅ populate-expectations.ts → `ep-admin ingest populate`
- ✅ run.ts → `ep-admin ingest status`
- ✅ ingest-pipeline-improved.ts → `ep-admin ingest pipeline`

### QA Commands (`ep-admin qa`)
- ✅ qa-process.sh → `ep-admin qa process`
- ✅ qa-status.ts → `ep-admin qa status`
- ✅ qa-report.ts → `ep-admin qa report`
- ✅ qa-repair.ts → `ep-admin qa repair`
- ✅ test-enhanced-qa.ts → `ep-admin qa test-enhanced`
- ✅ test-single-pattern.sh → `ep-admin qa test-single`
- ✅ permissions-fix.sh → `ep-admin qa fix-permissions`

### Database Commands (`ep-admin db`)
- ✅ test-db.ts → `ep-admin db test`
- ✅ test-db-quick.ts → `ep-admin db test-quick`
- ✅ verify-migration.ts → `ep-admin db verify-migration`
- ✅ mock-db.ts → `ep-admin db mock`

### Discord Commands (`ep-admin discord`)
- ✅ ingest-discord.ts → `ep-admin discord ingest`
- ✅ test-discord-simple.ts → `ep-admin discord test`

### Skills Commands (`ep-admin skills`)
- ✅ generate-skills.ts → `ep-admin skills generate`
- ✅ skill-generator.ts → `ep-admin skills skill-generator`
- ✅ generate_readme_by_skill_usecase.ts → `ep-admin skills generate-readme`

### Migration Commands (`ep-admin migrate`)
- ✅ migrate-state.ts → `ep-admin migrate state`
- ✅ migrate-to-postgres.ts → `ep-admin migrate postgres`

### Operations Commands (`ep-admin ops`)
- ✅ health-check.sh → `ep-admin ops health-check`
- ✅ rotate-api-key.sh → `ep-admin ops rotate-api-key`
- ✅ upgrade-baseline.sh → `ep-admin ops upgrade-baseline`

### Test Utils Commands (`ep-admin test-utils`)
- ✅ test-chat-app-core.ts → `ep-admin test-utils chat-app`
- ✅ test-harness.ts → `ep-admin test-utils harness`
- ✅ test-harness-cli.ts → `ep-admin test-utils harness-cli`
- ✅ test-llm-service.ts → `ep-admin test-utils llm`
- ✅ test-models.ts → `ep-admin test-utils models`
- ✅ test-patterns.ts → `ep-admin test-utils patterns`
- ✅ test-supermemory.ts → `ep-admin test-utils supermemory`

---

## Scripts Needing Migration 🔧

### Utility Scripts (Low Priority)
1. **add-seqid.js** - Adds sequential IDs to Discord QnA messages
   - Proposed: `ep-admin utils add-seqid [file] [--start N] [--backup] [--dry-run]`
   - Priority: Low (Discord-specific utility)

2. **renumber-seqid.js** - Renumbers sequential IDs
   - Proposed: `ep-admin utils renumber-seqid [file]`
   - Priority: Low (Discord-specific utility)

3. **flatten-discord-qna.js** - Flattens nested Discord messages
   - Proposed: `ep-admin discord flatten [file]`
   - Priority: Low (Discord-specific utility)

### Autofix Scripts (Medium Priority)
4. **autofix/prepublish-autofix.ts** - AI-powered autofix for prepublish errors
   - Proposed: `ep-admin autofix prepublish [--report FILE] [--ai] [--write]`
   - Priority: Medium (useful for automation)

### Publish Variants (Keep as-is or deprecate)
5. **publish/generate-simple.ts** - Simple version of generate
6. **publish/generate-claude-rules.ts** - Claude-specific rules generation
7. **publish/publish-simple.ts** - Simple version of publish
8. **publish/publish-one.ts** - Publish single pattern
9. **publish/rules-simple.ts** - Simple rules generation
10. **publish/validate-simple.ts** - Simple validation
11. **publish/test.ts** - Basic test runner
12. **publish/test-behavioral.ts** - Behavioral tests
13. **publish/test-integration.ts** - Integration tests
14. **publish/prepublish-check.ts** - Pre-publish checks
15. **publish/prepublish-check-one.ts** - Single pattern pre-publish check
16. **publish/pattern-validator.ts** - Pattern validation
17. **publish/validate-pipeline-integrity.ts** - Pipeline integrity validation
18. **publish/move-to-published.ts** - Move patterns to published
19. **publish/lint-effect-patterns.ts** - Effect patterns linting

**Decision**: Most of these are variants or legacy versions. Keep the `-improved` versions in CLI, deprecate simple versions.

---

## Test Files (Keep as-is) ✅
- integration.test.ts
- ep-rules-add.test.ts
- vitest-env.ts
- All files in `__tests__/` directories

---

## CLI Test Scripts (Keep as-is) ✅
- cli-tests/*.sh - These test the CLI itself

---

## Recommendation

### Phase 2A: Create Utils Command Group
Add new command group for utility scripts:
```typescript
// packages/ep-admin/src/utils-commands.ts
export const utilsCommand = Command.make("utils").pipe(
  Command.withDescription("Utility scripts for data management"),
  Command.withSubcommands([
    addSeqIdCommand,      // add-seqid.js
    renumberSeqIdCommand, // renumber-seqid.js
  ])
);
```

### Phase 2B: Enhance Discord Commands
Add flatten command to discord group:
```typescript
// packages/ep-admin/src/discord-commands.ts
export const discordFlattenCommand = Command.make("flatten", {...});
```

### Phase 2C: Create Autofix Command Group
```typescript
// packages/ep-admin/src/autofix-commands.ts
export const autofixCommand = Command.make("autofix").pipe(
  Command.withDescription("AI-powered autofix utilities"),
  Command.withSubcommands([
    prepublishAutofixCommand,
  ])
);
```

### Phase 2D: Deprecate Legacy Scripts
Mark these for removal after CLI is stable:
- All `-simple` variants in publish/
- Legacy test variants (keep only `-improved` versions)

---

## Summary

**Total Scripts**: ~55
**Already Migrated**: ~35 (63%)
**Need Migration**: ~8 core utilities (15%)
**Keep as-is**: ~12 test/config files (22%)

**Estimated Work**: 2-3 hours to migrate remaining 8 scripts
