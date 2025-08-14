import { Data, Equal } from "effect";

// Create two structurally equal tuples
const t1 = Data.tuple(1, "Alice");
const t2 = Data.tuple(1, "Alice");

// Compare by value, not reference
const areEqual = Equal.equals(t1, t2); // true

// Use tuples as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(t1);
console.log(HashSet.has(set, t2)); // true

// Pattern matching on tuples
const [id, name] = t1; // id: number, name: string