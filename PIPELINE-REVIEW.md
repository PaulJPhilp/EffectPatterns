# PIPELINE-REVIEW.md - Code Review Checklist

## Purpose

This checklist ensures pipeline changes maintain:
- Output integrity
- Atomic prevention
- Idempotency
- Repository consistency

**All pipeline changes require this review before merge.**

## Pre-Review Checklist

Before submitting a pipeline PR:

- [ ] Change is in `scripts/publish/` or `.git/hooks/`
- [ ] No changes to `content/new/` or `content/published/` structure
- [ ] All existing tests pass: `bun run test`
- [ ] Pipeline runs successfully: `bun run pipeline`
- [ ] No new forbidden directories created
- [ ] Documentation updated (PIPELINE.md or CONTRIBUTING.md)

## Code Review Checklist

### 1. Separation of Concerns

- [ ] Source files still live in `content/new/`
- [ ] Generated files still go to `content/published/`
- [ ] No generation writes outside `content/published/`
- [ ] No manual edits to published files

**Red flags:**
- ❌ Writing to `patterns/`, `rules/`, `.claude/`, etc.
- ❌ Reading from `content/published/` as source
- ❌ Modifying published files during pipeline

### 2. Atomic Prevention Integrity

- [ ] `validate-pipeline-integrity.ts` still runs at pipeline start
- [ ] Pre-commit hook still blocks forbidden directories
- [ ] No way to bypass prevention layers
- [ ] Error messages are clear and actionable

**Red flags:**
- ❌ Removing or weakening validation checks
- ❌ Commenting out prevention code
- ❌ Adding exceptions to forbidden directories

### 3. Idempotency

- [ ] Pipeline can run twice with same result
- [ ] No state is lost between runs
- [ ] No partial failures leave artifacts
- [ ] Cleanup happens on both success and failure

**Red flags:**
- ❌ Deleting files without verification
- ❌ Assuming previous state exists
- ❌ Creating files that aren't regenerated

### 4. Output Correctness

- [ ] README has correct structure (12 core + 14 schema categories)
- [ ] All 195 patterns appear in README
- [ ] Rules files are valid (syntax, completeness)
- [ ] Skills files are valid format
- [ ] No duplicate or missing entries

**Red flags:**
- ❌ README structure changed
- ❌ Categories renamed or reordered
- ❌ Patterns missing from README
- ❌ Invalid JSON or syntax in outputs

### 5. Error Handling

- [ ] All errors are caught and reported
- [ ] Error messages are clear and actionable
- [ ] Pipeline stops on first error
- [ ] No silent failures

**Red flags:**
- ❌ Errors silently ignored
- ❌ Generic error messages
- ❌ Pipeline continues after fatal error

### 6. Documentation

- [ ] Changes documented in PIPELINE.md
- [ ] CONTRIBUTING.md reflects changes if needed
- [ ] Code comments explain why, not just what
- [ ] Troubleshooting guide updated

**Red flags:**
- ❌ No documentation of changes
- ❌ Documentation out of date
- ❌ Comments say "HACK" or "TODO"

### 7. Testing

- [ ] All existing tests pass
- [ ] New tests added for new logic
- [ ] Tests verify separation of concerns
- [ ] Tests verify atomic prevention

**Red flags:**
- ❌ No tests for changes
- ❌ Tests are skipped or commented out
- ❌ Tests don't verify prevention system

### 8. Performance

- [ ] Pipeline completes in reasonable time (< 30s)
- [ ] No unnecessary file operations
- [ ] No blocking operations that could be async

**Red flags:**
- ❌ Pipeline noticeably slower
- ❌ Repeated file reads of same file
- ❌ Sync operations in loops

## Review Questions

1. **Could this bypass the prevention system?**
   - If yes, reject immediately
2. **Could this break idempotency?**
   - If yes, require changes
3. **Could this corrupt published outputs?**
   - If yes, require changes
4. **Is the code maintainable?**
   - If no, request improvements

## Approval Criteria

Approve only if:

✅ All sections pass  
✅ No red flags present  
✅ Tests pass  
✅ Documentation is clear  
✅ Separation of concerns maintained  
✅ Atomic prevention intact  

## After Approval

- [ ] Squash commits if needed
- [ ] Merge to main
- [ ] Monitor next pipeline run for issues
