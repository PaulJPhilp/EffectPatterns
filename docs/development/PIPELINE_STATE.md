# Pipeline State Machine (v0.8.0+)

Advanced pattern state tracking and workflow management for the publishing pipeline.

---

## Overview

The publishing pipeline integrates with a **PipelineStateMachine** that:
- Tracks pattern state through the workflow
- Enables retries of failed steps
- Provides status visibility and recovery
- Maintains audit trail of all operations

---

## Workflow States

Patterns progress through 6 states as they move through the pipeline:

```
draft
  ↓
ingested (pattern files discovered/processed)
  ↓
tested (TypeScript examples validated)
  ↓
validated (documentation and structure verified)
  ↓
published (MDX published to content/published/)
  ↓
finalized (moved to content/published/ and cleaned up)
```

### State Descriptions

| State | Description | What Happened |
|-------|-------------|---------------|
| **draft** | Initial state | Pattern created, not yet processed |
| **ingested** | Pattern files discovered | Ingest pipeline processed pattern |
| **tested** | TypeScript validated | Type checking passed |
| **validated** | Structure verified | All validation checks passed |
| **published** | MDX in pipeline output | Code embedded into MDX |
| **finalized** | Moved to published | In content/published/ and cleaned up |

---

## State-Aware Commands

All state management commands are under `ep-admin pipeline-state`:

### Show Pattern Status

```bash
# Show status of all patterns
ep-admin pipeline-state status

# Show status with verbose details
ep-admin pipeline-state status --verbose

# Show specific pattern
ep-admin pipeline-state status --pattern my-pattern-id

# Show specific pattern with details
ep-admin pipeline-state status --pattern my-pattern-id --verbose
```

**Output Example:**
```
Pattern: my-pattern
Status: in-progress
Current Step: tested
Created: 2025-12-13T10:30:00Z
Updated: 2025-12-13T10:35:00Z

Steps:
  ✓ ingested (completed, 5.2s)
  → tested (running, attempt 1)
  - validated (pending)
  - published (pending)
  - finalized (pending)
```

### Retry Failed Steps

```bash
# Retry a specific step for all failed patterns
ep-admin pipeline-state retry tested

# Retry a step for a specific pattern
ep-admin pipeline-state retry tested my-pattern-id

# Retry all failed patterns for a step
ep-admin pipeline-state retry validated --all

# Retry with verbose output
ep-admin pipeline-state retry tested --verbose
```

**Behavior:**
- Resets step status from failed → pending
- Runs pipeline from that step forward
- Preserves history of previous attempts
- Reports on retry completion

### Show Patterns Ready to Continue

```bash
# Show all patterns ready to resume
ep-admin pipeline-state resume

# Show with detailed information
ep-admin pipeline-state resume --verbose

# Filter by status
ep-admin pipeline-state resume --status tested
```

---

## State File Format

Pipeline state is persisted to `.pipeline-state.json` at project root:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-13T10:35:00Z",
  "patterns": {
    "my-pattern-id": {
      "id": "my-pattern-id",
      "status": "in-progress",
      "currentStep": "tested",
      "steps": {
        "ingested": {
          "status": "completed",
          "duration": 5.2,
          "startedAt": "2025-12-13T10:30:00Z",
          "completedAt": "2025-12-13T10:30:05Z"
        },
        "tested": {
          "status": "running",
          "attempts": 1,
          "startedAt": "2025-12-13T10:30:05Z"
        },
        "validated": {
          "status": "pending"
        },
        "published": {
          "status": "pending"
        },
        "finalized": {
          "status": "pending"
        }
      },
      "metadata": {
        "title": "Pattern Title",
        "skillLevel": "intermediate",
        "useCase": ["Error Management"]
      },
      "createdAt": "2025-12-13T10:30:00Z",
      "updatedAt": "2025-12-13T10:35:00Z"
    }
  },
  "global": {
    "currentStep": null,
    "stepHistory": [
      {
        "step": "tested",
        "timestamp": "2025-12-13T10:30:05Z",
        "patternsProcessed": 150,
        "patternsSucceeded": 148,
        "patternsFailed": 2
      }
    ]
  }
}
```

### Field Descriptions

**Top Level:**
- `version` - State file format version
- `lastUpdated` - Last time state was updated
- `patterns` - Map of pattern ID → pattern state
- `global` - Global pipeline state

**Per-Pattern State:**
- `id` - Pattern unique identifier
- `status` - Current overall status (draft, in-progress, completed, failed)
- `currentStep` - Which step pattern is on (ingested, tested, validated, published, finalized)
- `steps` - Object with status for each pipeline step
- `metadata` - Pattern frontmatter (title, skillLevel, useCase, etc.)
- `createdAt` - When pattern was added to state
- `updatedAt` - When pattern state last changed

**Step Status:**
- `status` - pending, running, completed, failed, skipped
- `attempts` - Number of times this step was run
- `duration` - Time taken (if completed)
- `startedAt` - When step started
- `completedAt` - When step finished
- `error` - Error message (if failed)

---

## Checkpoints & Audit Trail

Each step in the pipeline records checkpoints as JSON in stderr:

```json
[CHECKPOINT] {
  "operation": "test-completed",
  "timestamp": "2025-12-13T10:30:05Z",
  "data": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "durationMs": 5234
  }
}

