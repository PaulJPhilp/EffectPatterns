# Severity Signaling Visual Guide

## Overview

This guide shows how the new severity signaling system makes findings immediately scannable in the Cursor IDE.

## Comparison: Before vs. After

### High Severity Violation

#### ❌ BEFORE

```text
🔴 high **Effect.fail should use TaggedError**

Effect.fail without a TaggedError is deprecated in v4. Use Data.TaggedError for typed failures.

**Example of violation:**

```typescript
export const getUserOrFail = (id: number) =>
  Effect.fail(new Error('User not found')) // ❌ Untyped error
```

**Remediation:**

Define a TaggedError for each error scenario...
```

**Problems:**
- No visual hierarchy
- Header not scannable
- Message not emphasized
- No clear section separation

#### ✅ AFTER

```text
## [🔴 HIGH SEVERITY] Effect.fail should use TaggedError

> **Issue:** Effect.fail without a TaggedError is deprecated in v4.
> Use Data.TaggedError for typed failures.

### Problematic Pattern

```typescript
export const getUserOrFail = (id: number) =>
  Effect.fail(new Error('User not found')) // ❌ Untyped error
```

### How to Fix

> Define a TaggedError for each error scenario, then use it consistently
> across your service. This ensures type safety and proper error handling.
```

**Improvements:**
- Clear H2 header with severity
- Color-coded emoji immediately visible
- Blockquoted issue text emphasizes content
- Semantic subsections ("Problematic Pattern", "How to Fix")
- Natural reading flow

---

## Finding Grouping: Before vs. After

### ❌ BEFORE: Flat List

```text
🔴 high **Untyped Errors**
Errors must use Data.TaggedError...

🟡 medium **Missing Documentation**
Service requires JSDoc comments...

🔵 low **Code Style**
Consider using const instead of let...
```

**Problems:**
- No clear visual grouping
- Difficult to scan for critical issues
- All items appear at same visual weight
- User must read each line to prioritize

### ✅ AFTER: Grouped by Severity

```text
## Findings Summary (3 total)

### 🔴 High Severity (1)

#### [🔴 HIGH SEVERITY] Untyped Errors
> **Issue:** Errors must use Data.TaggedError for proper type safety.

[code example]

> **How to Fix:** Define error types using Data.TaggedError...

---

### 🟡 Advisory (2)

#### [🟡 ADVISORY] Missing Documentation
> **Issue:** Service requires JSDoc comments.

> **How to Fix:** Add documentation blocks to all public methods...

#### [🟡 ADVISORY] Incomplete Error Handling
> **Issue:** Consider adding error boundaries...

---

### 🔵 Info (1)

#### [🔵 INFO] Code Style
> **Issue:** Consider using const instead of let.
```

**Improvements:**
- Visual grouping by severity
- Item counts per category
- Consistent formatting
- Users can focus on high-severity items first
- Scannable at a glance

---

## Markdown Rendering in Cursor

### Header Hierarchy

```
# Level 1 - Document Title
This is the main heading.

## Level 2 - Major Section
Renders as larger text with visual break.

### Level 3 - Subsection
Renders as smaller text, grouped under H2.

#### Level 4 - Finding Title
```

### Blockquote Emphasis

```markdown
> This is emphasized text
> Appears indented in most renderers
> Good for highlighting key information
```

**In Cursor IDE:** Blockquotes appear with left border and background highlight

### Severity Emoji

```
[🔴 HIGH SEVERITY]  - Red circle = urgent
[🟡 ADVISORY]       - Yellow circle = important
[🔵 INFO]           - Blue circle = nice-to-know
```

**Why Emoji:**
- Universal symbol (works in all IDEs)
- Instant visual recognition
- Colorblind-friendly combined with labels
- Easy to search for (`[🔴` finds high severity)

---

## Real-World Example

### Code Analysis Result

```text
## Findings Summary (4 total)

### 🔴 High Severity (2)

#### [🔴 HIGH SEVERITY] Promise.all in Effect Logic
> **Issue:** Using Promise.all in Effect code breaks supervision and error handling

```typescript
// ❌ Problematic
const results = yield* Promise.all([
  fetchUser(),
  fetchPosts()
])
```

> **How to Fix:** Use Effect.all for proper supervision and resource management

```typescript
// ✅ Correct
const results = yield* Effect.all([
  fetchUser(),
  fetchPosts()
])
```

---

#### [🔴 HIGH SEVERITY] Missing Error Types
> **Issue:** All Effect.fail calls must use Data.TaggedError

```typescript
// ❌ Don't
Effect.fail(new Error("User not found"))

