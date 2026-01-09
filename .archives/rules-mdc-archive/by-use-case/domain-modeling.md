# domain-modeling Patterns

## Accumulate Multiple Errors with Either

Use Either to accumulate multiple validation errors instead of failing on the first one.

### Example

Using `Schema.decode` with the `allErrors: true` option demonstrates this pattern perfectly. The underlying mechanism uses `Either` to collect all parsing errors into an array instead of stopping at the first one.

```typescript
import { Effect, Schema, Data, Either } from "effect";

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
      message: () => "name must contain only letters and spaces",
    })
  ),
  email: Schema.String.pipe(
    Schema.pattern(/@/),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "email must be a valid email address",
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
  },
];

// Validate a single user
const validateUser = (input: User) =>
  Effect.gen(function* () {
    const result = yield* Schema.decode(UserSchema)(input, { errors: "all" });
    return result;
  });

// Process multiple users and accumulate all errors
const program = Effect.gen(function* () {
  yield* Effect.log("Validating users...\n");

  for (const input of invalidInputs) {
    const result = yield* Effect.either(validateUser(input));

    yield* Effect.log(`Validating user: ${input.name} <${input.email}>`);

    // Handle success and failure cases separately for clarity
    // Using Either.match which is the idiomatic way to handle Either values
    yield* Either.match(result, {
      onLeft: (error) =>
        Effect.gen(function* () {
          yield* Effect.log("❌ Validation failed:");
          yield* Effect.log(error.message);
          yield* Effect.log(""); // Empty line for readability
        }),
      onRight: (user) =>
        Effect.gen(function* () {
          yield* Effect.log(`✅ User is valid: ${JSON.stringify(user)}`);
          yield* Effect.log(""); // Empty line for readability
        }),
    });
  }
});

// Run the program
Effect.runSync(program);
```

---

---

## Avoid Long Chains of .andThen; Use Generators Instead

Prefer generators over long chains of .andThen.

### Example

```typescript
import { Effect } from "effect";

// Define our steps with logging
const step1 = (): Effect.Effect<number> =>
  Effect.succeed(42).pipe(Effect.tap((n) => Effect.log(`Step 1: ${n}`)));

const step2 = (a: number): Effect.Effect<string> =>
  Effect.succeed(`Result: ${a * 2}`).pipe(
    Effect.tap((s) => Effect.log(`Step 2: ${s}`))
  );

// Using Effect.gen for better readability
const program = Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});

// Run the program
const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Final result: ${result}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
Generators keep sequential logic readable and easy to maintain.

---

## Create Type-Safe Errors

Use Data.TaggedError to create typed, distinguishable errors for your domain.

### Example

```typescript
import { Effect, Data } from "effect"

// ============================================
// 1. Define tagged errors for your domain
// ============================================

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

class InvalidEmailError extends Data.TaggedError("InvalidEmailError")<{
  readonly email: string
  readonly reason: string
}> {}

class DuplicateUserError extends Data.TaggedError("DuplicateUserError")<{
  readonly email: string
}> {}

// ============================================
// 2. Use in Effect functions
// ============================================

interface User {
  id: string
  email: string
  name: string
}

const validateEmail = (email: string): Effect.Effect<string, InvalidEmailError> => {
  if (!email.includes("@")) {
    return Effect.fail(new InvalidEmailError({
      email,
      reason: "Missing @ symbol"
    }))
  }
  return Effect.succeed(email)
}

const findUser = (id: string): Effect.Effect<User, UserNotFoundError> => {
  // Simulate database lookup
  if (id === "123") {
    return Effect.succeed({ id, email: "alice@example.com", name: "Alice" })
  }
  return Effect.fail(new UserNotFoundError({ userId: id }))
}

const createUser = (
  email: string,
  name: string
): Effect.Effect<User, InvalidEmailError | DuplicateUserError> =>
  Effect.gen(function* () {
    const validEmail = yield* validateEmail(email)

    // Simulate duplicate check
    if (validEmail === "taken@example.com") {
      return yield* Effect.fail(new DuplicateUserError({ email: validEmail }))
    }

    return {
      id: crypto.randomUUID(),
      email: validEmail,
      name,
    }
  })

// ============================================
// 3. Handle errors by tag
// ============================================

const program = createUser("alice@example.com", "Alice").pipe(
  Effect.catchTag("InvalidEmailError", (error) =>
    Effect.succeed({
      id: "fallback",
      email: "default@example.com",
      name: `${error.email} was invalid: ${error.reason}`,
    })
  ),
  Effect.catchTag("DuplicateUserError", (error) =>
    Effect.fail(new Error(`Email ${error.email} already registered`))
  )
)

