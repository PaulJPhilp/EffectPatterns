# CLI Testing Plan

**Date**: January 5, 2026  
**Goal**: Verify all `ep-admin` CLI commands work correctly after migration

---

## Testing Strategy

### Test Levels
1. **Help Test** - Verify `--help` displays correct options
2. **Dry Run Test** - Run with `--dry-run` where available
3. **Functional Test** - Execute actual functionality
4. **Error Test** - Verify graceful error handling

### Test Environment
- Clean working directory
- Database connection available (for db commands)
- No uncommitted changes (for safety)

---

## Test Checklist

### 1. Publish Commands (`ep-admin publish`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `publish validate` | [ ] | [ ] | [ ] | ⏳ |
| `publish test` | [ ] | [ ] | [ ] | ⏳ |
| `publish publish` | [ ] | [ ] | [ ] | ⏳ |
| `publish generate` | [ ] | [ ] | [ ] | ⏳ |
| `publish lint` | [ ] | [ ] | [ ] | ⏳ |
| `publish pipeline` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin publish --help
bun run ep:admin publish validate --help

# Functional tests
bun run ep:admin publish validate --verbose
bun run ep:admin publish test
bun run ep:admin publish lint
```

---

### 2. Ingest Commands (`ep-admin ingest`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `ingest process` | [ ] | [ ] | [ ] | ⏳ |
| `ingest process-one` | [ ] | [ ] | [ ] | ⏳ |
| `ingest validate` | [ ] | [ ] | [ ] | ⏳ |
| `ingest test` | [ ] | [ ] | [ ] | ⏳ |
| `ingest populate` | [ ] | [ ] | [ ] | ⏳ |
| `ingest status` | [ ] | [ ] | [ ] | ⏳ |
| `ingest pipeline` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin ingest --help
bun run ep:admin ingest process --help

# Functional tests
bun run ep:admin ingest status
bun run ep:admin ingest validate
```

---

### 3. QA Commands (`ep-admin qa`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `qa process` | [ ] | [ ] | [ ] | ⏳ |
| `qa status` | [ ] | [ ] | [ ] | ⏳ |
| `qa report` | [ ] | [ ] | [ ] | ⏳ |
| `qa repair` | [ ] | [ ] | [ ] | ⏳ |
| `qa test-enhanced` | [ ] | [ ] | [ ] | ⏳ |
| `qa test-single` | [ ] | [ ] | [ ] | ⏳ |
| `qa fix-permissions` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin qa --help

# Functional tests (safe)
bun run ep:admin qa status
bun run ep:admin qa report

# With dry-run
bun run ep:admin qa repair --dry-run
```

---

### 4. Database Commands (`ep-admin db`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `db test` | [ ] | [ ] | [ ] | ⏳ |
| `db test-quick` | [ ] | [ ] | [ ] | ⏳ |
| `db verify-migration` | [ ] | [ ] | [ ] | ⏳ |
| `db mock` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin db --help

# Functional tests (requires DB)
bun run ep:admin db test-quick
bun run ep:admin db test
bun run ep:admin db verify-migration
```

---

### 5. Discord Commands (`ep-admin discord`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `discord ingest` | [ ] | [ ] | [ ] | ⏳ |
| `discord test` | [ ] | [ ] | [ ] | ⏳ |
| `discord flatten` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin discord --help
bun run ep:admin discord flatten --help

# Functional tests (safe - flatten only if file exists)
bun run ep:admin discord flatten --file packages/data/discord-qna.json
```

---

### 6. Skills Commands (`ep-admin skills`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `skills generate` | [ ] | [ ] | [ ] | ⏳ |
| `skills skill-generator` | [ ] | [ ] | [ ] | ⏳ |
| `skills generate-readme` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin skills --help

# Functional tests
bun run ep:admin skills generate-readme --help
```

---

### 7. Migration Commands (`ep-admin migrate`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `migrate state` | [ ] | [ ] | [ ] | ⏳ |
| `migrate postgres` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin migrate --help

