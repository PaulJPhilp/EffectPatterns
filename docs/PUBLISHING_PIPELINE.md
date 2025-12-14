# Publishing Pipeline Details

Complete documentation of the 5-step publishing pipeline and related scripts.

**Quick Reference:**
```bash
bun run ingest              # Step 0: Process pattern files
bun run pipeline            # Steps 1-5: Full publishing pipeline
bun run scripts/publish/move-to-published.ts  # Finalize to content/published/
```

---

## Pipeline Architecture

```
content/new/raw/*.mdx          (1. Ingest)
      ↓
content/new/src/*.ts           (TypeScript examples)
content/new/processed/*.mdx    (MDX with component tags)
      ↓ (2. Pipeline Execution)
      ├─→ test-improved.ts     Step 1: Type check + test
      ├─→ publish.ts           Step 2: Embed code into MDX
      ├─→ validate-improved.ts  Step 3: Validate structure
      ├─→ generate.ts          Step 4: Generate README
      └─→ rules-improved.ts     Step 5: Generate rules
      ↓
content/new/published/*.mdx    (Pipeline output - NOT yet published)
      ↓ (3. Manual Move)
content/published/*.mdx        (Final published patterns)
      ↓
README.md updated
rules/ with all formats updated
```

---

## Step-by-Step Execution

### Step 1: Test TypeScript Examples

**Script:** `scripts/publish/test-improved.ts`

**Input:**
- `content/new/src/*.ts` - TypeScript pattern examples

**Behavior:**
- Type checks all TypeScript files with strict mode
- Reports compilation errors
- Runtime execution disabled (`EXCLUDE_NEW_SRC_RUNTIME=true`)
- Only syntax/type validation, not behavior validation
- Parallel processing (10 concurrent checks)

**Output:**
- Console report with pass/fail counts
- Test results JSON (if requested)

**On Failure:**
- Pipeline stops immediately
- Specific file and error lines reported

**Typical Output:**
```
[1/150] Checking pattern-1.ts ... ✓
[2/150] Checking pattern-2.ts ... ✓
...
Passed: 148/150
Failed: 2/150
```

### Step 2: Publish MDX Files

**Script:** `scripts/publish/publish.ts`

**Input:**
- `content/new/processed/*.mdx` (from ingest)
- `content/new/src/*.ts` (TypeScript examples)

**Behavior:**
- Locates `<Example path="./src/pattern.ts" />` tags in MDX
- Reads actual TypeScript code from source file
- Replaces tags with full code blocks
- Generates complete, standalone MDX file

**Output:**
- `content/new/published/*.mdx` (ready for validation)

**On Failure:**
- Pipeline stops
- Reports missing files or parsing errors

**Example Transformation:**
```markdown
# Before (processed)
## Good Example
<Example path="./src/my-pattern.ts" />

# After (published)
## Good Example
\`\`\`typescript
import { Effect } from "effect";
// ... actual code ...
\`\`\`
```

### Step 3: Validate Published Files

**Script:** `scripts/publish/validate-improved.ts`

**Input:**
- `content/new/published/*.mdx`

**Validation Checks:**

**Frontmatter Validation:**
- Required fields: `id`, `title`, `skillLevel`, `useCase`, `summary`
- `id`: Unique identifier (kebab-case)
- `skillLevel`: Must be `beginner`, `intermediate`, or `advanced`
- `useCase`: Array of valid categories with automatic alias normalization
  - Example: `"error-handling"` → `"error-management"`
  - 40+ known aliases supported
- `summary`: One-sentence description

**Content Validation:**
- Required sections (regex-based):
  - `## Good Example`
  - `## Anti-Pattern`
  - `## Explanation` or `## Rationale`
- Link validation: Detects broken/placeholder links
- Code blocks: No empty or malformed blocks
- TypeScript files: Verified to exist in `content/new/src/`

**Performance:**
- Parallel validation (10 concurrent validations)
- ~100ms per file on modern hardware

**Output:**
- Console report with categorized issues
- JSON report (if requested)
- Summary: total files, passed, failed, warnings

**On Failure:**
- Pipeline stops
- Detailed error messages for each failing pattern

**Example Validation Report:**
```
✓ pattern-1.mdx (valid)
✗ pattern-2.mdx
  - Missing required section: Good Example
  - useCase contains invalid category: invalid-case
✓ pattern-3.mdx (valid)

Result: 2/3 passed
```

### Step 4: Generate README

**Script:** `scripts/publish/generate.ts`

**Input:**
- `content/published/*.mdx` (already-published patterns)

**Important:** This reads from the **finalized** `content/published/` directory, not from `content/new/published/`. The README reflects the current published state.

**Behavior:**
- Parses frontmatter from all published patterns
- Groups patterns by use case (13+ categories)
- Sorts patterns by skill level within each group: beginner → intermediate → advanced
- Generates markdown table with:
  - Pattern link
  - Skill level emoji (🟢 beginner, 🟡 intermediate, 🔴 advanced)
  - Summary text (max 200 chars)
  - Related patterns

**Output:**
- `README.md` (auto-generated, includes warning comment)
- Includes table of contents
- Groups by use case

**On Failure:**
- Pipeline stops
- Reports missing frontmatter or invalid use cases

