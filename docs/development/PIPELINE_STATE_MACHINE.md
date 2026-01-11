# Pipeline State Machine User Guide

A comprehensive guide to using the Effect Patterns publishing pipeline state machine.

## Overview

The **PipelineStateMachine** tracks pattern state through the publishing workflow, enabling:
- ✅ **Status Visibility** - Know exactly where each pattern is in the workflow
- ✅ **Retry Support** - Rerun failed steps without redoing successful ones
- ✅ **Resume Capability** - Continue from interruptions seamlessly
- ✅ **Audit Trail** - Complete history of operations via checkpoints

## Workflow States

Patterns progress through 6 workflow states:

```
draft → ingested → tested → validated → published → finalized
```

### State Descriptions

| State | When Reached | What Happened |
|-------|--------------|---------------|
| **draft** | Initial state | Pattern created but not yet processed |
| **ingested** | After ingest step | Pattern files discovered and validated |
| **tested** | After test step | TypeScript examples run successfully |
| **validated** | After validate step | Documentation and structure verified |
| **published** | After publish step | MDX embedded in content/published/ |
| **finalized** | After move step | Pattern moved to final location, cleanup done |

### Pattern Status Values

While moving through states, a pattern has a **status** that indicates readiness:

- **draft** - Not ready to process
- **in-progress** - Currently running a step
- **ready** - Completed current step, ready for next
- **blocked** - Cannot proceed (manual intervention needed)
- **completed** - All steps finished successfully
- **failed** - A step failed, needs retry or fix

## Basic Operations

### Check Pattern Status

**View all patterns:**
```bash
ep-admin pipeline-state status
```

Output:
```
📊 Pipeline Status (3 patterns)

🔄 in-progress:
   • My New Pattern (tested)

✅ ready:
   • Another Pattern (validated)

✨ completed:
   • Published Pattern (finalized)
```

**View specific pattern:**
```bash
ep-admin pipeline-state status --pattern my-pattern-id
```

Output:
```
📊 Pipeline Status - My Pattern Title
   ID: my-pattern-id
   Status: in-progress
   Current Step: tested

   Steps:
     ✅ ingested (completed 5s ago)
     🔄 tested (running...)
     ⏳ validated (pending)
     ⏳ published (pending)
     ⏳ finalized (pending)
```

**Verbose output:**
```bash
ep-admin pipeline-state status --pattern my-pattern-id --verbose
```

Shows timing and errors for each step.

## Handling Failures

### When a Step Fails

The pipeline automatically records the failure and stops. You'll see:

```
❌ test-improved.ts failed
test/example.ts:15: Type error: Property 'x' does not exist

Pipeline paused. Fix the issue and retry.
```

### Fix and Retry

1. **Fix the issue** in your pattern files
2. **Retry the specific step:**

```bash
# Retry tested step for one pattern
ep-admin pipeline-state retry tested my-pattern-id

# Retry validated step for all failed patterns
ep-admin pipeline-state retry validated --all
```

3. **Resume the pipeline:**

```bash
bun run pipeline
```

The pipeline will:
- Skip already-completed steps for your pattern
- Start from the step that failed
- Continue to the next steps

### Retry Limits

- Each step can be retried **up to 3 times**
- After 3 attempts, manual intervention is required
- You can fix the code and retry again

## Advanced Operations

### Resume from Checkpoint

If the pipeline was interrupted (Ctrl+C, system crash, etc.):

```bash
# See which patterns are ready to continue
ep-admin pipeline-state resume

# Output:
# ▶️  2 pattern(s) ready to continue:
#    • Pattern A (validated → published)
#    • Pattern B (published → finalized)
```

Then restart the pipeline:

```bash
bun run pipeline
```

The state machine will:
- Load saved state from `.pipeline-state.json`
- Skip already-completed steps
- Resume from where it left off

### View Detailed Checkpoints

Each step records detailed **checkpoints** for auditing. Checkpoints appear in stderr during pipeline execution:

```bash
# Run pipeline and capture checkpoints
bun run pipeline 2>checkpoints.log

# View checkpoint log
grep CHECKPOINT checkpoints.log | jq '.'
```

Example checkpoint:
```json
{
  "operation": "test-completed",
  "timestamp": "2025-12-13T10:30:45Z",
  "data": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "durationMs": 5234
  }
}
```

## Common Workflows

### Adding a New Pattern

```bash
# 1. Create pattern files
mkdir -p content/new/src
echo "// Example" > content/new/src/my-pattern.ts
echo "# My Pattern" > content/new/my-pattern.mdx

# 2. Run the state-aware pipeline
bun run pipeline

# 3. Pipeline will:
#    - Test your TypeScript code
#    - Validate your documentation
#    - Publish to content/published/
#    - Move to final location
#    - Generate README and rules

# 4. Check the result
ep-admin pipeline-state status --pattern my-pattern
```

### Fixing a Failed Pattern

```bash
# 1. See what failed
ep-admin pipeline-state status --pattern my-pattern --verbose

# 2. Output shows:
#    ❌ tested (failed)
#    Error: Type error in example

# 3. Fix the code
nano content/new/src/my-pattern.ts

# 4. Retry just that step
ep-admin pipeline-state retry tested my-pattern

# 5. Resume full pipeline
bun run pipeline

# 6. Verify success
ep-admin pipeline-state status --pattern my-pattern
```

### Batch Retry Failed Steps

If multiple patterns failed at the same step:

```bash
# 1. Retry all patterns at the tested step
ep-admin pipeline-state retry tested --all

# Output:
# 🔄 Retried 3 pattern(s) on step: tested

# 2. Resume pipeline
bun run pipeline

# 3. Check results
ep-admin pipeline-state status
```

