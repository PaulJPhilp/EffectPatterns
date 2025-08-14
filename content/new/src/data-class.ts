import { Data, Equal, Order, Hash } from "effect";

// Define a custom data type
const User = Data.struct({ id: 1, name: "Alice" });

// Derive equality, ordering, and hashing
const userEqual: Equal.Equal<typeof User> = Data.Class.getEqual(User);
const userOrder: Order.Order<typeof User> = Data.Class.getOrder(User, (a, b) => a.id - b.id);
const userHash: Hash.Hash<typeof User> = Data.Class.getHash(User);

// Use in a HashSet
import { HashSet } from "effect";
const set = HashSet.make(User);
console.log(HashSet.has(set, Data.struct({ id: 1, name: "Alice" }))); // true

// Use for sorting
const users = [Data.struct({ id: 2, name: "Bob" }), User];
const sorted = users.sort(userOrder.compare); // Sorted by id