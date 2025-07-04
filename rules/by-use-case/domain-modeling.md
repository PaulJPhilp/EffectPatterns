## Model Optional Values Safely with Option
**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

### Example
A function that looks for a user in a database is a classic use case. It might find a user, or it might not. Returning an `Option<User>` makes this contract explicit and safe.

```typescript
import { Option } from "effect";

interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: "Paul" },
  { id: 2, name: "Alex" },
];

// This function safely returns an Option, not a User or null.
const findUserById = (id: number): Option.Option<User> => {
  const user = users.find((u) => u.id === id);
  return Option.fromNullable(user); // A useful helper for existing APIs
};

// The caller MUST handle both cases.
const greeting = (id: number): string =>
  findUserById(id).pipe(
    Option.match({
      onNone: () => "User not found.",
      onSome: (user) => `Welcome, ${user.name}!`,
    }),
  );

console.log(greeting(1)); // "Welcome, Paul!"
console.log(greeting(3)); // "User not found."

## Use Effect.gen for Business Logic
**Rule:** Use Effect.gen for business logic.

### Example
```typescript
import { Effect } from "effect";

declare const validateUser: (data: any) => Effect.Effect<any>;
declare const hashPassword: (pw: string) => Effect.Effect<string>;
declare const dbCreateUser: (data: any) => Effect.Effect<any>;

const createUser = (userData: any) =>
  Effect.gen(function* () {
    const validated = yield* validateUser(userData);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });
```

**Explanation:**  
`Effect.gen` allows you to express business logic in a clear, sequential style,
improving maintainability.

## Transform Data During Validation with Schema
**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

### Example
This schema parses a string but produces a `Date` object, making the final data structure much more useful.

```typescript
import { Schema, Effect } from "effect";

// This schema takes a string as input and outputs a Date object.
const DateFromString = Schema.string.pipe(
  Schema.transform(
    Schema.Date,
    (s) => new Date(s), // decode
    (d) => d.toISOString(), // encode
  ),
);

const ApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: DateFromString,
});

const rawInput = { name: "User Login", timestamp: "2025-06-22T20:08:42.000Z" };

const program = Schema.decode(ApiEventSchema)(rawInput);

Effect.runPromise(program).then((event) => {
  // `event.timestamp` is a Date object, not a string!
  console.log(event.timestamp.getFullYear()); // 2025
});
```


`transformOrFail` is perfect for creating branded types, as the validation can fail.

```typescript
import { Schema, Effect, Brand, Either } from "effect";

type Email = string & Brand.Brand<"Email">;
const Email = Schema.string.pipe(
  Schema.transformOrFail(
    Schema.brand<Email>("Email"),
    (s, _, ast) =>
      s.includes("@")
        ? Either.right(s as Email)
        : Either.left(Schema.ParseError.create(ast, "Invalid email format")),
    (email) => Either.right(email),
  ),
);

const result = Schema.decode(Email)("paul@example.com"); // Succeeds
const errorResult = Schema.decode(Email)("invalid-email"); // Fails
```

---

## Define Type-Safe Errors with Data.TaggedError
**Rule:** Define type-safe errors with Data.TaggedError.

### Example
```typescript
import { Data, Effect } from "effect";

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

const findUser = (id: number): Effect.Effect<any, DatabaseError> =>
  Effect.fail(new DatabaseError({ cause: "Connection timed out" }));
```

**Explanation:**  
Tagged errors allow you to handle errors in a type-safe, self-documenting way.

## Define Contracts Upfront with Schema
**Rule:** Define contracts upfront with schema.

### Example
```typescript
import { Schema, Effect } from "effect";

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
});
type User = Schema.Schema.Type<typeof User>;

const DatabaseServiceSchema = Schema.Struct({
  getUser: Schema.Function(Schema.Number, Effect.Effect(User)),
});
```

**Explanation:**  
Defining schemas upfront clarifies your contracts and ensures both type safety
and runtime validation.

## Parse and Validate Data with Schema.decode
**Rule:** Parse and validate data with Schema.decode.

### Example
```typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({ name: Schema.String });

const processUserInput = (input: unknown) =>
  Schema.decode(UserSchema)(input).pipe(
    Effect.map((user) => `Welcome, ${user.name}!`),
    Effect.catchTag("ParseError", () => Effect.succeed("Invalid user data.")),
  );
```

**Explanation:**  
`Schema.decode` integrates parsing and validation into the Effect workflow,
making error handling composable and type-safe.

## Avoid Long Chains of .andThen; Use Generators Instead
**Rule:** Prefer generators over long chains of .andThen.

### Example
```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});
```

**Explanation:**  
Generators keep sequential logic readable and easy to maintain.

## Distinguish 'Not Found' from Errors
**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Example
This function to find a user can fail if the database is down, or it can succeed but find no user. The return type ``Effect.Effect<Option.Option<User>, DatabaseError>`` makes this contract perfectly clear.

````typescript
import { Effect, Option, Data } from "effect";

interface User {
  id: number;
  name: string;
}
class DatabaseError extends Data.TaggedError("DatabaseError") {}

// This signature is extremely honest about its possible outcomes.
const findUserInDb = (
  id: number,
): Effect.Effect<Option.Option<User>, DatabaseError> =>
  Effect.gen(function* () {
    // This could fail with a DatabaseError
    const dbResult = yield* Effect.try({
      try: () => (id === 1 ? { id: 1, name: "Paul" } : null),
      catch: () => new DatabaseError(),
    });

    // We wrap the potentially null result in an Option
    return Option.fromNullable(dbResult);
  });

// The caller can now handle all three cases explicitly.
const program = (id: number) =>
  findUserInDb(id).pipe(
    Effect.match({
      onFailure: (error) => "Error: Could not connect to the database.",
      onSuccess: (maybeUser) =>
        Option.match(maybeUser, {
          onNone: () => `Result: User with ID ${id} was not found.`,
          onSome: (user) => `Result: Found user ${user.name}.`,
        }),
    }),
  );
````

## Model Validated Domain Types with Brand
**Rule:** Model validated domain types with Brand.

### Example
```typescript
import { Brand, Option } from "effect";

type Email = string & Brand.Brand<"Email">;

const makeEmail = (s: string): Option.Option<Email> =>
  s.includes("@") ? Option.some(s as Email) : Option.none();

// A function can now trust that its input is a valid email.
const sendEmail = (email: Email, body: string) => { /* ... */ };
```

**Explanation:**  
Branding ensures that only validated values are used, reducing bugs and
repetitive checks.

## Accumulate Multiple Errors with Either
**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

### Example
Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

````typescript
import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(3)),
  email: Schema.String.pipe(Schema.pattern(/@/)),
});

const invalidInput = {
  name: "Al", // Too short
  email: "bob-no-at-sign.com", // Invalid pattern
};

// Use { allErrors: true } to enable error accumulation
const decoded = Schema.decode(UserSchema)(invalidInput, { allErrors: true });

const program = Effect.match(decoded, {
  onFailure: (error) => {
    // The error contains a tree of all validation failures
    console.log("Validation failed with multiple errors:");
    error.errors.forEach((e, i) => console.log(`${i + 1}. ${e.message}`));
  },
  onSuccess: (user) => console.log("User is valid:", user),
});

Effect.runSync(program);
/*
Output:
Validation failed with multiple errors:
1. name must be a string at least 3 character(s) long
2. email must be a string matching the pattern /@/
*/
````

---