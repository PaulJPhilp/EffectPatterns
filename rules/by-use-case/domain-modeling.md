# Domain Modeling Rules

## Accumulate Multiple Errors with Either
**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

### Example
Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

````typescript
import { Effect, Schema, Data } from "effect";

// Define validation error type
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Define user type
type User = {
  name: string;
  email: string;
};

// Define schema with custom validation
const UserSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(3),
    Schema.filter((name) => /^[A-Za-z\s]+$/.test(name), {
      message: () => "name must contain only letters and spaces"
    })
  ),
  email: Schema.String.pipe(
    Schema.pattern(/@/),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "email must be a valid email address"
    })
  ),
});

// Example inputs
const invalidInputs: User[] = [
  {
    name: "Al", // Too short
    email: "bob-no-at-sign.com", // Invalid pattern
  },
  {
    name: "John123", // Contains numbers
    email: "john@incomplete", // Invalid email
  },
  {
    name: "Alice Smith", // Valid
    email: "alice@example.com", // Valid
  }
];

// Validate a single user
const validateUser = (input: User) =>
  Effect.gen(function* () {
    const result = yield* Schema.decode(UserSchema)(input, { errors: "all" });
    return result;
  });

// Process multiple users and accumulate all errors
const program = Effect.gen(function* () {
  console.log("Validating users...\n");
  
  for (const input of invalidInputs) {
    const result = yield* Effect.either(validateUser(input));
    
    console.log(`Validating user: ${input.name} <${input.email}>`);
    
    yield* Effect.match(result, {
      onFailure: (error) => Effect.sync(() => {
        console.log("❌ Validation failed:");
        console.log(error.message);
        console.log(); // Empty line for readability
      }),
      onSuccess: (user) => Effect.sync(() => {
        console.log("✅ User is valid:", user);
        console.log(); // Empty line for readability
      })
    });
  }
});

// Run the program
Effect.runSync(program);
````

---

## Avoid Long Chains of .andThen; Use Generators Instead
**Rule:** Prefer generators over long chains of .andThen.

### Example
```typescript
import { Effect } from "effect";

// Define our steps with logging
const step1 = (): Effect.Effect<number> =>
  Effect.succeed(42).pipe(
    Effect.tap(n => Effect.log(`Step 1: ${n}`))
  );

const step2 = (a: number): Effect.Effect<string> =>
  Effect.succeed(`Result: ${a * 2}`).pipe(
    Effect.tap(s => Effect.log(`Step 2: ${s}`))
  );

// Using Effect.gen for better readability
const program = Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});

// Run the program
Effect.runPromise(program).then(
  result => Effect.runSync(Effect.log(`Final result: ${result}`))
);
```

**Explanation:**  
Generators keep sequential logic readable and easy to maintain.

## Define Contracts Upfront with Schema
**Rule:** Define contracts upfront with schema.

### Example
```typescript
import { Schema, Effect, Data } from "effect"

// Define User schema and type
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String
})

type User = Schema.Schema.Type<typeof UserSchema>

// Define error type
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: number
}> {}

// Create database service implementation
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    sync: () => ({
      getUser: (id: number) =>
        id === 1
          ? Effect.succeed({ id: 1, name: "John" })
          : Effect.fail(new UserNotFound({ id }))
    })
  }
) {}

// Create a program that demonstrates schema and error handling
const program = Effect.gen(function* () {
  const db = yield* Database
  
  // Try to get an existing user
  yield* Effect.logInfo("Looking up user 1...")
  const user1 = yield* db.getUser(1)
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user1)}`)
  
  // Try to get a non-existent user
  yield* Effect.logInfo("\nLooking up user 999...")
  yield* Effect.logInfo("Attempting to get user 999...")
  yield* Effect.gen(function* () {
    const user = yield* db.getUser(999)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof UserNotFound) {
        return Effect.logInfo(`Error: User with id ${error.id} not found`)
      }
      return Effect.logInfo(`Unexpected error: ${error}`)
    })
  )

  // Try to decode invalid data
  yield* Effect.logInfo("\nTrying to decode invalid user data...")
  const invalidUser = { id: "not-a-number", name: 123 } as any
  yield* Effect.gen(function* () {
    const user = yield* Schema.decode(UserSchema)(invalidUser)
    yield* Effect.logInfo(`Decoded user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Validation failed:\n${JSON.stringify(error, null, 2)}`)
    )
  )
})

