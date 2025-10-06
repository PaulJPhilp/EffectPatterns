# Ingest Pipeline Design

## Overview

The ingest pipeline processes new Effect patterns from backups, validates them, tests them, and integrates them into the main content repository.

## Architecture

### 8-Stage Pipeline

```
┌──────────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐
│1. Discovery  │->│2. Validation│->│3. QA     │->│4. Testing│
│& Extraction  │   │             │   │ Review   │   │          │
└──────────────┘   └────────────┘   └──────────┘   └─────────┘
                                                          ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ↓
│8. Reporting  │<-│7. Integration │<-│6. Migration  │<─┘
└──────────────┘   └──────────────┘   └──────────────┘
                                           ↑
┌─────────────┐                           │
│5. Comparison│──────────────────────────┘
└─────────────┘
```

### Stage Details

#### Stage 1: Discovery & Extraction 📖
**Purpose:** Find patterns and extract TypeScript code from MDX files

**Actions:**
- Scan `content/new/raw/` directory for MDX files
- Extract frontmatter metadata
- Extract TypeScript code from `## Good Example` sections
- Write TypeScript files to `content/new/src/`
- Build pattern inventory

**Output:**
```typescript
interface Pattern {
  id: string;
  title: string;
  rawPath: string;
  srcPath: string;
  processedPath: string;
  frontmatter: any;
  hasTypeScript: boolean;
}
```

**Example:**
```
📖 Stage 1: Pattern Discovery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 42 MDX files in backup

  ✅ brand-model-domain-type
  ✅ combinator-filter
  ⚠️  missing-typescript-file
```

---

#### Stage 2: Validation 🔍
**Purpose:** Validate frontmatter, structure, and content

**Checks:**
- **Frontmatter:** Required fields (id, title, skillLevel, useCase, summary)
- **Structure:** Required sections (Good Example, Anti-Pattern)
- **Files:** TypeScript file existence
- **Content:** Basic quality checks

**Output:**
```typescript
interface ValidationResult {
  pattern: Pattern;
  valid: boolean;
  issues: ValidationIssue[];
  qaScore?: number;       // Added for QA stage
  qaPassed?: boolean;     // Added for QA stage
  qaIssues?: string[];    // Added for QA stage
}
```

**Example:**
```
🔍 Stage 2: Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ brand-model-domain-type
❌ incomplete-pattern (2 errors)
⚠️  needs-improvement (1 warning)

Validated: 38/42 patterns
```

---

#### Stage 3: QA Review 🔍
**Purpose:** AI-based quality assurance checking

**Actions:**
- Copies valid patterns to `content/new/qa/` directory
- Runs automated quality checks (lightweight placeholder)
- Scores patterns on quality metrics (0-100%)
- Identifies potential quality issues
- Compatible with existing `bun run qa:process` workflow

**Quality Checks:**
- Content clarity and completeness
- Example quality and relevance  
- Documentation accuracy
- Best practices compliance
- Consistency with other patterns

**Output:**
```typescript
interface QAResult {
  patternId: string;
  qaPassed: boolean;
  qaScore: number;        // 0.0 - 1.0
  qaIssues: string[];     // Quality concerns
}
```

**Example:**
```
🔍 Stage 3: QA Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ brand-model-domain-type (85%)
✅ combinator-filter (92%)
⚠️ needs-work (68%)

QA passed: 36/38 patterns

💡 Note: Running full QA with AI analysis via 'bun run qa:process'
```

**Notes:**
- Lightweight placeholder in ingest pipeline (for speed)
- Full AI-powered QA available via `bun run qa:process`
- Results saved to `content/new/qa/` directory
- Integrates with existing QA infrastructure (`scripts/qa/`)

---

#### Stage 4: Testing 🧪
**Purpose:** Execute TypeScript examples to ensure they work

**Actions:**
- Run `bun run` on each TypeScript file
- Catch runtime errors
- Track execution time
- Mark tests as passed/failed

**Output:**
```typescript
interface ValidationResult {
  // ... previous fields
  testPassed?: boolean;
}
```

**Example:**
```
🧪 Stage 4: Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing 38 valid patterns

✅ brand-model-domain-type
✅ combinator-filter
❌ failing-test

Tests passed: 36/38
```

---

#### Stage 5: Comparison 🔎
**Purpose:** Detect duplicate patterns already in main content

**Actions:**
- Load existing pattern IDs from `content/raw/`
- Compare with incoming patterns
- Flag duplicates
- Identify truly new patterns

**Output:**
```typescript
interface ValidationResult {
  // ... previous fields
  isDuplicate?: boolean;
  existingPatternId?: string;
}
```

**Example:**
```
🔎 Stage 5: Duplicate Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ brand-model-domain-type - NEW
✅ new-pattern - NEW
⚠️  existing-pattern - DUPLICATE

New patterns: 34, Duplicates: 2
```

---

#### Stage 6: Migration 📦
**Purpose:** Move validated, tested, non-duplicate patterns to main content

**Actions:**
- Copy MDX file to `content/raw/`
- Copy TypeScript file to `content/src/`
- Preserve file metadata
- Track migration success

