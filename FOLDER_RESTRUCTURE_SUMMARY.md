# Folder Restructure Summary

## Date: September 29, 2025

## Overview
Simplified the content structure from a complex multi-folder setup to a clean two-folder system: `published` (source of truth) and `new` (work-in-progress).

## New Directory Structure

```
content/
  ├── published/          # Source of truth - self-contained MDX with embedded TS
  ├── qa/                 # QA results for published patterns
  └── new/               # Work-in-progress patterns
      ├── raw/           # Input: new patterns with embedded code
      ├── src/           # Working: extracted TypeScript files
      ├── processed/     # Working: MDX with <Example /> tags
      ├── published/     # Output: ready to publish (embedded code)
      └── qa/            # QA results for new patterns
```

## Migration Completed

### 1. Consolidated Existing Content
- ✅ Migrated 88 patterns from `content/raw/` + `content/src/` → `content/published/`
- ✅ Embedded TypeScript code directly into MDX files
- ✅ Moved QA results from `content/qa/results/` → `content/qa/`
- ✅ Deleted old `content/raw/` and `content/src/` directories
- ✅ Backup created: `content-backup-20250929-185731`

### 2. Updated Scripts

#### Publish Scripts
- `scripts/publish/publish.ts` - Now reads from `content/new/processed/` + `content/new/src/`, writes to `content/new/published/`
- `scripts/publish/publish-simple.ts` - Same updates as above

#### Validate Scripts
- `scripts/publish/validate.ts` - Now validates `content/new/published/` and checks `content/new/src/`
- `scripts/publish/validate-simple.ts` - Same updates as above
- `scripts/publish/validate-improved.ts` - Same updates with enhanced features

#### Test Scripts
- `scripts/publish/test.ts` - Now tests TypeScript files in `content/new/src/`
- `scripts/publish/test-improved.ts` - Same updates with parallel execution

#### Ingest Pipeline
- `scripts/ingest/ingest-pipeline-improved.ts` - Now outputs to `content/new/published/` with embedded code

#### QA Scripts
- `scripts/qa/qa-report.ts` - Added `--new` flag to report on new patterns
- `scripts/qa/qa-status.ts` - Added `--new` flag to check status of new patterns

### 3. New Scripts Created

#### Move to Published Script
- `scripts/publish/move-to-published.ts` - Final step to move patterns from `content/new/published/` → `content/published/`
- Includes `--dry-run` flag for safe testing
- Cleans up all working directories after successful move
- Verifies cleanup completed successfully

## Workflow

### For New Patterns

```bash
# 1. Place new patterns in content/new/raw/ (with embedded TypeScript)

# 2. Run ingest pipeline (extracts code, validates, tests, publishes)
bun scripts/ingest/run.ts
# or
bun scripts/ingest/process.ts

# 3. Publish patterns (embed code back into MDX)
bun scripts/publish/publish.ts

# 4. Validate published patterns
bun scripts/publish/validate.ts

# 5. Run QA on new patterns
bun run qa:process --new
bun run qa:status --new

# 6. When ready, move to published (FINAL STEP)
bun scripts/publish/move-to-published.ts --dry-run  # Test first
bun scripts/publish/move-to-published.ts             # Actually move

# After successful move, content/new/ folders will be empty
```

### For Published Patterns

```bash
# Run QA on published patterns
bun run qa:process
bun run qa:status
bun run qa:report
```

## Key Benefits

1. **Single Source of Truth**: `content/published/` contains self-contained MDX files with embedded code
2. **Clear Separation**: Published vs. work-in-progress patterns are clearly separated
3. **Simpler Workflows**: No need to sync multiple directories (raw, src, published)
4. **Easy to Move**: Final publishing is a single move operation
5. **Backwards Compatible**: All existing scripts work with updated paths

## Migration Script

The migration script (`scripts/migrate-to-new-structure.ts`) can be used as a reference for future migrations or batch operations.

## Notes

- All scripts maintain the same functionality, just with updated paths
- The `--new` flag on QA scripts allows running QA on both new and published patterns
- Dry-run mode on move-to-published script allows safe testing before actual changes
- Backup was created before any changes were made
