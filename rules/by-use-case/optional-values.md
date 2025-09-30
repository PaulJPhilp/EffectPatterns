# Optional Values Patterns

## Model Optional Values Safely with Option

Use Option to model values that may be present or absent, making absence explicit and type-safe.

### Example

```typescript
import { Option } from "effect";

// Create an Option from a value
const someValue = Option.some(42); // Option<number>
const noValue = Option.none(); // Option<never>

// Safely convert a nullable value to Option
const fromNullable = Option.fromNullable(Math.random() > 0.5 ? "hello" : null); // Option<string>

// Pattern match on Option
const result = someValue.pipe(
  Option.match({
    onNone: () => "No value",
    onSome: (n) => `Value: ${n}`,
  })
); // string

// Use Option in a workflow
function findUser(id: number): Option.Option<{ id: number; name: string }> {
  return id === 1 ? Option.some({ id, name: "Alice" }) : Option.none();
}

```

**Explanation:**  
- `Option.some(value)` represents a present value.
- `Option.none()` represents absence.
- `Option.fromNullable` safely lifts nullable values into Option.
- Pattern matching ensures all cases are handled.

---

