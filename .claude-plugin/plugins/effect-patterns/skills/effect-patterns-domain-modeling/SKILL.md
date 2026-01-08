---
name: effect-patterns-domain-modeling
description: Effect-TS patterns for Domain Modeling. Use when working with domain modeling in Effect-TS applications.
---
# Effect-TS Patterns: Domain Modeling
This skill provides 15 curated Effect-TS patterns for domain modeling.
Use this skill when working on tasks related to:
- domain modeling
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Create Type-Safe Errors

**Rule:** Use Data.TaggedError to create typed, distinguishable errors for your domain.

**Good Example:**

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

**Rationale:**

Create domain-specific errors using `Data.TaggedError`. Each error type gets a unique `_tag` for pattern matching.

---


Plain `Error` or string messages cause problems:

1. **No type safety** - Can't know what errors a function might throw
2. **Hard to handle** - Matching on error messages is fragile
3. **Poor documentation** - Errors aren't part of the function signature

Tagged errors solve this by making errors typed and distinguishable.

---

---

### Handle Missing Values with Option

**Rule:** Use Option instead of null/undefined to make missing values explicit and type-safe.

**Good Example:**

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

**Rationale:**

Use `Option<A>` to represent values that might be absent. This makes "might not exist" explicit in your types, forcing you to handle both cases.

---


`null` and `undefined` cause bugs because:

1. **Silent failures** - Accessing `.property` on null crashes at runtime
2. **Unclear intent** - Is null "not found" or "error"?
3. **Forgotten checks** - Easy to forget `if (x !== null)`

Option fixes this by making absence explicit and type-checked.

---

---

### Your First Domain Model

**Rule:** Start domain modeling by defining clear interfaces for your business entities.

**Good Example:**

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

**Rationale:**

Start by defining TypeScript interfaces that represent your business entities. Use descriptive names that match your domain language.

---


Good domain modeling:

1. **Clarifies intent** - Types document what data means
2. **Prevents errors** - Compiler catches wrong data usage
3. **Enables tooling** - IDE autocompletion and refactoring
4. **Communicates** - Code becomes documentation

---

---


## 🟡 Intermediate Patterns

### Model Optional Values Safely with Option

**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

**Good Example:**

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

**Anti-Pattern:**

The anti-pattern is returning a nullable type (e.g., User | null or User | undefined). This relies on the discipline of every single caller to perform a null check. Forgetting even one check can introduce a runtime error.

```typescript
interface User {
  id: number;
  name: string;
}
const users: User[] = [{ id: 1, name: "Paul" }];

// ❌ WRONG: This function's return type is less safe.
const findUserUnsafely = (id: number): User | undefined => {
  return users.find((u) => u.id === id);
};

const user = findUserUnsafely(3);

// This will throw "TypeError: Cannot read properties of undefined (reading 'name')"
// because the caller forgot to check if the user exists.
console.log(`User's name is ${user.name}`);
```

**Rationale:**

Represent values that may be absent with `Option<A>`. Use `Option.some(value)` to represent a present value and `Option.none()` for an absent one. This creates a container that forces you to handle both possibilities.

---


Functions that can return a value or `null`/`undefined` are a primary source of runtime errors in TypeScript (`Cannot read properties of null`).

The `Option` type solves this by making the possibility of an absent value explicit in the type system. A function that returns `Option<User>` cannot be mistaken for a function that returns `User`. The compiler forces you to handle the `None` case before you can access the value inside a `Some`, eliminating an entire class of bugs.

---

---

### Use Effect.gen for Business Logic

**Rule:** Use Effect.gen for business logic.

**Good Example:**

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

**Anti-Pattern:**

Using long chains of `.andThen` or `.flatMap` for multi-step business logic.
This is harder to read and pass state between steps.

**Rationale:**

Use `Effect.gen` to write your core business logic, especially when it involves
multiple sequential steps or conditional branching.


Generators provide a syntax that closely resembles standard synchronous code
(`async/await`), making complex workflows significantly easier to read, write,
and debug.

---

### Transform Data During Validation with Schema

**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

**Good Example:**

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

**Anti-Pattern:**

Performing validation and transformation in two separate steps. This is more verbose, requires creating intermediate types, and separates the validation logic from the transformation logic.

```typescript
import { Schema, Effect } from "effect";

