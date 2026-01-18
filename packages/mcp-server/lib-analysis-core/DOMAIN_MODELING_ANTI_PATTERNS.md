# Domain Modeling Anti-Patterns (Effect)

These anti-patterns indicate missing or weak domain models in Effect-TS codebases. They often appear as "working code" that becomes brittle, unclear, or unsafe as systems evolve.

## Overview

Domain modeling anti-patterns are **design smells**, not syntax errors. Most are AST-detectable via heuristics and are best used in **read-only review**. These rules help users:
- Reduce hidden complexity
- Make illegal states unrepresentable
- Let Effect's types do real work
- Build more maintainable systems

---

## 1. Using Primitives for Domain Concepts

**Rule ID**: `primitives-for-domain-concepts`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `introduce-branded-types`

### The Problem

```typescript
// ❌ Bad - Primitives lose meaning
function transfer(amount: number, accountId: string)
```

**Why this is bad:**
- Loses meaning and constraints
- Easy to mix up parameters
- No place to enforce invariants

### Better Approach

```typescript
// ✅ Good - Branded types with meaning
import { Brand } from "effect";

type Amount = number & Brand.Brand<"Amount">;
type AccountId = string & Brand.Brand<"AccountId">;

const Amount = Brand.nominal<Amount>();
const AccountId = Brand.nominal<AccountId>();

function transfer(
  amount: Amount,
  accountId: AccountId
): Effect.Effect<void, TransferError>

// Usage with validation
const makeAmount = (value: number): Effect.Effect<Amount, ValidationError> =>
  value > 0
    ? Effect.succeed(Amount(value))
    : Effect.fail(new ValidationError({ field: "amount", value }));
```

---

## 2. Boolean Flags Controlling Behavior

**Rule ID**: `boolean-flags-controlling-behavior`  
**Severity**: Medium  
**Category**: style  
**Fix ID**: `replace-boolean-with-tagged-union`

### The Problem

```typescript
// ❌ Bad - Boolean flags hide branches
function process(user: User, isAdmin: boolean)
```

**Why this is bad:**
- Hidden branches
- Poor readability
- Hard to extend safely

### Better Approach

```typescript
// ✅ Good - Explicit modes with tagged unions
import { Data } from "effect";

type UserRole = Data.TaggedEnum<{
  Admin: { permissions: string[] };
  User: { tier: "free" | "paid" };
  Guest: {};
}>;

const UserRole = Data.taggedEnum<UserRole>();

function process(
  user: User,
  role: UserRole
): Effect.Effect<Result, ProcessError>

// Pattern matching with exhaustiveness
Match.type<UserRole>().pipe(
  Match.tag("Admin", ({ permissions }) => processAsAdmin(permissions)),
  Match.tag("User", ({ tier }) => processAsUser(tier)),
  Match.tag("Guest", () => processAsGuest()),
  Match.exhaustive
);
```

---

## 3. Magic String Domains

**Rule ID**: `magic-string-domains`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `replace-magic-strings-with-union`

### The Problem

```typescript
// ❌ Bad - Magic strings, no exhaustiveness
if (status === "approved") { ... }
```

**Why this is bad:**
- No exhaustiveness checking
- Easy to drift during refactors
- Usually wants a union or enum

### Better Approach

```typescript
// ✅ Good - Literal union or tagged enum
type OrderStatus = "pending" | "approved" | "rejected" | "shipped";

// Or better, tagged enum with data
type OrderStatus = Data.TaggedEnum<{
  Pending: { createdAt: Date };
  Approved: { approvedBy: string; approvedAt: Date };
  Rejected: { reason: string; rejectedAt: Date };
  Shipped: { trackingNumber: string; shippedAt: Date };
}>;

const OrderStatus = Data.taggedEnum<OrderStatus>();

// Exhaustive pattern matching
const handleStatus = (status: OrderStatus) =>
  Match.type<OrderStatus>().pipe(
    Match.tag("Pending", ({ createdAt }) => ...),
    Match.tag("Approved", ({ approvedBy }) => ...),
    Match.tag("Rejected", ({ reason }) => ...),
    Match.tag("Shipped", ({ trackingNumber }) => ...),
    Match.exhaustive
  );
```

---

## 4. Objects Used as Implicit State Machines

**Rule ID**: `objects-as-implicit-state-machines`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `model-explicit-state-machine`

### The Problem

```typescript
// ❌ Bad - Allows impossible states
if (order.cancelled && !order.shipped) { ... }
```

**Why this is bad:**
- Impossible states allowed
- Complex conditional logic
- No compiler assistance

### Better Approach

```typescript
// ✅ Good - Explicit state machine
type OrderState = Data.TaggedEnum<{
  Draft: { items: Item[] };
  Submitted: { items: Item[]; submittedAt: Date };
  Processing: { items: Item[]; paymentId: string };
  Shipped: { trackingNumber: string; shippedAt: Date };
  Cancelled: { reason: string; cancelledAt: Date };
}>;

const OrderState = Data.taggedEnum<OrderState>();

// State transitions are explicit
const submitOrder = (state: OrderState.Draft): Effect.Effect<
  OrderState.Submitted,
  SubmissionError
> =>
  Effect.gen(function* () {
    if (state.items.length === 0) {
      return yield* Effect.fail(new EmptyOrderError());
    }
    return OrderState.Submitted({
      items: state.items,
      submittedAt: new Date()
    });
  });

// Impossible states are unrepresentable
// Can't have shipped && cancelled at the same time
```

