# Pattern Quality Assurance (QA) Process

Comprehensive guide to the Pattern QA workflow in Effect Patterns Hub, including automated validation, testing, and repair mechanisms.

**Table of Contents:**
- [Overview](#overview)
- [QA Architecture](#qa-architecture)
- [QA Pipeline Steps](#qa-pipeline-steps)
- [Validation Rules](#validation-rules)
- [Testing Strategy](#testing-strategy)
- [QA Commands Reference](#qa-commands-reference)
- [QA Reports](#qa-reports)
- [Repair & Maintenance](#repair--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Effect Patterns Hub QA system ensures all patterns meet quality standards before publication. The process includes:

- **Automated Validation** - Frontmatter, structure, and links
- **TypeScript Testing** - Type checking and runtime validation
- **Content Analysis** - Completeness and clarity checks
- **Detailed Reporting** - Metrics and failure analysis
- **Repair Tools** - Automatic fixes for common issues

### QA Goals

✅ **Consistency** - All patterns follow the same structure
✅ **Correctness** - TypeScript examples compile and run
✅ **Completeness** - Required sections and metadata present
✅ **Quality** - Patterns meet effectiveness standards
✅ **Discoverability** - Proper categorization and tagging

---

## QA Architecture

### Pipeline Flow

```
content/new/raw/
    ↓ (Step 0: Ingest)
content/new/src/ + content/new/processed/
    ↓ (Step 1: Test)
Type checking + Runtime validation
    ↓ (Step 2: Publish)
Code embedding into MDX
    ↓ (Step 3: Validate)
Frontmatter + Structure + Links
    ↓ (Step 4: Generate)
README.md + AI Rules
    ↓ (Final: QA Report)
content/qa/qa-report.json
```

### QA Scripts

| Script | Purpose | Runs | Input | Output |
|--------|---------|------|-------|--------|
| `test-improved.ts` | Type checking + Testing | Step 1 | `content/new/src/*.ts` | Console report |
| `validate-improved.ts` | Structure validation | Step 3 | `content/new/published/*.mdx` | Console report |
| `qa-process.sh` | QA orchestration | Manual | `content/new/processed/*.mdx` | `content/qa/results/` |
| `qa-report.ts` | Report generation | Manual | `content/qa/results/` | `qa-report.json` |
| `qa-repair.ts` | Automatic fixes | Manual | `content/published/*.mdx` | Fixed files |
| `qa-status.ts` | Status checking | Manual | `content/qa/` | Console report |

---

## QA Pipeline Steps

### Step 1: TypeScript Testing (`test-improved.ts`)

**Purpose:** Ensure TypeScript examples compile and execute

**Configuration:**
```typescript
const CONCURRENCY = 10;           // Run 10 tests in parallel
const ENABLE_TYPE_CHECK = true;   // Run TypeScript compiler
const EXCLUDE_NEW_SRC_RUNTIME = true;  // Skip runtime tests for /new
```

**Process:**

1. **Type Checking**
   ```bash
   tsc --noEmit
   ```
   - Validates TypeScript syntax
   - Checks type correctness
   - Reports compilation errors
   - Stops pipeline if errors found

2. **File Discovery**
   - Finds all `.ts` files in `content/new/src/`
   - Parallel processing (10 concurrent)
   - Progress tracking with visual bar

3. **Runtime Testing**
   - Executes each TypeScript example
   - Captures output and errors
   - Handles expected errors (configured list)
   - Records timing information

4. **Error Handling**
   ```typescript
   const EXPECTED_ERRORS = new Map<string, string[]>([
     ['write-tests-that-adapt-to-application-code', ['NotFoundError']],
     ['control-repetition-with-schedule', ['Transient error']],
   ]);
   ```

5. **Reporting**
   - Colored console output (✓ ✗)
   - Summary statistics
   - Detailed error messages
   - Timing and performance metrics

**Example Output:**
```
📝 Step 1: Type Checking
Running TypeScript compiler...
✓ Type check passed

🧪 Step 2: Running Tests
[████████░░░░░░░░░░░░░░░░░░] 40% (52/131)

Passed: 129/131
Failed: 2/131
Total Duration: 4.23s
```

**Common Issues:**
- Missing imports
- Type mismatches
- Incorrect Effect API usage
- Async/await syntax errors

---

### Step 3: Validation (`validate-improved.ts`)

**Purpose:** Validate MDX structure, frontmatter, and content

**Configuration:**
```typescript
const NEW_PUBLISHED_DIR = 'content/new/published';
const NEW_SRC_DIR = 'content/new/src';
const CONCURRENCY = 10;
const SHOW_PROGRESS = true;
```

**Validation Categories:**

1. **Frontmatter Validation**
   ```yaml
   Required Fields:
   - id (unique, kebab-case)
   - title (non-empty)
   - skillLevel (beginner|intermediate|advanced)
   - useCase (array of valid categories)
   - summary (brief description)
   - tags (minimum 3)

   Optional Fields:
   - rule.description (for AI tools)
   - related (array of pattern IDs)
   ```

   **Checks:**
   - Valid YAML syntax
   - All required fields present
   - Valid field values
   - Unique pattern ID
   - Tags count ≥ 3

2. **Structure Validation**
   ```markdown
   Required Sections:
   - ## Use Case
   - ## Good Example
   - ## Anti-Pattern
   - ## Rationale
   ```

   **Checks:**
   - Section existence
   - Proper heading levels
   - Content non-empty
   - Code block formatting

3. **Link Validation**
   - Internal pattern references
   - External URLs
   - File existence checks
   - Relative path correctness

4. **Code Block Validation**
   ```typescript
   Checks:
   - Proper markdown code fence syntax
   - Language identifier (typescript)
   - Code non-empty
   - Matches corresponding .ts file
   ```

5. **Content Validation**
   - No duplicate patterns
   - Proper markdown formatting
   - No hardcoded file paths
   - Clear, concise descriptions

**Issue Categories:**

| Category | Examples | Severity |
|----------|----------|----------|
| frontmatter | Missing ID, invalid skillLevel | Error |
| structure | Missing section, wrong heading | Error |
| links | Broken reference, 404 URL | Warning |
| code | Invalid fence, empty block | Error |
| content | Duplicate title, poor formatting | Warning |
| files | Missing .ts file, encoding issues | Error |

**Example Output:**
```
✓ pattern-1.mdx: PASS (0 issues)
✗ pattern-2.mdx: FAIL (3 issues)
  - error: frontmatter - Missing field: skillLevel
  - warning: links - Broken reference to pattern-xyz
  - warning: content - Title contains special characters

Summary:
Passed: 128/131
Failed: 3/131
Errors: 5
Warnings: 8
```

---

### QA Processing (`qa-process.sh`)

**Purpose:** Comprehensive QA analysis using CLI prompts

**Process:**

1. **Configuration**
   ```bash
   PROJECT_ROOT=$(pwd)
   PATTERNS_DIR="content/new/processed"
   QA_RESULTS_DIR="content/qa/results"
   ```

2. **Pattern Discovery**
   ```bash
   find "$PATTERNS_DIR" -name "*.mdx" -type f
   ```

3. **Metadata Extraction**
   - Parse YAML frontmatter
   - Extract pattern ID, title, skill level
   - Get use cases and tags
   - Identify rule description

4. **QA Prompt Creation**
   - Generate structured prompt for each pattern
   - Include context about pattern requirements
   - Ask for evaluation of quality metrics

5. **CLI Invocation**
   ```bash
   bun run ep admin validate pattern.mdx
   ```

6. **Result Parsing**
   - Parse CLI response
   - Extract pass/fail status
   - Collect error messages
   - Record metrics

7. **JSON Output**
   ```json
   {
     "patternId": "pattern-name",
     "fileName": "pattern-name.mdx",
     "title": "Pattern Title",
     "skillLevel": "intermediate",
     "useCase": ["error-management"],
     "tags": ["tag1", "tag2", "tag3"],
     "passed": true,
     "issues": [],
     "metrics": {
       "tokens": 1500,
       "duration": 2.3
     }
   }
   ```

---

## Validation Rules

### Pattern ID Rules

```typescript
// Pattern ID Validation
const idRules = {
  format: 'kebab-case',           // lowercase-with-hyphens
  minLength: 3,
  maxLength: 50,
  allowedChars: /^[a-z0-9-]+$/,
  unique: true,                    // No duplicates across all patterns
};
```

**Examples:**
- ✅ `handle-errors-with-catch`
- ✅ `retry-based-on-specific-errors`
- ✅ `compose-scoped-layers`
- ❌ `HandleErrors` (not kebab-case)
- ❌ `handle-errors` (too generic, likely duplicate)

### Skill Level Rules

```typescript
const skillLevels = {
  beginner: 'Foundational patterns for getting started',
  intermediate: 'Patterns for common use cases and production code',
  advanced: 'Complex patterns and specialized techniques',
};
```

**Distribution Target:**
- Beginner: 20-30% of patterns
- Intermediate: 40-50% of patterns
- Advanced: 20-30% of patterns

### Use Case Categories

```typescript
const validUseCases = [
  'error-management',           // Error handling and recovery
  'concurrency',                // Parallel and concurrent execution
  'core-concepts',              // Foundational Effect concepts
  'resource-management',        // Lifecycle and cleanup
  'testing',                    // Testing strategies
  'domain-modeling',            // Data modeling
  'modeling-data',              // Data types and structures
  'building-apis',              // HTTP and API patterns
  'building-data-pipelines',    // Stream and data processing
  'making-http-requests',       // HTTP client patterns
  'tooling-and-debugging',      // Development tools
  'observability',              // Logging, metrics, tracing
  'project-setup--execution',   // Setup and configuration
  'control-flow',               // Control flow patterns
];
```

### Tag Rules

```typescript
const tagRules = {
  minimum: 3,                   // At least 3 tags per pattern
  maxLength: 20,                // Tag length limit
  format: 'lowercase-hyphenated',
  unique: true,                 // No duplicate tags within pattern
};
```

**Good Tags:**
- `error-handling`, `effect-gen`, `type-safe`
- `streams`, `concurrency`, `fiber`
- `validation`, `schema`, `branded-types`

---

## Testing Strategy

### Type Checking

**Purpose:** Validate TypeScript syntax and types

```bash
tsc --noEmit
```

**Checks:**
- Syntax correctness
- Type compatibility
- Import validity
- Effect API usage
- Strict mode compliance

**Strictness:** Enabled at tsconfig level

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Runtime Testing

**Purpose:** Execute examples to verify they work

**Constraints:**
- No network calls
- No file system operations (except read)
- No side effects
- Timeout: 5 seconds per pattern
- Expected error handling for some patterns

**Test Categories:**

1. **Happy Path**
   - Effect compiles
   - Executes successfully
   - Returns expected result type

2. **Error Handling**
   - Errors caught properly
   - Error types correct
   - Error messages present

3. **Type Safety**
   - Generic types inferred correctly
   - Effect channels properly declared
   - No `any` types in examples

**Expected Errors:**

Some patterns intentionally throw errors to demonstrate error handling:

```typescript
const EXPECTED_ERRORS = new Map<string, string[]>([
  ['write-tests-that-adapt-to-application-code', ['NotFoundError']],
  ['control-repetition-with-schedule', ['Transient error']],
]);
```

---

## QA Commands Reference

### Testing & Validation

```bash
# Run all tests (type check + runtime)
bun run test

# Type check only (no runtime execution)
bun run test:simple

# Validate published patterns
bun run validate

# Simple validation
bun run validate:simple

# Run linter on patterns
bun run lint:effect
```

### QA Processing

```bash
# Run full QA process (discovery + analysis + report)
bun run qa:all

# Run QA process only
bun run qa:process

# Generate QA report from existing results
bun run qa:report

# Check QA status
bun run qa:status

# Test QA system
bun run qa:test
```

### Pattern Repair

```bash
# Preview repairs without making changes
bun run qa:repair --dry-run

# Apply all repairs
bun run qa:repair

# View detailed repair report
bun run qa:status
```

### Full Pipeline

```bash
# Complete pipeline (test → publish → validate → generate → rules)
bun run pipeline

# Step by step
bun run test
bun run publish
bun run validate
bun run generate
bun run rules
```

---

## QA Reports

### Report Structure

**File Location:** `content/qa/qa-report.json`

```json
{
  "summary": {
    "totalPatterns": 131,
    "passed": 128,
    "failed": 3,
    "passRate": 97.7,
    "totalTokens": 195000,
    "totalCost": 5.85,
    "averageDuration": 1.5,
    "generatedAt": "2025-12-17T15:30:45Z"
  },
  "failures": {
    "byCategory": {
      "error-management": 1,
      "concurrency": 2
    },
    "bySkillLevel": {
      "beginner": { "passed": 25, "failed": 0 },
      "intermediate": { "passed": 60, "failed": 2 },
      "advanced": { "passed": 42, "failed": 1 }
    },
    "byTag": {
      "streams": { "passed": 8, "failed": 1 }
    },
    "patterns": [
      {
        "patternId": "pattern-id",
        "fileName": "pattern-id.mdx",
        "title": "Pattern Title",
        "skillLevel": "intermediate",
        "tags": ["tag1", "tag2"],
        "errors": ["Missing frontmatter field: skillLevel"],
        "warnings": ["Broken link to pattern-xyz"],
        "suggestions": ["Consider splitting into two patterns"]
      }
    ]
  },
  "metrics": {
    "tokenUsage": {
      "min": 800,
      "max": 3200,
      "average": 1489
    },
    "costAnalysis": {
      "min": 0.024,
      "max": 0.096,
      "average": 0.045,
      "total": 5.85
    },
    "durationStats": {
      "min": 0.8,
      "max": 4.2,
      "average": 1.5
    }
  },
  "recommendations": [
    "Consider expanding beginner patterns",
    "Review failed patterns in concurrency category",
    "Optimize patterns with high token usage"
  ]
}
```

### Report Metrics

| Metric | Calculation | Use |
|--------|-----------|-----|
| Pass Rate | (passed / total) × 100 | Overall quality indicator |
| Token Usage | Sum of all tokens | Cost and performance |
| Duration | Average execution time | Performance tracking |
| Category Distribution | Failures by use case | Identify weak areas |
| Skill Level Distribution | Failures by level | Balance checking |

### Interpreting Reports

**Good Report:**
- Pass rate > 95%
- No critical errors
- Uniform distribution across categories
- Low token usage
- Consistent duration

**Red Flags:**
- Pass rate < 90%
- Multiple failures in one category
- High token usage (> 3000)
- Timeout errors
- Type checking failures

---

## Repair & Maintenance

### Automatic Repairs (`qa-repair.ts`)

**Purpose:** Fix common QA issues automatically

**Repairs Performed:**

1. **Frontmatter Fixes**
   - Add missing `id` field
   - Normalize `skillLevel` values
   - Fix `useCase` array format
   - Add default `tags` if missing

2. **Structure Fixes**
   - Add missing sections
   - Correct heading levels
   - Fix code block formatting
   - Remove duplicate sections

3. **Link Fixes**
   - Correct relative paths
   - Update broken references
   - Fix URL formatting
   - Validate internal links

4. **Content Normalization**
   - Remove trailing whitespace
   - Normalize line endings
   - Fix indentation
   - Standardize formatting

**Usage:**

```bash
# Preview changes without modifying files
bun run qa:repair --dry-run

# Generate detailed repair report
bun run qa:repair --verbose

# Apply all repairs
bun run qa:repair
```

**Example Output:**
```
QA Repair Report
================

Patterns to Repair: 3

1. pattern-1.mdx
   - Fixed: Missing skillLevel field
   - Fixed: Incorrect code block formatting
   - Fixed: Broken internal link to pattern-xyz

2. pattern-2.mdx
   - Fixed: Added missing tags (auto-generated)
   - Fixed: Normalized useCase array

3. pattern-3.mdx
   - Cannot repair: Multiple critical issues (manual review required)

Summary:
- Files repaired: 2/3
- Issues fixed: 5
- Manual reviews needed: 1
```

### Status Checking (`qa-status.ts`)

**Purpose:** Check current QA status

```bash
bun run qa:status
```

**Output:**

```
QA Status Report
================

Directory Status:
✓ content/published/ - 131 patterns
✓ content/new/processed/ - 5 patterns in development
✓ content/qa/results/ - Latest run: 2025-12-17 15:30:45

Latest Report:
- Pass Rate: 97.7% (128/131)
- Failed: 3 patterns
  - error-management/pattern-1.mdx
  - concurrency/pattern-2.mdx
  - concurrency/pattern-3.mdx

File Integrity:
✓ All pattern files readable
✓ All metadata valid
✓ No orphaned files

Last Actions:
- Validation: 2025-12-17 15:30:45 (PASS)
- Testing: 2025-12-17 15:25:10 (PASS)
- Repair: 2025-12-17 14:50:00 (3 files fixed)
```

---

## Troubleshooting

### Common Issues

#### 1. Type Checking Failures

**Error:** `error TS2307: Cannot find module 'effect'`

**Solution:**
```bash
# Reinstall dependencies
bun install

# Rebuild toolkit
bun run toolkit:build
```

**Error:** `error TS2339: Property 'xxx' does not exist on type 'Effect'`

**Solution:**
- Check Effect version: `npm view effect version`
- Update docs/ARCHITECTURE.md if Effect API changed
- Review pattern against latest Effect documentation

#### 2. Validation Failures

**Error:** `error: frontmatter - Missing field: skillLevel`

**Solution:**
1. Open pattern MDX file
2. Add to frontmatter:
   ```yaml
   skillLevel: beginner  # or intermediate/advanced
   ```
3. Run validation again

**Error:** `error: structure - Missing section: Good Example`

**Solution:**
```markdown
## Good Example

\`\`\`typescript
// Add working code example here
const example = Effect.gen(function* () {
  // Implementation
});
\`\`\`
```

#### 3. File Permission Issues

**Error:** `Permission denied: ./qa-process.sh`

**Solution:**
```bash
chmod +x scripts/qa/qa-process.sh
chmod +x scripts/qa/*.sh
```

#### 4. Pattern Not Found in Results

**Issue:** Pattern doesn't appear in QA report

**Solutions:**
1. Check file exists in correct directory
   ```bash
   ls content/published/pattern-id.mdx
   ```

2. Verify frontmatter is valid YAML
   ```bash
   head -20 content/published/pattern-id.mdx
   ```

3. Re-run QA process
   ```bash
   bun run qa:all
   ```

### Debug Mode

Enable verbose logging:

```bash
# Test with verbose output
bun run test 2>&1 | tee test-debug.log

# Validate with detailed output
bun run validate 2>&1 | tee validate-debug.log

# QA report with detailed metrics
bun run qa:report --verbose
```

### Performance Optimization

**Parallel Execution:**

Current settings in scripts:
```typescript
const CONCURRENCY = 10;  // Run 10 jobs in parallel
```

To increase performance for large pattern sets:
```typescript
const CONCURRENCY = 20;  // Increase to 20 parallel jobs
```

**Reduce Memory Usage:**
```typescript
const CONCURRENCY = 5;   // Decrease to 5 parallel jobs
```

### Getting Help

1. **Check Recent Errors**
   ```bash
   bun run qa:status
   ```

2. **View Detailed Report**
   ```bash
   cat content/qa/qa-report.json | jq '.failures.patterns[]'
   ```

3. **Test Individual Pattern**
   ```bash
   bash scripts/qa/test-single-pattern.sh pattern-id.mdx
   ```

---

## Best Practices

### For Pattern Authors

1. **Before Submission**
   ```bash
   # Test locally
   bun run test

   # Validate structure
   bun run validate

   # Check for issues
   bun run qa:status
   ```

2. **Use Templates**
   - Copy existing pattern as template
   - Follow frontmatter exactly
   - Include all required sections

3. **Test Code Examples**
   - Ensure TypeScript compiles
   - Run examples locally
   - Test error cases

### For QA Reviewers

1. **Check Reports Regularly**
   ```bash
   bun run qa:all
   bun run qa:report
   ```

2. **Review Failures**
   - Read error messages carefully
   - Understand root causes
   - Decide: fix automatically or manual review

3. **Monitor Trends**
   - Track pass rate over time
   - Identify common failures
   - Improve validation rules

### For CI/CD Integration

1. **Pre-Commit**
   ```bash
   bun run test && bun run validate
   ```

2. **Pre-Release**
   ```bash
   bun run qa:all
   ```

3. **Post-Release**
   ```bash
   bun run qa:report
   # Archive report for version tracking
   ```

---

## Integration with Development Workflow

### Pattern Development Cycle with QA

```
1. Create Pattern Files
   ↓
2. Run Local Validation
   bun run validate:simple
   ↓
3. Fix Issues (if any)
   ↓
4. Run Full Pipeline
   bun run pipeline
   ↓
5. Review QA Report
   bun run qa:report
   ↓
6. Make Repairs if Needed
   bun run qa:repair
   ↓
7. Submit for Publication
```

### Continuous Monitoring

```bash
# Set up cron job for daily QA
0 2 * * * cd /path/to/repo && bun run qa:all >> logs/qa-$(date +\%Y\%m\%d).log
```

---

## Related Documentation

- **[Publishing Pipeline Details](./PUBLISHING_PIPELINE.md)** - Full pipeline overview
- **[CLAUDE.md](../CLAUDE.md)** - Development context
- **[Contributing Guide](./guides/CONTRIBUTING.md)** - Pattern contribution guidelines
- **[Pattern Requirements](../ABOUT.md#pattern-requirements)** - What patterns must include
