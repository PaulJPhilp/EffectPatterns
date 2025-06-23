# Effect Coding Rules for AI (Cursor)

This document lists key architectural and style rules for our Effect-TS codebase. Use these as guidelines when generating or refactoring code.

--- (Pattern Start: access-config-in-context) ---

## Access Configuration from the Context

**Rule:** Access configuration from the Effect context.

### Full Pattern Content:

# Access Configuration from the Context

## Guideline

Inside an `Effect.gen` block, use `yield*` on your `Config` object to access the resolved, type-safe configuration values from the context.

## Rationale

This allows your business logic to declaratively state its dependency on a piece of configuration. The logic is clean, type-safe, and completely decoupled from *how* the configuration is provided.

## Good Example

```typescript
import { Config, Effect } from "effect";

const ServerConfig = Config.all({
  host: Config.string("HOST"),
  port: Config.number("PORT"),
});

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});
```

**Explanation:**  
By yielding the config object, you make your dependency explicit and leverage Effect's context system for testability and modularity.

## Anti-Pattern

Passing configuration values down through multiple function arguments ("prop-drilling"). This is cumbersome and obscures which components truly need which values.

--- (Pattern Start: avoid-long-andthen-chains) ---

## Avoid Long Chains of .andThen; Use Generators Instead

**Rule:** Prefer generators over long chains of .andThen.

### Full Pattern Content:

# Avoid Long Chains of .andThen; Use Generators Instead

## Guideline

For sequential logic involving more than two steps, prefer `Effect.gen` over
chaining multiple `.andThen` or `.flatMap` calls.

## Rationale

`Effect.gen` provides a flat, linear code structure that is easier to read and
debug than deeply nested functional chains.

## Good Example

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

## Anti-Pattern

```typescript
import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

step1().pipe(Effect.flatMap((a) => step2(a))); // Or .andThen
```

Chaining many `.flatMap` or `.andThen` calls leads to deeply nested,
hard-to-read code.

--- (Pattern Start: control-flow-with-combinators) ---

## Control Flow with Conditional Combinators

**Rule:** Use conditional combinators for control flow.

### Full Pattern Content:

# Control Flow with Conditional Combinators

## Guideline

Use declarative combinators like `Effect.if`, `Effect.when`, and
`Effect.unless` to execute effects based on runtime conditions.

## Rationale

These combinators allow you to embed conditional logic directly into your
`.pipe()` compositions, maintaining a declarative style for simple branching.

## Good Example

```typescript
import { Effect } from "effect";

const attemptAdminAction = (user: { isAdmin: boolean }) =>
  Effect.if(user.isAdmin, {
    onTrue: Effect.succeed("Admin action completed."),
    onFalse: Effect.fail("Permission denied."),
  });
```

**Explanation:**  
`Effect.if` and related combinators allow you to branch logic without leaving
the Effect world or breaking the flow of composition.

## Anti-Pattern

Using `Effect.gen` for a single, simple conditional check can be more verbose
than necessary. For simple branching, `Effect.if` is often more concise.

--- (Pattern Start: create-managed-runtime-for-scoped-resources) ---

## Create a Managed Runtime for Scoped Resources

**Rule:** Create a managed runtime for scoped resources.

### Full Pattern Content:

# Create a Managed Runtime for Scoped Resources

## Guideline

For services that manage resources needing explicit cleanup (e.g., a database
connection), define them in a `Layer` using `Layer.scoped`. Then, use
`Layer.launch` to provide this layer to your application.

## Rationale

`Layer.launch` is designed for resource safety. It acquires all resources,
provides them to your effect, and—crucially—guarantees that all registered
finalizers are executed upon completion or interruption.

## Good Example

```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Tag("DbPool")<DatabasePool, any> {}

const DatabaseLive = Layer.scoped(
  DatabasePool,
  Effect.acquireRelease(
    Effect.log("Acquiring pool"),
    () => Effect.log("Releasing pool"),
  ),
);

const launchedApp = Layer.launch(
  Effect.provide(Effect.log("Using DB"), DatabaseLive)
);

Effect.runPromise(launchedApp);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.

## Anti-Pattern

Do not use `Layer.toRuntime` with layers that contain scoped resources. This
will acquire the resource, but the runtime has no mechanism to release it,
leading to resource leaks.

--- (Pattern Start: create-reusable-runtime-from-layers) ---

## Create a Reusable Runtime from Layers

**Rule:** Create a reusable runtime from layers.

### Full Pattern Content:

# Create a Reusable Runtime from Layers

## Guideline

For applications that need to run multiple effects (e.g., a web server), use
`Layer.toRuntime(appLayer)` to compile your dependency graph into a single,
reusable `Runtime` object.

## Rationale

Building the dependency graph from layers has a one-time cost. Creating a
`Runtime` once when your application starts is highly efficient for
long-running applications.

## Good Example

```typescript
import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Tag("Greeter")<GreeterService, any> {}
const GreeterLive = Layer.succeed(GreeterService, {});