**Criteria:**
- ✅ Valid (no errors)
- ✅ Test passed
- ✅ Not a duplicate

**Example:**
```
📦 Stage 6: Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migrating 34 patterns

✅ brand-model-domain-type
✅ combinator-filter
✅ new-pattern

Migrated: 34/34
```

---

#### Stage 7: Integration 🔄
**Purpose:** Regenerate all outputs with new patterns included

**Actions:**
- Run the publishing pipeline
  - Test all patterns (including new ones)
  - Publish MDX files
  - Validate all patterns
  - Generate README
  - Generate rules (Cursor/Windsurf)
- Verify integration success

**Example:**
```
🔄 Stage 7: Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running publish pipeline...

🧪 Enhanced TypeScript Testing
✅ All tests passed in 28s

🔍 Enhanced Pattern Validation
✅ All patterns valid in 42ms

🔧 Enhanced Rules Generation
✅ 201 files generated

✅ Pipeline completed successfully
```

---

#### Stage 8: Reporting 📊
**Purpose:** Generate comprehensive reports of the ingest process

**Outputs:**
1. **JSON Report** - Machine-readable data
2. **Markdown Report** - Human-readable summary

**Report Contents:**
- Summary statistics
- Successfully migrated patterns
- Duplicate patterns
- Failed patterns with error details

**Example JSON:**
```json
{
  "timestamp": "2025-09-29T10:30:00.000Z",
  "totalPatterns": 42,
  "validated": 38,
  "testsPassed": 36,
  "duplicates": 2,
  "migrated": 34,
  "failed": 6,
  "results": [...]
}
```

**Example Markdown:**
```markdown
# Ingest Pipeline Report

Generated: 9/29/2025, 10:30:00 AM

## Summary

- Total Patterns: 42
- Validated: 38
- Tests Passed: 36
- Duplicates: 2
- Migrated: 34
- Failed: 6

## ✅ Successfully Migrated (34)

- brand-model-domain-type - Modeling Validated Domain Types with Brand
- combinator-filter - Filter with Combinators
...
```

---

## Data Flow

```
Backup Directory
├── raw/*.mdx              ─┐
├── src/*.ts               ─┤─> Discovery
└── processed/*.mdx        ─┘
                            │
                            ↓
                        Validation
                     (frontmatter, structure)
                            │
                            ↓
                         Testing
                     (execute TypeScript)
                            │
                            ↓
                       Comparison
                      (check duplicates)
                            │
                            ↓
                        Migration
                    (copy to main content)
                            │
                            ↓
Main Content Directory      │
├── raw/*.mdx        <──────┤
├── src/*.ts         <──────┘
└── published/*.mdx  <─── Integration
                            │
                            ↓
                       Reporting
                    (generate reports)
```

## Usage

### Basic Usage

```bash
# Run full ingest pipeline
bun run ingest

# Results:
# - Patterns moved to content/raw/ and content/src/
# - Pipeline regenerates everything
# - Reports in content/backups/ingest-reports/
```

### Advanced Usage

#### Dry Run Mode
```bash
# Preview what would happen without making changes
DRY_RUN=true bun run ingest
```

#### Filter by Pattern
```bash
# Only process specific patterns
PATTERN_FILTER="brand-*" bun run ingest
```

#### Skip Integration
```bash
# Migrate but don't run pipeline
SKIP_INTEGRATION=true bun run ingest
```

## Configuration

### Directories

```typescript
const NEW_DIR = "content/new";
const NEW_RAW = "content/new/raw";        // Source patterns
const NEW_SRC = "content/new/src";        // Source TypeScript
const TARGET_RAW = "content/raw";         // Target for MDX
const TARGET_SRC = "content/src";         // Target for TypeScript
const REPORT_DIR = "content/new/ingest-reports";
```

### Validation Rules

```typescript
// Required frontmatter fields
const REQUIRED_FIELDS = [
  "id",
  "title",
  "skillLevel",
  "useCase",
  "summary"
];

// Valid skill levels
const VALID_SKILL_LEVELS = [
  "beginner",
  "intermediate",
  "advanced"
];
```

### Testing Configuration

```typescript
const TEST_TIMEOUT = 10000;  // 10 seconds per test
const MAX_BUFFER = 1024 * 1024;  // 1MB output buffer
```

## Error Handling

### Validation Errors

**Missing Frontmatter:**
```
❌ [frontmatter] Missing required field: title
```

**Missing Sections:**
```
❌ [structure] Missing 'Good Example' section
```

**File Not Found:**
```
❌ [files] TypeScript file not found
```

### Test Failures

**Runtime Error:**
```
❌ [testing] TypeScript execution failed
   Error: Cannot find module 'effect'
```

**Timeout:**
```
❌ [testing] Test timed out after 10000ms
```

### Migration Failures

**Permission Error:**
```
❌ [migration] Failed to copy file: Permission denied
```

**Disk Space:**
```
❌ [migration] Failed to write file: No space left on device
```

## Reports

### Report Location