// ✅ Do
Effect.fail(new UserNotFoundError({ userId: 123 }))
```

> **How to Fix:** Define a TaggedError class for each error scenario

---

### 🟡 Advisory (1)

#### [🟡 ADVISORY] Async/Await in Service Definition
> **Issue:** Using async/await in service initialization can prevent proper resource cleanup

```typescript
effect: Effect.gen(function* () {
  async function setup() {  // ⚠️ Mixes async/await with Effect
    return await dbConnection();
  }
})
```

> **How to Fix:** Use Effect.tryPromise instead for Promise bridging

---

### 🔵 Info (1)

#### [🔵 INFO] Consider Adding Documentation
> **Issue:** Public service methods should have JSDoc comments

> **How to Fix:** Add comments explaining:
> - What the method does
> - Parameters and return type
> - Any error types that might be thrown
```

**User Experience:**
1. Sees "4 total" findings
2. Immediately sees 2 high-severity items
3. Quickly identifies critical issues to fix first
4. Can then review advisory and info items
5. Each finding is self-contained and scannable

---

## Usage Examples

### For Code Review Tool

```typescript
const findings = [
  {
    severity: "high",
    title: "Unhandled Error Path",
    description: "Effect.fork result is not supervised",
    code: "const fiber = yield* Effect.fork(backgroundTask)"
  },
  {
    severity: "medium",
    title: "Performance Warning",
    description: "Consider adding concurrency limit",
    code: "yield* Effect.forEach(items, processor)"
  },
  {
    severity: "low",
    title: "Style Note",
    description: "Could use const instead of let"
  }
];

const summary = createFindingsSummary(findings);
// Returns array of TextContent blocks with proper markdown formatting
```

### For Migration Guides

```typescript
const diffContent = generateMigrationDiff("effect-fail-tagged-error");
// Returns:
// ## [🔴 v3 Pattern] Before
// > This pattern has known issues in v4...
// [code block]
// ### Issues to Address
// [severity blocks for each anti-pattern]
// 
// ## [✅ v4 Pattern] After
// [code block]
// ### Key Improvements
// [severity blocks for each improvement]
```

### For Architecture Reviews

```typescript
const violation = buildViolationContent(
  "Global Service Singletons",
  "🔴 high",
  "Services must use Effect.Service for proper dependency injection",
  "Replace global singletons with Effect service definitions",
  `
    // ❌ Don't: Global singleton
    export const db = new Database()
    
    // ✅ Do: Effect service
    class Database extends Effect.Service<Database>() {
      // ...
    }
  `
);
// Returns array of TextContent with structured markdown
```

---

## Accessibility & Usability

### Color Accessibility
- ✅ Emoji work for colorblind users
- ✅ Labels [HIGH SEVERITY] provide text alternative
- ✅ Semantic ordering (High → Medium → Low)

### Screen Reader Support
- ✅ Headers properly marked with H2/H3
- ✅ Blockquotes provide semantic structure
- ✅ Code blocks properly identified
- ✅ Labels like "[🔴 HIGH SEVERITY]" read clearly

### Keyboard Navigation
- ✅ Headers allow jumping with IDE navigation
- ✅ Blockquotes preserve text selection
- ✅ Consistent structure aids pattern learning

### IDE Integration
- ✅ Renders correctly in Cursor's markdown viewer
- ✅ Emoji rendering consistent across platforms
- ✅ Links work within documents
- ✅ Code blocks get syntax highlighting

---

## Best Practices

### When to Use Each Severity Level

**🔴 HIGH SEVERITY**
- Missing required error types
- Architectural violations
- Resource leaks
- Type safety issues
- Performance bugs
- **Action required:** Fix before shipping

**🟡 ADVISORY**
- Missing documentation
- Suboptimal patterns
- Performance warnings
- Best practice violations
- **Action expected:** Fix in code review

**🔵 INFO**
- Style suggestions
- Optional improvements
- Future considerations
- **Action optional:** Nice-to-have

### Formatting Tips

1. **Keep titles concise** (< 60 chars)
2. **Use blockquotes for emphasis** (> for key points)
3. **Include code examples** when possible
4. **Group related items** under same severity
5. **Link to relevant docs** when available

### Test Your Output

```typescript
// Always verify markdown renders correctly
const content = createSeverityBlock("high", "Title", "Description");
const text = content.map(b => b.text).join("\n");
console.log(text);  // Check visual appearance
```

---

## Future Enhancements

- [ ] Custom severity color schemes
- [ ] Expandable/collapsible sections
- [ ] Interactive severity filters
- [ ] Export to HTML/PDF
- [ ] IDE quick-fix integration
- [ ] Severity trend tracking