// ❌ WRONG: Requires an intermediate "Raw" type.
const RawApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String,
});

const rawInput = { name: "User Login", timestamp: "2025-06-22T20:08:42.000Z" };

// The logic is now split into two distinct, less cohesive steps.
const program = Schema.decode(RawApiEventSchema)(rawInput).pipe(
  Effect.map((rawEvent) => ({
    ...rawEvent,
    timestamp: new Date(rawEvent.timestamp), // Manual transformation after parsing.
  }))
);
```

**Rationale:**

To convert data from one type to another as part of the validation process, use `Schema.transform`. This allows you to define a schema that parses an input type (e.g., `string`) and outputs a different, richer domain type (e.g., `Date`).

---


Often, the data you receive from external sources (like an API) isn't in the ideal format for your application's domain model. For example, dates are sent as ISO strings, but you want to work with `Date` objects.

`Schema.transform` integrates this conversion directly into the parsing step. It takes two functions: one to `decode` the input type into the domain type, and one to `encode` it back. This makes your schema the single source of truth for both the shape and the type transformation of your data.

For transformations that can fail (like creating a branded type), you can use `Schema.transformOrFail`, which allows the decoding step to return an `Either`.

---

---

### Define Type-Safe Errors with Data.TaggedError

**Rule:** Define type-safe errors with Data.TaggedError.

**Good Example:**

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

**Anti-Pattern:**

Using generic `Error` objects or strings in the error channel. This loses all
type information, forcing consumers to use `catchAll` and perform unsafe
checks.

**Rationale:**

For any distinct failure mode in your application, define a custom error class
that extends `Data.TaggedError`.


This gives each error a unique, literal `_tag` that Effect can use for type
discrimination with `Effect.catchTag`, making your error handling fully
type-safe.

---

### Define Contracts Upfront with Schema

**Rule:** Define contracts upfront with schema.

**Good Example:**

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

**Anti-Pattern:**

Defining logic with implicit `any` types first and adding validation later as
an afterthought. This leads to brittle code that lacks a clear contract.

**Rationale:**

Before writing implementation logic, define the shape of your data models and
function signatures using `Effect/Schema`.


This "schema-first" approach separates the "what" (the data shape) from the
"how" (the implementation). It provides a single source of truth for both
compile-time static types and runtime validation.

---

### Modeling Validated Domain Types with Brand

**Rule:** Use Brand to define types like Email, UserId, or PositiveInt, ensuring only valid values can be constructed and used.

**Good Example:**

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

**Anti-Pattern:**

Using plain strings or numbers for domain-specific values (like emails, user IDs, or currency codes), which can lead to accidental misuse and bugs that are hard to catch.

**Rationale:**

Use the `Brand` utility to create domain-specific types from primitives like `string` or `number`.  
This prevents accidental misuse and makes illegal states unrepresentable in your codebase.


Branded types add a layer of type safety, ensuring that values like `Email`, `UserId`, or `PositiveInt` are not confused with plain strings or numbers.  
They help you catch bugs at compile time and make your code more self-documenting.

---

### Parse and Validate Data with Schema.decode

**Rule:** Parse and validate data with Schema.decode.

**Good Example:**

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

**Anti-Pattern:**

Using `Schema.parse(schema)(input)`, as it throws an exception. This forces
you to use `try/catch` blocks, which breaks the composability of Effect.

**Rationale:**

When you need to parse or validate data against a `Schema`, use the
`Schema.decode(schema)` function. It takes an `unknown` input and returns an
`Effect`.


Unlike the older `Schema.parse` which throws, `Schema.decode` is fully
integrated into the Effect ecosystem, allowing you to handle validation
failures gracefully with operators like `Effect.catchTag`.

---

### Validating and Parsing Branded Types

**Rule:** Combine Schema and Brand to validate and parse branded types, guaranteeing only valid domain values are created at runtime.

**Good Example:**

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

**Anti-Pattern:**

Branding values without runtime validation, or accepting unvalidated user input as branded types, which can lead to invalid domain values and runtime bugs.

**Rationale:**

Use `Schema` in combination with `Brand` to validate and parse branded types at runtime.  
This ensures that only values passing your validation logic can be constructed as branded types, making your domain models robust and type-safe.


While branding types at the type level prevents accidental misuse, runtime validation is needed to ensure only valid values are constructed from user input, APIs, or external sources.

---

### Avoid Long Chains of .andThen; Use Generators Instead

**Rule:** Prefer generators over long chains of .andThen.

**Good Example:**

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

**Anti-Pattern:**

```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

