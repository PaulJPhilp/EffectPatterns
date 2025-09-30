# Checks Patterns

## Checking Option and Either Cases

Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe conditional logic.

### Example

```typescript
import { Option, Either } from "effect";

// Option: Check if value is Some or None
const option = Option.some(42);

if (Option.isSome(option)) {
  // option.value is available here
  console.log("We have a value:", option.value);
} else if (Option.isNone(option)) {
  console.log("No value present");
}

// Either: Check if value is Right or Left
const either = Either.left("error");

if (Either.isRight(either)) {
  // either.right is available here
  console.log("Success:", either.right);
} else if (Either.isLeft(either)) {
  // either.left is available here
  console.log("Failure:", either.left);
}

// Filtering a collection of Options
const options = [Option.some(1), Option.none(), Option.some(3)];
const presentValues = options.filter(Option.isSome).map((o) => o.value); // [1, 3]
```

**Explanation:**  
- `Option.isSome` and `Option.isNone` let you check for presence or absence.
- `Either.isRight` and `Either.isLeft` let you check for success or failure.
- These are especially useful for filtering or quick conditional logic.

---

