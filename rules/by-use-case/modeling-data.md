# modeling-data Patterns

## Work with Arbitrary-Precision Numbers using BigDecimal

Use BigDecimal to represent and compute with decimal numbers that require arbitrary precision, such as in finance or scientific domains.

### Example

```typescript
import { BigDecimal } from "effect";

// Create BigDecimal values
const a = BigDecimal.fromNumber(0.1);
const b = BigDecimal.fromNumber(0.2);

// Add, subtract, multiply, divide
const sum = BigDecimal.sum(a, b); // BigDecimal(0.3)
const product = BigDecimal.multiply(a, b); // BigDecimal(0.02)

// Compare values
const isEqual = BigDecimal.equals(sum, BigDecimal.fromNumber(0.3)); // true

// Convert to string or number
const asString = BigDecimal.format(BigDecimal.normalize(sum)); // "0.3"
const asNumber = BigDecimal.unsafeToNumber(sum); // 0.3
```

**Explanation:**  
- `BigDecimal` is immutable and supports precise decimal arithmetic.
- Use it for domains where rounding errors are unacceptable (e.g., finance, billing, scientific data).
- Avoids the pitfalls of floating-point math in JavaScript.

---

## Work with Immutable Sets using HashSet

Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

### Example

```typescript
import { HashSet } from "effect";

// Create a HashSet from an array
const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);

// Membership check
const hasTwo = HashSet.has(setA, 2); // true

// Union, intersection, difference
const union = HashSet.union(setA, setB);         // HashSet {1, 2, 3, 4, 5}
const intersection = HashSet.intersection(setA, setB); // HashSet {3}
const difference = HashSet.difference(setA, setB);     // HashSet {1, 2}

// Add and remove elements
const withSix = HashSet.add(setA, 6);    // HashSet {1, 2, 3, 6}
const withoutOne = HashSet.remove(setA, 1); // HashSet {2, 3}
```

**Explanation:**  
- `HashSet` is immutable and supports efficient set operations.
- Use it for membership checks, set algebra, and modeling unique collections.
- Safe for concurrent and functional workflows.

---

## Working with Immutable Arrays using Data.array

Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal arrays
const arr1 = Data.array([1, 2, 3]);
const arr2 = Data.array([1, 2, 3]);

// Compare by value, not reference
const areEqual = Equal.equals(arr1, arr2); // true

// Use arrays as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(arr1);
console.log(HashSet.has(set, arr2)); // true

// Functional operations (map, filter, etc.)
const doubled = arr1.map((n) => n * 2); // Data.array([2, 4, 6])
```

**Explanation:**  
- `Data.array` creates immutable arrays with value-based equality.
- Useful for modeling ordered collections in a safe, functional way.
- Supports all standard array operations, but with immutability and structural equality.

---