const runtime = Layer.toRuntime(GreeterLive);
const run = Runtime.runPromise(runtime);

// In a server, you would reuse `run` for every request.
run(Effect.log("Hello"));
```

**Explanation:**  
By compiling your layers into a Runtime once, you avoid rebuilding the
dependency graph for every effect execution.

## Anti-Pattern

For a long-running application, avoid providing layers and running an effect
in a single operation. This forces Effect to rebuild the dependency graph on
every execution.

--- (Pattern Start: create-pre-resolved-effect) ---

## Create Pre-resolved Effects with succeed and fail

**Rule:** Create pre-resolved effects with succeed and fail.

### Full Pattern Content:

# Create Pre-resolved Effects with succeed and fail

## Guideline

To lift a pure, already-known value into an `Effect`, use `Effect.succeed()`.
To represent an immediate and known failure, use `Effect.fail()`.

## Rationale

These are the simplest effect constructors, essential for returning static
values within functions that must return an `Effect`.

## Good Example

```typescript
import { Effect, Data } from "effect";

const successEffect = Effect.succeed(42);

class MyError extends Data.TaggedError("MyError") {}
const failureEffect = Effect.fail(new MyError());
```

**Explanation:**  
Use `Effect.succeed` for values you already have, and `Effect.fail` for
immediate, known errors.

## Anti-Pattern

Do not wrap a static value in `Effect.sync`. While it works, `Effect.succeed`
is more descriptive and direct for values that are already available.

--- (Pattern Start: define-config-schema) ---

## Define a Type-Safe Configuration Schema

**Rule:** Define a type-safe configuration schema.

### Full Pattern Content:

# Define a Type-Safe Configuration Schema

## Guideline

Define all external configuration values your application needs using the schema-building functions from `Effect.Config`, such as `Config.string` and `Config.number`.

## Rationale

This creates a single, type-safe source of truth for your configuration, eliminating runtime errors from missing or malformed environment variables and making the required configuration explicit.

## Good Example

```typescript
import { Config } from "effect";

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  }),
);
```

**Explanation:**  
This schema ensures that both `host` and `port` are present and properly typed, and that their source is clearly defined.

## Anti-Pattern

Directly accessing `process.env`. This is not type-safe, scatters configuration access throughout your codebase, and can lead to parsing errors or `undefined` values.

--- (Pattern Start: define-contracts-with-schema) ---

## Define Contracts Upfront with Schema

**Rule:** Define contracts upfront with schema.

### Full Pattern Content:

# Define Contracts Upfront with Schema

## Guideline

Before writing implementation logic, define the shape of your data models and
function signatures using `Effect/Schema`.

## Rationale

This "schema-first" approach separates the "what" (the data shape) from the
"how" (the implementation). It provides a single source of truth for both
compile-time static types and runtime validation.

## Good Example

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

## Anti-Pattern

Defining logic with implicit `any` types first and adding validation later as
an afterthought. This leads to brittle code that lacks a clear contract.

--- (Pattern Start: define-tagged-errors) ---

## Define Type-Safe Errors with Data.TaggedError

**Rule:** Define type-safe errors with Data.TaggedError.

### Full Pattern Content:

# Define Type-Safe Errors with Data.TaggedError

## Guideline

For any distinct failure mode in your application, define a custom error class
that extends `Data.TaggedError`.

## Rationale

This gives each error a unique, literal `_tag` that Effect can use for type
discrimination with `Effect.catchTag`, making your error handling fully
type-safe.

## Good Example

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

## Anti-Pattern

Using generic `Error` objects or strings in the error channel. This loses all
type information, forcing consumers to use `catchAll` and perform unsafe
checks.

--- (Pattern Start: distinguish-not-found-from-errors) ---

## Distinguish 'Not Found' from Errors

**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

### Full Pattern Content:

## Guideline

When a computation can fail (e.g., a network error) or succeed but find nothing, model its return type as `Effect<Option<A>>`. This separates the "hard failure" channel from the "soft failure" (or empty) channel.

---

## Rationale

This pattern provides a precise way to handle three distinct outcomes of an operation:

1.  **Success with a value:** `Effect.succeed(Option.some(value))`
2.  **Success with no value:** `Effect.succeed(Option.none())` (e.g., user not found)
3.  **Failure:** `Effect.fail(new DatabaseError())` (e.g., database connection lost)

By using `Option` inside the success channel of an `Effect`, you keep the error channel clean for true, unexpected, or unrecoverable errors. The "not found" case is often an expected and recoverable part of your business logic, and `Option.none()` models this perfectly.

---

## Good Example

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

## Anti-Pattern

A common alternative is to create a specific NotFoundError and put it in the error channel alongside other errors.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError") {}
	
	// ❌ This signature conflates two different kinds of failure.
	const findUserUnsafely = (
	  id: number,
	): Effect.Effect<User, DatabaseError | NotFoundError> => {
	  // ...
	  return Effect.fail(new NotFoundError());
	};
```

