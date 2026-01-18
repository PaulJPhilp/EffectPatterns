# Large Switch Statement Anti-Pattern

## Overview

Large switch statements are a **design smell** in Effect-TS codebases. While not always wrong, they usually indicate that Effect's better tools for domain modeling and type-safe control flow are being underutilized.

**Rule ID**: `large-switch-statement`  
**Severity**: Medium (escalates to High in specific contexts)  
**Category**: style  
**Fix ID**: `refactor-switch-to-tagged-union`

## Why This Belongs in Effect Correctness

In Effect code, large switch statements usually mean one of three things:

1. **Hidden domain logic** instead of modeled data
2. **Ad-hoc error routing** instead of typed error handling
3. **Control flow doing work the type system should do**

Effect pushes you toward:
- Tagged unions with `Data.TaggedEnum`
- Pattern matching with `Match` module
- Explicit domain modeling
- Error-channel semantics with `catchTag`/`catchAll`

A big switch is often a sign that the code is fighting the model.

## When a Switch IS a Problem (Detectable Cases)

### ✅ High-Signal Cases (Good to Flag)

#### 1. Switching on String Literals

```typescript
// ❌ Bad - No exhaustiveness checking
switch (status) {
  case "pending":
    return handlePending();
  case "approved":
    return handleApproved();
  case "rejected":
    return handleRejected();
  case "cancelled":
    return handleCancelled();
  case "expired":
    return handleExpired();
}
```

**Why it's bad:**
- No exhaustiveness checking
- Easy to drift during refactors
- Usually wants a tagged union

**Better approach:**
```typescript
// ✅ Good - Tagged union with exhaustiveness
import { Data } from "effect";

type Status = Data.TaggedEnum<{
  Pending: {};
  Approved: {};
  Rejected: {};
  Cancelled: {};
  Expired: {};
}>;

const Status = Data.taggedEnum<Status>();

// Pattern matching with exhaustiveness
const handleStatus = Match.type<Status>().pipe(
  Match.tag("Pending", () => handlePending()),
  Match.tag("Approved", () => handleApproved()),
  Match.tag("Rejected", () => handleRejected()),
  Match.tag("Cancelled", () => handleCancelled()),
  Match.tag("Expired", () => handleExpired()),
  Match.exhaustive
);
```

#### 2. Switching on Error "Types"

```typescript
// ❌ Bad - Reinvents catchTag
Effect.catchAll((error) => {
  switch (error.name) {
    case "NetworkError":
      return retry();
    case "ValidationError":
      return logAndFail();
    case "AuthError":
      return reauth();
    case "TimeoutError":
      return fallback();
    case "DatabaseError":
      return useCache();
  }
});
```

**Why it's bad:**
- Reinvents `catchTag` / `catchAll`
- Encourages monolithic error handling
- Breaks composability

**Better approach:**
```typescript
// ✅ Good - Use Effect's error combinators
Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchTag("NetworkError", () => retry()),
  Effect.catchTag("ValidationError", () => logAndFail()),
  Effect.catchTag("AuthError", () => reauth()),
  Effect.catchTag("TimeoutError", () => fallback()),
  Effect.catchTag("DatabaseError", () => useCache())
);
```

#### 3. Large Switch Inside Effect Logic

```typescript
// ❌ Bad - Inside Effect.gen
Effect.gen(function* () {
  const input = yield* getInput;
  
  switch (input.type) {
    case "typeA":
      return yield* processA(input);
    case "typeB":
      return yield* processB(input);
    case "typeC":
      return yield* processC(input);
    case "typeD":
      return yield* processD(input);
    case "typeE":
      return yield* processE(input);
  }
});
```

**Why it's bad:**
- Hides domain transitions
- Makes flows hard to test and reason about
- Loses type safety

**Better approach:**
```typescript
// ✅ Good - Handler map with type safety
const handlers = {
  typeA: processA,
  typeB: processB,
  typeC: processC,
  typeD: processD,
  typeE: processE,
} as const;

Effect.gen(function* () {
  const input = yield* getInput;
  const handler = handlers[input.type];
  return yield* handler(input);
});
```

#### 4. Switch Used for Business Routing

```typescript
// ❌ Bad - Ad-hoc routing logic
switch (input.type) {
  case "A":
    return doA();
  case "B":
    return doB();
  case "C":
    return doC();
  case "D":
    return doD();
  case "E":
    return doE();
}
```

**Why it's bad:**
- Usually wants a map of handlers
- Or polymorphism via tagged data
- No compile-time safety

**Better approach:**
```typescript
// ✅ Good - Handler map or tagged union
const handlerMap = new Map([
  ["A", doA],
  ["B", doB],
  ["C", doC],
  ["D", doD],
  ["E", doE],
]);

const handler = handlerMap.get(input.type);
if (!handler) {
  return Effect.fail(new UnknownTypeError({ type: input.type }));
}
return handler();
```

