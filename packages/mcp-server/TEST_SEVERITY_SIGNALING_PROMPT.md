# Test Prompt: Severity Signaling in Markdown Rich Content

This prompt tests the new severity signaling features in the MCP server's rich content blocks. Copy and paste into Claude Code or your MCP client to test the implementation.

---

## Test 1: Analyze Code with Severity Signaling

**Purpose:** Test the enhanced `analyze_code` tool to see severity-marked findings with scannable headers.

**Prompt:**

```
Analyze this TypeScript code for Effect-TS anti-patterns and violations. 
Show me the findings with clear severity indicators so I can prioritize fixes.

Here's the code:

```typescript
// src/services/user-service.ts
import { Effect } from "effect";

export const getUserService = () => {
  return Effect.gen(function* () {
    // ❌ Issue 1: Using Promise.all instead of Effect.all
    const [user, posts] = yield* Promise.all([
      fetchUser(123),
      fetchPosts(123)
    ]);

    // ❌ Issue 2: Untyped Error
    if (!user) {
      yield* Effect.fail(new Error("User not found"));
    }

    // ❌ Issue 3: Try/catch in Effect
    try {
      const result = yield* validateUser(user);
      return result;
    } catch (error) {
      console.error("Validation failed", error);
      return null;
    }
  });
};

const fetchUser = (id: number) =>
  Effect.promise(() => fetch(`/users/${id}`));

const fetchPosts = (id: number) =>
  Effect.promise(() => fetch(`/posts?userId=${id}`));

const validateUser = (user: any) =>
  Effect.try(() => ({
    id: user.id,
    email: user.email,
    name: user.name,
  }));
```

I want the findings organized by severity so I can see:
- [🔴 HIGH SEVERITY] items first (critical issues to fix)
- [🟡 ADVISORY] items next (important improvements)
- [🔵 INFO] items last (nice-to-have suggestions)
```

**Expected Result:**
- Findings grouped by severity level
- Headers with [🔴 HIGH SEVERITY], [🟡 ADVISORY], [🔵 INFO] labels
- Descriptions in blockquotes for emphasis
- Clear "Problematic Pattern" and "How to Fix" sections
- Code examples showing violations

---

## Test 2: Review Code with Architectural Findings

**Purpose:** Test the `review_code` tool with severity-marked violations and structured recommendations.

**Prompt:**

```
Review this Effect service for architectural issues and anti-patterns.
Present the findings with severity markers so I understand what's critical vs. advisory.

File: src/services/data-processor.ts

```typescript
import { Effect } from "effect";

class DataProcessor extends Effect.Service<DataProcessor>()(
  "DataProcessor",
  {
    effect: Effect.gen(function* () {
      // Global singleton - anti-pattern
      const cache = new Map();
      
      return {
        process: (items: unknown[]) =>
          Effect.gen(function* () {
            // Issue: Using Promise.all in Effect logic
            const results = yield* Promise.all(
              items.map(item => processItem(item))
            );

            // Issue: Untyped errors
            results.forEach(r => {
              if (!r.success) {
                yield* Effect.fail(new Error("Processing failed"));
              }
            });

            return results;
          }),

        // Issue: Async/await in service
        async cache: (key: string, value: unknown) => {
          cache.set(key, value);
          await new Promise(r => setTimeout(r, 100));
        }
      };
    }),
  }
) {}

function processItem(item: unknown): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 100);
  });
}
```

Please highlight:
1. High-severity architectural issues I must fix
2. Important improvements I should address
3. Informational notes for best practices
```

**Expected Result:**
- Severity-grouped findings
- Structured headers and blockquoted descriptions
- Examples of problematic patterns
- Remediation advice in blockquotes
- Clear visual hierarchy for scanning

---

## Test 3: Migration Guide with Enhanced Diff Signaling

**Purpose:** Test enhanced migration diffs with severity indicators and grouped annotations.

**Prompt:**

```
Show me the migration guide for converting from v3 to v4 style Effect.fail with typed errors.
I want to see the before/after patterns with clear severity markers.

Specifically:
- Mark the v3 pattern as [🔴 v3 Pattern] with issues highlighted
- Mark the v4 pattern as [✅ v4 Pattern] with improvements highlighted
- Group all issues and improvements by relevance
```