While this works, it can be less expressive. It treats a "not found" result—which might be a normal part of your application's flow—the same as a catastrophic DatabaseError. 

Using `Effect<Option<A>>` often leads to clearer and more precise business logic.

--- (Pattern Start: execute-with-runpromise) ---

## Execute Asynchronous Effects with Effect.runPromise

**Rule:** Execute asynchronous effects with Effect.runPromise.

### Full Pattern Content:

# Execute Asynchronous Effects with Effect.runPromise

## Guideline

To execute an `Effect` that may be asynchronous and retrieve its result, use
`Effect.runPromise`. This should only be done at the outermost layer of your
application.

## Rationale

`Effect.runPromise` is the bridge from the Effect world to the Promise-based
world of Node.js and browsers. If the Effect succeeds, the Promise resolves;
if it fails, the Promise rejects.

## Good Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(
  Effect.delay("1 second"),
);

const promise = Effect.runPromise(program);

promise.then(console.log); // Logs "Hello, World!" after 1 second.
```

**Explanation:**  
`Effect.runPromise` executes your effect and returns a Promise, making it
easy to integrate with existing JavaScript async workflows.

## Anti-Pattern

Never call `runPromise` inside another `Effect` composition. Effects are
meant to be composed together *before* being run once at the end.

--- (Pattern Start: execute-with-runsync) ---

## Execute Synchronous Effects with Effect.runSync

**Rule:** Execute synchronous effects with Effect.runSync.

### Full Pattern Content:

# Execute Synchronous Effects with Effect.runSync

## Guideline

To execute an `Effect` that is guaranteed to be synchronous, use
`Effect.runSync`. This will return the success value directly or throw the
error.

## Rationale

`Effect.runSync` is an optimized runner for Effects that don't involve any
asynchronous operations. If the Effect contains any async operations,
`runSync` will throw an error.

## Good Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed(10).pipe(Effect.map((n) => n * 2));

const result = Effect.runSync(program); // result is 20
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

## Anti-Pattern

Do not use `runSync` on an Effect that contains asynchronous operations like
`Effect.delay` or `Effect.promise`. This will result in a runtime error.

--- (Pattern Start: handle-errors-with-catch) ---

## Handle Errors with catchTag, catchTags, and catchAll

**Rule:** Handle errors with catchTag, catchTags, and catchAll.

### Full Pattern Content:

# Handle Errors with catchTag, catchTags, and catchAll

## Guideline

To recover from failures, use the `catch*` family of functions.
`Effect.catchTag` for specific tagged errors, `Effect.catchTags` for multiple,
and `Effect.catchAll` for any error.

## Rationale

Effect's structured error handling allows you to build resilient applications.
By using tagged errors and `catchTag`, you can handle different failure
scenarios with different logic in a type-safe way.

## Good Example

```typescript
import { Data, Effect } from "effect";

class FooError extends Data.TaggedError("FooError") {}

const program: Effect.Effect<string, FooError> = Effect.fail(new FooError());

