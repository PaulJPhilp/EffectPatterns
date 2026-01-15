# Domain Modeling Anti-Patterns Addition Summary

## Overview

Successfully added **10 Domain Modeling Anti-Patterns** to the Effect Patterns code analysis system. These anti-patterns indicate missing or weak domain models that often appear as "working code" but become brittle, unclear, or unsafe as systems evolve.

## What Was Added

### 1. Type Definitions

**File**: `src/tools/ids.ts`

**Added to RuleIdValues (10 new rule IDs):**
- `primitives-for-domain-concepts` - Using primitives for domain concepts
- `boolean-flags-controlling-behavior` - Boolean flags controlling behavior
- `magic-string-domains` - Magic string domains
- `objects-as-implicit-state-machines` - Objects as implicit state machines
- `domain-logic-in-conditionals` - Domain logic embedded in conditionals
- `adhoc-error-semantics-in-domain` - Ad-hoc error semantics in domain code
- `overloaded-config-objects` - Overloaded config or options objects
- `domain-ids-as-raw-strings` - Domain identifiers as raw strings
- `time-as-number-or-date` - Time as number or Date in domain logic
- `domain-meaning-from-file-structure` - Domain meaning inferred from file structure

**Added to FixIdValues (10 new fix IDs):**
- `introduce-branded-types` - Introduce branded types for domain concepts
- `replace-boolean-with-tagged-union` - Replace boolean flags with tagged unions
- `replace-magic-strings-with-union` - Replace magic strings with literal unions
- `model-explicit-state-machine` - Model explicit state machine
- `extract-domain-predicates` - Extract domain predicates
- `use-domain-specific-errors` - Use domain-specific error types
- `structure-config-schema` - Structure config schema
- `introduce-branded-ids` - Introduce branded IDs
- `use-duration-abstraction` - Use Duration abstraction
- `encode-domain-in-types` - Encode domain meaning in types

### 2. Fix Definitions

**File**: `src/services/rule-registry.ts`

Added 10 comprehensive fix definitions with clear titles and descriptions for each domain modeling anti-pattern.

### 3. Rule Definitions

**File**: `src/services/rule-registry.ts`

Added 10 detailed rule definitions with:
- Clear titles and comprehensive messages
- Appropriate severity levels (1 High, 9 Medium)
- Categorized as "validation", "style", or "errors"
- Associated fix IDs for automated remediation

## Severity Distribution

### High Severity (1 rule)
1. **`adhoc-error-semantics-in-domain`** - Domain meaning implicit, no structured recovery

### Medium Severity (9 rules)
1. **`primitives-for-domain-concepts`** - Loses meaning and constraints
2. **`boolean-flags-controlling-behavior`** - Hidden branches, poor readability
3. **`magic-string-domains`** - No exhaustiveness checking
4. **`objects-as-implicit-state-machines`** - Allows impossible states
5. **`domain-logic-in-conditionals`** - Business rules hidden
6. **`overloaded-config-objects`** - Unclear required vs optional fields
7. **`domain-ids-as-raw-strings`** - IDs interchangeable by accident
8. **`time-as-number-or-date`** - Units unclear, arithmetic errors
9. **`domain-meaning-from-file-structure`** - Hard to refactor

## Key Focus Areas

These anti-patterns address:

1. **Type Design**
   - Primitives vs branded types
   - Boolean flags vs tagged unions
   - Magic strings vs literal unions

2. **State Modeling**
   - Implicit vs explicit state machines
   - Impossible states prevention
   - Type-safe state transitions

3. **Domain Logic**
   - Hidden business rules
   - Ad-hoc error semantics
   - Domain predicates extraction

4. **Configuration & IDs**
   - Overloaded config objects
   - Raw string IDs
   - Time representation

## Better Patterns Promoted

### 1. Branded Types

```typescript
// Instead of: function transfer(amount: number, accountId: string)
type Amount = number & Brand.Brand<"Amount">;
type AccountId = string & Brand.Brand<"AccountId">;

const Amount = Brand.nominal<Amount>();
const AccountId = Brand.nominal<AccountId>();

function transfer(amount: Amount, accountId: AccountId)
```

### 2. Tagged Unions

```typescript
// Instead of: function process(user: User, isAdmin: boolean)
type UserRole = Data.TaggedEnum<{
  Admin: { permissions: string[] };
  User: { tier: "free" | "paid" };
  Guest: {};
}>;

function process(user: User, role: UserRole)
```

### 3. Explicit State Machines

```typescript
// Instead of: if (order.cancelled && !order.shipped)
type OrderState = Data.TaggedEnum<{
  Draft: { items: Item[] };
  Submitted: { items: Item[]; submittedAt: Date };
  Processing: { items: Item[]; paymentId: string };
  Shipped: { trackingNumber: string; shippedAt: Date };
  Cancelled: { reason: string; cancelledAt: Date };
}>;
```

