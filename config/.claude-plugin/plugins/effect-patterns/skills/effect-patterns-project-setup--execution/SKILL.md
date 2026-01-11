---
name: effect-patterns-project-setup--execution
description: Effect-TS patterns for Project Setup  Execution. Use when working with project setup  execution in Effect-TS applications.
---
# Effect-TS Patterns: Project Setup  Execution
This skill provides 4 curated Effect-TS patterns for project setup  execution.
Use this skill when working on tasks related to:
- project setup  execution
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Execute Synchronous Effects with Effect.runSync

**Rule:** Execute synchronous effects with Effect.runSync.

**Good Example:**

```typescript
import { Effect } from "effect";

// Simple synchronous program
const program1 = Effect.gen(function* () {
  const n = 10;
  const result = n * 2;
  yield* Effect.log(`Simple program result: ${result}`);
  return result;
});

// Run simple program
Effect.runSync(program1);

// Program with logging
const program2 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting calculation...");
  const n = yield* Effect.sync(() => 10);
  yield* Effect.logInfo(`Got number: ${n}`);
  const result = yield* Effect.sync(() => n * 2);
  yield* Effect.logInfo(`Result: ${result}`);
  return result;
});

// Run with logging
Effect.runSync(program2);

// Program with error handling
const program3 = Effect.gen(function* () {
  yield* Effect.logInfo("Starting division...");
  const n = yield* Effect.sync(() => 10);
  const divisor = yield* Effect.sync(() => 0);

  yield* Effect.logInfo(`Attempting to divide ${n} by ${divisor}...`);
  return yield* Effect.try({
    try: () => {
      if (divisor === 0) throw new Error("Cannot divide by zero");
      return n / divisor;
    },
    catch: (error) => {
      if (error instanceof Error) {
        return error;
      }
      return new Error("Unknown error occurred");
    },
  });
}).pipe(
  Effect.catchAll((error) => Effect.logInfo(`Error occurred: ${error.message}`))
);

// Run with error handling
Effect.runSync(program3);
```

**Explanation:**  
Use `runSync` only for Effects that are fully synchronous. If the Effect
contains async code, use `runPromise` instead.

**Anti-Pattern:**

Do not use `runSync` on an Effect that contains asynchronous operations like
`Effect.delay` or `Effect.promise`. This will result in a runtime error.

**Rationale:**

To execute an `Effect` that is guaranteed to be synchronous, use
`Effect.runSync`. This will return the success value directly or throw the
error.


`Effect.runSync` is an optimized runner for Effects that don't involve any
asynchronous operations. If the Effect contains any async operations,
`runSync` will throw an error.

---

### Execute Asynchronous Effects with Effect.runPromise

**Rule:** Execute asynchronous effects with Effect.runPromise.

**Good Example:**

```typescript
import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(Effect.delay("1 second"));

const promise = Effect.runPromise(program);

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(result); // Logs "Hello, World!" after 1 second.
  return result;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
`Effect.runPromise` executes your effect and returns a Promise, making it
easy to integrate with existing JavaScript async workflows.

**Anti-Pattern:**

Never call `runPromise` inside another `Effect` composition. Effects are
meant to be composed together _before_ being run once at the end.

**Rationale:**

To execute an `Effect` that may be asynchronous and retrieve its result, use
`Effect.runPromise`. This should only be done at the outermost layer of your
application.


`Effect.runPromise` is the bridge from the Effect world to the Promise-based
world of Node.js and browsers. If the Effect succeeds, the Promise resolves;
if it fails, the Promise rejects.

---

### Set Up a New Effect Project

**Rule:** Set up a new Effect project.

**Good Example:**

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

**Anti-Pattern:**

Avoid disabling `strict` mode in your `tsconfig.json`. Running with
`"strict": false` will cause you to lose many of the type-safety guarantees
that make Effect so powerful.

**Rationale:**

To start a new Effect project, initialize a standard Node.js project, add
`effect` and `typescript` as dependencies, and create a `tsconfig.json` file
with strict mode enabled.


A proper setup is crucial for leveraging Effect's powerful type-safety
features. Using TypeScript's `strict` mode is non-negotiable.

---


## 🟠 Advanced Patterns

### Create a Reusable Runtime from Layers

**Rule:** Create a reusable runtime from layers.

**Good Example:**

```typescript
import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Service<GreeterService>()("Greeter", {
  sync: () => ({
    greet: (name: string) => Effect.sync(() => `Hello ${name}`),
  }),
}) {}

const runtime = Effect.runSync(
  Layer.toRuntime(GreeterService.Default).pipe(Effect.scoped)
);

// In a server, you would reuse `run` for every request.
Runtime.runPromise(runtime)(Effect.log("Hello"));
```

**Explanation:**  
By compiling your layers into a Runtime once, you avoid rebuilding the
dependency graph for every effect execution.

**Anti-Pattern:**

For a long-running application, avoid providing layers and running an effect
in a single operation. This forces Effect to rebuild the dependency graph on
every execution.

**Rationale:**

For applications that need to run multiple effects (e.g., a web server), use
`Layer.toRuntime(appLayer)` to compile your dependency graph into a single,
reusable `Runtime` object.


Building the dependency graph from layers has a one-time cost. Creating a
`Runtime` once when your application starts is highly efficient for
long-running applications.

---


