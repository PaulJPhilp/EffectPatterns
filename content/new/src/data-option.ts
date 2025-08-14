import { Option } from "effect";

// Create an Option from a value
const someValue = Option.some(42); // Option<number>
const noValue = Option.none();     // Option<never>

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
function findUser(id: number): Option<{ id: number; name: string }> {
  return id === 1 ? Option.some({ id, name: "Alice" }) : Option.none();
}