# Effect Coding Rules for AI (Cursor)

This document lists key architectural and style rules for our Effect-TS codebase. Use these as guidelines when generating or refactoring code.

## Access Configuration from the Context
**Rule:** Access configuration from the Effect context.

## Accessing the Current Time with Clock
**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

## Accumulate Multiple Errors with Either
**Rule:** Use Either to accumulate multiple validation errors instead of failing on the first one.

## Add Caching by Wrapping a Layer
**Rule:** Use a wrapping Layer to add cross-cutting concerns like caching to a service without altering its original implementation.

## Add Custom Metrics to Your Application
**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

## Automatically Retry Failed Operations
**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

## Avoid Long Chains of .andThen; Use Generators Instead
**Rule:** Prefer generators over long chains of .andThen.

## Beyond the Date Type - Real World Dates, Times, and Timezones
**Rule:** Use the Clock service for testable time-based logic and immutable primitives for timestamps.

## Build a Basic HTTP Server
**Rule:** Use a managed Runtime created from a Layer to handle requests in a Node.js HTTP server.

## Collect All Results into a List
**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

## Comparing Data by Value with Structural Equality
**Rule:** Use Data.struct or implement the Equal interface for value-based comparison of objects and classes.

## Conditionally Branching Workflows
**Rule:** Use predicate-based operators like Effect.filter and Effect.if to declaratively control workflow branching.

## Control Flow with Conditional Combinators
**Rule:** Use conditional combinators for control flow.

## Control Repetition with Schedule
**Rule:** Use Schedule to create composable policies for controlling the repetition and retrying of effects.

## Create a Basic HTTP Server
**Rule:** Use Http.server.serve with a platform-specific layer to run an HTTP application.

## Create a Managed Runtime for Scoped Resources
**Rule:** Create a managed runtime for scoped resources.

## Create a Reusable Runtime from Layers
**Rule:** Create a reusable runtime from layers.

## Create a Stream from a List
**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

## Create a Testable HTTP Client Service
**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

## Create Pre-resolved Effects with succeed and fail
**Rule:** Create pre-resolved effects with succeed and fail.

## Decouple Fibers with Queues and PubSub
**Rule:** Use Queue for point-to-point work distribution and PubSub for broadcast messaging between fibers.

## Define a Type-Safe Configuration Schema
**Rule:** Define a type-safe configuration schema.

## Define Contracts Upfront with Schema
**Rule:** Define contracts upfront with schema.

## Define Type-Safe Errors with Data.TaggedError
**Rule:** Define type-safe errors with Data.TaggedError.

## Distinguish 'Not Found' from Errors
**Rule:** Use Effect<Option<A>> to distinguish between recoverable 'not found' cases and actual failures.

## Execute Asynchronous Effects with Effect.runPromise
**Rule:** Execute asynchronous effects with Effect.runPromise.

## Execute Long-Running Apps with Effect.runFork
**Rule:** Use Effect.runFork to launch a long-running application as a manageable, detached fiber.

## Execute Synchronous Effects with Effect.runSync
**Rule:** Execute synchronous effects with Effect.runSync.

## Extract Path Parameters
**Rule:** Define routes with colon-prefixed parameters (e.g., /users/:id) and access their values within the handler.

## Handle a GET Request
**Rule:** Use Http.router.get to associate a URL path with a specific response Effect.

## Handle API Errors
**Rule:** Model application errors as typed classes and use Http.server.serveOptions to map them to specific HTTP responses.

## Handle Errors with catchTag, catchTags, and catchAll
**Rule:** Handle errors with catchTag, catchTags, and catchAll.

## Handle Flaky Operations with Retries and Timeouts
**Rule:** Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing effects.

## Handle Unexpected Errors by Inspecting the Cause
**Rule:** Handle unexpected errors by inspecting the cause.

## Implement Graceful Shutdown for Your Application
**Rule:** Use Effect.runFork and OS signal listeners to implement graceful shutdown for long-running applications.

## Leverage Effect's Built-in Structured Logging
**Rule:** Leverage Effect's built-in structured logging.

## Make an Outgoing HTTP Client Request
**Rule:** Use the Http.client module to make outgoing requests to keep the entire operation within the Effect ecosystem.

## Manage Resource Lifecycles with Scope
**Rule:** Use Scope for fine-grained, manual control over resource lifecycles and cleanup guarantees.

## Manage Resources Safely in a Pipeline
**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

## Manage Shared State Safely with Ref
**Rule:** Use Ref to manage shared, mutable state concurrently, ensuring atomicity.