```
content/backups/ingest-reports/
├── ingest-report-1727606400000.json
├── ingest-report-1727606400000.md
└── ... (timestamped reports)
```

### Report Structure

#### Success Metrics
- Total patterns found
- Validation pass rate
- Test pass rate
- Duplicate detection
- Migration success rate

#### Failure Details
- Pattern ID
- Issue category
- Error message
- Stack trace (if applicable)

#### Recommendations
- Patterns needing attention
- Suggested fixes
- Next steps

## Integration with Main Pipeline

After migration, the main pipeline runs:

```bash
1. test-improved.ts      # Test all 89+ patterns
2. publish-simple.ts     # Publish to MDX
3. validate-improved.ts  # Validate all patterns
4. generate-simple.ts    # Generate README
5. rules-improved.ts     # Generate 201 rule files
```

## Performance

### Expected Timings

| Stage | Duration | Notes |
|-------|----------|-------|
| Discovery | <1s | Fast file system scan |
| Validation | 1-2s | Depends on pattern count |
| Testing | 30-60s | Parallel execution (10 workers) |
| Comparison | <1s | Simple set lookup |
| Migration | 1-2s | File system copies |
| Integration | 25-30s | Full pipeline run |
| Reporting | <1s | JSON + Markdown generation |
| **Total** | **~60s** | For 42 patterns |

### Scalability

- ✅ Handles 100+ patterns efficiently
- ✅ Parallel testing (10 concurrent)
- ✅ Incremental processing possible
- ✅ Memory efficient (streaming)

## Best Practices

### Before Running Ingest

1. **Backup current content**
   ```bash
   cp -r content content-backup-$(date +%Y%m%d)
   ```

2. **Check backup directory**
   ```bash
   ls -la content/backups/new-20250811-171541/
   ```

3. **Verify Effect version**
   ```bash
   bun list effect
   ```

### During Ingest

1. **Monitor progress** - Watch console output
2. **Check for errors** - Red messages indicate issues
3. **Review warnings** - Yellow messages need attention

### After Ingest

1. **Review reports**
   ```bash
   cat content/backups/ingest-reports/ingest-report-*.md
   ```

2. **Verify patterns**
   ```bash
   ls content/raw/ | wc -l  # Should increase
   ls content/src/ | wc -l  # Should increase
   ```

3. **Test manually**
   ```bash
   bun run test
   bun run validate
   ```

4. **Check generated outputs**
   ```bash
   cat README.md
   ls rules/cursor/
   ```

## Troubleshooting

### "No patterns found"

**Problem:** Backup directory empty or wrong path

**Solution:**
```bash
# Check backup location
ls -la content/backups/new-20250811-171541/raw/
```

### "TypeScript file not found"

**Problem:** Missing corresponding .ts file

**Solution:**
1. Check if file exists in `backup/src/`
2. Verify filename matches pattern ID
3. Extract code manually if needed

### "Test failed"

**Problem:** TypeScript code doesn't execute

**Solution:**
1. Run test manually: `bun run content/backups/.../src/pattern.ts`
2. Check for outdated Effect APIs
3. Update code to current Effect version
4. Add to `EXPECTED_ERRORS` if intentional

### "Duplicate detected"

**Problem:** Pattern already exists in main content

**Solution:**
1. Review existing pattern
2. Decide: skip, replace, or merge
3. Manually handle duplicates after ingest

### "Pipeline failed"

**Problem:** Integration step encountered errors

**Solution:**
1. Check pipeline output
2. Run pipeline manually: `bun run pipeline`
3. Fix any pattern-specific issues
4. Re-run ingest

## Future Enhancements

### Phase 1: Automation
- [ ] Automatic backup scanning
- [ ] Scheduled ingest runs
- [ ] Email/Slack notifications
- [ ] Web dashboard

### Phase 2: Intelligence
- [ ] AI-powered validation
- [ ] Auto-fix common issues
- [ ] Similarity detection
- [ ] Quality scoring

### Phase 3: Collaboration
- [ ] Multi-user review workflow
- [ ] Pattern approval process
- [ ] Contributor tracking
- [ ] Version control integration

### Phase 4: Analytics
- [ ] Pattern usage metrics
- [ ] Quality trends
- [ ] Performance tracking
- [ ] Success rate monitoring

## Related Files

- `scripts/ingest/ingest-pipeline-improved.ts` - Main pipeline
- `scripts/publish/pipeline.ts` - Publishing pipeline
- `scripts/publish/test-improved.ts` - Testing script
- `scripts/publish/validate-improved.ts` - Validation script
- `package.json` - Scripts configuration

## Summary

The ingest pipeline provides a **robust, automated way** to bring new patterns into the Effect Patterns repository with:

- ✅ **7-stage validation** - Comprehensive quality checks
- ✅ **Automated testing** - All patterns must execute
- ✅ **Duplicate detection** - Avoid conflicts
- ✅ **Full integration** - Regenerates all outputs
- ✅ **Detailed reporting** - Know exactly what happened
- ✅ **~60 second runtime** - Fast feedback

Perfect for maintaining a high-quality, growing pattern library! 🎉
