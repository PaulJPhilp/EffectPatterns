import { Data, Equal } from "effect";

// Create two structurally equal objects
const user1 = Data.struct({ id: 1, name: "Alice" });
const user2 = Data.struct({ id: 1, name: "Alice" });

// Compare by value, not reference
const areEqual = Equal.equals(user1, user2); // true

// Use in a HashSet or as keys in a Map
import { HashSet } from "effect";
const set = HashSet.make(user1);
console.log(HashSet.has(set, user2)); // true