**Expected Result:**
- v3 section with [🔴 v3 Pattern] header and blockquoted issues
- v4 section with [✅ v4 Pattern] header and blockquoted explanation
- "Issues to Address" section grouping anti-patterns
- "Key Improvements" section grouping improvements
- Proper code syntax highlighting
- Annotations showing line numbers and explanations

---

## Test 4: Multiple Findings with Grouping

**Purpose:** Test the `createFindingsSummary` function through code analysis with varied severity levels.

**Prompt:**

```
Analyze this code and show me ALL findings grouped by severity with counts.
I want to see the summary organized from most critical to least important.

```typescript
import { Effect } from "effect";

export const service = Effect.gen(function* () {
  // High: Using Promise-based concurrency
  const data = yield* Promise.all([
    fetch("/api/users"),
    fetch("/api/posts")
  ]);

  // High: Untyped error
  if (!data) {
    yield* Effect.fail(new Error("No data"));
  }

  // Medium: Missing documentation
  const processResults = (items: any[]) => {
    // Medium: Async/await in Effect
    async function helper(item: any) {
      return await transform(item);
    }

    return items.map(i => helper(i));
  };

  // Low: Could use const
  let result = processResults(data);

  // Medium: console.log in Effect
  console.log("Processing:", result);

  return result;
});

async function transform(item: any) {
  return item;
}
```

Show me a summary that looks like:
```
## Findings Summary (N total)

### 🔴 High Severity (X)
[findings grouped...]

### 🟡 Advisory (X)
[findings grouped...]

### 🔵 Info (X)
[findings grouped...]
```
```

**Expected Result:**
- Summary header with total count
- Sections for each severity level with item counts
- Findings grouped and organized
- Clear visual hierarchy
- Each finding has severity marker and structure

---

## Test 5: Compare Before and After Scannability

**Purpose:** Direct comparison test showing the improvement in scannability.

**Prompt:**

```
Analyze this code for violations:

```typescript
const badService = Effect.gen(function* () {
  yield* Promise.all([task1(), task2()]);
  yield* Effect.fail(new Error("error"));
  async function help() { return await fetch("/"); }
});
```

First, show me what the FINDINGS LOOK LIKE with the old format (flat, no grouping, no severity headers).

Then show me what they look like with the NEW format (grouped by severity with clear headers and emphasis).

Compare them side-by-side so I can see the improvement.
```

**Expected Result:**
- Old format: Plain list of findings without visual hierarchy
- New format: 
  - Grouped by severity with headers
  - Section headers like "### 🔴 High Severity (X)"
  - Severity labels in finding headers "[🔴 HIGH SEVERITY]"
  - Blockquoted descriptions for emphasis
  - Clear visual hierarchy

---

## Test 6: Edge Cases

**Purpose:** Test various edge cases and special scenarios.

### Test 6a: No Findings

**Prompt:**

```
Analyze this code. It should be clean - show me what the findings look like 
(there should be minimal or no high-severity items):

```typescript
import { Data, Effect } from "effect";

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: number;
}> {}

const getUser = (id: number) =>
  Effect.gen(function* () {
    if (id <= 0) {
      yield* Effect.fail(new UserNotFoundError({ userId: id }));
    }
    return { id, name: "User" };
  });
```
```

**Expected Result:**
- Summary showing 0 high-severity or mostly advisory/info items
- Proper header structure even with few findings
- Clean, minimal output

### Test 6b: All High Severity

**Prompt:**

```
Analyze this intentionally bad code. Show me what it looks like when EVERYTHING is high-severity:

```typescript
const terribleCode = Effect.gen(function* () {
  // Everything is wrong here
  const x = yield* Promise.all([Promise.resolve(1), Promise.resolve(2)]);
  yield* Effect.fail(new Error("msg1"));
  yield* Effect.fail(new Error("msg2"));
  yield* Effect.fail(new Error("msg3"));
  try { yield* something(); } catch (e) { console.error(e); }
});
```
```

**Expected Result:**
- Findings Summary showing primarily 🔴 High Severity
- Multiple high-severity items listed
- Proper grouping even with many items
- Clear scanning of what's wrong

---

## Test 7: Code Review Tool with Violations

**Purpose:** Test the `review_code` tool with structured violation output.

**Prompt:**