---

## 5. Domain Logic Embedded in Conditionals

**Rule ID**: `domain-logic-in-conditionals`  
**Severity**: Medium  
**Category**: style  
**Fix ID**: `extract-domain-predicates`

### The Problem

```typescript
// ❌ Bad - Business rules hidden in conditionals
if (x > 100 && y < 10 && mode !== "test") { ... }
```

**Why this is bad:**
- Business rules are hidden
- Hard to test or reuse
- Encourages copy-paste logic

### Better Approach

```typescript
// ✅ Good - Named domain predicates
const isEligibleForDiscount = (
  orderTotal: Amount,
  customerTier: CustomerTier,
  mode: AppMode
): boolean =>
  Amount.unwrap(orderTotal) > 100 &&
  customerTier === "premium" &&
  mode !== "test";

// Or as Effect for validation
const validateDiscountEligibility = (
  orderTotal: Amount,
  customerTier: CustomerTier,
  mode: AppMode
): Effect.Effect<void, IneligibleError> =>
  isEligibleForDiscount(orderTotal, customerTier, mode)
    ? Effect.void
    : Effect.fail(new IneligibleError({ orderTotal, customerTier }));

// Usage is clear
if (isEligibleForDiscount(total, tier, mode)) {
  applyDiscount();
}
```

---

## 6. Ad-Hoc Error Semantics in Domain Code

**Rule ID**: `adhoc-error-semantics-in-domain`  
**Severity**: High  
**Category**: errors  
**Fix ID**: `use-domain-specific-errors`

### The Problem

```typescript
// ❌ Bad - Domain meaning implicit
Effect.fail("not allowed")
```

**Why this is bad:**
- Domain meaning is implicit
- No structured recovery
- Difficult to observe or migrate

### Better Approach

```typescript
// ✅ Good - Domain-specific error types
class InsufficientFundsError extends Data.TaggedError("InsufficientFunds")<{
  readonly accountId: AccountId;
  readonly requested: Amount;
  readonly available: Amount;
}> {}

class AccountLockedError extends Data.TaggedError("AccountLocked")<{
  readonly accountId: AccountId;
  readonly reason: string;
  readonly lockedUntil: Date;
}> {}

type TransferError = InsufficientFundsError | AccountLockedError;

const transfer = (
  from: AccountId,
  to: AccountId,
  amount: Amount
): Effect.Effect<TransferReceipt, TransferError> =>
  Effect.gen(function* () {
    const balance = yield* getBalance(from);
    if (Amount.unwrap(balance) < Amount.unwrap(amount)) {
      return yield* Effect.fail(new InsufficientFundsError({
        accountId: from,
        requested: amount,
        available: balance
      }));
    }
    // ...
  });
```

---

## 7. Overloaded Config or Options Objects

**Rule ID**: `overloaded-config-objects`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `structure-config-schema`

### The Problem

```typescript
// ❌ Bad - Unclear structure
function createThing(opts: any)
```

**Why this is bad:**
- Unclear required vs optional fields
- Silent misconfiguration
- Hard to validate

### Better Approach

```typescript
// ✅ Good - Structured schema with validation
import { Schema } from "@effect/schema";

const DatabaseConfigSchema = Schema.Struct({
  host: Schema.String,
  port: Schema.Number,
  database: Schema.String,
  username: Schema.String,
  password: Schema.String,
  poolSize: Schema.optional(Schema.Number).pipe(Schema.withDefault(10)),
  ssl: Schema.optional(Schema.Boolean).pipe(Schema.withDefault(true))
});

type DatabaseConfig = Schema.Schema.Type<typeof DatabaseConfigSchema>;

const createDatabase = (
  config: unknown
): Effect.Effect<Database, ConfigError> =>
  Effect.gen(function* () {
    const validated = yield* Schema.decodeUnknown(DatabaseConfigSchema)(config);
    return yield* connectToDatabase(validated);
  });
```

---

## 8. Domain Identifiers as Raw Strings Everywhere

**Rule ID**: `domain-ids-as-raw-strings`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `introduce-branded-ids`

### The Problem

```typescript
// ❌ Bad - IDs are interchangeable
type UserId = string
```

**Why this is bad:**
- IDs are interchangeable by accident
- No place to attach semantics

### Better Approach

```typescript
// ✅ Good - Branded IDs with constructors
import { Brand } from "effect";

type UserId = string & Brand.Brand<"UserId">;
type OrderId = string & Brand.Brand<"OrderId">;

const UserId = Brand.refined<UserId>(
  (s): s is UserId => /^user_[a-z0-9]{16}$/.test(s),
  (s) => Brand.error(`Invalid UserId format: ${s}`)
);

const OrderId = Brand.refined<OrderId>(
  (s): s is OrderId => /^order_[a-z0-9]{16}$/.test(s),
  (s) => Brand.error(`Invalid OrderId format: ${s}`)
);

// Constructor functions
const makeUserId = (value: string): Effect.Effect<UserId, ValidationError> =>
  Effect.try({
    try: () => UserId(value),
    catch: (error) => new ValidationError({ field: "userId", error })
  });

// Now you can't accidentally mix them up
function getOrder(userId: UserId, orderId: OrderId) // Type-safe!
```