### 4. Domain Predicates

```typescript
// Instead of: if (x > 100 && y < 10 && mode !== "test")
const isEligibleForDiscount = (
  orderTotal: Amount,
  customerTier: CustomerTier,
  mode: AppMode
): boolean => ...
```

### 5. Structured Schemas

```typescript
// Instead of: function createThing(opts: any)
const DatabaseConfigSchema = Schema.Struct({
  host: Schema.String,
  port: Schema.Number,
  database: Schema.String,
  // ...
});
```

## Detection Strategy

**AST Patterns:**
- Function parameters with primitive types (number, string, boolean)
- Boolean parameters in function signatures
- String literal comparisons in conditionals
- Multiple boolean conditions combined
- Config objects typed as `any`
- Simple type aliases like `type UserId = string`
- Time-related fields typed as number or Date
- `Effect.fail("string literal")`

**Heuristics:**
- Count primitive parameters in domain functions (threshold: ≥3)
- Detect boolean parameters named like modes (isAdmin, isEnabled)
- Find string literal comparisons in if statements
- Identify complex boolean expressions (≥3 conditions)
- Locate config/options parameters typed as any or object
- Find type aliases that are just primitives
- Detect time fields without Duration type

## Testing

Added comprehensive test coverage:

```typescript
// Check for domain modeling anti-patterns (10 rules)
expect(rules.some((r) => r.id === "primitives-for-domain-concepts")).toBe(true);
expect(rules.some((r) => r.id === "boolean-flags-controlling-behavior")).toBe(true);
// ... 8 more

// Check for domain modeling fixes (10 fixes)
expect(fixes.some((f) => f.id === "introduce-branded-types")).toBe(true);
expect(fixes.some((f) => f.id === "replace-boolean-with-tagged-union")).toBe(true);
// ... 8 more
```

**Test Results**: ✅ All 77 tests passing with 209 expect calls

## Benefits

These rules help teams:

1. **Reduce Hidden Complexity**
   - Make domain concepts explicit
   - Extract business rules
   - Clear state transitions

2. **Make Illegal States Unrepresentable**
   - Explicit state machines
   - Tagged unions
   - Branded types

3. **Let Effect's Types Do Real Work**
   - Type-safe domain modeling
   - Compiler-enforced invariants
   - Exhaustiveness checking

4. **Build More Maintainable Systems**
   - Explicit domain models
   - Clear business rules
   - Safe refactoring

## Educational Value

**High educational value** because these rules:

1. **Teach domain modeling** - Encourage proper domain representation with types
2. **Improve type safety** - Make illegal states unrepresentable
3. **Enhance maintainability** - Explicit domain models are easier to evolve
4. **Support refactoring** - Types guide safe code changes

## Use Cases

- **Read-only code review** - Identify weak domain models
- **Educational explanations** - Learn domain modeling best practices
- **Pro suggestions** - Automated refactoring hints
- **Team standards** - Establish domain modeling conventions

## Documentation

Created comprehensive documentation:
- `DOMAIN_MODELING_ANTI_PATTERNS.md` - Full guide with examples, rationale, and better patterns

## Integration Status

✅ **Fully Integrated**:
- Type definitions updated (10 rule IDs + 10 fix IDs)
- Fix definitions added with clear descriptions
- Rule definitions with comprehensive messages
- Test coverage complete
- Documentation created
- Available via MCP server for code analysis

## Impact Summary

**Total Anti-Patterns**: Now **48** (38 previous + 10 domain modeling)
- 17 original anti-patterns
- 10 Top 10 correctness anti-patterns
- 1 design smell detector (large switch)
- 10 error modeling anti-patterns
- 10 domain modeling anti-patterns

**Total Fix Definitions**: Now **40** (30 previous + 10 domain modeling)

**Severity Distribution**:
- High: 16 rules (15 previous + 1 domain modeling)
- Medium: 30 rules (21 previous + 9 domain modeling)
- Low: 2 rules

## Category Distribution

**New Categories Used:**
- **validation**: 6 rules (primitives, magic strings, state machines, config, IDs, time)
- **style**: 3 rules (boolean flags, domain logic, file structure)
- **errors**: 1 rule (ad-hoc error semantics)

## Summary

The 10 Domain Modeling Anti-Patterns are now fully integrated into the Effect Patterns analysis system. These are **design smells** that help teams identify missing or weak domain models. They promote:
- Explicit domain types over primitives
- Tagged unions over boolean flags
- State machines over implicit state
- Domain predicates over hidden business rules
- Structured schemas over any types

By making domain concepts explicit in types, teams can leverage Effect's type system to build more maintainable, type-safe, and evolvable applications.