const handled = program.pipe(
  Effect.catchTag("FooError", (error) => Effect.succeed("Caught a Foo!")),
);
```

**Explanation:**  
Use `catchTag` to handle specific error types in a type-safe, composable way.

## Anti-Pattern

Using `try/catch` blocks inside your Effect compositions. It breaks the
declarative flow and bypasses Effect's powerful, type-safe error channels.

--- (Pattern Start: handle-unexpected-errors-with-cause) ---

## Handle Unexpected Errors by Inspecting the Cause

**Rule:** Handle unexpected errors by inspecting the cause.

### Full Pattern Content:

# Handle Unexpected Errors by Inspecting the Cause

## Guideline

To build truly resilient applications, differentiate between known business
errors (`Fail`) and unknown defects (`Die`). Use `Effect.catchAllCause` to
inspect the full `Cause` of a failure.

## Rationale

The `Cause` object explains *why* an effect failed. A `Fail` is an expected
error (e.g., `ValidationError`). A `Die` is an unexpected defect (e.g., a
thrown exception). They should be handled differently.

## Good Example

```typescript
import { Cause, Effect } from "effect";

const programThatDies = Effect.sync(() => { throw new Error("bug!") });

const handled = programThatDies.pipe(
  Effect.catchAllCause((cause) => {
    if (Cause.isDie(cause)) {
      return Effect.logFatal("Caught a defect!", cause);
    }
    return Effect.failCause(cause);
  }),
);
```

**Explanation:**  
By inspecting the `Cause`, you can distinguish between expected and unexpected
failures, logging or escalating as appropriate.

## Anti-Pattern

Using a simple `Effect.catchAll` can dangerously conflate expected errors and
unexpected defects, masking critical bugs as recoverable errors.

--- (Pattern Start: leverage-structured-logging) ---

## Leverage Effect's Built-in Structured Logging

**Rule:** Leverage Effect's built-in structured logging.

### Full Pattern Content:

# Leverage Effect's Built-in Structured Logging

## Guideline

Use the built-in `Effect.log*` family of functions for all application logging
instead of using `console.log`.

## Rationale

Effect's logger is structured, context-aware (with trace IDs), configurable
via `Layer`, and testable. It's a first-class citizen, not an unmanaged
side-effect.

## Good Example

```typescript
import { Effect, Layer, Logger } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 });

// In production, this log might be hidden by default.
// To enable it, provide a Layer.
const DebugLayer = Logger.withMinimumLogLevel(Logger.Level.Debug);
const runnable = Effect.provide(program, DebugLayer);
```

**Explanation:**  
Using Effect's logging system ensures your logs are structured, filterable,
and context-aware.

## Anti-Pattern

Calling `console.log` directly within an Effect composition. This is an
unmanaged side-effect that bypasses all the benefits of Effect's logging system.

--- (Pattern Start: model-dependencies-as-services) ---

## Model Dependencies as Services

**Rule:** Model dependencies as services.

### Full Pattern Content:

# Model Dependencies as Services

## Guideline

Represent any external dependency or distinct capability—from a database client to a simple UUID generator—as a service.

## Rationale

This pattern is the key to testability. It allows you to provide a `Live` implementation in production and a `Test` implementation (returning mock data) in your tests, making your code decoupled and reliable.

## Good Example

```typescript
import { Effect, Layer } from "effect";

class Random extends Effect.Tag("Random")<Random, { readonly next: Effect.Effect<number> }> {}

// For production
const RandomLive = Layer.succeed(Random, { next: Effect.sync(() => Math.random()) });

// For testing
const RandomTest = Layer.succeed(Random, { next: Effect.succeed(0.5) });
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

## Anti-Pattern

Directly calling external APIs like `fetch` or using impure functions like `Math.random()` within your business logic. This tightly couples your logic to a specific implementation and makes it difficult to test.

--- (Pattern Start: model-optional-values-with-option) ---

## Model Optional Values Safely with Option

**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

### Full Pattern Content:

## Guideline

Represent values that may be absent with `Option<A>`. Use `Option.some(value)` to represent a present value and `Option.none()` for an absent one. This creates a container that forces you to handle both possibilities.

---

## Rationale

Functions that can return a value or `null`/`undefined` are a primary source of runtime errors in TypeScript (`Cannot read properties of null`).

The `Option` type solves this by making the possibility of an absent value explicit in the type system. A function that returns `Option<User>` cannot be mistaken for a function that returns `User`. The compiler forces you to handle the `None` case before you can access the value inside a `Some`, eliminating an entire class of bugs.

---

## Good Example

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

