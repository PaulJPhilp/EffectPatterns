# EP-Admin CLI Quick Reference

## Command Categories

### 📦 Publishing Patterns
```bash
ep-admin publish validate      # Validate patterns
ep-admin publish test          # Run TypeScript examples
ep-admin publish publish       # Move to published/
ep-admin publish generate      # Generate README + rules
ep-admin publish lint          # Check Effect-TS patterns
ep-admin publish pipeline      # Full publish workflow
```

### 📥 Ingesting Patterns
```bash
ep-admin ingest process        # Process all raw MDX files
ep-admin ingest process-one    # Process single pattern
ep-admin ingest validate       # Validate ingest data
ep-admin ingest test           # Test ingest pipeline
ep-admin ingest populate       # Populate test expectations
ep-admin ingest status         # Show ingest status
ep-admin ingest pipeline       # Full ingest workflow
```

### ✅ Quality Assurance
```bash
ep-admin qa process            # Full QA pipeline
ep-admin qa status             # Show QA status
ep-admin qa report             # Generate detailed report
ep-admin qa repair             # Auto-fix issues
ep-admin qa test-enhanced      # Enhanced QA tests
ep-admin qa test-single        # Test single pattern
ep-admin qa fix-permissions    # Fix file permissions
```

### 🗄️ Database Operations
```bash
ep-admin db test               # Comprehensive DB tests
ep-admin db test-quick         # Quick connectivity test
ep-admin db verify-migration   # Verify schema migration
ep-admin db mock               # Create mock database
```

### 🤖 Discord Integration
```bash
ep-admin discord ingest        # Ingest from Discord
ep-admin discord test          # Test Discord connection
```

### 🎯 Skills Generation
```bash
ep-admin skills generate       # Generate all skills
ep-admin skills skill-generator # Interactive generator
ep-admin skills generate-readme # Generate README
```

### 🔄 Migrations
```bash
ep-admin migrate state         # Migrate pipeline state
ep-admin migrate postgres      # Migrate to PostgreSQL
```

### ⚙️ Operations
```bash
ep-admin ops health-check      # System health check
ep-admin ops rotate-api-key    # Rotate API keys
ep-admin ops upgrade-baseline  # Upgrade test baselines
```

### 🧪 Test Utilities
```bash
ep-admin test-utils chat-app       # Chat app tests
ep-admin test-utils harness        # Integration tests
ep-admin test-utils harness-cli    # CLI tests
ep-admin test-utils llm            # LLM service tests
ep-admin test-utils models         # ML model tests
ep-admin test-utils patterns       # Pattern system tests
ep-admin test-utils supermemory    # Supermemory tests
```

## Common Flags

All commands support these standard options:

```bash
--verbose          # Show detailed output
-v                 # Short form of --verbose

--dry-run          # Preview changes without applying
--backup           # Create backup before operations
--fix              # Auto-fix issues
--confirm          # Skip confirmation prompts
```

## Usage Examples

### Typical Publishing Workflow
```bash
# 1. Validate new patterns
ep-admin publish validate --verbose

# 2. Run tests
ep-admin publish test

# 3. Auto-fix any issues
ep-admin qa repair --fix

# 4. Generate documentation
ep-admin publish generate

# 5. Publish to production
ep-admin publish publish
```

### Pattern Development
```bash
# Start ingesting
ep-admin ingest process

# Test the pipeline
ep-admin ingest test

# Check QA status
ep-admin qa status

# Run full QA
ep-admin qa process --fix

# Generate skills
ep-admin skills generate --format json
```

### Database Operations
```bash
# Test database
ep-admin db test --verbose

# Verify migration
ep-admin db verify-migration

# Create mock database for testing
ep-admin db mock --seed
```

### Safe Migrations
```bash
# Preview changes
ep-admin migrate postgres --dry-run --verbose

# Run with backup
ep-admin migrate postgres --backup

# Check migration result
ep-admin db verify-migration
```

## Help System

```bash
# Show all available commands
ep-admin --help

# Show help for specific category
ep-admin publish --help
ep-admin ingest --help
ep-admin qa --help

# Show help for specific command
ep-admin publish validate --help
ep-admin migrate postgres --help
```

## Tips & Tricks

### Verbose Mode
Add `--verbose` or `-v` to any command for detailed output:
```bash
ep-admin publish validate --verbose
```

### Dry Run
Test operations with `--dry-run` before committing:
```bash
ep-admin qa repair --dry-run
ep-admin migrate postgres --dry-run
```

### Combined Operations
Chain commands for complete workflows:
```bash
# Ingest → Test → QA → Publish
ep-admin ingest pipeline && \
  ep-admin qa process --fix && \
  ep-admin publish pipeline
```

## Error Handling

All commands provide clear error messages:
- ✅ Success messages in green
- ⚠️ Warnings in yellow  
- ❌ Errors in red with detailed info

## Troubleshooting

### Database Issues
```bash
# Quick test
ep-admin db test-quick

# Full diagnostics
ep-admin db test --verbose

# Verify schema
ep-admin db verify-migration --fix
```

### Publishing Issues
```bash
# Check pattern validity
ep-admin publish validate --verbose

# Run linter
ep-admin publish lint

# Check QA
ep-admin qa report --format json
```

### Ingest Issues
```bash
# Check status
ep-admin ingest status --verbose

# Validate data
ep-admin ingest validate

# Test pipeline
ep-admin ingest test --verbose
```

## Migration Reference

Replaced commands:

| Old Script | New CLI Command |
|-----------|-----------------|
| `scripts/publish/validate-improved.ts` | `ep-admin publish validate` |
| `scripts/publish/test-improved.ts` | `ep-admin publish test` |
| `scripts/ingest/process.ts` | `ep-admin ingest process` |
| `scripts/qa/qa-process.sh` | `ep-admin qa process` |
| `scripts/test-db.ts` | `ep-admin db test` |
| `scripts/migrate-to-postgres.ts` | `ep-admin migrate postgres` |
| ... and many more |

See `SCRIPTS_TO_CLI_MIGRATION_COMPLETE.md` for full details.
