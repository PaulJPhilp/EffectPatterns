import { Data } from "effect";

// Define a custom data type
const User = Data.struct({ id: 1, name: "Alice" });

// Derive equality for data types
const user2 = Data.struct({ id: 1, name: "Alice" });
const areEqual = Data.equal(User, user2); // true based on structural equality

// Use for sorting
const users = [
  Data.struct({ id: 2, name: "Bob" }),
  Data.struct({ id: 1, name: "Alice" })
];

// Sort by id manually
const sorted = users.sort((a, b) => (a as any).id - (b as any).id);