## Anti-Pattern

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
	console.log(`User's name is ${user.name}`)
  ```

--- (Pattern Start: model-validated-domain-types-with-brand) ---

## Model Validated Domain Types with Brand

**Rule:** Model validated domain types with Brand.

### Full Pattern Content:

# Model Validated Domain Types with Brand

## Guideline

For domain primitives that have specific rules (e.g., a valid email), create a
Branded Type. This ensures a value can only be created after passing a
validation check.

## Rationale

This pattern moves validation to the boundaries of your system. Once a value
has been branded, the rest of your application can trust that it is valid,
eliminating repetitive checks.

## Good Example

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

## Anti-Pattern

"Primitive obsession"—using raw primitives (`string`, `number`) and performing
validation inside every function that uses them. This is repetitive and
error-prone.

--- (Pattern Start: parse-with-schema-decode) ---

## Parse and Validate Data with Schema.decode

**Rule:** Parse and validate data with Schema.decode.

### Full Pattern Content:

# Parse and Validate Data with Schema.decode

## Guideline

When you need to parse or validate data against a `Schema`, use the
`Schema.decode(schema)` function. It takes an `unknown` input and returns an
`Effect`.

## Rationale

Unlike the older `Schema.parse` which throws, `Schema.decode` is fully
integrated into the Effect ecosystem, allowing you to handle validation
failures gracefully with operators like `Effect.catchTag`.

## Good Example

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

## Anti-Pattern

Using `Schema.parse(schema)(input)`, as it throws an exception. This forces
you to use `try/catch` blocks, which breaks the composability of Effect.

--- (Pattern Start: provide-config-layer) ---

## Provide Configuration to Your App via a Layer

**Rule:** Provide configuration to your app via a Layer.

### Full Pattern Content:

# Provide Configuration to Your App via a Layer

## Guideline

Transform your configuration schema into a `Layer` using `Config.layer()` and provide it to your main application `Effect`.

## Rationale

Integrating configuration as a `Layer` plugs it directly into Effect's dependency injection system. This makes your configuration available anywhere in the program and dramatically simplifies testing by allowing you to substitute mock configuration.

## Good Example

```typescript
import { Config, Effect, Layer } from "effect";

const ServerConfig = Config.all({ port: Config.number("PORT") });

const program = Effect.log("Application starting...");

const configLayer = Config.layer(ServerConfig);

const runnable = Effect.provide(program, configLayer);
```

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.

## Anti-Pattern

Manually reading environment variables deep inside business logic. This tightly couples that logic to the external environment, making it difficult to test and reuse.

--- (Pattern Start: setup-new-project) ---

## Set Up a New Effect Project

**Rule:** Set up a new Effect project.

### Full Pattern Content:

# Set Up a New Effect Project

## Guideline

To start a new Effect project, initialize a standard Node.js project, add
`effect` and `typescript` as dependencies, and create a `tsconfig.json` file
with strict mode enabled.

## Rationale

A proper setup is crucial for leveraging Effect's powerful type-safety
features. Using TypeScript's `strict` mode is non-negotiable.

## Good Example

```typescript
// 1. Init project (e.g., `npm init -y`)
// 2. Install deps (e.g., `npm install effect`, `npm install -D typescript tsx`)
// 3. Create tsconfig.json with `"strict": true`
// 4. Create src/index.ts
import { Effect } from "effect";

const program = Effect.log("Hello, World!");

Effect.runSync(program);

// 5. Run the program (e.g., `npx tsx src/index.ts`)
```

**Explanation:**  
This setup ensures you have TypeScript and Effect ready to go, with strict
type-checking for maximum safety and correctness.

## Anti-Pattern

Avoid disabling `strict` mode in your `tsconfig.json`. Running with
`"strict": false` will cause you to lose many of the type-safety guarantees
that make Effect so powerful.

--- (Pattern Start: transform-effect-values) ---

## Transform Effect Values with map and flatMap

**Rule:** Transform Effect values with map and flatMap.

### Full Pattern Content:

# Transform Effect Values with map and flatMap

## Guideline

To work with the success value of an `Effect`, use `Effect.map` for simple,
synchronous transformations and `Effect.flatMap` for effectful transformations.

## Rationale

`Effect.map` is like `Array.prototype.map`. `Effect.flatMap` is like
`Promise.prototype.then` and is used when your transformation function itself
returns an `Effect`.

## Good Example

```typescript
import { Effect } from "effect";