// ============================================
// 4. Match on all errors
// ============================================

const handleAllErrors = createUser("bad-email", "Bob").pipe(
  Effect.catchTags({
    InvalidEmailError: (e) => Effect.succeed(`Invalid: ${e.reason}`),
    DuplicateUserError: (e) => Effect.succeed(`Duplicate: ${e.email}`),
  })
)

// ============================================
// 5. Run and see results
// ============================================

Effect.runPromise(program)
  .then((user) => console.log("Created:", user))
  .catch((error) => console.error("Failed:", error))
```

---

## Define Contracts Upfront with Schema

Define contracts upfront with schema.

### Example

```typescript
import { Schema, Effect, Data } from "effect";

// Define User schema and type
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
});

type User = Schema.Schema.Type<typeof UserSchema>;

// Define error type
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: number;
}> {}

// Create database service implementation
export class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: number) =>
      id === 1
        ? Effect.succeed({ id: 1, name: "John" })
        : Effect.fail(new UserNotFound({ id })),
  }),
}) {}

// Create a program that demonstrates schema and error handling
const program = Effect.gen(function* () {
  const db = yield* Database;

  // Try to get an existing user
  yield* Effect.logInfo("Looking up user 1...");
  const user1 = yield* db.getUser(1);
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user1)}`);

  // Try to get a non-existent user
  yield* Effect.logInfo("\nLooking up user 999...");
  yield* Effect.logInfo("Attempting to get user 999...");
  yield* Effect.gen(function* () {
    const user = yield* db.getUser(999);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof UserNotFound) {
        return Effect.logInfo(`Error: User with id ${error.id} not found`);
      }
      return Effect.logInfo(`Unexpected error: ${error}`);
    })
  );

  // Try to decode invalid data
  yield* Effect.logInfo("\nTrying to decode invalid user data...");
  const invalidUser = { id: "not-a-number", name: 123 } as any;
  yield* Effect.gen(function* () {
    const user = yield* Schema.decode(UserSchema)(invalidUser);
    yield* Effect.logInfo(`Decoded user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Validation failed:\n${JSON.stringify(error, null, 2)}`)
    )
  );
});

// Run the program
Effect.runPromise(Effect.provide(program, Database.Default));
```

**Explanation:**  
Defining schemas upfront clarifies your contracts and ensures both type safety
and runtime validation.

---

## Define Type-Safe Errors with Data.TaggedError

Define type-safe errors with Data.TaggedError.

### Example

```typescript
import { Data, Effect } from "effect";

// Define our tagged error type
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

// Function that simulates a database error
const findUser = (
  id: number
): Effect.Effect<{ id: number; name: string }, DatabaseError> =>
  Effect.gen(function* () {
    if (id < 0) {
      return yield* Effect.fail(new DatabaseError({ cause: "Invalid ID" }));
    }
    return { id, name: `User ${id}` };
  });

// Create a program that demonstrates error handling
const program = Effect.gen(function* () {
  // Try to find a valid user
  yield* Effect.logInfo("Looking up user 1...");
  yield* Effect.gen(function* () {
    const user = yield* findUser(1);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Error finding user: ${error._tag} - ${error.cause}`)
    )
  );

  // Try to find an invalid user
  yield* Effect.logInfo("\nLooking up user -1...");
  yield* Effect.gen(function* () {
    const user = yield* findUser(-1);
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);
  }).pipe(
    Effect.catchTag("DatabaseError", (error) =>
      Effect.logInfo(`Database error: ${error._tag} - ${error.cause}`)
    )
  );
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**  
Tagged errors allow you to handle errors in a type-safe, self-documenting way.

---

## Distinguish 'Not Found' from Errors

Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Example

This function to find a user can fail if the database is down, or it can succeed but find no user. The return type `Effect.Effect<Option.Option<User>, DatabaseError>` makes this contract perfectly clear.

```typescript
import { Effect, Option, Data } from "effect";

interface User {
  id: number;
  name: string;
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
      catch: () => new DatabaseError(),
    });

    // We wrap the potentially null result in an Option
    return Option.fromNullable(dbResult);
  });

// The caller can now handle all three cases explicitly.
const program = (id: number) =>
  findUserInDb(id).pipe(
    Effect.flatMap((maybeUser) =>
      Option.match(maybeUser, {
        onNone: () =>
          Effect.logInfo(`Result: User with ID ${id} was not found.`),
        onSome: (user) => Effect.logInfo(`Result: Found user ${user.name}.`),
      })
    ),
    Effect.catchAll((error) =>
      Effect.logInfo("Error: Could not connect to the database.")
    )
  );

// Run the program with different IDs
Effect.runPromise(
  Effect.gen(function* () {
    // Try with existing user
    yield* Effect.logInfo("Looking for user with ID 1...");
    yield* program(1);

    // Try with non-existent user
    yield* Effect.logInfo("\nLooking for user with ID 2...");
    yield* program(2);
  })
);
```