// Run the program
Effect.runPromise(
  Effect.provide(program, Database.Default)
)
```

**Explanation:**  
Defining schemas upfront clarifies your contracts and ensures both type safety
and runtime validation.

## Define Type-Safe Errors with Data.TaggedError
**Rule:** Define type-safe errors with Data.TaggedError.

### Example
```typescript
import { Data, Effect } from "effect"

// Define our tagged error type
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown
}> {}

// Function that simulates a database error
const findUser = (id: number): Effect.Effect<{ id: number; name: string }, DatabaseError> =>
  Effect.gen(function* () {
    if (id < 0) {
      return yield* Effect.fail(new DatabaseError({ cause: "Invalid ID" }))
    }
    return { id, name: `User ${id}` }
  })

// Create a program that demonstrates error handling
const program = Effect.gen(function* () {
  // Try to find a valid user
  yield* Effect.logInfo("Looking up user 1...")
  yield* Effect.gen(function* () {
    const user = yield* findUser(1)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Error finding user: ${error._tag} - ${error.cause}`)
    )
  )

  // Try to find an invalid user
  yield* Effect.logInfo("\nLooking up user -1...")
  yield* Effect.gen(function* () {
    const user = yield* findUser(-1)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchTag("DatabaseError", (error) =>
      Effect.logInfo(`Database error: ${error._tag} - ${error.cause}`)
    )
  )
})

// Run the program
Effect.runPromise(program)
```

**Explanation:**  
Tagged errors allow you to handle errors in a type-safe, self-documenting way.

## Distinguish 'Not Found' from Errors
**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Example
This function to find a user can fail if the database is down, or it can succeed but find no user. The return type ``Effect.Effect<Option.Option<User>, DatabaseError>`` makes this contract perfectly clear.

````typescript
import { Effect, Option, Data } from "effect"

interface User {
  id: number
  name: string
}
class DatabaseError extends Data.TaggedError("DatabaseError") {}

// This signature is extremely honest about its possible outcomes.
const findUserInDb = (
  id: number
): Effect.Effect<Option.Option<User>, DatabaseError> =>
  Effect.gen(function* () {
    // This could fail with a DatabaseError
    const dbResult = yield* Effect.try({
      try: () => (id === 1 ? { id: 1, name: "Paul" } : null),
      catch: () => new DatabaseError()
    })

    // We wrap the potentially null result in an Option
    return Option.fromNullable(dbResult)
  })

// The caller can now handle all three cases explicitly.
const program = (id: number) =>
  findUserInDb(id).pipe(
    Effect.flatMap((maybeUser) =>
      Option.match(maybeUser, {
        onNone: () =>
          Effect.logInfo(`Result: User with ID ${id} was not found.`),
        onSome: (user) =>
          Effect.logInfo(`Result: Found user ${user.name}.`)
      })
    ),
    Effect.catchAll((error) =>
      Effect.logInfo("Error: Could not connect to the database.")
    )
  )

// Run the program with different IDs
Effect.runPromise(
  Effect.gen(function* () {
    // Try with existing user
    yield* Effect.logInfo("Looking for user with ID 1...")
    yield* program(1)

    // Try with non-existent user
    yield* Effect.logInfo("\nLooking for user with ID 2...")
    yield* program(2)
  })
)
````

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
```

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

## Parse and Validate Data with Schema.decode
**Rule:** Parse and validate data with Schema.decode.

### Example
```typescript
import { Effect, Schema } from "effect";

interface User {
  name: string;
}

const UserSchema = Schema.Struct({
  name: Schema.String,
}) as Schema.Schema<User>;

const processUserInput = (input: unknown) =>
  Effect.gen(function* () {
    const user = yield* Schema.decodeUnknown(UserSchema)(input);
    return `Welcome, ${user.name}!`;
  }).pipe(
    Effect.catchTag("ParseError", () => Effect.succeed("Invalid user data."))
  );

// Demonstrate the schema parsing
const program = Effect.gen(function* () {
  // Test with valid input
  const validInput = { name: "Paul" };
  const validResult = yield* processUserInput(validInput);
  yield* Effect.logInfo(`Valid input result: ${validResult}`);

  // Test with invalid input
  const invalidInput = { age: 25 }; // Missing 'name' field
  const invalidResult = yield* processUserInput(invalidInput);
  yield* Effect.logInfo(`Invalid input result: ${invalidResult}`);

  // Test with completely invalid input
  const badInput = "not an object";
  const badResult = yield* processUserInput(badInput);
  yield* Effect.logInfo(`Bad input result: ${badResult}`);
});

Effect.runPromise(program);

```

**Explanation:**  
`Schema.decode` integrates parsing and validation into the Effect workflow,
making error handling composable and type-safe.

## Transform Data During Validation with Schema
**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

### Example
This schema parses a string but produces a `Date` object, making the final data structure much more useful.

```typescript
import { Schema, Effect } from "effect";

// Define types for better type safety
type RawEvent = {
  name: string;
  timestamp: string;
};

type ParsedEvent = {
  name: string;
  timestamp: Date;
};

// Define the schema for our event
const ApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String
});

// Example input
const rawInput: RawEvent = {
  name: "User Login",
  timestamp: "2025-06-22T20:08:42.000Z"
};

// Parse and transform
const program = Effect.gen(function* () {
  const parsed = yield* Schema.decode(ApiEventSchema)(rawInput);
  return {
    name: parsed.name,
    timestamp: new Date(parsed.timestamp)
  } as ParsedEvent;
});

Effect.runPromise(program).then(
  (event) => {
    console.log('Event year:', event.timestamp.getFullYear());
    console.log('Full event:', event);
  },
  (error) => {
    console.error('Failed to parse event:', error);
  }
);
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

## Use Effect.gen for Business Logic
**Rule:** Use Effect.gen for business logic.

### Example
```typescript
import { Effect } from "effect";

// Concrete implementations for demonstration
const validateUser = (
  data: any
): Effect.Effect<{ email: string; password: string }, Error, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Validating user data: ${JSON.stringify(data)}`);

    if (!data.email || !data.password) {
      return yield* Effect.fail(new Error("Email and password are required"));
    }

    if (data.password.length < 6) {
      return yield* Effect.fail(
        new Error("Password must be at least 6 characters")
      );
    }

    yield* Effect.logInfo("✅ User data validated successfully");
    return { email: data.email, password: data.password };
  });