const getUser = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: "Paul" });

const getPosts = (userId: number): Effect.Effect<{ title: string }[]> =>
  Effect.succeed([{ title: "My First Post" }]);

const userPosts = getUser(123).pipe(
  Effect.flatMap((user) => getPosts(user.id)),
);
```

**Explanation:**  
Use `flatMap` to chain effects that depend on each other, and `map` for
simple value transformations.

## Anti-Pattern

Using `map` when you should be using `flatMap`. This results in a nested
`Effect<Effect<...>>`, which is usually not what you want.

--- (Pattern Start: effects-are-lazy) ---

## Understand that Effects are Lazy Blueprints

**Rule:** Understand that effects are lazy blueprints.

### Full Pattern Content:

# Understand that Effects are Lazy Blueprints

## Guideline

An `Effect` is not a value or a `Promise`. It is a lazy, immutable blueprint
that describes a computation. It does nothing on its own until it is passed to
a runtime executor (e.g., `Effect.runPromise` or `Effect.runSync`).

## Rationale

This laziness is a superpower because it makes your code composable,
predictable, and testable. Unlike a `Promise` which executes immediately,
an `Effect` is just a description of work, like a recipe waiting for a chef.

## Good Example

```typescript
import { Effect } from "effect";

console.log("1. Defining the Effect blueprint...");

const program = Effect.sync(() => {
  console.log("3. The blueprint is now being executed!");
  return 42;
});

console.log("2. The blueprint has been defined. No work has been done yet.");

Effect.runSync(program);
```

**Explanation:**  
Defining an `Effect` does not execute any code inside it. Only when you call
`Effect.runSync(program)` does the computation actually happen.

## Anti-Pattern

Assuming an `Effect` behaves like a `Promise`. A `Promise` executes its work
immediately upon creation. Never expect a side effect to occur just from
defining an `Effect`.

--- (Pattern Start: use-pipe-for-composition) ---

## Use .pipe for Composition

**Rule:** Use .pipe for composition.

### Full Pattern Content:

# Use .pipe for Composition

## Guideline

To apply a sequence of transformations or operations to an `Effect`, use the
`.pipe()` method.

## Rationale

Piping makes code readable and avoids deeply nested function calls. It allows
you to see the flow of data transformations in a clear, linear fashion.

## Good Example

```typescript
import { Effect } from "effect";

const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => `The result is ${n}`),
  Effect.tap(Effect.log),
);
```

**Explanation:**  
Using `.pipe()` allows you to compose operations in a top-to-bottom style,
improving readability and maintainability.

## Anti-Pattern

Nesting function calls manually. This is hard to read and reorder.
`Effect.tap(Effect.map(Effect.map(Effect.succeed(5), n => n * 2), n => ...))`

--- (Pattern Start: use-gen-for-business-logic) ---

## Use Effect.gen for Business Logic

**Rule:** Use Effect.gen for business logic.

### Full Pattern Content:

# Use Effect.gen for Business Logic

## Guideline

Use `Effect.gen` to write your core business logic, especially when it involves
multiple sequential steps or conditional branching.

## Rationale

Generators provide a syntax that closely resembles standard synchronous code
(`async/await`), making complex workflows significantly easier to read, write,
and debug.

## Good Example

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

## Anti-Pattern

Using long chains of `.andThen` or `.flatMap` for multi-step business logic.
This is harder to read and pass state between steps.

--- (Pattern Start: use-default-layer-for-tests) ---

## Use the Auto-Generated .Default Layer in Tests

**Rule:** Use the auto-generated .Default layer in tests.

### Full Pattern Content:

# Use the Auto-Generated .Default Layer in Tests

## Guideline

In your tests, provide service dependencies using the static `.Default` property that `Effect.Service` automatically attaches to your service class.

## Rationale

The `.Default` layer is the canonical way to provide a service in a test environment. It's automatically created, correctly scoped, and handles resolving any transitive dependencies, making tests cleaner and more robust.

## Good Example

```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MyService } from "../MyService";

describe("MyService", () => {
  it("should perform its operation", () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.doSomething();
      expect(result).toBe("done");
    }).pipe(
      Effect.provide(MyService.Default), // ✅ Correct
      Effect.runPromise,
    ));
});
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

## Anti-Pattern

