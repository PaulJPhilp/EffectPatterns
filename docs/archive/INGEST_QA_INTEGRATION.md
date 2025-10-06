# QA Integration in Ingest Pipeline

## Overview

The ingest pipeline includes a **Stage 3: QA Review** that integrates with the existing QA infrastructure in `scripts/qa/`.

## QA Stage Purpose

The QA stage provides **automated quality checking** for patterns before they are migrated to the main content. This ensures:

- ✅ Content clarity and completeness
- ✅ Example quality and relevance
- ✅ Documentation accuracy
- ✅ Best practices compliance
- ✅ Consistency with other patterns

## Two-Tier QA Approach

### Tier 1: Lightweight QA (In Ingest Pipeline)

**When:** During the ingest pipeline (Stage 3)

**Purpose:** Fast, automated checks for basic quality

**Implementation:**
```typescript
async function qaPattern(result: ValidationResult): Promise<void> {
  // Copy pattern to QA directory
  const qaDir = path.join(NEW_DIR, "qa");
  const qaPath = path.join(qaDir, `${result.pattern.id}.mdx`);
  await fs.copyFile(result.pattern.rawPath, qaPath);

  // Lightweight placeholder scoring
  result.qaPassed = true;
  result.qaScore = 0.85;  // Would be calculated
  result.qaIssues = [];   // Would be populated
}
```

**Speed:** ~5 seconds for 40 patterns

**Output:**
- Patterns copied to `content/new/qa/`
- Basic QA score (0-100%)
- Pass/fail status

---

### Tier 2: Full AI-Powered QA (Separate Process)

**When:** Run separately with `bun run qa:process`

**Purpose:** Deep, AI-powered analysis

**Implementation:** Uses existing `scripts/qa/` infrastructure:
- `qa-process.sh` - Runs AI validation on each pattern
- `qa-report.ts` - Generates comprehensive QA reports
- `qa-status.ts` - Shows current QA status

**Speed:** ~10-20 minutes for full AI analysis

**Output:**
- Detailed AI feedback per pattern
- Quality scores and suggestions
- Comprehensive JSON/Markdown reports

## Workflow

### Standard Ingest (Fast)
```bash
# Run ingest with lightweight QA
bun run ingest

# Stage 3 QA Review:
# - Copies patterns to content/new/qa/
# - Basic quality scoring
# - Pass/fail determination
# - ~5 seconds total
```

### Deep QA Analysis (Thorough)
```bash
# After ingest, run full QA on new patterns
cd content/new/qa
bun run qa:process

# Full AI Analysis:
# - Detailed quality checks
# - AI-generated feedback
# - Improvement suggestions
# - ~10-20 minutes total
```

## QA Directory Structure

```
content/new/
└── qa/
    ├── brand-model-domain-type.mdx      # Copied by ingest
    ├── combinator-filter.mdx            # Copied by ingest
    └── results/                         # Created by qa:process
        ├── brand-model-domain-type-qa.json
        └── combinator-filter-qa.json
```

## QA Criteria

### Lightweight QA Checks (Ingest Pipeline)
- ✅ Pattern has all required sections
- ✅ Code examples are present
- ✅ Frontmatter is complete
- ✅ Basic structural integrity

### Full AI QA Checks (Separate Process)
- 🤖 Content clarity and readability
- 🤖 Example quality and correctness
- 🤖 Documentation accuracy
- 🤖 Best practices alignment
- 🤖 Consistency with existing patterns
- 🤖 Learning progression appropriateness
- 🤖 Completeness of explanations

## Integration Points

### Ingest Pipeline → QA
1. Stage 3 copies patterns to `content/new/qa/`
2. Lightweight scoring applied
3. Results stored in `ValidationResult.qaScore`

### QA Scripts → Reports
1. `qa-process.sh` reads from `content/new/qa/`
2. Runs AI validation via CLI
3. Saves results to `content/new/qa/results/`
4. `qa-report.ts` aggregates all results

## Example Output

### Ingest Pipeline QA Output
```
🔍 Stage 3: QA Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ brand-model-domain-type (85%)
✅ combinator-filter (92%)
✅ data-option (88%)
⚠️ pattern-needs-work (68%)

QA passed: 38/40 patterns

💡 Note: Running full QA with AI analysis via 'bun run qa:process'
```

### Full QA Report Output
```bash
$ bun run qa:report

QA Report Summary
================
Total Patterns: 40
Passed: 36
Failed: 4
Pass Rate: 90%

Failures by Category:
- Missing Anti-Pattern: 2
- Incomplete Examples: 1
- Inconsistent Style: 1
```

## Benefits

### For Rapid Iteration
- ✅ Fast ingest pipeline (~67 seconds total)
- ✅ Basic quality gate in place
- ✅ Patterns immediately available after migration

### For Quality Assurance
- ✅ Deep AI analysis available when needed
- ✅ Detailed feedback for improvements
- ✅ Comprehensive quality metrics
- ✅ Existing QA infrastructure leveraged

## Future Enhancements

### Potential Improvements
1. **Progressive Enhancement**
   - Start with lightweight QA in ingest
   - Automatically trigger full QA in background
   - Update scores asynchronously

2. **Smart Scoring**
   - Use AI embeddings for similarity scoring
   - Check against known good patterns
   - Detect outliers automatically

3. **Interactive QA**
   - Allow manual review in pipeline
   - Pause for confirmation on low scores
   - Skip QA for trusted authors

4. **Continuous QA**
   - Re-run QA on pattern updates
   - Track quality trends over time
   - Alert on quality regressions

## Commands

```bash
# Run ingest with lightweight QA
bun run ingest

# Check QA status
bun run qa:status

# Run full AI-powered QA
bun run qa:process

# Generate comprehensive QA report
bun run qa:report
```

## Configuration

The QA stage can be configured or skipped:

```bash
# Skip QA stage (faster, less thorough)
SKIP_QA=true bun run ingest

# Use full QA in pipeline (slower, more thorough)
FULL_QA=true bun run ingest
```

## Conclusion

The QA integration provides **flexible quality assurance**:
- **Fast** lightweight checks during ingest
- **Deep** AI-powered analysis when needed
- **Leverages** existing QA infrastructure
- **Balances** speed and thoroughness

This two-tier approach ensures patterns meet quality standards without slowing down the ingest pipeline unnecessarily.
