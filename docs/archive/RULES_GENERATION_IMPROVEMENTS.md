# Rules Generation Improvements

## Summary

Enhanced rules generation to create comprehensive AI coding rules in multiple formats, including **Cursor** and **Windsurf** IDE integrations.

## What Was Generated

### Output Summary
```
Total Files: 201
- Full Rules:        1 file  (rules.md)
- Compact Rules:     1 file  (rules-compact.md)
- JSON Rules:        1 file  (rules.json)
- Use Case Rules:   22 files (by-use-case/*.md)
- Cursor Rules:     88 files (cursor/*.mdc)
- Windsurf Rules:   88 files (windsurf/*.mdc)
```

### File Formats

#### 1. Full Rules (`rules.md`)
Complete patterns with examples, anti-patterns, and explanations:
```markdown
## Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Handle errors with catchTag, catchTags, and catchAll.

**Skill Level:** intermediate

**Use Cases:** error-management

### Good Example
[Code example with full implementation]

### Anti-Pattern
[What NOT to do]

### Explanation
[Why this pattern works]
```

#### 2. Compact Rules (`rules-compact.md`)
One-line summaries for quick reference:
```markdown
- **Handle Errors with catchTag, catchTags, and catchAll**: Handle errors with catchTag, catchTags, and catchAll.
- **Transform Effect Values with map and flatMap**: Transform Effect Values with map and flatMap.
```

#### 3. JSON Rules (`rules.json`)
Structured data for programmatic access:
```json
[
  {
    "id": "handle-errors-with-catch",
    "title": "Handle Errors with catchTag, catchTags, and catchAll",
    "description": "Handle errors with catchTag, catchTags, and catchAll.",
    "skillLevel": "intermediate",
    "useCases": ["error-management"],
    "example": "...",
    "antiPattern": "...",
    "explanation": "..."
  }
]
```

#### 4. Use Case Rules (`by-use-case/*.md`)
Patterns grouped by category (22 files):
- `core-concepts.md`
- `error-management.md`
- `concurrency.md`
- `resource-management.md`
- `dependency-injection.md`
- `testing.md`
- `observability.md`
- `domain-modeling.md`
- `application-architecture.md`
- `building-apis.md`
- `network-requests.md`
- `file-handling.md`
- `database-connections.md`
- `modeling-data.md`
- `modeling-time.md`
- `building-data-pipelines.md`
- `tooling-and-debugging.md`
- `project-setup--execution.md`
- `making-http-requests.md`
- `custom-layers.md`
- `advanced-dependency-injection.md`
- `application-configuration.md`

#### 5. Cursor Rules (`cursor/*.mdc`) ⭐ NEW

IDE-specific rules for **Cursor AI editor** (88 files):

Format:
```markdown
description: Handle errors with catchTag, catchTags, and catchAll.
globs: "**/*.ts"
alwaysApply: true

# Handle Errors with catchTag, catchTags, and catchAll
**Rule:** Handle errors with catchTag, catchTags, and catchAll.

### Example
```typescript
[Full working code example]
```

**Explanation:**  
[Why and how to use this pattern]
```

**Features:**
- Frontmatter metadata for Cursor
- `globs` pattern to apply to TypeScript files
- `alwaysApply: true` for automatic suggestions
- Full code examples
- Explanation text

#### 6. Windsurf Rules (`windsurf/*.mdc`) ⭐ NEW

IDE-specific rules for **Windsurf AI editor** (88 files):

Format:
```markdown
description: Handle errors with catchTag, catchTags, and catchAll.
globs: "**/*.ts"
alwaysApply: true

# Handle Errors with catchTag, catchTags, and catchAll
**Rule:** Handle errors with catchTag, catchTags, and catchAll.

### Example
[Good example code]

### Anti-Pattern (Avoid)
[What NOT to do]

**Explanation:**  
[Detailed explanation]
```

**Differences from Cursor:**
- Includes Anti-Pattern section (what NOT to do)
- Same frontmatter format
- Additional context for AI understanding

## Usage

### Generate Rules

```bash
# Use improved rules generator (default)
bun run rules

# Use simple rules generator
bun run rules:simple

# Run full pipeline (uses improved rules)
bun run pipeline
```

### Use in Cursor

1. Open Cursor settings
2. Navigate to "Rules" or "AI Rules"
3. Import rules from: `/Users/paul/Projects/Effect-Patterns/rules/cursor/`
4. Cursor will automatically suggest patterns while coding TypeScript

### Use in Windsurf

1. Open Windsurf settings
2. Navigate to "AI Coding Rules"
3. Import rules from: `/Users/paul/Projects/Effect-Patterns/rules/windsurf/`
4. Windsurf will provide context-aware suggestions

## Performance

```
Generation Time: 100ms
Total Files:     201
Patterns:        88
Use Cases:       22

Speed: Fast enough for CI/CD pipelines
```

## Architecture

### Extraction Phase

```typescript
// Extract rules from published MDX files
async function extractRules(): Promise<Rule[]> {
  // Read all published patterns
  // Parse frontmatter for metadata
  // Extract Good Example section
  // Extract Anti-Pattern section
  // Extract Explanation section
  // Return structured Rule objects
}
```

### Generation Phase

```typescript
// Generate all formats in parallel
await Promise.all([
  generateFullRules(rules),        // rules.md
  generateCompactRules(rules),     // rules-compact.md
  generateJsonRules(rules),        // rules.json
  generateUseCaseRules(rules),     // by-use-case/*.md
  generateCursorRules(rules),      // cursor/*.mdc ⭐
  generateWindsurfRules(rules),    // windsurf/*.mdc ⭐
]);
```

