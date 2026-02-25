# Pattern Guidance: Use branded types for domain concepts instead of primitives

**Goal: Make domain meaning explicit in the type system.**

## Use when
- A value represents a domain concept (UserId, Email, Amount, Priority).
- The value has constraints or semantic meaning beyond the primitive type.
- You want to prevent mixing up similar types (UserId vs AdminId).
- You're building domain models and services.

## Avoid when
- Using raw strings, numbers, or booleans directly without semantic meaning.
- Passing `string` when you mean "email address" or "API key".
- Using `amount: number` when the amount is always in cents (not dollars).
- Treating domain IDs as interchangeable with raw strings.

## Decision rule
If a value has:
- A domain name (not just "id" but "UserId", "OrderId")
- Constraints (email must have @, amount must be positive)
- Semantic meaning (priority isn't just a number, it's High/Medium/Low)

Then create a branded type or union, not a primitive.

**Simplifier**
Raw primitive = "Could be anything."
Branded type = "Definitely a UserId, definitely valid."

## Goal
Make domain meaning explicit in the type system.

---

## Architecture impact
**Domain impact**
- Type safety breaks: passing a random string where UserId is expected.
- Refactoring is fragile: renaming a domain concept is a find-and-replace, not a type error.
- Constraints are implicit: email validation happens at runtime, not compile time.
- Logic is scattered: validation code lives in multiple places.

**Boundary/runtime impact**
- Observability: logs show "string value 'user123'" instead of "UserId(user123)".
- Debugging: which value is which? All you see is strings/numbers.
- APIs become ambiguous: function(string, string, string) - which is which?
- Testing is error-prone: easy to pass arguments in wrong order because they're all strings.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Define a branded type (or union) for this domain concept. Create a constructor/validator function. Update the function signature to use the branded type instead of the primitive. Update call sites to construct the branded value."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the primitive that represents a domain concept.
2. Create a branded type: `type UserId = string & { readonly __brand: "UserId" }`.
3. Create a constructor: `const UserId = (value: string): UserId => value as UserId`.
4. Add validation in the constructor if needed.
5. Update function signatures to accept the branded type.
6. Update call sites to construct the branded value.

**What will change (summary)**
- Domain meaning is explicit in types.
- Type checker prevents mixing up similar values.
- Constraints are enforced at construction time.
- Code is more self-documenting.

**Risks / watch-outs**
- Branded types add boilerplate (constructor functions for each type).
- Runtime validation can be expensive if done on every construction.
- Conversion from external sources (JSON, database) needs validation.

---

## Example
**Before:**
```typescript
export const transferMoney = (
  from: string,      // Could be any string
  to: string,        // Could be any string
  amount: number     // Could be negative!
): Effect<void, Error> =>
  Effect.gen(function* () {
    // Easy to pass arguments in wrong order
    // No constraints on amount
    yield* updateBalance(from, -amount);
    yield* updateBalance(to, amount);
  });

// Call site: easy to make mistakes
yield* transferMoney("user123", "5000", 100);  // Oops, mixed up userId and amount
```

**After:**
```typescript
// Define branded types with validators
type UserId = string & { readonly __brand: "UserId" };
type Amount = number & { readonly __brand: "Amount" };

const UserId = (value: string): UserId => {
  if (!value.match(/^user_[a-z0-9]+$/)) {
    throw new Error("Invalid UserId format");
  }
  return value as UserId;
};

const Amount = (value: number): Amount => {
  if (value <= 0) {
    throw new Error("Amount must be positive");
  }
  return value as Amount;
};

export const transferMoney = (
  from: UserId,
  to: UserId,
  amount: Amount
): Effect<void, Error> =>
  Effect.gen(function* () {
    yield* updateBalance(from, Amount(-amount as any));  // Type error if you try to swap
    yield* updateBalance(to, amount);
  });

// Call site: explicit and safe
const fromId = UserId("user_alice");
const toId = UserId("user_bob");
const amt = Amount(100);
yield* transferMoney(fromId, toId, amt);  // Clear intent, no mistakes

// Type error if you try to pass in wrong order:
// yield* transferMoney(amt, fromId, toId);  // ❌ Type error!
```

---

## Related patterns
See also:
- **objects-as-implicit-state-machines** — similar issue: raw booleans/strings for domain state
- **encode-domain-in-types** — broader pattern of making domain meaning explicit