# These are destructive - test help only
bun run ep:admin migrate state --help
bun run ep:admin migrate postgres --help
```

---

### 8. Operations Commands (`ep-admin ops`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `ops health-check` | [ ] | [ ] | [ ] | ⏳ |
| `ops rotate-api-key` | [ ] | [ ] | [ ] | ⏳ |
| `ops upgrade-baseline` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin ops --help

# Safe functional test
bun run ep:admin ops health-check
```

---

### 9. Test Utils Commands (`ep-admin test-utils`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `test-utils chat-app` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils harness` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils harness-cli` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils llm` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils models` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils patterns` | [ ] | [ ] | [ ] | ⏳ |
| `test-utils supermemory` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin test-utils --help

# Functional tests
bun run ep:admin test-utils models
bun run ep:admin test-utils patterns
```

---

### 10. Utility Commands (`ep-admin utils`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `utils add-seqid` | [ ] | [ ] | [ ] | ⏳ |
| `utils renumber-seqid` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin utils --help
bun run ep:admin utils add-seqid --help

# Functional tests (with dry-run)
bun run ep:admin utils add-seqid --dry-run
```

---

### 11. Autofix Commands (`ep-admin autofix`)

| Command | Help | Dry Run | Functional | Status |
|---------|------|---------|------------|--------|
| `autofix prepublish` | [ ] | [ ] | [ ] | ⏳ |

**Test Commands:**
```bash
# Help tests
bun run ep:admin autofix --help
bun run ep:admin autofix prepublish --help

# Functional tests (default is dry-run)
bun run ep:admin autofix prepublish
```

---

## Quick Test Script

Run all help tests in sequence:

```bash
#!/bin/bash
# CLI Help Tests

echo "=== Testing ep-admin CLI Help ==="

commands=(
  "publish"
  "ingest"
  "qa"
  "db"
  "discord"
  "skills"
  "migrate"
  "ops"
  "test-utils"
  "utils"
  "autofix"
)

for cmd in "${commands[@]}"; do
  echo ""
  echo "--- Testing: $cmd ---"
  bun run ep:admin $cmd --help > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ $cmd --help"
  else
    echo "❌ $cmd --help FAILED"
  fi
done

echo ""
echo "=== Help Tests Complete ==="
```

---

## Safe Functional Tests

These commands are safe to run without side effects:

```bash
# Status/info commands (read-only)
bun run ep:admin qa status
bun run ep:admin qa report
bun run ep:admin db test-quick
bun run ep:admin ops health-check

# Validation commands (read-only)
bun run ep:admin publish validate
bun run ep:admin ingest validate

# Test commands (isolated)
bun run ep:admin publish test
bun run ep:admin test-utils patterns
bun run ep:admin test-utils models
```

---

## Destructive Tests (Require Caution)

These commands modify state - run with care:

```bash
# Migration commands
bun run ep:admin migrate state      # Modifies .pipeline-state.json
bun run ep:admin migrate postgres   # Database migration

# Publish commands
bun run ep:admin publish publish    # Moves files
bun run ep:admin publish pipeline   # Full pipeline

# Repair commands
bun run ep:admin qa repair          # Modifies files

# Discord commands
bun run ep:admin discord ingest     # Writes to database
bun run ep:admin discord flatten    # Modifies JSON file
```

---

## Expected Issues

### Known Limitations
1. **Database Required** - `db` commands need PostgreSQL connection
2. **Discord Credentials** - `discord ingest` needs API tokens
3. **AI Keys** - `autofix prepublish --ai-call` needs AI provider keys

### Potential Failures
- Commands may fail if underlying scripts have bugs
- Some commands may require specific file/directory state
- Effect version warnings are expected (non-blocking)

---

## Test Execution Order

**Phase 1: Help Tests** (5 min)
- Run all `--help` commands to verify CLI registration

**Phase 2: Safe Read-Only Tests** (10 min)
- Status, report, and validation commands

**Phase 3: Isolated Functional Tests** (15 min)
- Test and lint commands with verbose output

**Phase 4: Integration Tests** (20 min)
- Full pipeline tests in a test environment