---

## 9. Time as number or Date in Domain Logic

**Rule ID**: `time-as-number-or-date`  
**Severity**: Medium  
**Category**: validation  
**Fix ID**: `use-duration-abstraction`

### The Problem

```typescript
// ❌ Bad - Units unclear
expiresAt: number
```

**Why this is bad:**
- Units unclear (ms? seconds?)
- Arithmetic errors
- Time logic becomes brittle

### Better Approach

```typescript
// ✅ Good - Duration abstraction
import { Duration } from "effect";

interface Session {
  readonly createdAt: Date;
  readonly expiresIn: Duration.Duration;
}

const isExpired = (session: Session): boolean => {
  const now = Date.now();
  const expiresAt = session.createdAt.getTime() + 
    Duration.toMillis(session.expiresIn);
  return now > expiresAt;
};

// Clear duration creation
const session: Session = {
  createdAt: new Date(),
  expiresIn: Duration.minutes(30) // Clear units!
};

// Duration arithmetic
const extendSession = (session: Session): Session => ({
  ...session,
  expiresIn: Duration.sum(session.expiresIn, Duration.hours(1))
});
```

---

## 10. Domain Meaning Inferred from File Structure

**Rule ID**: `domain-meaning-from-file-structure`  
**Severity**: Medium  
**Category**: style  
**Fix ID**: `encode-domain-in-types`

### The Problem

Meaning encoded implicitly by where code lives rather than by types.

**Why this is bad:**
- Hard to refactor
- New contributors miss rules
- Tooling can't help you

### Better Approach

```typescript
// ❌ Bad - Meaning from file location
// src/admin/users.ts
export const deleteUser = (id: string) => ...

// src/public/users.ts
export const getUser = (id: string) => ...

// ✅ Good - Meaning in types
type AdminContext = Brand.Brand<"AdminContext">;
type PublicContext = Brand.Brand<"PublicContext">;

// Operations are tagged with their context
const deleteUser = (
  id: UserId,
  context: AdminContext
): Effect.Effect<void, DeleteError> => ...

const getUser = (
  id: UserId,
  context: PublicContext | AdminContext
): Effect.Effect<User, NotFoundError> => ...

// Context is explicit and type-checked
const adminOp = Effect.gen(function* () {
  const ctx = yield* getAdminContext();
  yield* deleteUser(userId, ctx); // Type-safe!
});
```

---

## Detection Strategy

### AST Patterns to Match

1. **Primitive Parameters**: Function parameters with primitive types (number, string, boolean)
2. **Boolean Flags**: Boolean parameters in function signatures
3. **String Literals**: String literal comparisons in conditionals
4. **Complex Conditionals**: Multiple boolean conditions combined
5. **Any Types**: Config objects typed as `any`
6. **Type Aliases**: Simple type aliases like `type UserId = string`
7. **Number/Date Time**: Time-related fields typed as number or Date
8. **Ad-hoc Strings**: `Effect.fail("string literal")`

### Heuristics

- Count primitive parameters in domain functions (threshold: ≥3)
- Detect boolean parameters named like modes (isAdmin, isEnabled, etc.)
- Find string literal comparisons (especially in if statements)
- Identify complex boolean expressions (≥3 conditions)
- Locate config/options parameters typed as any or object
- Find type aliases that are just primitives
- Detect time fields without Duration type

---

## Implementation Status

✅ **Fully Integrated** - All 10 domain modeling anti-patterns are now part of the Effect Patterns analysis system:

- Type definitions updated with rule IDs and fix IDs
- Fix definitions added for all 10 patterns
- Rule definitions with comprehensive messages
- Test coverage complete (93 expect calls)
- Available via MCP server for code analysis

## Summary Statistics

- **Total Anti-Patterns**: Now 48 (38 previous + 10 domain modeling)
- **Total Fix Definitions**: Now 40 (30 previous + 10 domain modeling)
- **Severity Distribution**:
  - High: 16 rules (1 new domain modeling)
  - Medium: 30 rules (9 new domain modeling)
  - Low: 2 rules

## Educational Value

These rules have **high educational value** because they:

1. **Teach domain modeling**: Encourage proper domain representation with types
2. **Improve type safety**: Make illegal states unrepresentable
3. **Enhance maintainability**: Explicit domain models are easier to evolve
4. **Support refactoring**: Types guide safe code changes

## Ideal Use Cases

- **Read-only code review**: Identify weak domain models
- **Educational explanations**: Learn domain modeling best practices
- **Pro suggestions**: Automated refactoring hints
- **Team standards**: Establish domain modeling conventions

These rules help teams reduce hidden complexity and let Effect's type system do real work in representing domain concepts accurately and safely.