---

## Handle Missing Values with Option

Use Option instead of null/undefined to make missing values explicit and type-safe.

### Example

```typescript
import { Option, Effect } from "effect"

// ============================================
// 1. Creating Options
// ============================================

// Some - a value is present
const hasValue = Option.some(42)

// None - no value
const noValue = Option.none<number>()

// From nullable - null/undefined becomes None
const fromNull = Option.fromNullable(null)        // None
const fromValue = Option.fromNullable("hello")    // Some("hello")

// ============================================
// 2. Checking and extracting values
// ============================================

const maybeUser = Option.some({ name: "Alice", age: 30 })

// Check if value exists
if (Option.isSome(maybeUser)) {
  console.log(`User: ${maybeUser.value.name}`)
}

// Get with default
const name = Option.getOrElse(
  Option.map(maybeUser, u => u.name),
  () => "Anonymous"
)

// ============================================
// 3. Transforming Options
// ============================================

const maybeNumber = Option.some(5)

// Map - transform the value if present
const doubled = Option.map(maybeNumber, n => n * 2)  // Some(10)

// FlatMap - chain operations that return Option
const safeDivide = (a: number, b: number): Option.Option<number> =>
  b === 0 ? Option.none() : Option.some(a / b)

const result = Option.flatMap(maybeNumber, n => safeDivide(10, n))  // Some(2)

// ============================================
// 4. Domain modeling example
// ============================================

interface User {
  readonly id: string
  readonly name: string
  readonly email: Option.Option<string>  // Email is optional
  readonly phone: Option.Option<string>  // Phone is optional
}

const createUser = (name: string): User => ({
  id: crypto.randomUUID(),
  name,
  email: Option.none(),
  phone: Option.none(),
})

const addEmail = (user: User, email: string): User => ({
  ...user,
  email: Option.some(email),
})

const getContactInfo = (user: User): string => {
  const email = Option.getOrElse(user.email, () => "no email")
  const phone = Option.getOrElse(user.phone, () => "no phone")
  return `${user.name}: ${email}, ${phone}`
}

// ============================================
// 5. Use in Effects
// ============================================

const findUser = (id: string): Effect.Effect<Option.Option<User>> =>
  Effect.succeed(
    id === "123"
      ? Option.some({ id, name: "Alice", email: Option.none(), phone: Option.none() })
      : Option.none()
  )

const program = Effect.gen(function* () {
  const maybeUser = yield* findUser("123")

  if (Option.isSome(maybeUser)) {
    yield* Effect.log(`Found: ${maybeUser.value.name}`)
  } else {
    yield* Effect.log("User not found")
  }
})

Effect.runPromise(program)
```

---

## Model Optional Values Safely with Option

Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

### Example

A function that looks for a user in a database is a classic use case. It might find a user, or it might not. Returning an `Option<User>` makes this contract explicit and safe.

```typescript
import { Effect, Option } from "effect";

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
    })
  );

const program = Effect.gen(function* () {
  yield* Effect.log(greeting(1)); // "Welcome, Paul!"
  yield* Effect.log(greeting(3)); // "User not found."
});

Effect.runPromise(program);
```

---

## Model Validated Domain Types with Brand

Model validated domain types with Brand.

### Example

```typescript
import { Brand, Option } from "effect";

type Email = string & Brand.Brand<"Email">;

const makeEmail = (s: string): Option.Option<Email> =>
  s.includes("@") ? Option.some(s as Email) : Option.none();

// A function can now trust that its input is a valid email.
const sendEmail = (email: Email, body: string) => {
  /* ... */
};
```

**Explanation:**  
Branding ensures that only validated values are used, reducing bugs and
repetitive checks.

---

## Modeling Validated Domain Types with Brand

Use Brand to define types like Email, UserId, or PositiveInt, ensuring only valid values can be constructed and used.

### Example

```typescript
import { Brand } from "effect";

// Define a branded type for Email
type Email = string & Brand.Brand<"Email">;

// Function that only accepts Email, not any string
function sendWelcome(email: Email) {
  // ...
}

// Constructing an Email value (unsafe, see next pattern for validation)
const email = "user@example.com" as Email;

sendWelcome(email); // OK
// sendWelcome("not-an-email"); // Type error! (commented to allow compilation)
```

