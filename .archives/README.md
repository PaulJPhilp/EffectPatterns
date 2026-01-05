# Archived Files

This directory contains legacy files that have been migrated or deprecated.

## Contents

### rules-mdc-archive/
- **440 MDC rule files** for Cursor and Windsurf IDEs
- **Location**: Previously in `content/published/rules/`
- **Status**: Migrated to `effect_patterns` table with `rule` field
- **Archive Date**: December 23, 2025
- **Subfolders**:
  - `cursor/` - Cursor IDE custom rules
  - `windsurf/` - Windsurf IDE custom rules

### scripts/
- **Legacy scripts** replaced by unified CLI
- **Archive Date**: January 5, 2026
- **Status**: All functionality migrated to `ep-admin` CLI
- **Subfolders**:
  - `publish/` - Legacy publish scripts (replaced by `ep-admin publish`)
  - `ingest/` - Legacy ingest scripts (replaced by `ep-admin ingest`)
  - `qa/` - Legacy QA scripts (replaced by `ep-admin qa`)

## Why This Archive Exists

### Database Migration (December 2025)
The Effect-Patterns project completed migration from file-based patterns to PostgreSQL:

1. **JSON Files** → `effect_patterns` table in PostgreSQL
2. **MDX Files** → `effect_patterns` table content fields
3. **MDC Rule Files** → `effect_patterns` table rule fields

### Scripts to CLI Migration (January 2026)
All scattered scripts consolidated into unified `ep-admin` CLI:

1. **Publish Scripts** → `ep-admin publish` commands
2. **Ingest Scripts** → `ep-admin ingest` commands
3. **QA Scripts** → `ep-admin qa` commands
4. **Utility Scripts** → `ep-admin utils`, `ep-admin ops`, etc.

## Access After Migration

### Database Access
All pattern and rule data is now accessed via:
- **Database**: PostgreSQL with Drizzle ORM
- **API**: `/api/v1/rules` endpoints
- **CLI**: Database queries via toolkit packages
- **Services**: MCP server and other services query the database

### Script Access
All script functionality is now accessed via:
- **CLI**: `bun run ep:admin <command>`
- **package.json**: Convenience scripts like `bun run publish`, `bun run validate`
- **Help**: `bun run ep:admin --help` for all commands

## Archived Scripts Reference

| Legacy Script | CLI Replacement |
|---------------|-----------------|
| `scripts/publish/validate-simple.ts` | `ep-admin publish validate` |
| `scripts/publish/test-behavioral.ts` | `ep-admin publish test` |
| `scripts/publish/generate-simple.ts` | `ep-admin publish generate` |
| `scripts/publish/publish-simple.ts` | `ep-admin publish publish` |
| `scripts/publish/test.ts` | `ep-admin publish test` |
| `scripts/ingest/test-new.ts` | `ep-admin ingest test` |
| `scripts/qa/test-single-pattern.sh` | `ep-admin qa test-single` |

## Removing This Archive

Once verified that all migrations are stable and no code references these files:

```bash
# Remove rules archive (after database migration verified)
rm -rf .archives/rules-mdc-archive

# Remove scripts archive (after CLI migration verified)
rm -rf .archives/scripts
```

## Migration Status

✅ **Database Migration Complete** (December 23, 2025)
- All legacy pattern files archived
- Database migration complete
- API and services updated

✅ **Scripts to CLI Migration Complete** (January 5, 2026)
- 45 commands migrated across 11 categories
- All `package.json` scripts updated
- Documentation complete

**Key Changes**:
- `api/index.ts` - Now uses database instead of reading .mdc files
- `services/mcp-server-stdio/` - Cleaned up to use database functions only
- `packages/toolkit/src/io.ts` - Provides database query functions
- `packages/ep-admin/src/` - Unified CLI with all commands
- `package.json` - All scripts use CLI commands