Do not create manual layers for your service in tests (`Layer.succeed(...)`) or try to provide the service class directly. This bypasses the intended dependency injection mechanism.

--- (Pattern Start: wrap-asynchronous-computations) ---

## Wrap Asynchronous Computations with tryPromise

**Rule:** Wrap asynchronous computations with tryPromise.

### Full Pattern Content:

# Wrap Asynchronous Computations with tryPromise

## Guideline

To integrate a `Promise`-based function (like `fetch`), use `Effect.tryPromise`.

## Rationale

This is the standard bridge from the Promise-based world to Effect, allowing
you to leverage the massive `async/await` ecosystem safely.

## Good Example

```typescript
import { Effect } from "effect";

class HttpError extends Effect.Tag("HttpError") {}

const getUrl = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new HttpError(),
  });
```

**Explanation:**  
`Effect.tryPromise` wraps a `Promise`-returning function and safely handles
rejections, moving errors into the Effect's error channel.

## Anti-Pattern

Manually handling `.then()` and `.catch()` inside an `Effect.sync`. This is
verbose, error-prone, and defeats the purpose of using Effect's built-in
Promise integration.

--- (Pattern Start: wrap-synchronous-computations) ---

## Wrap Synchronous Computations with sync and try

**Rule:** Wrap synchronous computations with sync and try.

### Full Pattern Content:

# Wrap Synchronous Computations with sync and try

## Guideline

To bring a synchronous side-effect into Effect, wrap it in a thunk (`() => ...`).
Use `Effect.sync` for functions guaranteed not to throw, and `Effect.try` for
functions that might throw.

## Rationale

This is the primary way to safely integrate with synchronous libraries like
`JSON.parse`. `Effect.try` captures any thrown exception and moves it into
the Effect's error channel.

## Good Example

```typescript
import { Effect } from "effect";

const randomNumber = Effect.sync(() => Math.random());

const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new Error(`JSON parsing failed: ${error}`),
  });
```

**Explanation:**  
Use `Effect.sync` for safe synchronous code, and `Effect.try` to safely
handle exceptions from potentially unsafe code.

## Anti-Pattern

Never use `Effect.sync` for an operation that could throw, like `JSON.parse`.
This can lead to unhandled exceptions that crash your application.

--- (Pattern Start: write-sequential-code-with-gen) ---

## Write Sequential Code with Effect.gen

**Rule:** Write sequential code with Effect.gen.

### Full Pattern Content:

# Write Sequential Code with Effect.gen

## Guideline

For sequential operations that depend on each other, use `Effect.gen` to write
your logic in a familiar, imperative style. It's the Effect-native equivalent
of `async/await`.

## Rationale

`Effect.gen` uses generator functions to create a flat, linear, and highly
readable sequence of operations, avoiding the nested "callback hell" of
`flatMap`.

## Good Example

```typescript
import { Effect } from "effect";

const getPostsWithGen = Effect.gen(function* () {
  const response = yield* Effect.tryPromise(() => fetch("..."));
  const user = yield* Effect.tryPromise(() => response.json() as Promise<any>);
  // ... more steps
  return user;
});
```

**Explanation:**  
`Effect.gen` allows you to write top-to-bottom code that is easy to read and
maintain, even when chaining many asynchronous steps.

## Anti-Pattern

Deeply nesting `flatMap` calls. This is much harder to read and maintain than
the equivalent `Effect.gen` block.

--- (Pattern Start: write-tests-that-adapt-to-application-code) ---

## Write Tests That Adapt to Application Code

**Rule:** Write tests that adapt to application code.

### Full Pattern Content:

# Write Tests That Adapt to Application Code

## Guideline

Tests are secondary artifacts that serve to validate the application. The application's code and interfaces are the source of truth. When a test fails, fix the test's logic or setup, not the production code.

## Rationale

Treating application code as immutable during testing prevents the introduction of bugs and false test confidence. The goal of a test is to verify real-world behavior; changing that behavior to suit the test invalidates its purpose.

## Good Example

```typescript
// 1. Read the actual service interface first.
export interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// 2. Write a test that correctly invokes that interface.
it("should return a user", () =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const result = yield* Effect.either(db.getUserById(123));
    // ... assertions
  }).pipe(Effect.provide(DatabaseService.Default), Effect.runPromise));
```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

## Anti-Pattern

Any action where the test dictates a change to the application code. Do not modify a service file to add a method just because a test needs it. If a test fails, fix the test.