## Mapping Errors to Fit Your Domain
**Rule:** Use Effect.mapError to transform errors and create clean architectural boundaries between layers.

## Mocking Dependencies in Tests
**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

## Model Dependencies as Services
**Rule:** Model dependencies as services.

## Model Optional Values Safely with Option
**Rule:** Use Option<A> to explicitly model values that may be absent, avoiding null or undefined.

## Model Validated Domain Types with Brand
**Rule:** Model validated domain types with Brand.

## Organize Layers into Composable Modules
**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

## Parse and Validate Data with Schema.decode
**Rule:** Parse and validate data with Schema.decode.

## Poll for Status Until a Task Completes
**Rule:** Use Effect.race to run a repeating polling task that is automatically interrupted when a main task completes.

## Process a Collection in Parallel with Effect.forEach
**Rule:** Use Effect.forEach with the `concurrency` option to process a collection in parallel with a fixed limit.

## Process a Large File with Constant Memory
**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

## Process collections of data asynchronously
**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

## Process Items Concurrently
**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

## Process Items in Batches
**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

## Process Streaming Data with Stream
**Rule:** Use Stream to model and process data that arrives over time in a composable, efficient way.

## Provide Configuration to Your App via a Layer
**Rule:** Provide configuration to your app via a Layer.

## Provide Dependencies to Routes
**Rule:** Define dependencies with Effect.Service and provide them to your HTTP server using a Layer.

## Race Concurrent Effects for the Fastest Result
**Rule:** Use Effect.race to get the result from the first of several effects to succeed, automatically interrupting the losers.

## Representing Time Spans with Duration
**Rule:** Use the Duration data type to represent time intervals instead of raw numbers.

## Retry Operations Based on Specific Errors
**Rule:** Use predicate-based retry policies to retry an operation only for specific, recoverable errors.

## Run a Pipeline for its Side Effects
**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

## Run Background Tasks with Effect.fork
**Rule:** Use Effect.fork to start a non-blocking background process and manage its lifecycle via its Fiber.

## Run Independent Effects in Parallel with Effect.all
**Rule:** Use Effect.all to execute a collection of independent effects concurrently.

## Send a JSON Response
**Rule:** Use Http.response.json to automatically serialize data structures into a JSON response.

## Set Up a New Effect Project
**Rule:** Set up a new Effect project.

## Solve Promise Problems with Effect
**Rule:** Recognize that Effect solves the core limitations of Promises: untyped errors, no dependency injection, and no cancellation.

## Supercharge Your Editor with the Effect LSP
**Rule:** Install and use the Effect LSP extension for enhanced type information and error checking in your editor.

## Teach your AI Agents Effect with the MCP Server
**Rule:** Use the MCP server to provide live application context to AI coding agents, enabling more accurate assistance.

## Trace Operations Across Services with Spans
**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

## Transform Data During Validation with Schema
**Rule:** Use Schema.transform to safely convert data types during the validation and parsing process.

## Transform Effect Values with map and flatMap
**Rule:** Transform Effect values with map and flatMap.

## Turn a Paginated API into a Single Stream
**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

## Understand Fibers as Lightweight Threads
**Rule:** Understand that a Fiber is a lightweight, virtual thread managed by the Effect runtime for massive concurrency.

## Understand Layers for Dependency Injection
**Rule:** Understand that a Layer is a blueprint describing how to construct a service and its dependencies.

## Understand that Effects are Lazy Blueprints
**Rule:** Understand that effects are lazy blueprints.

## Understand the Three Effect Channels (A, E, R)
**Rule:** Understand that an Effect&lt;A, E, R&gt; describes a computation with a success type (A), an error type (E), and a requirements type (R).

## Use .pipe for Composition
**Rule:** Use .pipe for composition.

## Use Chunk for High-Performance Collections
**Rule:** Prefer Chunk over Array for immutable collection operations within data processing pipelines for better performance.

## Use Effect.gen for Business Logic
**Rule:** Use Effect.gen for business logic.

## Use the Auto-Generated .Default Layer in Tests
**Rule:** Use the auto-generated .Default layer in tests.

## Validate Request Body
**Rule:** Use Http.request.schemaBodyJson with a Schema to automatically parse and validate request bodies.

## Wrap Asynchronous Computations with tryPromise
**Rule:** Wrap asynchronous computations with tryPromise.

## Wrap Synchronous Computations with sync and try
**Rule:** Wrap synchronous computations with sync and try.

## Write Sequential Code with Effect.gen
**Rule:** Write sequential code with Effect.gen.

## Write Tests That Adapt to Application Code
**Rule:** Write tests that adapt to application code.
