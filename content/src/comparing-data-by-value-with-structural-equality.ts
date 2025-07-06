import { Data, Equal } from "effect";

// Define a Point data type with structural equality
const Point = Data.struct({
  x: Data.number,
  y: Data.number,
});

const p1 = Point({ x: 1, y: 2 });
const p2 = Point({ x: 1, y: 2 });
const p3 = Point({ x: 3, y: 4 });

// Standard reference equality fails
console.log(p1 === p2); // false

// Structural equality works as expected
console.log(Equal.equals(p1, p2)); // true
console.log(Equal.equals(p1, p3)); // false