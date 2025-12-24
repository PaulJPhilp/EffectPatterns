# Scripts to CLI Migration Strategy

## Current State Analysis

### Script Categories

#### 1. **Publish Pipeline** (`scripts/publish/`)
- **pipeline.ts** - Main state-aware pattern publishing workflow
- **publish.ts** - Publish patterns to content/published
- **publish-one.ts** - Publish single pattern
- **publish-simple.ts** - Simplified publish
- **test.ts**, **test-improved.ts**, **test-behavioral.ts**, **test-integration.ts** - Test patterns
- **validate.ts**, **validate-improved.ts** - Validate patterns
- **validate-pipeline-integrity.ts** - Check pipeline integrity
- **prepublish-check.ts**, **prepublish-check-one.ts** - Pre-publish checks
- **generate.ts**, **generate-simple.ts** - Generate README/rules
- **generate-claude-rules.ts** - Generate Claude-specific rules
- **lint-effect-patterns.ts** - Lint patterns
- **pattern-validator.ts** - Pattern validation utilities
- **rules-improved.ts**, **rules-simple.ts** - Rules generation
- **move-to-published.ts** - Move patterns to published directory

**→ Migrate to:** `ep-admin publish` commands

#### 2. **Ingest Pipeline** (`scripts/ingest/`)
- **ingest-pipeline-improved.ts** - Main ingest workflow (discovery → migration)
- **process.ts**, **process-one.ts** - Process patterns
- **run.ts** - Run ingest pipeline
- **test-new.ts**, **test-publish.ts** - Test ingested patterns
- **populate-expectations.ts** - Populate test expectations

**→ Migrate to:** `ep-admin ingest` commands or `ep ingest`

#### 3. **QA Operations** (`scripts/qa/`)
- **qa-process.sh** - Main QA workflow (shell script)
- **qa-report.ts** - Generate QA reports
- **qa-status.ts** - Check QA status
- **qa-repair.ts** - Repair QA issues
- **test-enhanced-qa.ts** - Test QA system
- Plus various shell scripts: permissions-fix.sh, run-fix.sh, test-qa-process.sh, test-single-pattern.sh

**→ Migrate to:** `ep-admin qa` commands

#### 4. **Database Operations**
- **test-db.ts** - Test database functionality
- **test-db-quick.ts** - Quick database tests
- **verify-migration.ts** - Verify PostgreSQL migration
- **migrate-to-postgres.ts** - One-time migration script (COMPLETED)
- **migrate-state.ts** - Migrate pipeline state
- **mock-db.ts** - Mock database for testing

**→ Migrate to:** `ep-admin db` commands (test, verify, migrate)

#### 5. **Discord Integration**
- **ingest-discord.ts** - Ingest patterns from Discord
- **test-discord-simple.ts** - Test Discord integration (DELETED - no longer needed)
- **flatten-discord-qna.js** - Flatten Discord Q&A
- **add-seqid.js**, **renumber-seqid.js** - Sequence ID management

**→ Migrate to:** `ep-admin discord` commands

#### 6. **Skills Generation**
- **skill-generator.ts** - Generate skill definitions
- **generate-skills.ts** - Generate skills metadata

**→ Migrate to:** `ep-admin skills` commands

#### 7. **Other Utilities**
- **ep.ts** - Unified project management CLI (2729 lines - already a CLI!)
- **ep-rules-add.test.ts** - Test rule addition (TEST FILE)
- **health-check.sh** - Health check script
- **rotate-api-key.sh** - Rotate API key
- **upgrade-baseline.sh** - Upgrade baseline
- **generate_readme_by_skill_usecase.ts** - Generate README

**→ Handle accordingly:**
- `ep.ts` → Already a CLI, needs refactoring
- Test files → Keep in scripts/__tests__/
- Shell scripts → Convert to TypeScript or keep for CI/CD

