# The Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.

**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**


## Table of Contents

- [Core Concepts](#core-concepts)
- [Project Setup & Execution](#project-setup-execution)
- [Application Configuration](#application-configuration)
- [Error Management](#error-management)
- [Domain Modeling](#domain-modeling)
- [Modeling Time](#modeling-time)
- [Modeling Data](#modeling-data)
- [Making HTTP Requests](#making-http-requests)
- [Building APIs](#building-apis)
- [Building Data Pipelines](#building-data-pipelines)
- [Concurrency](#concurrency)
- [Testing](#testing)
- [Observability](#observability)
- [Resource Management](#resource-management)
- [Tooling and Debugging](#tooling-and-debugging)

---

## Core Concepts

The absolute fundamentals of Effect. Start here to understand the core philosophy.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create Pre-resolved Effects with succeed and fail](./content/create-pre-resolved-effect.mdx) | 🟢 **Beginner** | Use Effect.succeed(value) to create an Effect that immediately succeeds with a value, and Effect.fail(error) for an Effect that immediately fails. |
| [Solve Promise Problems with Effect](./content/solve-promise-problems-with-effect.mdx) | 🟢 **Beginner** | Understand how Effect solves the fundamental problems of native Promises, such as untyped errors, lack of dependency injection, and no built-in cancellation. |
| [Transform Effect Values with map and flatMap](./content/transform-effect-values.mdx) | 🟢 **Beginner** | Use Effect.map for synchronous transformations and Effect.flatMap to chain operations that return another Effect. |
| [Understand that Effects are Lazy Blueprints](./content/effects-are-lazy.mdx) | 🟢 **Beginner** | An Effect is a lazy, immutable blueprint describing a computation, which does nothing until it is explicitly executed by a runtime. |
| [Understand the Three Effect Channels (A, E, R)](./content/understand-effect-channels.mdx) | 🟢 **Beginner** | Learn about the three generic parameters of an Effect: the success value (A), the failure error (E), and the context requirements (R). |
| [Use .pipe for Composition](./content/use-pipe-for-composition.mdx) | 🟢 **Beginner** | Use the .pipe() method to chain multiple operations onto an Effect in a readable, top-to-bottom sequence. |
| [Wrap Asynchronous Computations with tryPromise](./content/wrap-asynchronous-computations.mdx) | 🟢 **Beginner** | Use Effect.tryPromise to safely convert a function that returns a Promise into an Effect, capturing rejections in the error channel. |
| [Wrap Synchronous Computations with sync and try](./content/wrap-synchronous-computations.mdx) | 🟢 **Beginner** | Use Effect.sync for non-throwing synchronous code and Effect.try for synchronous code that might throw an exception. |
| [Write Sequential Code with Effect.gen](./content/write-sequential-code-with-gen.mdx) | 🟢 **Beginner** | Use Effect.gen with yield* to write sequential, asynchronous code in a style that looks and feels like familiar async/await. |
| [Conditionally Branching Workflows](./content/conditionally-branching-workflows.mdx) | 🟡 **Intermediate** | Use predicate-based operators like Effect.filter and Effect.if to make decisions and control the flow of your application based on runtime values. |
| [Control Flow with Conditional Combinators](./content/control-flow-with-combinators.mdx) | 🟡 **Intermediate** | Use combinators like Effect.if, Effect.when, and Effect.cond to handle conditional logic in a declarative, composable way. |
| [Control Repetition with Schedule](./content/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Manage Shared State Safely with Ref](./content/manage-shared-state-with-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Process Streaming Data with Stream](./content/process-streaming-data-with-stream.mdx) | 🟡 **Intermediate** | Use Stream<A, E, R> to represent and process data that arrives over time, such as file reads, WebSocket messages, or paginated API results. |
| [Understand Layers for Dependency Injection](./content/understand-layers-for-dependency-injection.mdx) | 🟡 **Intermediate** | A Layer is a blueprint that describes how to build a service, detailing its own requirements and any potential errors during its construction. |
| [Use Chunk for High-Performance Collections](./content/use-chunk-for-high-performance-collections.mdx) | 🟡 **Intermediate** | Use Chunk<A> as a high-performance, immutable alternative to JavaScript's Array, especially for data processing pipelines. |
| [Understand Fibers as Lightweight Threads](./content/understand-fibers-as-lightweight-threads.mdx) | 🟠 **Advanced** | A Fiber is a lightweight, virtual thread managed by the Effect runtime, enabling massive concurrency on a single OS thread without the overhead of traditional threading. |

---

## Project Setup & Execution

Getting started and running code, from simple scripts to long-running applications.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Execute Asynchronous Effects with Effect.runPromise](./content/execute-with-runpromise.mdx) | 🟢 **Beginner** | Use Effect.runPromise at the 'end of the world' to execute an asynchronous Effect and get its result as a JavaScript Promise. |
| [Execute Synchronous Effects with Effect.runSync](./content/execute-with-runsync.mdx) | 🟢 **Beginner** | Use Effect.runSync at the 'end of the world' to execute a purely synchronous Effect and get its value directly. |
| [Set Up a New Effect Project](./content/setup-new-project.mdx) | 🟢 **Beginner** | Initialize a new Node.js project with the necessary TypeScript configuration and Effect dependencies to start building. |
| [Create a Managed Runtime for Scoped Resources](./content/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |
| [Create a Reusable Runtime from Layers](./content/create-reusable-runtime-from-layers.mdx) | 🟠 **Advanced** | Compile your application's layers into a reusable Runtime object to efficiently execute multiple effects that share the same context. |
| [Execute Long-Running Apps with Effect.runFork](./content/execute-long-running-apps-with-runfork.mdx) | 🟠 **Advanced** | Use Effect.runFork at the application's entry point to launch a long-running process as a detached fiber, allowing for graceful shutdown. |

---

## Application Configuration

Managing configuration from different sources in a type-safe and testable way.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Access Configuration from the Context](./content/access-config-in-context.mdx) | 🟡 **Intermediate** | Access your type-safe configuration within an Effect.gen block by yielding the Config object you defined. |
| [Define a Type-Safe Configuration Schema](./content/define-config-schema.mdx) | 🟡 **Intermediate** | Use Effect.Config primitives to define a schema for your application's configuration, ensuring type-safety and separation from code. |
| [Provide Configuration to Your App via a Layer](./content/provide-config-layer.mdx) | 🟡 **Intermediate** | Use Config.layer(schema) to create a Layer that provides your configuration schema to the application's context. |

---

## Error Management

Strategies for building resilient applications by treating failures as first-class citizens.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accumulate Multiple Errors with Either](./content/accumulate-multiple-errors-with-either.mdx) | 🟡 **Intermediate** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Conditionally Branching Workflows](./content/conditionally-branching-workflows.mdx) | 🟡 **Intermediate** | Use predicate-based operators like Effect.filter and Effect.if to make decisions and control the flow of your application based on runtime values. |
| [Control Repetition with Schedule](./content/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Define Type-Safe Errors with Data.TaggedError](./content/define-tagged-errors.mdx) | 🟡 **Intermediate** | Create custom, type-safe error classes by extending Data.TaggedError to make error handling robust, predictable, and self-documenting. |
| [Distinguish 'Not Found' from Errors](./content/distinguish-not-found-from-errors.mdx) | 🟡 **Intermediate** | Use Effect<Option<A>> to clearly distinguish between a recoverable 'not found' case (None) and a true failure (Fail). |
| [Handle Errors with catchTag, catchTags, and catchAll](./content/handle-errors-with-catch.mdx) | 🟡 **Intermediate** | Use catchTag for type-safe recovery from specific tagged errors, and catchAll to recover from any possible failure. |
| [Handle Flaky Operations with Retries and Timeouts](./content/handle-flaky-operations-with-retry-timeout.mdx) | 🟡 **Intermediate** | Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing operations, such as network requests. |
| [Leverage Effect's Built-in Structured Logging](./content/leverage-structured-logging.mdx) | 🟡 **Intermediate** | Use Effect's built-in logging functions (Effect.log, Effect.logInfo, etc.) for structured, configurable, and context-aware logging. |
| [Mapping Errors to Fit Your Domain](./content/mapping-errors-to-fit-your-domain.mdx) | 🟡 **Intermediate** | Use Effect.mapError to transform specific, low-level errors into more general domain errors, creating clean architectural boundaries. |
| [Model Optional Values Safely with Option](./content/model-optional-values-with-option.mdx) | 🟡 **Intermediate** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Retry Operations Based on Specific Errors](./content/retry-based-on-specific-errors.mdx) | 🟡 **Intermediate** | Use Effect.retry and predicate functions to selectively retry an operation only when specific, recoverable errors occur. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/handle-unexpected-errors-with-cause.mdx) | 🟠 **Advanced** | Use Effect.catchAllCause or Effect.runFork to inspect the Cause of a failure, distinguishing between expected errors (Fail) and unexpected defects (Die). |

---

## Domain Modeling

Building a type-safe, expressive model of your business logic.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accumulate Multiple Errors with Either](./content/accumulate-multiple-errors-with-either.mdx) | 🟡 **Intermediate** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Avoid Long Chains of .andThen; Use Generators Instead](./content/avoid-long-andthen-chains.mdx) | 🟡 **Intermediate** | Prefer Effect.gen over long chains of .andThen for sequential logic to improve readability and maintainability. |
| [Define Contracts Upfront with Schema](./content/define-contracts-with-schema.mdx) | 🟡 **Intermediate** | Use Schema to define the types for your data models and function signatures before writing the implementation, creating clear, type-safe contracts. |
| [Define Type-Safe Errors with Data.TaggedError](./content/define-tagged-errors.mdx) | 🟡 **Intermediate** | Create custom, type-safe error classes by extending Data.TaggedError to make error handling robust, predictable, and self-documenting. |
| [Distinguish 'Not Found' from Errors](./content/distinguish-not-found-from-errors.mdx) | 🟡 **Intermediate** | Use Effect<Option<A>> to clearly distinguish between a recoverable 'not found' case (None) and a true failure (Fail). |
| [Model Optional Values Safely with Option](./content/model-optional-values-with-option.mdx) | 🟡 **Intermediate** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Model Validated Domain Types with Brand](./content/model-validated-domain-types-with-brand.mdx) | 🟡 **Intermediate** | Use Brand to turn primitive types like string or number into specific, validated domain types like Email or PositiveInt, making illegal states unrepresentable. |
| [Parse and Validate Data with Schema.decode](./content/parse-with-schema-decode.mdx) | 🟡 **Intermediate** | Use Schema.decode(schema) to create an Effect that parses and validates unknown data, which integrates seamlessly with Effect's error handling. |
| [Transform Data During Validation with Schema](./content/transform-data-with-schema.mdx) | 🟡 **Intermediate** | Use Schema.transform to safely convert data from one type to another during the parsing phase, such as from a string to a Date. |
| [Use Effect.gen for Business Logic](./content/use-gen-for-business-logic.mdx) | 🟡 **Intermediate** | Encapsulate sequential business logic, control flow, and dependency access within Effect.gen for improved readability and maintainability. |

---

## Modeling Time

Representing and manipulating time in your applications.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accessing the Current Time with Clock](./content/accessing-current-time-with-clock.mdx) | 🟡 **Intermediate** | Use the Clock service to access the current time in a testable, deterministic way, avoiding direct calls to Date.now(). |
| [Beyond the Date Type - Real World Dates, Times, and Timezones](./content/beyond-the-date-type.mdx) | 🟡 **Intermediate** | Use the Clock service for testable access to the current time and prefer immutable primitives for storing and passing timestamps. |
| [Representing Time Spans with Duration](./content/representing-time-spans-with-duration.mdx) | 🟡 **Intermediate** | Use the Duration data type to represent time intervals in a type-safe, human-readable, and composable way. |

---

## Modeling Data

Working with data structures and transformations in a type-safe way.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Comparing Data by Value with Structural Equality](./content/comparing-data-by-value-with-structural-equality.mdx) | 🟢 **Beginner** | Use Data.struct and Equal.equals to safely compare objects by their value instead of their reference, avoiding common JavaScript pitfalls. |

---

## Making HTTP Requests

Acting as a client to call external APIs and services

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Add Custom Metrics to Your Application](./content/add-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Create a Testable HTTP Client Service](./content/create-a-testable-http-client-service.mdx) | 🟡 **Intermediate** | Define an HttpClient service with separate 'Live' and 'Test' layers to enable robust, testable interactions with external APIs. |
| [Model Dependencies as Services](./content/model-dependencies-as-services.mdx) | 🟡 **Intermediate** | Abstract external dependencies and capabilities into swappable, testable services using Effect's dependency injection system. |
| [Add Caching by Wrapping a Layer](./content/add-caching-by-wrapping-a-layer.mdx) | 🟠 **Advanced** | Implement caching by creating a new layer that wraps a live service, intercepting method calls to add caching logic without modifying the original service. |
| [Build a Basic HTTP Server](./content/build-a-basic-http-server.mdx) | 🟠 **Advanced** | Combine Layer, Runtime, and Effect to create a simple, robust HTTP server using Node.js's built-in http module. |
| [Create a Managed Runtime for Scoped Resources](./content/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |

---

## Building APIs

Creating APIs with Effect, including routing, request handling, and response generation.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create a Basic HTTP Server](./content/launch-http-server.mdx) | 🟢 **Beginner** | Launch a simple, effect-native HTTP server to respond to incoming requests. |
| [Extract Path Parameters](./content/extract-path-parameters.mdx) | 🟢 **Beginner** | Capture and use dynamic segments from a request URL, such as a resource ID. |
| [Handle a GET Request](./content/handle-get-request.mdx) | 🟢 **Beginner** | Define a route that responds to a specific HTTP GET request path. |
| [Send a JSON Response](./content/send-json-response.mdx) | 🟢 **Beginner** | Create and send a structured JSON response with the correct headers and status code. |
| [Handle API Errors](./content/handle-api-errors.mdx) | 🟡 **Intermediate** | Translate application-specific errors from the Effect failure channel into meaningful HTTP error responses. |
| [Make an Outgoing HTTP Client Request](./content/make-http-client-request.mdx) | 🟡 **Intermediate** | Use the built-in Effect HTTP client to make safe and composable requests to external services from within your API. |
| [Provide Dependencies to Routes](./content/provide-dependencies-to-routes.mdx) | 🟡 **Intermediate** | Inject services like database connections into HTTP route handlers using Layer and Effect.Service. |
| [Validate Request Body](./content/validate-request-body.mdx) | 🟡 **Intermediate** | Safely parse and validate an incoming JSON request body against a predefined Schema. |

---

## Building Data Pipelines

Processing and transforming data in a lazy, composable, and resource-safe manner.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Collect All Results into a List](./content/stream-collect-results.mdx) | 🟢 **Beginner** | Run a pipeline and gather all of its results into an in-memory array. |
| [Create a Stream from a List](./content/stream-from-iterable.mdx) | 🟢 **Beginner** | Turn a simple in-memory array or list into a foundational data pipeline using Stream. |
| [Run a Pipeline for its Side Effects](./content/stream-run-for-effects.mdx) | 🟢 **Beginner** | Execute a pipeline for its effects without collecting the results, saving memory. |
| [Automatically Retry Failed Operations](./content/stream-retry-on-failure.mdx) | 🟡 **Intermediate** | Build a self-healing pipeline that can automatically retry failed processing steps using a configurable backoff strategy. |
| [Process a Large File with Constant Memory](./content/stream-from-file.mdx) | 🟡 **Intermediate** | Create a data pipeline from a file on disk, processing it line-by-line without loading the entire file into memory. |
| [Process collections of data asynchronously](./content/process-a-collection-of-data-asynchronously.mdx) | 🟡 **Intermediate** | Process collections of data asynchronously in a lazy, composable, and resource-safe manner using Effect's Stream. |
| [Process Items Concurrently](./content/stream-process-concurrently.mdx) | 🟡 **Intermediate** | Perform an asynchronous action for each item in a stream with controlled parallelism to dramatically improve performance. |
| [Process Items in Batches](./content/stream-process-in-batches.mdx) | 🟡 **Intermediate** | Group items into chunks for efficient bulk operations, like database inserts or batch API calls. |
| [Turn a Paginated API into a Single Stream](./content/stream-from-paginated-api.mdx) | 🟡 **Intermediate** | Convert a paginated API into a continuous, easy-to-use stream, abstracting away the complexity of fetching page by page. |
| [Manage Resources Safely in a Pipeline](./content/stream-manage-resources.mdx) | 🟠 **Advanced** | Ensure resources like file handles or connections are safely acquired at the start of a pipeline and always released at the end, even on failure. |

---

## Concurrency

Building efficient, non-blocking applications that can handle multiple tasks simultaneously.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Control Repetition with Schedule](./content/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Manage Shared State Safely with Ref](./content/manage-shared-state-with-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Process a Collection in Parallel with Effect.forEach](./content/process-collection-in-parallel-with-foreach.mdx) | 🟡 **Intermediate** | Use Effect.forEach with the `concurrency` option to process a collection of items in parallel with a fixed limit, preventing resource exhaustion. |
| [Race Concurrent Effects for the Fastest Result](./content/race-concurrent-effects.mdx) | 🟡 **Intermediate** | Use Effect.race to run multiple effects concurrently and proceed with the result of the one that succeeds first, automatically interrupting the others. |
| [Run Independent Effects in Parallel with Effect.all](./content/run-effects-in-parallel-with-all.mdx) | 🟡 **Intermediate** | Use Effect.all to run multiple independent effects concurrently and collect all their results into a single tuple. |
| [Add Caching by Wrapping a Layer](./content/add-caching-by-wrapping-a-layer.mdx) | 🟠 **Advanced** | Implement caching by creating a new layer that wraps a live service, intercepting method calls to add caching logic without modifying the original service. |
| [Decouple Fibers with Queues and PubSub](./content/decouple-fibers-with-queue-pubsub.mdx) | 🟠 **Advanced** | Use Queue for point-to-point work distribution and PubSub for broadcast messaging to enable safe, decoupled communication between concurrent fibers. |
| [Execute Long-Running Apps with Effect.runFork](./content/execute-long-running-apps-with-runfork.mdx) | 🟠 **Advanced** | Use Effect.runFork at the application's entry point to launch a long-running process as a detached fiber, allowing for graceful shutdown. |
| [Implement Graceful Shutdown for Your Application](./content/implement-graceful-shutdown.mdx) | 🟠 **Advanced** | Use Effect.runFork and listen for OS signals (SIGINT, SIGTERM) to trigger a Fiber.interrupt, ensuring all resources are safely released. |
| [Manage Resource Lifecycles with Scope](./content/manage-resource-lifecycles-with-scope.mdx) | 🟠 **Advanced** | Use Scope for fine-grained, manual control over resource lifecycles, ensuring cleanup logic (finalizers) is always executed. |
| [Poll for Status Until a Task Completes](./content/poll-for-status-until-task-completes.mdx) | 🟠 **Advanced** | Use Effect.race to run a repeating polling effect alongside a main task, automatically stopping the polling when the main task finishes. |
| [Run Background Tasks with Effect.fork](./content/run-background-tasks-with-fork.mdx) | 🟠 **Advanced** | Use Effect.fork to start a computation in a background fiber, allowing the parent fiber to continue its work without waiting. |
| [Understand Fibers as Lightweight Threads](./content/understand-fibers-as-lightweight-threads.mdx) | 🟠 **Advanced** | A Fiber is a lightweight, virtual thread managed by the Effect runtime, enabling massive concurrency on a single OS thread without the overhead of traditional threading. |

---

## Testing

How to test Effect code effectively, reliably, and deterministically.

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accessing the Current Time with Clock](./content/accessing-current-time-with-clock.mdx) | 🟡 **Intermediate** | Use the Clock service to access the current time in a testable, deterministic way, avoiding direct calls to Date.now(). |
| [Create a Testable HTTP Client Service](./content/create-a-testable-http-client-service.mdx) | 🟡 **Intermediate** | Define an HttpClient service with separate 'Live' and 'Test' layers to enable robust, testable interactions with external APIs. |
| [Mocking Dependencies in Tests](./content/mocking-dependencies-in-tests.mdx) | 🟡 **Intermediate** | Use a test-specific Layer to provide mock implementations of services your code depends on, enabling isolated and deterministic unit tests. |
| [Model Dependencies as Services](./content/model-dependencies-as-services.mdx) | 🟡 **Intermediate** | Abstract external dependencies and capabilities into swappable, testable services using Effect's dependency injection system. |
| [Use the Auto-Generated .Default Layer in Tests](./content/use-default-layer-for-tests.mdx) | 🟡 **Intermediate** | When testing, always use the MyService.Default layer that is automatically generated by the Effect.Service class for dependency injection. |
| [Write Tests That Adapt to Application Code](./content/write-tests-that-adapt-to-application-code.mdx) | 🟡 **Intermediate** | A cardinal rule of testing: Tests must adapt to the application's interface, not the other way around. Never modify application code solely to make a test pass. |
| [Organize Layers into Composable Modules](./content/organize-layers-into-composable-modules.mdx) | 🟠 **Advanced** | Structure a large application by grouping related services into 'module' layers, which are then composed together with a shared base layer. |

---

## Observability

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Add Custom Metrics to Your Application](./content/add-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Trace Operations Across Services with Spans](./content/trace-operations-with-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |

---

## Resource Management

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create a Managed Runtime for Scoped Resources](./content/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |
| [Implement Graceful Shutdown for Your Application](./content/implement-graceful-shutdown.mdx) | 🟠 **Advanced** | Use Effect.runFork and listen for OS signals (SIGINT, SIGTERM) to trigger a Fiber.interrupt, ensuring all resources are safely released. |
| [Manage Resource Lifecycles with Scope](./content/manage-resource-lifecycles-with-scope.mdx) | 🟠 **Advanced** | Use Scope for fine-grained, manual control over resource lifecycles, ensuring cleanup logic (finalizers) is always executed. |

---

## Tooling and Debugging

| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Supercharge Your Editor with the Effect LSP](./content/supercharge-your-editor-with-the-effect-lsp.mdx) | 🟡 **Intermediate** | Install the Effect Language Server (LSP) extension for your editor to get rich, inline type information and enhanced error checking for your Effect code. |
| [Teach your AI Agents Effect with the MCP Server](./content/teach-your-ai-agents-effect-with-the-mcp-server.mdx) | 🟠 **Advanced** | Use the Effect MCP server to provide live, contextual information about your application's structure directly to AI coding agents. |