**Example Output:**
```markdown
## Error Management

| Pattern | Level | Summary |
|---------|-------|---------|
| [Handle Errors with Catch](./content/published/handle-errors.mdx) | 🟢 | Basic error handling using... |
| [Retry Based on Specific Errors](./content/published/retry-errors.mdx) | 🟡 | Advanced retry logic for... |
```

### Step 5: Generate AI Coding Rules

**Script:** `scripts/publish/rules-improved.ts`

**Input:**
- `content/published/*.mdx` (extracts `rule.description` from frontmatter)

**Behavior:**
- Extracts rule descriptions and pattern sections
- Generates rules in parallel (6 formats simultaneously)
- Filters by skill level if specified
- Organizes by use case

**Output Formats:**

1. **`rules/rules.md`** - Full rules with all sections
   - Complete pattern documentation
   - All sections (use case, rationale, examples)
   - Best for human reading

2. **`rules/rules-compact.md`** - Concise one-liner rules
   - Single line per pattern
   - Quick reference format

3. **`rules/rules.json`** - Machine-readable JSON format
   - Structured data for programmatic access
   - All metadata included

4. **`rules/by-use-case/{useCase}.md`** - Separate file per use case
   - One file per 13+ use case category
   - Organized by skill level

5. **`rules/cursor/{title}.mdc`** - Cursor IDE format
   - .mdc files for Cursor custom rules
   - IDE-compatible formatting

6. **`rules/windsurf/{title}.mdc`** - Windsurf IDE format
   - .mdc files for Windsurf IDE
   - IDE-compatible formatting

**On Failure:**
- Pipeline stops
- Reports missing rule descriptions or formatting errors

---

## Post-Pipeline Steps

### Option A: Manual Finalization (Current Standard)

After pipeline succeeds, finalize with:
```bash
bun run scripts/publish/move-to-published.ts
```

**This:**
- Moves files from `content/new/published/` → `content/published/`
- Cleans up working directories: `raw/`, `src/`, `processed/`, `qa/`
- Generates `.pipeline-state.json` entry for each pattern
- Next pipeline run will update README and rules from published patterns

### Option B: Integrate into Pipeline (Recommended for Future)

Modify `pipeline.ts` to include `move-to-published.ts` as final step:
- Would make pipeline fully automated
- No separate finalization step needed
- Single command workflow

---

## Pipeline Scripts Reference

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `test-improved.ts` | Type check + test TypeScript | `content/new/src/` | Console report |
| `publish.ts` | Embed code into MDX | `content/new/processed/` | `content/new/published/` |
| `validate-improved.ts` | Validate structure | `content/new/published/` | Validation report |
| `generate.ts` | Generate README | `content/published/` | `README.md` |
| `rules-improved.ts` | Generate AI rules | `content/published/` | `rules/` (6 formats) |
| `move-to-published.ts` | Finalize publication | `content/new/published/` | `content/published/` |
| `generate-claude-rules.ts` | Claude-specific rules | `content/published/` + `CLAUDE.md` | AI tool rules |

---

## Important Notes

### Two-Stage Publication

Pattern publishing is a two-stage process:

**Stage 1: Validation & Pipeline**
```bash
bun run pipeline
```
- Outputs to `content/new/published/`
- NOT yet visible on website/in README
- Pipeline may be re-run multiple times

**Stage 2: Finalization**
```bash
bun run scripts/publish/move-to-published.ts
```
- Moves to `content/published/`
- Now visible on website
- README and rules generated in next pipeline run

### README Generation Timing

The README generator reads from `content/published/`, not `content/new/published/`:
- README reflects **currently published** patterns
- Does NOT include patterns from failed/pending pipeline runs
- To update README with new patterns: finalize with `move-to-published.ts` first

### Test Limitations

TypeScript tests only perform **type checking**, not runtime validation:
- Syntax errors detected
- Type errors detected
- Behavior/runtime errors NOT detected

For comprehensive testing:
```bash
bun run test:behavioral      # Test pattern behavior
bun run test:integration     # Integration tests
bun run test:all             # Both
```

### Use Case Aliases

The validator automatically normalizes use case aliases:
- `error-handling` → `error-management`
- `async` → `concurrency`
- `callback` → `concurrency`
- `custom-layers` → `dependency-injection`
- `logging` → `observability`
- `metrics` → `observability`
- `monitoring` → `observability`
- `instrumentation` → `observability`

See `docs/ARCHITECTURE.md` for complete list of valid use cases and aliases.

---

## Debugging Pipeline Issues

### Test Failures
```bash
bun run test:simple     # Clearer output format
# Check specific file for syntax/type errors
```

### Validation Errors
- Check console output for specific file and line number
- Review required sections: Use Case, Good Example, Anti-Pattern, Rationale
- Verify frontmatter YAML syntax

### README Not Updating
- Remember: README reads from `content/published/`
- Run `move-to-published.ts` to finalize patterns first
- Then run pipeline again to update README

### Rules Not Generating
- Verify `rule.description` field exists in all frontmatter
- Check for special characters in rule description
- Run `rules-improved.ts` separately for detailed errors

---

## See Also

- [Architecture & Monorepo Structure](./ARCHITECTURE.md)
- [Pipeline State Machine](./PIPELINE_STATE.md)
- [Pattern Development in CLAUDE.md](../CLAUDE.md#pattern-development-cycle)