#### 8. **Test & Validation** (keep as test scripts)
- **test-harness.ts**, **test-harness-cli.ts** - Test harness
- **test-patterns.ts** - Test patterns
- **test-models.ts** - Test models
- **test-llm-service.ts** - Test LLM service
- **vitest-env.ts** - Vitest configuration
- **integration.test.ts**, **ep-rules-add.test.ts** - Integration tests

**→ Keep in:** `scripts/__tests__/` and `packages/*/__tests__/`

---

## Proposed CLI Structure

```
ep
├── pattern
│   ├── new          # Create new pattern (interactive)
│   ├── validate     # Validate pattern structure
│   ├── test         # Test pattern examples
│   └── list         # List patterns

ep-admin
├── publish
│   ├── pipeline     # Main publishing workflow
│   ├── validate     # Validate before publish
│   ├── publish      # Publish patterns
│   ├── prepare      # Prepare patterns for publishing
│   └── generate     # Generate README/rules
│
├── ingest
│   ├── start        # Start ingest pipeline
│   ├── process      # Process patterns
│   ├── validate     # Validate ingested patterns
│   ├── test         # Test ingested patterns
│   └── status       # Show ingest status
│
├── qa
│   ├── run          # Run QA process
│   ├── report       # Generate QA report
│   ├── status       # Show QA status
│   └── repair       # Repair QA issues
│
├── db
│   ├── test         # Test database
│   ├── verify       # Verify migration
│   ├── migrate      # Run migrations
│   └── push         # Push schema
│
├── discord
│   ├── ingest       # Ingest from Discord
│   └── sync         # Sync Discord data
│
├── skills
│   ├── generate     # Generate skills
│   └── validate     # Validate skills
│
├── lint
│   └── patterns     # Lint patterns
│
└── validate
    ├── integrity    # Validate pipeline integrity
    └── all          # Validate everything

sm-cli
├── (Supermemory CLI - already exists)
```

---

## Migration Phases

### Phase 1: Planning & Architecture (Current)
- ✅ Audit scripts
- ✅ Categorize by purpose
- ✅ Identify dependencies
- Create command structure in CLI packages

### Phase 2: Core Commands
- Migrate `ep-admin publish` commands
- Migrate `ep-admin ingest` commands
- Update package.json scripts to use CLI

### Phase 3: Utilities
- Migrate `ep-admin qa`, `db`, `discord`, `skills` commands
- Keep/archive helper scripts

### Phase 4: Testing & Refinement
- Test all migrated commands
- Update documentation
- Remove old scripts

### Phase 5: CI/CD Updates
- Update GitHub Actions workflows
- Update Vercel build scripts
- Update deployment processes

---

## Key Considerations

### 1. **Dependencies to Preserve**
- All database operations should use toolkit repositories
- Pattern validation should use Schema
- Effect error handling for all operations

### 2. **State Management**
- Preserve PipelineStateMachine integration
- Keep checkpoint/audit trail functionality
- Maintain progress tracking

### 3. **Backwards Compatibility**
- Scripts that are called by CI/CD should work during transition
- Can create wrapper scripts initially

### 4. **Testing**
- Migrate test scripts to proper test directories
- Keep test data and fixtures

### 5. **Documentation**
- Update README with new CLI commands
- Document each command with help text
- Create quick-start guides

---

## Implementation Order

1. **Start with `ep-admin` structure** - Most scripts are admin operations
2. **Migrate publish pipeline first** - Most critical workflow
3. **Then ingest pipeline** - Core data ingestion
4. **Then QA, database, discord** - Supporting operations
5. **Finally, consolidate and clean up**

---

## Benefits of This Migration

| Aspect | Before | After |
|--------|--------|-------|
| Entry Points | Many scattered scripts | Unified `ep` & `ep-admin` CLIs |
| Discovery | Run script manually | `ep-admin --help` or `man` pages |
| Error Handling | Inconsistent | Standardized via Effect/CLI |
| Type Safety | Partial | Full TypeScript + Schema validation |
| Testing | Via scripts | Via unit tests + CLI tests |
| Distribution | Complex | Simple binary/package |
| CI/CD Integration | Script calls | CLI calls |