### Parallel Execution

All 6 formats generate simultaneously for maximum speed.

## Rule Structure

```typescript
interface Rule {
  id: string;              // Pattern identifier
  title: string;           // Human-readable title
  description: string;     // Short rule description
  skillLevel?: string;     // beginner | intermediate | advanced
  useCases?: string[];     // Categories this applies to
  example?: string;        // Good example code
  antiPattern?: string;    // Bad example code
  explanation?: string;    // Why this pattern works
  content?: string;        // Full MDX content
}
```

## Output Locations

```
rules/
├── rules.md                          # Full rules
├── rules-compact.md                  # Compact list
├── rules.json                        # JSON data
├── by-use-case/                      # Grouped by category
│   ├── core-concepts.md
│   ├── error-management.md
│   └── ... (22 files)
├── cursor/                           # Cursor IDE rules ⭐
│   ├── handle-errors-with-catch.mdc
│   ├── transform-effect-values.mdc
│   └── ... (88 files)
└── windsurf/                         # Windsurf IDE rules ⭐
    ├── handle-errors-with-catch.mdc
    ├── transform-effect-values.mdc
    └── ... (88 files)
```

## Benefits

### For Developers

1. **IDE Integration:** Rules appear automatically while coding
2. **Context-Aware:** Suggestions based on current code
3. **Best Practices:** Always follow Effect-TS patterns
4. **Learning Tool:** Examples and explanations inline
5. **Multiple Formats:** Choose the format that works for you

### For Teams

1. **Consistency:** Everyone follows the same patterns
2. **Onboarding:** New team members learn by doing
3. **Documentation:** Living documentation that stays updated
4. **Quality:** Automatic adherence to best practices
5. **Customizable:** Edit rules to match team preferences

### For Projects

1. **Maintainability:** Consistent code is easier to maintain
2. **Scalability:** Patterns work across large codebases
3. **Quality Assurance:** Automated pattern enforcement
4. **Documentation:** Self-documenting code
5. **Evolution:** Rules update with new versions

## Customization

### Editing Rules

To modify rules, edit the source patterns in `content/published/`, then regenerate:

```bash
# Edit pattern
vim content/published/handle-errors-with-catch.mdx

# Regenerate rules
bun run rules
```

### Filtering Rules

Create custom rule sets by filtering:

```typescript
// Only beginner rules
const beginnerRules = rules.filter(r => r.skillLevel === "beginner");

// Only error handling rules
const errorRules = rules.filter(r => 
  r.useCases?.includes("error-management")
);
```

### Custom Formats

Add new generators:

```typescript
async function generateMyCustomFormat(rules: Rule[]) {
  // Your custom logic
  const content = transform(rules);
  await fs.writeFile("custom-output.txt", content);
}

// Add to main generation
await Promise.all([
  ...existingGenerators,
  generateMyCustomFormat(rules),
]);
```

## Integration Examples

### Cursor

In your TypeScript project:
1. Create `.cursor/rules` directory
2. Copy rules from `rules/cursor/*.mdc`
3. Cursor automatically loads and applies them

### Windsurf

In your TypeScript project:
1. Create `.windsurf/rules` directory
2. Copy rules from `rules/windsurf/*.mdc`
3. Windsurf automatically provides suggestions

### CI/CD

```yaml
# .github/workflows/validate-patterns.yml
name: Validate Effect Patterns

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: bun install
      - run: bun run pipeline
      - name: Check rules generated
        run: |
          test -f rules/rules.md
          test -d rules/cursor
          test -d rules/windsurf
          echo "✅ All rules generated successfully"
```

## Future Enhancements

### 1. Rule Validation
- Ensure all patterns have proper frontmatter
- Validate code examples compile
- Check for broken links

### 2. Rule Analytics
- Track which rules are most applied
- Measure pattern adoption
- Identify confusing rules

### 3. Interactive Rules
- Link to documentation
- Show related patterns
- Suggest alternatives

### 4. Version-Specific Rules
- Generate rules for specific Effect versions
- Migration guides between versions
- Compatibility warnings

### 5. Additional IDE Support
- VS Code snippets
- IntelliJ IDEA templates
- Vim/Neovim configuration
- Emacs integration

## Technical Details

### Section Extraction

```typescript
function extractSection(content: string, ...names: string[]): string {
  // Find section by header (## Section Name)
  // Collect lines until next section
  // Return trimmed content
}
```

### File Naming

```typescript
const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")    // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, ""); // Remove special chars
```

### Frontmatter Format

```yaml
description: Short rule description
globs: "**/*.ts"        # File patterns to apply to
alwaysApply: true       # Always show suggestions
```

## Related Files

- `scripts/publish/rules-improved.ts` - Enhanced generator
- `scripts/publish/rules.ts` - Original simple generator
- `rules/` - All generated rule files
- `content/published/` - Source patterns

## Impact

The improved rules generation:

1. ✅ **201 files generated** in 100ms
2. ✅ **2 new IDE integrations** (Cursor & Windsurf)
3. ✅ **88 patterns** available in each format
4. ✅ **22 use case categories**
5. ✅ **Parallel generation** for speed
6. ✅ **Beautiful output** with colors and summaries
7. ✅ **Production ready** for any Effect-TS project

This makes Effect-TS patterns instantly accessible to developers through their IDE, dramatically improving adoption and code quality.