### Selective Pattern Processing

If you want to process only new patterns:

```bash
# 1. Check status to see which are "draft"
ep-admin pipeline-state status

# 2. Run pipeline (processes all not yet completed)
bun run pipeline

# 3. Already-completed patterns are skipped automatically
```

## State File

The state is persisted in `.pipeline-state.json` at the project root.

### Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-13T10:30:45Z",
  "patterns": {
    "my-pattern": {
      "id": "my-pattern",
      "status": "completed",
      "currentStep": "finalized",
      "metadata": {
        "id": "my-pattern",
        "title": "My Pattern Title",
        "rawPath": "content/published/my-pattern.mdx",
        "srcPath": "content/src/my-pattern.ts",
        "summary": "Short description"
      },
      "steps": {
        "ingested": {
          "status": "completed",
          "startedAt": "2025-12-13T10:00:00Z",
          "completedAt": "2025-12-13T10:00:05Z",
          "duration": 5,
          "attempts": 1,
          "checkpoints": [
            {
              "operation": "pattern-ingested",
              "timestamp": "2025-12-13T10:00:05Z"
            }
          ]
        },
        "tested": { /* ... */ },
        "validated": { /* ... */ },
        "published": { /* ... */ },
        "finalized": { /* ... */ }
      },
      "errors": [],
      "createdAt": "2025-12-13T10:00:00Z",
      "updatedAt": "2025-12-13T10:30:45Z"
    }
  },
  "global": {
    "currentStep": null,
    "stepHistory": []
  }
}
```

### Backup and Recovery

The state file is critical. Backup it regularly:

```bash
# Backup state
cp .pipeline-state.json .pipeline-state.json.backup

# Restore from backup if needed
cp .pipeline-state.json.backup .pipeline-state.json

# Or reset for a fresh start (will mark existing patterns as completed)
rm .pipeline-state.json
bun scripts/migrate-state.ts
```

## Troubleshooting

### "State file not found"

If you see this error, the `.pipeline-state.json` file is missing. This is normal on fresh installs.

**Solution:**
```bash
# Migrate existing patterns
bun scripts/migrate-state.ts

# Or just run the pipeline (it creates a new state file)
bun run pipeline
```

### "Pattern not found in state"

Pattern exists in filesystem but not in state file.

**Solution:**
```bash
# Add the pattern to state (assumes pattern is complete)
bun scripts/migrate-state.ts
```

### "Maximum retry attempts exceeded"

A step has been retried 3 times and still fails.

**Solutions:**
1. Fix the underlying issue more thoroughly
2. Review the error logs in detail: `ep-admin pipeline-state status --pattern <id> --verbose`
3. Check the step checkpoint data for clues
4. Consider resetting that pattern's state manually if appropriate

### "Pattern is blocked"

Status shows "blocked" - usually means manual intervention needed.

**Check what's blocking:**
```bash
ep-admin pipeline-state status --pattern <id> --verbose
```

**Possible causes:**
- Resource not found
- Conflicting filename
- Permission issue

Fix the issue, then resume or retry.

## Performance Tips

### Speed Up Large Batches

The pipeline uses parallel execution (10 concurrent workers).

**Adjust parallelism:**
```bash
# In test-improved.ts, validate-improved.ts
const CONCURRENCY = 20; // Increase for faster processing
```

### Monitor Progress

Use `resume` command to check progress without restarting:

```bash
# Check status without running anything
ep-admin pipeline-state resume

# Output shows patterns ready to advance
```

### Selective Reprocessing

Only reprocess patterns that need it:

```bash
# Reprocess only failed patterns
ep-admin pipeline-state retry tested --all
bun run pipeline
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Publish Patterns

on:
  push:
    paths:
      - 'content/new/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Run Publishing Pipeline
        run: |
          bun install
          bun run pipeline

      - name: Commit changes
        run: |
          git add content/published/ .pipeline-state.json
          git commit -m "Publish new patterns" || true
          git push
```

## API Reference

All state machine operations are accessible via CLI commands:

```bash
# Status operations
ep-admin pipeline-state status              # Show all pattern states
ep-admin pipeline-state status --pattern ID # Show specific pattern

# Retry operations
ep-admin pipeline-state retry STEP              # Retry for one pattern
ep-admin pipeline-state retry STEP --all       # Retry for all failed

# Resume operations
ep-admin pipeline-state resume             # Show patterns ready to continue
ep-admin pipeline-state resume --verbose   # With detailed info
```

For programmatic access, see [packages/pipeline-state/README.md](../packages/pipeline-state/README.md).

## FAQ

**Q: Can I reset a pattern's state?**
A: Yes, by editing `.pipeline-state.json` directly. Set `status: "draft"` to restart.

**Q: What if I want to skip a step?**
A: The state machine prevents skipping. Fix the issue and retry instead.

**Q: Can multiple people run the pipeline simultaneously?**
A: Not recommended - they'll conflict on the state file. Use a mutex or sequential jobs.

**Q: Does the state machine track when each pattern was added?**
A: Yes, in the `createdAt` and `updatedAt` fields.

**Q: Can I use this with other build systems?**
A: Yes! The state machine is independent. You can invoke it from npm, Make, etc.

## Version History

- **v1.0.0** (Dec 2025) - Initial release with 6-step workflow

## Getting Help

- See troubleshooting section above
- Check [CLAUDE.md](../CLAUDE.md) for context
- Review state file (`cat .pipeline-state.json | jq '.'`)
- Check checkpoint logs for detailed operation history