**Explanation:**

- `Brand.Branded<T, Name>` creates a new type that is distinct from its base type.
- Only values explicitly branded as `Email` can be used where an `Email` is required.
- This prevents accidental mixing of domain types.

---

## Parse and Validate Data with Schema.decode

Parse and validate data with Schema.decode.

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

---

## Transform Data During Validation with Schema

Use Schema.transform to safely convert data types during the validation and parsing process.

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
  timestamp: Schema.String,
});

// Example input
const rawInput: RawEvent = {
  name: "User Login",
  timestamp: "2025-06-22T20:08:42.000Z",
};

// Parse and transform
const program = Effect.gen(function* () {
  const parsed = yield* Schema.decode(ApiEventSchema)(rawInput);
  return {
    name: parsed.name,
    timestamp: new Date(parsed.timestamp),
  } as ParsedEvent;
});

const programWithLogging = Effect.gen(function* () {
  try {
    const event = yield* program;
    yield* Effect.log(`Event year: ${event.timestamp.getFullYear()}`);
    yield* Effect.log(`Full event: ${JSON.stringify(event, null, 2)}`);
    return event;
  } catch (error) {
    yield* Effect.logError(`Failed to parse event: ${error}`);
    throw error;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
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
    (email) => Either.right(email)
  )
);

const result = Schema.decode(Email)("paul@example.com"); // Succeeds
const errorResult = Schema.decode(Email)("invalid-email"); // Fails
```

---

---

## Use Effect.gen for Business Logic

Use Effect.gen for business logic.

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
    const timestamp = yield* Effect.sync(() => Date.now());
    const hashed = `hashed_${pw}_${timestamp}`;
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

const createUser = (
  userData: any
): Effect.Effect<{ id: number; email: string }, Error, never> =>
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

---

## Validating and Parsing Branded Types

Combine Schema and Brand to validate and parse branded types, guaranteeing only valid domain values are created at runtime.

### Example

```typescript
import { Brand, Effect, Schema } from "effect";

// Define a branded type for Email
type Email = string & Brand.Brand<"Email">;

// Create a Schema for Email validation
const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/), // Simple email regex
  Schema.brand("Email" as const) // Attach the brand
);

// Parse and validate an email at runtime
const parseEmail = (input: string) =>
  Effect.try({
    try: () => Schema.decodeSync(EmailSchema)(input),
    catch: (err) => `Invalid email: ${String(err)}`,
  });

// Usage
parseEmail("user@example.com").pipe(
  Effect.match({
    onSuccess: (email) => console.log("Valid email:", email),
    onFailure: (err) => console.error(err),
  })
);
```

**Explanation:**

- `Schema` is used to define validation logic for the branded type.
- `Brand.schema<Email>()` attaches the brand to the schema, so only validated values can be constructed as `Email`.
- This pattern ensures both compile-time and runtime safety.

---

## Your First Domain Model

Start domain modeling by defining clear interfaces for your business entities.

### Example

```typescript
import { Effect } from "effect"

// ============================================
// 1. Define domain entities as interfaces
// ============================================

interface User {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly createdAt: Date
}

interface Product {
  readonly sku: string
  readonly name: string
  readonly price: number
  readonly inStock: boolean
}

interface Order {
  readonly id: string
  readonly userId: string
  readonly items: ReadonlyArray<OrderItem>
  readonly total: number
  readonly status: OrderStatus
}

interface OrderItem {
  readonly productSku: string
  readonly quantity: number
  readonly unitPrice: number
}

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered"

// ============================================
// 2. Create domain functions
// ============================================

const createUser = (email: string, name: string): User => ({
  id: crypto.randomUUID(),
  email,
  name,
  createdAt: new Date(),
})

const calculateOrderTotal = (items: ReadonlyArray<OrderItem>): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

// ============================================
// 3. Use in Effect programs
// ============================================

const program = Effect.gen(function* () {
  const user = createUser("alice@example.com", "Alice")
  yield* Effect.log(`Created user: ${user.name}`)

  const items: OrderItem[] = [
    { productSku: "WIDGET-001", quantity: 2, unitPrice: 29.99 },
    { productSku: "GADGET-002", quantity: 1, unitPrice: 49.99 },
  ]

  const order: Order = {
    id: crypto.randomUUID(),
    userId: user.id,
    items,
    total: calculateOrderTotal(items),
    status: "pending",
  }

  yield* Effect.log(`Order total: $${order.total.toFixed(2)}`)
  return order
})

Effect.runPromise(program)
```

---

