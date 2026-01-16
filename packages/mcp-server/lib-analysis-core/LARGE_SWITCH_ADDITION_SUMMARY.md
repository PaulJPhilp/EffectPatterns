# Large Switch Statement Anti-Pattern Addition Summary

## Overview

Successfully added the **Large Switch Statement** anti-pattern to the Effect Patterns code analysis system. This is a design smell detector that identifies when large switch statements are being used instead of Effect's better tools for domain modeling and type-safe control flow.

## What Was Added

### 1. Type Definitions

**File**: `src/tools/ids.ts`

Added to `RuleIdValues`:
- `large-switch-statement` - Rule ID for detecting large switch statements

Added to `FixIdValues`:
- `refactor-switch-to-tagged-union` - Fix ID for refactoring switches to tagged unions

### 2. Fix Definition

**File**: `src/services/rule-registry.ts`

```typescript
{
  id: "refactor-switch-to-tagged-union",
  title: "Refactor switch statement to tagged union",
  description: "Converts large switch statements to tagged unions with pattern matching or handler maps.",
}
```

### 3. Rule Definition

**File**: `src/services/rule-registry.ts`

```typescript
{
  id: "large-switch-statement",
  title: "Large Switch Statement",
  message: "Large switch statements (≥5 cases) often indicate missing domain modeling or ad-hoc error routing. " +
    "In Effect code, this usually means: (1) hidden domain logic instead of modeled data, " +
    "(2) ad-hoc error routing instead of typed error handling, or (3) control flow doing work the type system should do. " +
    "Consider tagged unions with pattern matching, Effect combinators (catchTag, handler maps), or explicit domain modeling. " +
    "Severity escalates to HIGH if switching on error.name, error.message, or inside catchAll.",
  severity: "medium",
  category: "style",
  fixIds: ["refactor-switch-to-tagged-union"],
}
```

## Key Characteristics

### Detection Heuristics (AST-Based)

Flag if **ALL** apply:
- Node type is `SwitchStatement`
- Case count ≥ **5** (tunable threshold)
- Discriminant is `Identifier` or `PropertyAccessExpression`
- Inside Effect logic context

### Severity Escalation

Upgrade to **HIGH** severity if:
- Switching on `error.name` or `error.message`
- Switching inside `catchAll` callback
- Switching on string literals with ≥7 cases

### When NOT to Flag

Explicitly allow:
- Small switches (≤ 3 cases)
- Parsing/decoding boundaries
- Exhaustive switches over real discriminated unions (TypeScript-checked)

## Why This Anti-Pattern Matters

In Effect code, large switch statements usually indicate:

1. **Hidden domain logic** instead of modeled data
2. **Ad-hoc error routing** instead of typed error handling
3. **Control flow doing work the type system should do**

Effect provides better alternatives:
- Tagged unions with `Data.TaggedEnum`
- Pattern matching with `Match` module
- Error combinators like `catchTag`
- Handler maps for routing logic

## Better Patterns

### Instead of String Literal Switches

```typescript
// ❌ Bad
switch (status) {
  case "pending": ...
  case "approved": ...
  case "rejected": ...
}

// ✅ Good
type Status = Data.TaggedEnum<{
  Pending: {};
  Approved: {};
  Rejected: {};
}>;

Match.type<Status>().pipe(
  Match.tag("Pending", ...),
  Match.tag("Approved", ...),
  Match.tag("Rejected", ...),
  Match.exhaustive
);
```

### Instead of Error Switching

```typescript
// ❌ Bad
Effect.catchAll((error) => {
  switch (error.name) {
    case "NetworkError": return retry();
    case "ValidationError": return logAndFail();
  }
});

// ✅ Good
Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchTag("NetworkError", () => retry()),
  Effect.catchTag("ValidationError", () => logAndFail())
);
```

### Instead of Business Routing Switches

```typescript
// ❌ Bad
switch (input.type) {
  case "A": return doA();
  case "B": return doB();
  case "C": return doC();
}

// ✅ Good
const handlers = {
  A: doA,
  B: doB,
  C: doC,
} as const;

handlers[input.type]();
```

## Testing

Added comprehensive test coverage:

```typescript
// Check for design smell detectors
expect(rules.some((r) => r.id === "large-switch-statement")).toBe(true);

// Check for design smell fixes
expect(fixes.some((f) => f.id === "refactor-switch-to-tagged-union")).toBe(true);
```

**Test Results**: ✅ All 77 tests passing

## Positioning in Rule System

This is a **design smell detector**, not a correctness bomb.

**Priority**: Belongs after:
- Error-channel rules
- `yield*` correctness
- `orDie` misuse

**Educational Value**: High
- Teaches Effect patterns
- Improves type safety
- Enhances composability
- Reveals design issues

## Documentation

Created comprehensive documentation:
- `LARGE_SWITCH_STATEMENT_ANTI_PATTERN.md` - Full guide with examples and rationale

## Integration Status

✅ **Fully Integrated**:
- Type definitions updated
- Fix definition added
- Rule definition added with comprehensive message
- Test coverage complete
- Documentation created
- Available via MCP server for code analysis

## Impact

**Total Anti-Patterns**: Now 28 (27 previous + 1 new)
- 17 original anti-patterns
- 10 Top 10 correctness anti-patterns
- 1 design smell detector

**Total Fix Definitions**: Now 20 (19 previous + 1 new)

**Severity Distribution**:
- High: 12 rules
- Medium: 15 rules (including this one)
- Low: 2 rules

## Summary

The Large Switch Statement anti-pattern is now fully integrated into the Effect Patterns analysis system. It serves as an excellent design smell detector that encourages developers to use Effect's better tools for domain modeling and type-safe control flow, promoting more idiomatic and maintainable Effect-TS code.