```
Review this code using the review_code tool. Show me the architectural issues 
with severity markers and structured formatting:

File: src/services/database.ts

```typescript
import { Effect } from "effect";

// Global singleton - anti-pattern
export const dbConnection = new DatabaseConnection();

export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.gen(function* () {
      return {
        query: (sql: string) =>
          Effect.promise(() => 
            dbConnection.query(sql).catch(e => {
              console.error("DB Error:", e);
              throw e;
            })
          ),

        // Issue: Mixing async/await
        async transaction(fn: Function) {
          await dbConnection.startTransaction();
          try {
            return await fn();
          } catch (e) {
            await dbConnection.rollback();
            throw e;
          } finally {
            await dbConnection.commit();
          }
        }
      };
    }),
  }
) {}
```

Show me:
1. What's wrong (with severity)
2. How to fix it (with examples)
3. All organized by importance
```

**Expected Result:**
- Violation blocks with [🔴 HIGH SEVERITY] labels
- Structured "Problematic Pattern" sections
- "How to Fix" sections with remediation
- Blockquoted descriptions for emphasis
- Clear scanning path from critical to nice-to-have

---

## Test 8: Visual Rendering Test

**Purpose:** Verify that Markdown renders correctly in Cursor IDE.

**Prompt:**

```
Analyze this code and show me findings. 
I want to verify that the Markdown renders correctly in Cursor:
- H2/H3 headers should create visual breaks
- Blockquotes should be indented and emphasized
- Emoji should display correctly
- Code blocks should have syntax highlighting

```typescript
const code = Effect.gen(function* () {
  const x = yield* Promise.all([a(), b()]);
  yield* Effect.fail(new Error("bad"));
  try { yield* something(); } catch (e) {}
});
```
```

**Expected Result:**
In Cursor IDE, you should see:
- Headers with proper visual hierarchy (H3 smaller than H2)
- Blockquoted text indented with a left border
- Emoji displaying correctly in headers
- Code blocks with TypeScript syntax highlighting
- Clear visual separation between sections
- Easy to scan from top to bottom

---

## Checklist: Verify All Features

After running these tests, verify:

- [ ] **Headers are scannable** - I can see severity at a glance
- [ ] **Emoji render correctly** - 🔴 🟡 🔵 all display properly
- [ ] **Blockquotes emphasize** - Important text stands out
- [ ] **Grouping works** - Findings organized by severity
- [ ] **Counts are accurate** - Item counts match actual items
- [ ] **No errors** - All tests complete without crashing
- [ ] **IDE renders well** - Markdown displays properly in Cursor
- [ ] **Navigation works** - Headers create proper structure
- [ ] **Code examples** - Syntax highlighting works
- [ ] **Edge cases** - No findings and all high-severity both work

---

## Troubleshooting Test Failures

If tests don't show expected formatting:

1. **Headers not showing** - Check if using proper `##` or `###` syntax
2. **Emoji not rendering** - Verify emoji support in Cursor IDE
3. **Blockquotes missing** - Look for `> ` prefix in output
4. **Not grouped** - Verify `createFindingsSummary` is being called
5. **Wrong counts** - Check severity grouping logic
6. **No code blocks** - Verify triple backticks with language specified

---

## Integration Points to Test

Test these specific integration points:

1. **`buildViolationContent()`** - Used by `review_code` tool
2. **`createSeverityBlock()`** - Creates individual scannable blocks  
3. **`createFindingsSummary()`** - Groups findings by severity
4. **`generateMigrationDiff()`** - Enhanced migration guides
5. **MCP stdio interface** - Tools returning rich content properly

---

## Performance Notes

- Each test should complete in < 5 seconds
- No errors or warnings in console
- Clean Markdown output without artifacts
- IDE should render without lag

---

## Next Steps After Testing

If all tests pass:

1. ✅ Integrate into code review workflows
2. ✅ Use in architecture analysis tools  
3. ✅ Apply to migration documentation
4. ✅ Consider UI enhancements for interactive features

If tests reveal issues:

1. Check documentation: `SEVERITY_SIGNALING.md`
2. Review visual guide: `SEVERITY_VISUAL_GUIDE.md`
3. Run unit tests: `bun run test:mcp`
4. Check MCP debug logs: `MCP_DEBUG=true`
