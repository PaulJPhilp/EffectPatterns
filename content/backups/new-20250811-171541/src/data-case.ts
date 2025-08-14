import { Data, Effect, Equal } from "effect";

interface Person {
  readonly name: string;
}

const Person = Data.case<Person>();

const person1 = Person({ name: "Alice" });
const person2 = Person({ name: "Bob" });

function greet(person: Person): string {
  return `Hello, ${person.name}!`;
}

const program = Effect.gen(function* () {
  yield* Effect.log(greet(person1));
  yield* Effect.log(greet(person2));
  yield* Effect.log(`Are they equal? ${Equal.equals(person1, person2)}`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