[CHECKPOINT] {
  "operation": "validation-started",
  "timestamp": "2025-12-13T10:30:06Z",
  "data": {
    "patterns": 150,
    "parallelConcurrency": 10
  }
}
```

**Checkpoint Types:**
- `ingest-started`, `ingest-completed` - Ingest process start/completion
- `test-started`, `test-completed` - Testing phase
- `publish-started`, `publish-completed` - Publishing phase
- `validation-started`, `validation-completed` - Validation phase
- `readme-generation-started`, `readme-generation-completed` - README generation
- `rules-generation-started`, `rules-generation-completed` - Rules generation

**Usage:**
- Audit trail for all operations
- Can be logged to external systems
- Helps debug pipeline issues
- Records performance metrics

---

## Migration for Existing Patterns

If you have existing patterns in `content/published/`, initialize their state:

```bash
bun scripts/migrate-state.ts
```

**This:**
- Reads all patterns from `content/published/`
- Creates `.pipeline-state.json` entry for each
- Marks all patterns as `finalized` (completed state)
- Preserves pattern metadata from frontmatter
- Allows future patterns to track state from creation

**Output:**
```
Migrating 150 patterns...
✓ Created state for all-patterns-are-effects
✓ Created state for async-composition
...
✓ Migrated 150 patterns

.pipeline-state.json created with all patterns marked as finalized.
```

---

## Advanced Usage

### Partial Pipeline Runs

Skip to a specific step for a pattern:

```bash
# Run from 'tested' step onward (skip ingest)
ep-admin pipeline-state skip-to tested my-pattern-id

# Run from 'validated' step onward
ep-admin pipeline-state skip-to validated --all
```

### Bulk Operations

Reset all patterns to a specific state:

```bash
# Reset all patterns to 'ingested' (skip testing)
ep-admin pipeline-state reset ingested --all

# Reset failed patterns
ep-admin pipeline-state reset tested --status failed
```

### Performance Metrics

View pipeline performance data:

```bash
# Show step timings
ep-admin pipeline-state metrics

# Show metrics for specific step
ep-admin pipeline-state metrics --step tested

# Export metrics as JSON
ep-admin pipeline-state metrics --format json > metrics.json
```

---

## Troubleshooting

### Pattern Stuck in Running State

If a pattern shows `status: running` but pipeline is idle:

```bash
# Force completion or failure
ep-admin pipeline-state complete my-pattern-id

# Or mark as failed
ep-admin pipeline-state fail my-pattern-id --reason "Manual failure - investigate"
```

### Recover from Failed Step

To retry without full pipeline:

```bash
# Retry just the 'tested' step
ep-admin pipeline-state retry tested my-pattern-id

# Watch the output
ep-admin pipeline-state status my-pattern-id --verbose
```

### Clear State for Fresh Start

Reset everything and start over:

```bash
# ⚠️ Warning: This removes all state history
rm .pipeline-state.json

# Reinitialize state
bun scripts/migrate-state.ts
```

---

## Integration with Publishing Pipeline

The state machine integrates transparently with the standard pipeline:

```bash
bun run ingest              # Updates state: draft → ingested
bun run pipeline            # Updates state: ingested → finalized
                            # (if all steps pass)

bun run scripts/publish/move-to-published.ts  # Marks patterns as finalized
```

**State Flow:**
```
bun run ingest:
  draft → ingested

bun run pipeline:
  ingested → tested (step 1)
         → validated (step 3)
         → published (step 2)
         → finalized (step 5)

If any step fails:
  → stays at current step
  → use 'retry' to continue
```

---

## See Also

- [Publishing Pipeline Details](./PUBLISHING_PIPELINE.md)
- [Architecture & Monorepo Structure](./ARCHITECTURE.md)
- [Pattern Development in CLAUDE.md](../CLAUDE.md#pattern-development-cycle)