## AI Coding Rules

This project provides several machine-readable sets of coding rules, tailored for different needs and optimized for AI-powered IDEs and coding agents like Cursor or GitHub Copilot.

You can find the latest rule files in the [`rules`](./rules/) directory. These are automatically generated from the content in this repository.

### Available Formats

-   **Comprehensive Rules (`rules.md`)**: A human-readable markdown file containing all patterns, guidelines, and rationale.
-   **Compact Rules (`rules-compact.md`)**: A condensed version containing only the core rule for each pattern, designed for minimal token usage.
-   **Structured JSON (`rules.json`)**: A machine-readable JSON file containing all rule information for programmatic use.
-   **By Skill Level**: Detailed rules, including examples, split into separate files for each skill level.
    -   [`beginner.md`](./rules/beginner.md)
    -   [`intermediate.md`](./rules/intermediate.md)
    -   [`advanced.md`](./rules/advanced.md)
-   **By Use Case**: Detailed rules, including examples, grouped by practical application areas.
    -   [View all use cases](./rules/by-use-case/)

---

## Contributing

This is a community-driven project, and we welcome contributions! Whether it's a new pattern, a correction, or an improvement to an existing one, your help is valued.

Please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** file for guidelines on how to get started.

*This README.md is automatically generated. To update it, run the generation script.*