## When a Switch is Probably OK (Don't Flag)

You should **explicitly allow**:

### ✅ Small Switches (≤ 3 cases)
```typescript
switch (value) {
  case "foo":
    return handleFoo();
  case "bar":
    return handleBar();
  default:
    return handleDefault();
}
```

### ✅ Parsing / Decoding Boundaries
```typescript
// Protocol decoding at system boundary
switch (wireFormat.type) {
  case 0x01:
    return parseTypeA(wireFormat);
  case 0x02:
    return parseTypeB(wireFormat);
}
```

### ✅ Exhaustive Switches Over Real Discriminated Unions
```typescript
// TypeScript-checked exhaustiveness
type Result = 
  | { _tag: "Success"; value: number }
  | { _tag: "Failure"; error: string };

switch (result._tag) {
  case "Success":
    return result.value;
  case "Failure":
    return 0;
}
```

This is actually **good** code because TypeScript enforces exhaustiveness.

## Rule Definition

### Trigger Heuristics (AST-Based)

Flag if **ALL** apply:
- Node type is `SwitchStatement`
- Case count ≥ **5** (tunable threshold)
- Discriminant is:
  - `Identifier` (e.g., `switch (status)`)
  - `PropertyAccessExpression` (e.g., `switch (error.name)`)
- Inside Effect logic context (Effect.gen, map, flatMap, tap, etc.)

### Severity Escalation

Upgrade severity to **HIGH** if:
- Switching on `error.name` or `error.message`
- Switching inside `catchAll` callback
- Switching on string literals with ≥7 cases

## Detection Strategy

### AST Pattern to Match

```typescript
// Look for SwitchStatement nodes
SwitchStatement {
  expression: Identifier | PropertyAccessExpression,
  caseBlock: {
    clauses: CaseClause[] // length >= 5
  }
}

// Check context
isInsideEffectContext(node) && 
caseCount >= 5
```

### Context Detection

Determine if switch is inside Effect logic by checking:
- Parent is `Effect.gen` generator function
- Parent is callback to `Effect.map`, `Effect.flatMap`, `Effect.tap`
- Parent is inside `Effect.catchAll` callback

## Message Text

> Large switch statements (≥5 cases) often indicate missing domain modeling or ad-hoc error routing. In Effect code, this usually means: (1) hidden domain logic instead of modeled data, (2) ad-hoc error routing instead of typed error handling, or (3) control flow doing work the type system should do. Consider tagged unions with pattern matching, Effect combinators (catchTag, handler maps), or explicit domain modeling. Severity escalates to HIGH if switching on error.name, error.message, or inside catchAll.

## Recommended Fixes

### Fix 1: Tagged Union with Pattern Matching

```typescript
// Before
switch (status) {
  case "pending": ...
  case "approved": ...
  case "rejected": ...
}

// After
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

### Fix 2: Handler Map

```typescript
// Before
switch (type) {
  case "A": return doA();
  case "B": return doB();
  case "C": return doC();
}

// After
const handlers = {
  A: doA,
  B: doB,
  C: doC,
} as const;

handlers[type]();
```

### Fix 3: Effect Error Combinators

```typescript
// Before
Effect.catchAll((error) => {
  switch (error._tag) {
    case "NetworkError": return retry();
    case "ValidationError": return logAndFail();
  }
});

// After
Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchTag("NetworkError", () => retry()),
  Effect.catchTag("ValidationError", () => logAndFail())
);
```

## Educational Value

This rule has **high educational value** because it:

1. **Teaches Effect patterns**: Encourages developers to use tagged unions and pattern matching
2. **Improves type safety**: Pushes toward exhaustiveness checking
3. **Enhances composability**: Promotes Effect's error handling combinators
4. **Reveals design issues**: Highlights when domain modeling is missing

## Positioning in Rule System

This is **not** an early rule. It belongs after:
- Error-channel rules
- `yield*` correctness
- `orDie` misuse

It's a **design smell detector**, not a correctness bomb.

## Implementation Status

✅ **Fully Integrated** - The large switch statement anti-pattern is now part of the Effect Patterns analysis system:

- Added to `RuleRegistryService` with comprehensive message
- Included in type definitions (`RuleId` and `FixId`)
- Categorized as "style" with medium severity
- Fix definition available: `refactor-switch-to-tagged-union`
- Comprehensive test coverage
- Available via MCP server for code analysis

## Verdict

✅ **Include it**  
✅ Medium severity (escalates to High in specific contexts)  
✅ Guarded by heuristics (≥5 cases, Effect context)  
✅ High educational value  
✅ Excellent fit for read-only code review  
✅ Promotes Effect best practices

This rule helps developers write more idiomatic Effect code by encouraging proper domain modeling and type-safe control flow patterns.
