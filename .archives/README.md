# Archived Pattern Files

This directory contains legacy pattern files that have been migrated to the PostgreSQL database.

## Contents

### rules-mdc-archive/
- **440 MDC rule files** for Cursor and Windsurf IDEs
- **Location**: Previously in `content/published/rules/`
- **Status**: Migrated to `effect_patterns` table with `rule` field
- **Archive Date**: December 23, 2025
- **Subfolders**:
  - `cursor/` - Cursor IDE custom rules
  - `windsurf/` - Windsurf IDE custom rules

## Why This Archive Exists

The Effect-Patterns project has completed migration from file-based patterns to a PostgreSQL database:

1. **JSON Files** → `effect_patterns` table in PostgreSQL
2. **MDX Files** → `effect_patterns` table content fields
3. **MDC Rule Files** → `effect_patterns` table rule fields

## Access After Migration

All pattern and rule data is now accessed via:

- **Database**: PostgreSQL with Drizzle ORM
- **API**: `/api/v1/rules` endpoints
- **CLI**: Database queries via toolkit packages
- **Services**: MCP server and other services query the database

## Removing This Archive

Once verified that all data is properly in the database and no code references these files:

```bash
rm -rf .archives/rules-mdc-archive
```

## Migration Status

✅ **Complete** - All legacy pattern files have been archived and database migration is complete.

**Key Changes**:
- `api/index.ts` - Now uses database instead of reading .mdc files
- `services/mcp-server-stdio/` - Cleaned up to use database functions only
- `packages/toolkit/src/io.ts` - Provides database query functions