## Roadmap & Future Vision

This repository is the foundational layer for a much larger vision. The goal is to evolve this knowledge base into a comprehensive platform for learning and building with Effect.

Our roadmap includes:

### 1. The Effect Patterns Hub Website
A dedicated blog and documentation site built with  **Effect**. This will provide a beautiful, searchable, and interactive interface for browsing the patterns.

### 2. The "Recipes" Section
A collection of end-to-end, practical blueprints for building complete applications. This will go beyond individual patterns to show how they are composed to solve real-world problems, including:
-   Building Enterprise Apps
-   Building SaaS Apps
-   Building Real-time Apps
-   Building Runtimes for AI Agents
-   Building Blogs
-   Building Full APIs
-   Building AI-powered Applications

### 3. The "Learn Effect" Chat App
A specialized, AI-powered chat application. This app will be trained on this knowledge base, allowing developers to ask questions in natural language ("How do I handle retries?") and get synthesized answers, code examples, and links to the relevant patterns.

### 4. AI Agent Integration
Enhancing the scripts that generate machine-readable rulebooks ('rules.md', 'rules.json') from our pattern library. The goal is to create self-contained artifacts that can be directly consumed by AI coding agents like **Cursor** or custom bots, providing them with the full context of our best practices to assist in code generation and refactoring.

### 5. Internal Tooling & Automation
-   **README Generation:** The immediate next step is to create a script that automatically generates the tables in this README by parsing the frontmatter from all '.mdx' files.
-   **Rule Generation:** Continue to enhance and maintain the scripts that generate the machine-readable rulebooks.

## Contributing

This is a community-driven project, and we welcome contributions! Whether it's a new pattern, a correction, or help with one of the roadmap items, your help is valued.

Please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** file for guidelines on how to get started.