const hashPassword = (pw: string): Effect.Effect<string, never, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Hashing password...");
    // Simulate password hashing
    const hashed = `hashed_${pw}_${Date.now()}`;
    yield* Effect.logInfo("✅ Password hashed successfully");
    return hashed;
  });

const dbCreateUser = (data: {
  email: string;
  password: string;
}): Effect.Effect<{ id: number; email: string }, never, never> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Creating user in database: ${data.email}`);
    // Simulate database operation
    const user = { id: Math.floor(Math.random() * 1000), email: data.email };
    yield* Effect.logInfo(`✅ User created with ID: ${user.id}`);
    return user;
  });

const createUser = (userData: any): Effect.Effect<{ id: number; email: string }, Error, never> =>
  Effect.gen(function* () {
    const validated = yield* validateUser(userData);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });

// Demonstrate using Effect.gen for business logic
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Using Effect.gen for Business Logic Demo ===");

  // Example 1: Successful user creation
  yield* Effect.logInfo("\n1. Creating a valid user:");
  const validUser = yield* createUser({
    email: "paul@example.com",
    password: "securepassword123",
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to create user: ${error.message}`);
        return { id: -1, email: "error" };
      })
    )
  );
  yield* Effect.logInfo(`Created user: ${JSON.stringify(validUser)}`);

  // Example 2: Invalid user data
  yield* Effect.logInfo("\n2. Attempting to create user with invalid data:");
  const invalidUser = yield* createUser({
    email: "invalid@example.com",
    password: "123", // Too short
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to create user: ${error.message}`);
        return { id: -1, email: "error" };
      })
    )
  );
  yield* Effect.logInfo(`Result: ${JSON.stringify(invalidUser)}`);

  yield* Effect.logInfo("\n✅ Business logic demonstration completed!");
});

Effect.runPromise(program);

```

**Explanation:**  
`Effect.gen` allows you to express business logic in a clear, sequential style,
improving maintainability.