step1().pipe(Effect.flatMap((a) => step2(a))); // Or .andThen
```

Chaining many `.flatMap` or `.andThen` calls leads to deeply nested,
hard-to-read code.

**Rationale:**

For sequential logic involving more than two steps, prefer `Effect.gen` over
chaining multiple `.andThen` or `.flatMap` calls.


`Effect.gen` provides a flat, linear code structure that is easier to read and
debug than deeply nested functional chains.

---

### Distinguish 'Not Found' from Errors

**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

**Good Example:**

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

**Anti-Pattern:**

A common alternative is to create a specific NotFoundError and put it in the error channel alongside other errors.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError") {}

// ❌ This signature conflates two different kinds of failure.
const findUserUnsafely = (
  id: number
): Effect.Effect<User, DatabaseError | NotFoundError> => {
  // ...
  return Effect.fail(new NotFoundError());
};
```

While this works, it can be less expressive. It treats a "not found" result—which might be a normal part of your application's flow—the same as a catastrophic DatabaseError.

Using `Effect<Option<A>>` often leads to clearer and more precise business logic.

**Rationale:**

When a computation can fail (e.g., a network error) or succeed but find nothing, model its return type as `Effect<Option<A>>`. This separates the "hard failure" channel from the "soft failure" (or empty) channel.

---


This pattern provides a precise way to handle three distinct outcomes of an operation:

1.  **Success with a value:** `Effect.succeed(Option.some(value))`
2.  **Success with no value:** `Effect.succeed(Option.none())` (e.g., user not found)
3.  **Failure:** `Effect.fail(new DatabaseError())` (e.g., database connection lost)

By using `Option` inside the success channel of an `Effect`, you keep the error channel clean for true, unexpected, or unrecoverable errors. The "not found" case is often an expected and recoverable part of your business logic, and `Option.none()` models this perfectly.

---

---

### Model Validated Domain Types with Brand

**Rule:** Model validated domain types with Brand.

**Good Example:**

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

**Anti-Pattern:**

"Primitive obsession"—using raw primitives (`string`, `number`) and performing
validation inside every function that uses them. This is repetitive and
error-prone.

**Rationale:**

For domain primitives that have specific rules (e.g., a valid email), create a
Branded Type. This ensures a value can only be created after passing a
validation check.


This pattern moves validation to the boundaries of your system. Once a value
has been branded, the rest of your application can trust that it is valid,
eliminating repetitive checks.

---

### Accumulate Multiple Errors with Either

**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

**Good Example:**

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

**Anti-Pattern:**

Using `Effect`'s error channel for validation that requires multiple error messages. The code below will only ever report the first error it finds, because `Effect.fail` short-circuits the entire `Effect.gen` block.

```typescript
import { Effect } from "effect";

const validateWithEffect = (input: { name: string; email: string }) =>
  Effect.gen(function* () {
    if (input.name.length < 3) {
      // The program will fail here and never check the email.
      return yield* Effect.fail("Name is too short.");
    }
    if (!input.email.includes("@")) {
      return yield* Effect.fail("Email is invalid.");
    }
    return yield* Effect.succeed(input);
  });
```

**Rationale:**

When you need to perform multiple validation checks and collect all failures, use the `Either<E, A>` data type. `Either` represents a value that can be one of two possibilities: a `Left<E>` (typically for failure) or a `Right<A>` (typically for success).

---


The `Effect` error channel is designed to short-circuit. The moment an `Effect` fails, the entire computation stops and the error is propagated. This is perfect for handling unrecoverable errors like a lost database connection.

However, for tasks like validating a user's input, this is poor user experience. You want to show the user all of their mistakes at once.

`Either` is the solution. Since it's a pure data structure, you can run multiple checks that each return an `Either`, and then combine the results to accumulate all the `Left` (error) values. The `Effect/Schema` module uses this pattern internally to provide powerful error accumulation.

---

---


