# Archived Scripts - CLI Migration

**Archive Date**: January 5, 2026  
**Reason**: All functionality migrated to unified `ep-admin` CLI

---

## Scripts Archived

### Publish Scripts (`.archives/scripts/publish/`)

| Script | CLI Replacement | Notes |
|--------|-----------------|-------|
| `validate-simple.ts` | `ep-admin publish validate` | Simple variant, use improved version via CLI |
| `publish-simple.ts` | `ep-admin publish publish` | Simple variant, use improved version via CLI |
| `generate-simple.ts` | `ep-admin publish generate` | Simple variant, use improved version via CLI |
| `rules-simple.ts` | `ep-admin publish lint` | Simple variant, use improved version via CLI |
| `test-behavioral.ts` | `ep-admin publish test` | Behavioral tests now part of main test command |
| `test-integration.ts` | `ep-admin publish test` | Integration tests now part of main test command |
| `test.ts` | `ep-admin publish test` | Basic test runner, use improved version via CLI |
| `generate-claude-rules.ts` | `ep-admin publish generate` | Claude-specific rules, use main generate command |
| `publish-one.ts` | `ep-admin publish publish` | Single pattern publish, use main command with filters |
| `prepublish-check.ts` | `ep-admin autofix prepublish` | Now part of autofix command |
| `prepublish-check-one.ts` | `ep-admin autofix prepublish` | Single pattern check, use autofix with filters |
| `pattern-validator.ts` | `ep-admin publish validate` | Pattern validation, use main validate command |
| `validate-pipeline-integrity.ts` | `ep-admin publish validate` | Pipeline integrity, use main validate command |
| `move-to-published.ts` | `ep-admin publish publish` | Move patterns, use main publish command |

### Ingest Scripts (`.archives/scripts/ingest/`)

| Script | CLI Replacement | Notes |
|--------|-----------------|-------|
| `test-new.ts` | `ep-admin ingest test` | Test runner, use improved version via CLI |
| `test-publish.ts` | `ep-admin ingest test` | Test runner, use improved version via CLI |
| `run.ts` | `ep-admin ingest status` | Status runner, use improved version via CLI |

### QA Scripts (`.archives/scripts/qa/`)

| Script | CLI Replacement | Notes |
|--------|-----------------|-------|
| `run-fix.sh` | `ep-admin qa repair` | QA repair, use improved version via CLI |
| `test-qa-process.sh` | `ep-admin qa process` | QA process test, use improved version via CLI |
| `test-single-pattern.sh` | `ep-admin qa test-single` | Single pattern test, use improved version via CLI |

---

## Active Scripts (Still in Use)

These scripts remain active and are wrapped by the CLI:

### Publish Scripts
- `validate-improved.ts` - Used by `ep-admin publish validate`
- `test-improved.ts` - Used by `ep-admin publish test`
- `publish.ts` - Used by `ep-admin publish publish`
- `generate.ts` - Used by `ep-admin publish generate`
- `rules-improved.ts` - Used by `ep-admin publish lint`
- `pipeline.ts` - Used by `ep-admin publish pipeline`
- `lint-effect-patterns.ts` - Used by `ep-admin publish lint`
- `validate.ts` - Used by `ep-admin publish validate`

### Ingest Scripts
- `process.ts` - Used by `ep-admin ingest process`
- `process-one.ts` - Used by `ep-admin ingest process-one`
- `populate-expectations.ts` - Used by `ep-admin ingest populate`
- `ingest-pipeline-improved.ts` - Used by `ep-admin ingest pipeline`

### QA Scripts
- `qa-process.sh` - Used by `ep-admin qa process`
- `permissions-fix.sh` - Used by `ep-admin qa fix-permissions`

### Other Scripts
- `add-seqid.js` - Used by `ep-admin utils add-seqid`
- `renumber-seqid.js` - Used by `ep-admin utils renumber-seqid`
- `flatten-discord-qna.js` - Used by `ep-admin discord flatten`
- `health-check.sh` - Used by `ep-admin ops health-check`
- `rotate-api-key.sh` - Used by `ep-admin ops rotate-api-key`
- `upgrade-baseline.sh` - Used by `ep-admin ops upgrade-baseline`

---

## Migration Benefits

1. **Unified Interface** - All operations through single `ep-admin` CLI
2. **Consistent Options** - Standardized flags like `--verbose`, `--dry-run`
3. **Better Help** - `--help` on any command shows all options
4. **Type Safety** - Full TypeScript + Effect-TS patterns
5. **Composability** - Commands can be chained with Effect combinators

---

## Restoration

If you need to restore any archived script:

```bash
# Copy from archive back to scripts/
cp .archives/scripts/publish/validate-simple.ts scripts/publish/

# Or use git to restore
git checkout HEAD -- scripts/publish/validate-simple.ts
```

---

## Removal

Once verified that CLI migration is stable (recommended: 30 days):

```bash
# Remove all archived scripts
rm -rf .archives/scripts
```

---

**For current CLI usage, see**: `CLI_MIGRATION_COMPLETE.md`