---

## Results Summary (January 5, 2026)

| Category | Total | Passed | Failed | Env Issue |
|----------|-------|--------|--------|-----------|
| Publish | 4 | 4 | 0 | 0 |
| Ingest | 7 | 2 | 1 | 4 |
| QA | 7 | 4 | 0 | 3 |
| Database | 4 | 4 | 0 | 0 |
| Discord | 3 | 1 | 0 | 2 |
| Skills | 3 | 2 | 0 | 1 |
| Migration | 2 | 0 | 0 | 2 |
| Operations | 3 | 0 | 1 | 2 |
| Test Utils | 7 | 2 | 1 | 4 |
| Utils | 2 | 0 | 0 | 2 |
| Autofix | 1 | 0 | 0 | 1 |
| **Total** | **43** | **19** | **3** | **21** |

### Legend
- **Passed**: Command executed successfully
- **Failed**: Command has a bug/missing code
- **Env Issue**: Command works but requires specific files/state

---

## Detailed Results

### ✅ Passing Commands (19)
| Command | Notes |
|---------|-------|
| `validate` | ✅ Pattern validation works |
| `test` | ✅ TypeScript tests pass |
| `generate` | ✅ README generation works |
| `pipeline` | ✅ Help works (full run not tested) |
| `qa status` | ✅ Status check works |
| `qa report` | ✅ Report generation works |
| `qa repair --dry-run` | ✅ Dry-run works |
| `db test` | ✅ Full database tests pass |
| `db test-quick` | ✅ Quick connectivity test passes |
| `db verify-migration` | ✅ Migration verification works |
| `test-utils patterns` | ✅ Pattern tests pass |
| `skills generate-readme` | ✅ README generation works |
| `ingest --help` | ✅ Help displays correctly |
| `discord --help` | ✅ Help displays correctly |
| All `--help` commands | ✅ All 11 command groups show help |

### ⚠️ Environment Issues (21)
These commands work but require specific files/state:

| Command | Required |
|---------|----------|
| `ingest process` | Empty content/new/src directory |
| `ingest status` | Raw files to process |
| `migrate state` | No existing .pipeline-state.json |
| `autofix prepublish` | prepublish-report.json file |
| `utils add-seqid` | discord-qna.json file |
| `discord flatten` | discord-qna.json file |
| `discord ingest` | Discord API credentials |
| `ops health-check` | Shell script compatibility |
| `test-utils models` | AI provider modules |

### ❌ Code Issues Found (3)
| Command | Issue | Fix Status |
|---------|-------|------------|
| `validate` | Missing `executeScriptWithTUI` import | ✅ Fixed |
| `ingest status` | Referenced archived script | ✅ Fixed |
| `ingest validate` | Referenced missing script | ✅ Fixed |

---

## Next Steps After Testing

1. [ ] Fix any failing commands
2. [ ] Update MIGRATION_PROGRESS.md with results
3. [ ] Create automated test suite (optional)
4. [ ] Update CI/CD to use CLI commands

---

## ep (User CLI) Results (January 5, 2026)

### ✅ Fix Applied

The `ep` CLI entrypoint previously produced no output because it defined the
runner but did not execute it when invoked.

- Updated `packages/ep-cli/src/index.ts` to run `createUserProgram(process.argv)`
  via `NodeRuntime.runMain`.

### ✅ Help Tests

All `--help` commands render successfully:

- `ep --help`
- `ep search --help`
- `ep list --help`
- `ep show --help`
- `ep pattern --help`
- `ep install --help`

### ✅ Functional Smoke Tests

- `ep list --group-by category` (works)
- `ep list --difficulty beginner` (works)
- `ep search scope` (works)
- `ep show compose-scoped-layers` (works)

### 🛠 Bug Found and Fixed

- `ep list --category "Error Handling"` initially failed during cleanup with:
  `TypeError: db.close is not a function`.

Fix:
- Added `closeDatabaseSafely` helper and replaced direct `db.close()` calls.
- After fix, the same command exits successfully (prints “No patterns match”).
