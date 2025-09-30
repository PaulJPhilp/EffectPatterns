# The Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.

**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**

## Table of Contents

- [Data Types](#data-types)
- [Time](#time)
- [Duration](#duration)
- [Domain Modeling](#domain-modeling)
- [Combinators](#combinators)
- [Composition](#composition)
- [Pairing](#pairing)
- [Error Management](#error-management)
- [Collections](#collections)
- [Performance](#performance)
- [Constructors](#constructors)
- [Interop](#interop)
- [Async](#async)
- [Callback](#callback)
- [Optional Values](#optional-values)
- [Building APIs](#building-apis)
- [Core Concepts](#core-concepts)
- [Concurrency](#concurrency)
- [Testing](#testing)
- [Tooling and Debugging](#tooling-and-debugging)
- [Observability](#observability)
- [Instrumentation](#instrumentation)
- [Function Calls](#function-calls)
- [Debugging](#debugging)
- [Modeling Data](#modeling-data)
- [Logging](#logging)
- [Making HTTP Requests](#making-http-requests)
- [Set Operations](#set-operations)
- [Resource Management](#resource-management)
- [Sequencing](#sequencing)
- [Side Effects](#side-effects)
- [File Handling](#file-handling)
- [Database Connections](#database-connections)
- [Network Requests](#network-requests)
- [Building Data Pipelines](#building-data-pipelines)
- [Error Handling](#error-handling)
- [Application Configuration](#application-configuration)
- [Security](#security)
- [Sensitive Data](#sensitive-data)
- [Modeling Time](#modeling-time)
- [Project Setup & Execution](#project-setup-execution)
- [Lifting](#lifting)
- [Metrics](#metrics)
- [Monitoring](#monitoring)
- [Effect Results](#effect-results)
- [Numeric Precision](#numeric-precision)
- [Financial](#financial)
- [Scientific](#scientific)
- [Pattern Matching](#pattern-matching)
- [Tagged Unions](#tagged-unions)
- [Branching](#branching)
- [Conditional Logic](#conditional-logic)
- [Advanced Dependency Injection](#advanced-dependency-injection)
- [Custom Layers](#custom-layers)
- [Tracing](#tracing)
- [Effectful Branching](#effectful-branching)
- [Structural Equality](#structural-equality)
- [Branded Types](#branded-types)
- [Type Safety](#type-safety)
- [Validation](#validation)
- [Parsing](#parsing)
- [Conversion](#conversion)
- [Type Classes](#type-classes)
- [Equality](#equality)
- [Ordering](#ordering)
- [Hashing](#hashing)
- [Dependency Injection](#dependency-injection)
- [Application Architecture](#application-architecture)
- [Streams](#streams)
- [Batch Processing](#batch-processing)
- [Tuples](#tuples)
- [ADTs](#adts)
- [OpenTelemetry](#opentelemetry)
- [Distributed Systems](#distributed-systems)
- [Absence](#absence)
- [Parallelism](#parallelism)
- [Option](#option)
- [Either](#either)
- [Checks](#checks)
- [Date](#date)
- [Arrays](#arrays)
- [State](#state)
- [Mutable State](#mutable-state)

---

## Data Types
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Model Optional Values Safely with Option](./content/published/data-option.mdx) | 🟢 **Beginner** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Accumulate Multiple Errors with Either](./content/published/data-either.mdx) | 🟢 **Beginner** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Comparing Data by Value with Data.struct](./content/published/data-struct.mdx) | 🟢 **Beginner** | Use Data.struct to create immutable, structurally-typed objects that can be compared by value, not by reference. |
| [Working with Tuples using Data.tuple](./content/published/data-tuple.mdx) | 🟢 **Beginner** | Use Data.tuple to create immutable, type-safe tuples that support value-based equality and pattern matching. |
| [Working with Immutable Arrays using Data.array](./content/published/data-array.mdx) | 🟢 **Beginner** | Use Data.array to create immutable, type-safe arrays that support value-based equality and safe functional operations. |
| [Representing Time Spans with Duration](./content/published/data-duration.mdx) | 🟡 **Intermediate** | Use Duration to represent time intervals in a type-safe, human-readable, and composable way. |
| [Use Chunk for High-Performance Collections](./content/published/data-chunk.mdx) | 🟡 **Intermediate** | Use Chunk<A> as a high-performance, immutable alternative to JavaScript's Array, especially for data processing pipelines. |
| [Work with Immutable Sets using HashSet](./content/published/data-hashset.mdx) | 🟡 **Intermediate** | Use HashSet<A> to model immutable, high-performance sets for efficient membership checks and set operations. |
| [Redact and Handle Sensitive Data](./content/published/data-redacted.mdx) | 🟡 **Intermediate** | Use Redacted to securely handle sensitive data, ensuring secrets are not accidentally logged or exposed. |
| [Modeling Effect Results with Exit](./content/published/data-exit.mdx) | 🟡 **Intermediate** | Use Exit<E, A> to represent the result of running an Effect, capturing both success and failure (including defects) in a type-safe way. |
| [Work with Arbitrary-Precision Numbers using BigDecimal](./content/published/data-bigdecimal.mdx) | 🟡 **Intermediate** | Use BigDecimal for arbitrary-precision decimal arithmetic, avoiding rounding errors and loss of precision in financial or scientific calculations. |
| [Type Classes for Equality, Ordering, and Hashing with Data.Class](./content/published/data-class.mdx) | 🟡 **Intermediate** | Use Data.Class to derive and implement type classes for equality, ordering, and hashing, enabling composable and type-safe abstractions. |
| [Modeling Tagged Unions with Data.case](./content/published/data-case.mdx) | 🟡 **Intermediate** | Use Data.case to create tagged unions (algebraic data types) for robust, type-safe domain modeling and pattern matching. |
| [Work with Dates and Times using DateTime](./content/published/data-datetime.mdx) | 🟡 **Intermediate** | Use DateTime for immutable, time-zone-aware date and time values, enabling safe and precise time calculations. |
| [Manage Shared State Safely with Ref](./content/published/data-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/published/data-cause.mdx) | 🟠 **Advanced** | Use Cause<E> to get rich, structured information about errors and failures, including defects, interruptions, and error traces. |

## Time
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Representing Time Spans with Duration](./content/published/data-duration.mdx) | 🟡 **Intermediate** | Use Duration to represent time intervals in a type-safe, human-readable, and composable way. |
| [Work with Dates and Times using DateTime](./content/published/data-datetime.mdx) | 🟡 **Intermediate** | Use DateTime for immutable, time-zone-aware date and time values, enabling safe and precise time calculations. |

## Duration
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Representing Time Spans with Duration](./content/published/data-duration.mdx) | 🟡 **Intermediate** | Use Duration to represent time intervals in a type-safe, human-readable, and composable way. |

## Domain Modeling
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Model Optional Values Safely with Option](./content/published/data-option.mdx) | 🟢 **Beginner** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Accumulate Multiple Errors with Either](./content/published/data-either.mdx) | 🟢 **Beginner** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Comparing Data by Value with Data.struct](./content/published/data-struct.mdx) | 🟢 **Beginner** | Use Data.struct to create immutable, structurally-typed objects that can be compared by value, not by reference. |
| [Working with Tuples using Data.tuple](./content/published/data-tuple.mdx) | 🟢 **Beginner** | Use Data.tuple to create immutable, type-safe tuples that support value-based equality and pattern matching. |
| [Representing Time Spans with Duration](./content/published/data-duration.mdx) | 🟡 **Intermediate** | Use Duration to represent time intervals in a type-safe, human-readable, and composable way. |
| [Model Optional Values Safely with Option](./content/published/model-optional-values-with-option.mdx) | 🟡 **Intermediate** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Use Effect.gen for Business Logic](./content/published/use-gen-for-business-logic.mdx) | 🟡 **Intermediate** | Encapsulate sequential business logic, control flow, and dependency access within Effect.gen for improved readability and maintainability. |
| [Transform Data During Validation with Schema](./content/published/transform-data-with-schema.mdx) | 🟡 **Intermediate** | Use Schema.transform to safely convert data from one type to another during the parsing phase, such as from a string to a Date. |
| [Define Type-Safe Errors with Data.TaggedError](./content/published/define-tagged-errors.mdx) | 🟡 **Intermediate** | Create custom, type-safe error classes by extending Data.TaggedError to make error handling robust, predictable, and self-documenting. |
| [Define Contracts Upfront with Schema](./content/published/define-contracts-with-schema.mdx) | 🟡 **Intermediate** | Use Schema to define the types for your data models and function signatures before writing the implementation, creating clear, type-safe contracts. |
| [Modeling Validated Domain Types with Brand](./content/published/brand-model-domain-type.mdx) | 🟡 **Intermediate** | Use Brand to create domain-specific types from primitives, making illegal states unrepresentable and preventing accidental misuse. |
| [Parse and Validate Data with Schema.decode](./content/published/parse-with-schema-decode.mdx) | 🟡 **Intermediate** | Use Schema.decode(schema) to create an Effect that parses and validates unknown data, which integrates seamlessly with Effect's error handling. |
| [Validating and Parsing Branded Types](./content/published/brand-validate-parse.mdx) | 🟡 **Intermediate** | Use Schema and Brand together to validate and parse branded types at runtime, ensuring only valid values are constructed. |
| [Avoid Long Chains of .andThen; Use Generators Instead](./content/published/avoid-long-andthen-chains.mdx) | 🟡 **Intermediate** | Prefer Effect.gen over long chains of .andThen for sequential logic to improve readability and maintainability. |
| [Distinguish 'Not Found' from Errors](./content/published/distinguish-not-found-from-errors.mdx) | 🟡 **Intermediate** | Use Effect<Option<A>> to clearly distinguish between a recoverable 'not found' case (None) and a true failure (Fail). |
| [Model Validated Domain Types with Brand](./content/published/model-validated-domain-types-with-brand.mdx) | 🟡 **Intermediate** | Use Brand to turn primitive types like string or number into specific, validated domain types like Email or PositiveInt, making illegal states unrepresentable. |
| [Modeling Tagged Unions with Data.case](./content/published/data-case.mdx) | 🟡 **Intermediate** | Use Data.case to create tagged unions (algebraic data types) for robust, type-safe domain modeling and pattern matching. |
| [Accumulate Multiple Errors with Either](./content/published/accumulate-multiple-errors-with-either.mdx) | 🟡 **Intermediate** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Work with Dates and Times using DateTime](./content/published/data-datetime.mdx) | 🟡 **Intermediate** | Use DateTime for immutable, time-zone-aware date and time values, enabling safe and precise time calculations. |

## Combinators
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Combining Values with zip](./content/published/combinator-zip.mdx) | 🟢 **Beginner** | Use zip to combine two computations, pairing their results together in Effect, Stream, Option, or Either. |
| [Conditional Branching with if, when, and cond](./content/published/combinator-conditional.mdx) | 🟢 **Beginner** | Use combinators like if, when, and cond to express conditional logic declaratively across Effect, Stream, Option, and Either. |
| [Transforming Values with map](./content/published/combinator-map.mdx) | 🟢 **Beginner** | Use map to transform the result of an Effect, Stream, Option, or Either in a declarative, type-safe way. |
| [Chaining Computations with flatMap](./content/published/combinator-flatmap.mdx) | 🟢 **Beginner** | Use flatMap to chain together computations where each step may itself be effectful, optional, or error-prone. |
| [Filtering Results with filter](./content/published/combinator-filter.mdx) | 🟢 **Beginner** | Use filter to keep or discard results based on a predicate, across Effect, Stream, Option, and Either. |
| [Sequencing with andThen, tap, and flatten](./content/published/combinator-sequencing.mdx) | 🟡 **Intermediate** | Use andThen, tap, and flatten to sequence computations, run side effects, and flatten nested structures in Effect, Stream, Option, and Either. |
| [Handling Errors with catchAll, orElse, and match](./content/published/combinator-error-handling.mdx) | 🟡 **Intermediate** | Use catchAll, orElse, and match to recover from errors, provide fallbacks, or transform errors in Effect, Either, and Option. |
| [Mapping and Chaining over Collections with forEach and all](./content/published/combinator-foreach-all.mdx) | 🟡 **Intermediate** | Use forEach and all to apply effectful functions to collections and combine the results, enabling batch and parallel processing. |

## Composition
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Combining Values with zip](./content/published/combinator-zip.mdx) | 🟢 **Beginner** | Use zip to combine two computations, pairing their results together in Effect, Stream, Option, or Either. |
| [Lifting Values with succeed, some, and right](./content/published/constructor-succeed-some-right.mdx) | 🟢 **Beginner** | Use succeed, some, and right to lift plain values into Effect, Option, or Either, making them composable and type-safe. |
| [Conditional Branching with if, when, and cond](./content/published/combinator-conditional.mdx) | 🟢 **Beginner** | Use combinators like if, when, and cond to express conditional logic declaratively across Effect, Stream, Option, and Either. |
| [Transforming Values with map](./content/published/combinator-map.mdx) | 🟢 **Beginner** | Use map to transform the result of an Effect, Stream, Option, or Either in a declarative, type-safe way. |
| [Chaining Computations with flatMap](./content/published/combinator-flatmap.mdx) | 🟢 **Beginner** | Use flatMap to chain together computations where each step may itself be effectful, optional, or error-prone. |
| [Filtering Results with filter](./content/published/combinator-filter.mdx) | 🟢 **Beginner** | Use filter to keep or discard results based on a predicate, across Effect, Stream, Option, and Either. |
| [Sequencing with andThen, tap, and flatten](./content/published/combinator-sequencing.mdx) | 🟡 **Intermediate** | Use andThen, tap, and flatten to sequence computations, run side effects, and flatten nested structures in Effect, Stream, Option, and Either. |
| [Handling Errors with catchAll, orElse, and match](./content/published/combinator-error-handling.mdx) | 🟡 **Intermediate** | Use catchAll, orElse, and match to recover from errors, provide fallbacks, or transform errors in Effect, Either, and Option. |

## Pairing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Combining Values with zip](./content/published/combinator-zip.mdx) | 🟢 **Beginner** | Use zip to combine two computations, pairing their results together in Effect, Stream, Option, or Either. |

## Error Management
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Handle Errors with catchTag, catchTags, and catchAll](./content/published/handle-errors-with-catch.mdx) | 🟡 **Intermediate** | Use catchTag for type-safe recovery from specific tagged errors, and catchAll to recover from any possible failure. |
| [Mapping Errors to Fit Your Domain](./content/published/mapping-errors-to-fit-your-domain.mdx) | 🟡 **Intermediate** | Use Effect.mapError to transform specific, low-level errors into more general domain errors, creating clean architectural boundaries. |
| [Control Repetition with Schedule](./content/published/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Model Optional Values Safely with Option](./content/published/model-optional-values-with-option.mdx) | 🟡 **Intermediate** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |
| [Define Type-Safe Errors with Data.TaggedError](./content/published/define-tagged-errors.mdx) | 🟡 **Intermediate** | Create custom, type-safe error classes by extending Data.TaggedError to make error handling robust, predictable, and self-documenting. |
| [Leverage Effect's Built-in Structured Logging](./content/published/leverage-structured-logging.mdx) | 🟡 **Intermediate** | Use Effect's built-in logging functions (Effect.log, Effect.logInfo, etc.) for structured, configurable, and context-aware logging. |
| [Conditionally Branching Workflows](./content/published/conditionally-branching-workflows.mdx) | 🟡 **Intermediate** | Use predicate-based operators like Effect.filter and Effect.if to make decisions and control the flow of your application based on runtime values. |
| [Retry Operations Based on Specific Errors](./content/published/retry-based-on-specific-errors.mdx) | 🟡 **Intermediate** | Use Effect.retry and predicate functions to selectively retry an operation only when specific, recoverable errors occur. |
| [Handle Flaky Operations with Retries and Timeouts](./content/published/handle-flaky-operations-with-retry-timeout.mdx) | 🟡 **Intermediate** | Use Effect.retry and Effect.timeout to build resilience against slow or intermittently failing operations, such as network requests. |
| [Distinguish 'Not Found' from Errors](./content/published/distinguish-not-found-from-errors.mdx) | 🟡 **Intermediate** | Use Effect<Option<A>> to clearly distinguish between a recoverable 'not found' case (None) and a true failure (Fail). |
| [Accumulate Multiple Errors with Either](./content/published/accumulate-multiple-errors-with-either.mdx) | 🟡 **Intermediate** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/published/handle-unexpected-errors-with-cause.mdx) | 🟠 **Advanced** | Use Effect.catchAllCause or Effect.runFork to inspect the Cause of a failure, distinguishing between expected errors (Fail) and unexpected defects (Die). |

## Collections
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Collections](./content/published/constructor-from-iterable.mdx) | 🟢 **Beginner** | Use fromIterable and fromArray to create Streams or Effects from arrays, iterables, or other collections, enabling batch and streaming operations. |
| [Working with Immutable Arrays using Data.array](./content/published/data-array.mdx) | 🟢 **Beginner** | Use Data.array to create immutable, type-safe arrays that support value-based equality and safe functional operations. |
| [Use Chunk for High-Performance Collections](./content/published/data-chunk.mdx) | 🟡 **Intermediate** | Use Chunk<A> as a high-performance, immutable alternative to JavaScript's Array, especially for data processing pipelines. |
| [Work with Immutable Sets using HashSet](./content/published/data-hashset.mdx) | 🟡 **Intermediate** | Use HashSet<A> to model immutable, high-performance sets for efficient membership checks and set operations. |
| [Mapping and Chaining over Collections with forEach and all](./content/published/combinator-foreach-all.mdx) | 🟡 **Intermediate** | Use forEach and all to apply effectful functions to collections and combine the results, enabling batch and parallel processing. |

## Performance
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Use Chunk for High-Performance Collections](./content/published/data-chunk.mdx) | 🟡 **Intermediate** | Use Chunk<A> as a high-performance, immutable alternative to JavaScript's Array, especially for data processing pipelines. |
| [Add Custom Metrics to Your Application](./content/published/observability-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Trace Operations Across Services with Spans](./content/published/observability-tracing-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |

## Constructors
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Synchronous and Callback Code](./content/published/constructor-sync-async.mdx) | 🟢 **Beginner** | Use sync and async to lift synchronous or callback-based computations into Effect, enabling safe and composable interop with legacy code. |
| [Lifting Values with succeed, some, and right](./content/published/constructor-succeed-some-right.mdx) | 🟢 **Beginner** | Use succeed, some, and right to lift plain values into Effect, Option, or Either, making them composable and type-safe. |
| [Converting from Nullable, Option, or Either](./content/published/constructor-from-nullable-option-either.mdx) | 🟢 **Beginner** | Use fromNullable, fromOption, and fromEither to convert nullable values, Option, or Either into Effects or Streams, enabling safe and composable interop. |
| [Wrapping Synchronous and Asynchronous Computations](./content/published/constructor-try-trypromise.mdx) | 🟢 **Beginner** | Use try and tryPromise to safely wrap synchronous or asynchronous computations that may throw or reject, capturing errors in the Effect world. |
| [Creating from Collections](./content/published/constructor-from-iterable.mdx) | 🟢 **Beginner** | Use fromIterable and fromArray to create Streams or Effects from arrays, iterables, or other collections, enabling batch and streaming operations. |
| [Lifting Errors and Absence with fail, none, and left](./content/published/constructor-fail-none-left.mdx) | 🟢 **Beginner** | Use fail, none, and left to represent errors or absence in Effect, Option, or Either, making failures explicit and type-safe. |

## Interop
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Synchronous and Callback Code](./content/published/constructor-sync-async.mdx) | 🟢 **Beginner** | Use sync and async to lift synchronous or callback-based computations into Effect, enabling safe and composable interop with legacy code. |
| [Converting from Nullable, Option, or Either](./content/published/constructor-from-nullable-option-either.mdx) | 🟢 **Beginner** | Use fromNullable, fromOption, and fromEither to convert nullable values, Option, or Either into Effects or Streams, enabling safe and composable interop. |
| [Wrapping Synchronous and Asynchronous Computations](./content/published/constructor-try-trypromise.mdx) | 🟢 **Beginner** | Use try and tryPromise to safely wrap synchronous or asynchronous computations that may throw or reject, capturing errors in the Effect world. |

## Async
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Synchronous and Callback Code](./content/published/constructor-sync-async.mdx) | 🟢 **Beginner** | Use sync and async to lift synchronous or callback-based computations into Effect, enabling safe and composable interop with legacy code. |
| [Wrapping Synchronous and Asynchronous Computations](./content/published/constructor-try-trypromise.mdx) | 🟢 **Beginner** | Use try and tryPromise to safely wrap synchronous or asynchronous computations that may throw or reject, capturing errors in the Effect world. |

## Callback
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Synchronous and Callback Code](./content/published/constructor-sync-async.mdx) | 🟢 **Beginner** | Use sync and async to lift synchronous or callback-based computations into Effect, enabling safe and composable interop with legacy code. |

## Optional Values
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Model Optional Values Safely with Option](./content/published/data-option.mdx) | 🟢 **Beginner** | Use Option<A> to explicitly represent a value that may or may not exist, eliminating null and undefined errors. |

## Building APIs
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Handle a GET Request](./content/published/handle-get-request.mdx) | 🟢 **Beginner** | Define a route that responds to a specific HTTP GET request path. |
| [Send a JSON Response](./content/published/send-json-response.mdx) | 🟢 **Beginner** | Create and send a structured JSON response with the correct headers and status code. |
| [Extract Path Parameters](./content/published/extract-path-parameters.mdx) | 🟢 **Beginner** | Capture and use dynamic segments from a request URL, such as a resource ID. |
| [Create a Basic HTTP Server](./content/published/launch-http-server.mdx) | 🟢 **Beginner** | Launch a simple, effect-native HTTP server to respond to incoming requests. |
| [Validate Request Body](./content/published/validate-request-body.mdx) | 🟡 **Intermediate** | Safely parse and validate an incoming JSON request body against a predefined Schema. |
| [Provide Dependencies to Routes](./content/published/provide-dependencies-to-routes.mdx) | 🟡 **Intermediate** | Inject services like database connections into HTTP route handlers using Layer and Effect.Service. |
| [Handle API Errors](./content/published/handle-api-errors.mdx) | 🟡 **Intermediate** | Translate application-specific errors from the Effect failure channel into meaningful HTTP error responses. |
| [Make an Outgoing HTTP Client Request](./content/published/make-http-client-request.mdx) | 🟡 **Intermediate** | Use the built-in Effect HTTP client to make safe and composable requests to external services from within your API. |

## Core Concepts
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Understand that Effects are Lazy Blueprints](./content/published/effects-are-lazy.mdx) | 🟢 **Beginner** | An Effect is a lazy, immutable blueprint describing a computation, which does nothing until it is explicitly executed by a runtime. |
| [Wrap Asynchronous Computations with tryPromise](./content/published/wrap-asynchronous-computations.mdx) | 🟢 **Beginner** | Use Effect.tryPromise to safely convert a function that returns a Promise into an Effect, capturing rejections in the error channel. |
| [Write Sequential Code with Effect.gen](./content/published/write-sequential-code-with-gen.mdx) | 🟢 **Beginner** | Use Effect.gen with yield* to write sequential, asynchronous code in a style that looks and feels like familiar async/await. |
| [Transform Effect Values with map and flatMap](./content/published/transform-effect-values.mdx) | 🟢 **Beginner** | Use Effect.map for synchronous transformations and Effect.flatMap to chain operations that return another Effect. |
| [Create Pre-resolved Effects with succeed and fail](./content/published/create-pre-resolved-effect.mdx) | 🟢 **Beginner** | Use Effect.succeed(value) to create an Effect that immediately succeeds with a value, and Effect.fail(error) for an Effect that immediately fails. |
| [Solve Promise Problems with Effect](./content/published/solve-promise-problems-with-effect.mdx) | 🟢 **Beginner** | Understand how Effect solves the fundamental problems of native Promises, such as untyped errors, lack of dependency injection, and no built-in cancellation. |
| [Wrap Synchronous Computations with sync and try](./content/published/wrap-synchronous-computations.mdx) | 🟢 **Beginner** | Use Effect.sync for non-throwing synchronous code and Effect.try for synchronous code that might throw an exception. |
| [Use .pipe for Composition](./content/published/use-pipe-for-composition.mdx) | 🟢 **Beginner** | Use the .pipe() method to chain multiple operations onto an Effect in a readable, top-to-bottom sequence. |
| [Understand the Three Effect Channels (A, E, R)](./content/published/understand-effect-channels.mdx) | 🟢 **Beginner** | Learn about the three generic parameters of an Effect: the success value (A), the failure error (E), and the context requirements (R). |
| [Control Repetition with Schedule](./content/published/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Conditionally Branching Workflows](./content/published/conditionally-branching-workflows.mdx) | 🟡 **Intermediate** | Use predicate-based operators like Effect.filter and Effect.if to make decisions and control the flow of your application based on runtime values. |
| [Control Flow with Conditional Combinators](./content/published/control-flow-with-combinators.mdx) | 🟡 **Intermediate** | Use combinators like Effect.if, Effect.when, and Effect.cond to handle conditional logic in a declarative, composable way. |
| [Process Streaming Data with Stream](./content/published/process-streaming-data-with-stream.mdx) | 🟡 **Intermediate** | Use Stream<A, E, R> to represent and process data that arrives over time, such as file reads, WebSocket messages, or paginated API results. |
| [Manage Shared State Safely with Ref](./content/published/manage-shared-state-with-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Understand Layers for Dependency Injection](./content/published/understand-layers-for-dependency-injection.mdx) | 🟡 **Intermediate** | A Layer is a blueprint that describes how to build a service, detailing its own requirements and any potential errors during its construction. |
| [Use Chunk for High-Performance Collections](./content/published/use-chunk-for-high-performance-collections.mdx) | 🟡 **Intermediate** | Use Chunk<A> as a high-performance, immutable alternative to JavaScript's Array, especially for data processing pipelines. |
| [Understand Fibers as Lightweight Threads](./content/published/understand-fibers-as-lightweight-threads.mdx) | 🟠 **Advanced** | A Fiber is a lightweight, virtual thread managed by the Effect runtime, enabling massive concurrency on a single OS thread without the overhead of traditional threading. |

## Concurrency
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Control Repetition with Schedule](./content/published/control-repetition-with-schedule.mdx) | 🟡 **Intermediate** | Use Schedule to create composable, stateful policies that define precisely how an effect should be repeated or retried. |
| [Race Concurrent Effects for the Fastest Result](./content/published/race-concurrent-effects.mdx) | 🟡 **Intermediate** | Use Effect.race to run multiple effects concurrently and proceed with the result of the one that succeeds first, automatically interrupting the others. |
| [Modeling Effect Results with Exit](./content/published/data-exit.mdx) | 🟡 **Intermediate** | Use Exit<E, A> to represent the result of running an Effect, capturing both success and failure (including defects) in a type-safe way. |
| [Manage Shared State Safely with Ref](./content/published/manage-shared-state-with-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Run Independent Effects in Parallel with Effect.all](./content/published/run-effects-in-parallel-with-all.mdx) | 🟡 **Intermediate** | Use Effect.all to run multiple independent effects concurrently and collect all their results into a single tuple. |
| [Process a Collection in Parallel with Effect.forEach](./content/published/process-collection-in-parallel-with-foreach.mdx) | 🟡 **Intermediate** | Use Effect.forEach with the `concurrency` option to process a collection of items in parallel with a fixed limit, preventing resource exhaustion. |
| [Manage Shared State Safely with Ref](./content/published/data-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |
| [Add Caching by Wrapping a Layer](./content/published/add-caching-by-wrapping-a-layer.mdx) | 🟠 **Advanced** | Implement caching by creating a new layer that wraps a live service, intercepting method calls to add caching logic without modifying the original service. |
| [Manage Resource Lifecycles with Scope](./content/published/manage-resource-lifecycles-with-scope.mdx) | 🟠 **Advanced** | Use Scope for fine-grained, manual control over resource lifecycles, ensuring cleanup logic (finalizers) is always executed. |
| [Run Background Tasks with Effect.fork](./content/published/run-background-tasks-with-fork.mdx) | 🟠 **Advanced** | Use Effect.fork to start a computation in a background fiber, allowing the parent fiber to continue its work without waiting. |
| [Execute Long-Running Apps with Effect.runFork](./content/published/execute-long-running-apps-with-runfork.mdx) | 🟠 **Advanced** | Use Effect.runFork at the application's entry point to launch a long-running process as a detached fiber, allowing for graceful shutdown. |
| [Implement Graceful Shutdown for Your Application](./content/published/implement-graceful-shutdown.mdx) | 🟠 **Advanced** | Use Effect.runFork and listen for OS signals (SIGINT, SIGTERM) to trigger a Fiber.interrupt, ensuring all resources are safely released. |
| [Decouple Fibers with Queues and PubSub](./content/published/decouple-fibers-with-queue-pubsub.mdx) | 🟠 **Advanced** | Use Queue for point-to-point work distribution and PubSub for broadcast messaging to enable safe, decoupled communication between concurrent fibers. |
| [Poll for Status Until a Task Completes](./content/published/poll-for-status-until-task-completes.mdx) | 🟠 **Advanced** | Use Effect.race to run a repeating polling effect alongside a main task, automatically stopping the polling when the main task finishes. |
| [Understand Fibers as Lightweight Threads](./content/published/understand-fibers-as-lightweight-threads.mdx) | 🟠 **Advanced** | A Fiber is a lightweight, virtual thread managed by the Effect runtime, enabling massive concurrency on a single OS thread without the overhead of traditional threading. |

## Testing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accessing the Current Time with Clock](./content/published/accessing-current-time-with-clock.mdx) | 🟡 **Intermediate** | Use the Clock service to access the current time in a testable, deterministic way, avoiding direct calls to Date.now(). |
| [Write Tests That Adapt to Application Code](./content/published/write-tests-that-adapt-to-application-code.mdx) | 🟡 **Intermediate** | A cardinal rule of testing: Tests must adapt to the application's interface, not the other way around. Never modify application code solely to make a test pass. |
| [Use the Auto-Generated .Default Layer in Tests](./content/published/use-default-layer-for-tests.mdx) | 🟡 **Intermediate** | When testing, always use the MyService.Default layer that is automatically generated by the Effect.Service class for dependency injection. |
| [Mocking Dependencies in Tests](./content/published/mocking-dependencies-in-tests.mdx) | 🟡 **Intermediate** | Use a test-specific Layer to provide mock implementations of services your code depends on, enabling isolated and deterministic unit tests. |
| [Model Dependencies as Services](./content/published/model-dependencies-as-services.mdx) | 🟡 **Intermediate** | Abstract external dependencies and capabilities into swappable, testable services using Effect's dependency injection system. |
| [Create a Testable HTTP Client Service](./content/published/create-a-testable-http-client-service.mdx) | 🟡 **Intermediate** | Define an HttpClient service with separate 'Live' and 'Test' layers to enable robust, testable interactions with external APIs. |
| [Organize Layers into Composable Modules](./content/published/organize-layers-into-composable-modules.mdx) | 🟠 **Advanced** | Structure a large application by grouping related services into 'module' layers, which are then composed together with a shared base layer. |

## Tooling and Debugging
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Supercharge Your Editor with the Effect LSP](./content/published/supercharge-your-editor-with-the-effect-lsp.mdx) | 🟡 **Intermediate** | Install the Effect Language Server (LSP) extension for your editor to get rich, inline type information and enhanced error checking for your Effect code. |
| [Teach your AI Agents Effect with the MCP Server](./content/published/teach-your-ai-agents-effect-with-the-mcp-server.mdx) | 🟠 **Advanced** | Use the Effect MCP server to provide live, contextual information about your application's structure directly to AI coding agents. |

## Observability
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Instrument and Observe Function Calls with Effect.fn](./content/published/observability-effect-fn.mdx) | 🟡 **Intermediate** | Use Effect.fn to wrap, instrument, and observe function calls, enabling composable logging, metrics, and tracing at function boundaries. |
| [Leverage Effect's Built-in Structured Logging](./content/published/observability-structured-logging.mdx) | 🟡 **Intermediate** | Use Effect's built-in logging functions for structured, configurable, and context-aware logging. |
| [Add Custom Metrics to Your Application](./content/published/add-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Add Custom Metrics to Your Application](./content/published/observability-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Trace Operations Across Services with Spans](./content/published/observability-tracing-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |
| [Trace Operations Across Services with Spans](./content/published/trace-operations-with-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |
| [Integrate Effect Tracing with OpenTelemetry](./content/published/observability-opentelemetry.mdx) | 🟠 **Advanced** | Connect Effect's tracing spans to OpenTelemetry for end-to-end distributed tracing and visualization. |

## Instrumentation
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Instrument and Observe Function Calls with Effect.fn](./content/published/observability-effect-fn.mdx) | 🟡 **Intermediate** | Use Effect.fn to wrap, instrument, and observe function calls, enabling composable logging, metrics, and tracing at function boundaries. |

## Function Calls
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Instrument and Observe Function Calls with Effect.fn](./content/published/observability-effect-fn.mdx) | 🟡 **Intermediate** | Use Effect.fn to wrap, instrument, and observe function calls, enabling composable logging, metrics, and tracing at function boundaries. |

## Debugging
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Instrument and Observe Function Calls with Effect.fn](./content/published/observability-effect-fn.mdx) | 🟡 **Intermediate** | Use Effect.fn to wrap, instrument, and observe function calls, enabling composable logging, metrics, and tracing at function boundaries. |
| [Leverage Effect's Built-in Structured Logging](./content/published/observability-structured-logging.mdx) | 🟡 **Intermediate** | Use Effect's built-in logging functions for structured, configurable, and context-aware logging. |
| [Trace Operations Across Services with Spans](./content/published/observability-tracing-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/published/data-cause.mdx) | 🟠 **Advanced** | Use Cause<E> to get rich, structured information about errors and failures, including defects, interruptions, and error traces. |

## Modeling Data
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Comparing Data by Value with Structural Equality](./content/published/comparing-data-by-value-with-structural-equality.mdx) | 🟢 **Beginner** | Use Data.struct and Equal.equals to safely compare objects by their value instead of their reference, avoiding common JavaScript pitfalls. |

## Logging
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Leverage Effect's Built-in Structured Logging](./content/published/observability-structured-logging.mdx) | 🟡 **Intermediate** | Use Effect's built-in logging functions for structured, configurable, and context-aware logging. |
| [Redact and Handle Sensitive Data](./content/published/data-redacted.mdx) | 🟡 **Intermediate** | Use Redacted to securely handle sensitive data, ensuring secrets are not accidentally logged or exposed. |

## Making HTTP Requests
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Add Custom Metrics to Your Application](./content/published/add-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |
| [Model Dependencies as Services](./content/published/model-dependencies-as-services.mdx) | 🟡 **Intermediate** | Abstract external dependencies and capabilities into swappable, testable services using Effect's dependency injection system. |
| [Create a Testable HTTP Client Service](./content/published/create-a-testable-http-client-service.mdx) | 🟡 **Intermediate** | Define an HttpClient service with separate 'Live' and 'Test' layers to enable robust, testable interactions with external APIs. |
| [Add Caching by Wrapping a Layer](./content/published/add-caching-by-wrapping-a-layer.mdx) | 🟠 **Advanced** | Implement caching by creating a new layer that wraps a live service, intercepting method calls to add caching logic without modifying the original service. |
| [Build a Basic HTTP Server](./content/published/build-a-basic-http-server.mdx) | 🟠 **Advanced** | Combine Layer, Runtime, and Effect to create a simple, robust HTTP server using Node.js's built-in http module. |
| [Create a Managed Runtime for Scoped Resources](./content/published/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |

## Set Operations
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Work with Immutable Sets using HashSet](./content/published/data-hashset.mdx) | 🟡 **Intermediate** | Use HashSet<A> to model immutable, high-performance sets for efficient membership checks and set operations. |

## Resource Management
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Safely Bracket Resource Usage with `acquireRelease`](./content/published/safely-bracket-resource-usage.mdx) | 🟢 **Beginner** | Use `Effect.acquireRelease` to guarantee a resource's cleanup logic runs, even if errors or interruptions occur. |
| [Create a Service Layer from a Managed Resource](./content/published/scoped-service-layer.mdx) | 🟡 **Intermediate** | Use `Layer.scoped` with `Effect.Service` to transform a managed resource into a shareable, application-wide service. |
| [Compose Resource Lifecycles with `Layer.merge`](./content/published/compose-scoped-layers.mdx) | 🟡 **Intermediate** | Combine multiple resource-managing layers, letting Effect automatically handle the acquisition and release order. |
| [Manage Resource Lifecycles with Scope](./content/published/manage-resource-lifecycles-with-scope.mdx) | 🟠 **Advanced** | Use Scope for fine-grained, manual control over resource lifecycles, ensuring cleanup logic (finalizers) is always executed. |
| [Manually Manage Lifecycles with `Scope`](./content/published/manual-scope-management.mdx) | 🟠 **Advanced** | Use `Scope` directly to manage complex resource lifecycles or when building custom layers. |
| [Implement Graceful Shutdown for Your Application](./content/published/implement-graceful-shutdown.mdx) | 🟠 **Advanced** | Use Effect.runFork and listen for OS signals (SIGINT, SIGTERM) to trigger a Fiber.interrupt, ensuring all resources are safely released. |
| [Create a Managed Runtime for Scoped Resources](./content/published/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |

## Sequencing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Chaining Computations with flatMap](./content/published/combinator-flatmap.mdx) | 🟢 **Beginner** | Use flatMap to chain together computations where each step may itself be effectful, optional, or error-prone. |
| [Sequencing with andThen, tap, and flatten](./content/published/combinator-sequencing.mdx) | 🟡 **Intermediate** | Use andThen, tap, and flatten to sequence computations, run side effects, and flatten nested structures in Effect, Stream, Option, and Either. |

## Side Effects
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Sequencing with andThen, tap, and flatten](./content/published/combinator-sequencing.mdx) | 🟡 **Intermediate** | Use andThen, tap, and flatten to sequence computations, run side effects, and flatten nested structures in Effect, Stream, Option, and Either. |

## File Handling
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Safely Bracket Resource Usage with `acquireRelease`](./content/published/safely-bracket-resource-usage.mdx) | 🟢 **Beginner** | Use `Effect.acquireRelease` to guarantee a resource's cleanup logic runs, even if errors or interruptions occur. |

## Database Connections
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Safely Bracket Resource Usage with `acquireRelease`](./content/published/safely-bracket-resource-usage.mdx) | 🟢 **Beginner** | Use `Effect.acquireRelease` to guarantee a resource's cleanup logic runs, even if errors or interruptions occur. |

## Network Requests
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Safely Bracket Resource Usage with `acquireRelease`](./content/published/safely-bracket-resource-usage.mdx) | 🟢 **Beginner** | Use `Effect.acquireRelease` to guarantee a resource's cleanup logic runs, even if errors or interruptions occur. |

## Building Data Pipelines
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create a Stream from a List](./content/published/stream-from-iterable.mdx) | 🟢 **Beginner** | Turn a simple in-memory array or list into a foundational data pipeline using Stream. |
| [Run a Pipeline for its Side Effects](./content/published/stream-run-for-effects.mdx) | 🟢 **Beginner** | Execute a pipeline for its effects without collecting the results, saving memory. |
| [Collect All Results into a List](./content/published/stream-collect-results.mdx) | 🟢 **Beginner** | Run a pipeline and gather all of its results into an in-memory array. |
| [Turn a Paginated API into a Single Stream](./content/published/stream-from-paginated-api.mdx) | 🟡 **Intermediate** | Convert a paginated API into a continuous, easy-to-use stream, abstracting away the complexity of fetching page by page. |
| [Process Items Concurrently](./content/published/stream-process-concurrently.mdx) | 🟡 **Intermediate** | Perform an asynchronous action for each item in a stream with controlled parallelism to dramatically improve performance. |
| [Process Items in Batches](./content/published/stream-process-in-batches.mdx) | 🟡 **Intermediate** | Group items into chunks for efficient bulk operations, like database inserts or batch API calls. |
| [Process collections of data asynchronously](./content/published/process-a-collection-of-data-asynchronously.mdx) | 🟡 **Intermediate** | Process collections of data asynchronously in a lazy, composable, and resource-safe manner using Effect's Stream. |
| [Process a Large File with Constant Memory](./content/published/stream-from-file.mdx) | 🟡 **Intermediate** | Create a data pipeline from a file on disk, processing it line-by-line without loading the entire file into memory. |
| [Automatically Retry Failed Operations](./content/published/stream-retry-on-failure.mdx) | 🟡 **Intermediate** | Build a self-healing pipeline that can automatically retry failed processing steps using a configurable backoff strategy. |
| [Manage Resources Safely in a Pipeline](./content/published/stream-manage-resources.mdx) | 🟠 **Advanced** | Ensure resources like file handles or connections are safely acquired at the start of a pipeline and always released at the end, even on failure. |

## Error Handling
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accumulate Multiple Errors with Either](./content/published/data-either.mdx) | 🟢 **Beginner** | Use Either<E, A> to represent computations that can fail, allowing you to accumulate multiple errors instead of short-circuiting on the first one. |
| [Wrapping Synchronous and Asynchronous Computations](./content/published/constructor-try-trypromise.mdx) | 🟢 **Beginner** | Use try and tryPromise to safely wrap synchronous or asynchronous computations that may throw or reject, capturing errors in the Effect world. |
| [Matching on Success and Failure with match](./content/published/pattern-match.mdx) | 🟢 **Beginner** | Use match to handle both success and failure cases in a single, declarative place for Effect, Option, and Either. |
| [Lifting Errors and Absence with fail, none, and left](./content/published/constructor-fail-none-left.mdx) | 🟢 **Beginner** | Use fail, none, and left to represent errors or absence in Effect, Option, or Either, making failures explicit and type-safe. |
| [Handling Errors with catchAll, orElse, and match](./content/published/combinator-error-handling.mdx) | 🟡 **Intermediate** | Use catchAll, orElse, and match to recover from errors, provide fallbacks, or transform errors in Effect, Either, and Option. |
| [Modeling Effect Results with Exit](./content/published/data-exit.mdx) | 🟡 **Intermediate** | Use Exit<E, A> to represent the result of running an Effect, capturing both success and failure (including defects) in a type-safe way. |
| [Matching Tagged Unions with matchTag and matchTags](./content/published/pattern-matchtag.mdx) | 🟡 **Intermediate** | Use matchTag and matchTags to pattern match on specific tagged union cases, enabling precise and type-safe branching. |
| [Effectful Pattern Matching with matchEffect](./content/published/pattern-matcheffect.mdx) | 🟡 **Intermediate** | Use matchEffect to perform effectful branching based on success or failure, enabling rich workflows in the Effect world. |
| [Handling Specific Errors with catchTag and catchTags](./content/published/pattern-catchtag.mdx) | 🟡 **Intermediate** | Use catchTag and catchTags to recover from or handle specific error types in the Effect failure channel, enabling precise and type-safe error recovery. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/published/data-cause.mdx) | 🟠 **Advanced** | Use Cause<E> to get rich, structured information about errors and failures, including defects, interruptions, and error traces. |

## Application Configuration
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Access Configuration from the Context](./content/published/access-config-in-context.mdx) | 🟡 **Intermediate** | Access your type-safe configuration within an Effect.gen block by yielding the Config object you defined. |
| [Define a Type-Safe Configuration Schema](./content/published/define-config-schema.mdx) | 🟡 **Intermediate** | Use Effect.Config primitives to define a schema for your application's configuration, ensuring type-safety and separation from code. |
| [Provide Configuration to Your App via a Layer](./content/published/provide-config-layer.mdx) | 🟡 **Intermediate** | Use Config.layer(schema) to create a Layer that provides your configuration schema to the application's context. |

## Security
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Redact and Handle Sensitive Data](./content/published/data-redacted.mdx) | 🟡 **Intermediate** | Use Redacted to securely handle sensitive data, ensuring secrets are not accidentally logged or exposed. |

## Sensitive Data
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Redact and Handle Sensitive Data](./content/published/data-redacted.mdx) | 🟡 **Intermediate** | Use Redacted to securely handle sensitive data, ensuring secrets are not accidentally logged or exposed. |

## Modeling Time
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Accessing the Current Time with Clock](./content/published/accessing-current-time-with-clock.mdx) | 🟡 **Intermediate** | Use the Clock service to access the current time in a testable, deterministic way, avoiding direct calls to Date.now(). |
| [Representing Time Spans with Duration](./content/published/representing-time-spans-with-duration.mdx) | 🟡 **Intermediate** | Use the Duration data type to represent time intervals in a type-safe, human-readable, and composable way. |
| [Beyond the Date Type - Real World Dates, Times, and Timezones](./content/published/beyond-the-date-type.mdx) | 🟡 **Intermediate** | Use the Clock service for testable access to the current time and prefer immutable primitives for storing and passing timestamps. |

## Project Setup & Execution
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Execute Synchronous Effects with Effect.runSync](./content/published/execute-with-runsync.mdx) | 🟢 **Beginner** | Use Effect.runSync at the 'end of the world' to execute a purely synchronous Effect and get its value directly. |
| [Execute Asynchronous Effects with Effect.runPromise](./content/published/execute-with-runpromise.mdx) | 🟢 **Beginner** | Use Effect.runPromise at the 'end of the world' to execute an asynchronous Effect and get its result as a JavaScript Promise. |
| [Set Up a New Effect Project](./content/published/setup-new-project.mdx) | 🟢 **Beginner** | Initialize a new Node.js project with the necessary TypeScript configuration and Effect dependencies to start building. |
| [Execute Long-Running Apps with Effect.runFork](./content/published/execute-long-running-apps-with-runfork.mdx) | 🟠 **Advanced** | Use Effect.runFork at the application's entry point to launch a long-running process as a detached fiber, allowing for graceful shutdown. |
| [Create a Reusable Runtime from Layers](./content/published/create-reusable-runtime-from-layers.mdx) | 🟠 **Advanced** | Compile your application's layers into a reusable Runtime object to efficiently execute multiple effects that share the same context. |
| [Create a Managed Runtime for Scoped Resources](./content/published/create-managed-runtime-for-scoped-resources.mdx) | 🟠 **Advanced** | Use Layer.launch to safely manage the lifecycle of layers containing scoped resources, ensuring finalizers are always run. |

## Lifting
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Lifting Values with succeed, some, and right](./content/published/constructor-succeed-some-right.mdx) | 🟢 **Beginner** | Use succeed, some, and right to lift plain values into Effect, Option, or Either, making them composable and type-safe. |
| [Lifting Errors and Absence with fail, none, and left](./content/published/constructor-fail-none-left.mdx) | 🟢 **Beginner** | Use fail, none, and left to represent errors or absence in Effect, Option, or Either, making failures explicit and type-safe. |

## Metrics
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Add Custom Metrics to Your Application](./content/published/observability-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |

## Monitoring
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Add Custom Metrics to Your Application](./content/published/observability-custom-metrics.mdx) | 🟡 **Intermediate** | Use Effect's Metric module to instrument your code with counters, gauges, and histograms to track key business and performance indicators. |

## Effect Results
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Modeling Effect Results with Exit](./content/published/data-exit.mdx) | 🟡 **Intermediate** | Use Exit<E, A> to represent the result of running an Effect, capturing both success and failure (including defects) in a type-safe way. |
| [Handle Unexpected Errors by Inspecting the Cause](./content/published/data-cause.mdx) | 🟠 **Advanced** | Use Cause<E> to get rich, structured information about errors and failures, including defects, interruptions, and error traces. |

## Numeric Precision
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Work with Arbitrary-Precision Numbers using BigDecimal](./content/published/data-bigdecimal.mdx) | 🟡 **Intermediate** | Use BigDecimal for arbitrary-precision decimal arithmetic, avoiding rounding errors and loss of precision in financial or scientific calculations. |

## Financial
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Work with Arbitrary-Precision Numbers using BigDecimal](./content/published/data-bigdecimal.mdx) | 🟡 **Intermediate** | Use BigDecimal for arbitrary-precision decimal arithmetic, avoiding rounding errors and loss of precision in financial or scientific calculations. |

## Scientific
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Work with Arbitrary-Precision Numbers using BigDecimal](./content/published/data-bigdecimal.mdx) | 🟡 **Intermediate** | Use BigDecimal for arbitrary-precision decimal arithmetic, avoiding rounding errors and loss of precision in financial or scientific calculations. |

## Pattern Matching
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Matching on Success and Failure with match](./content/published/pattern-match.mdx) | 🟢 **Beginner** | Use match to handle both success and failure cases in a single, declarative place for Effect, Option, and Either. |
| [Checking Option and Either Cases](./content/published/pattern-option-either-checks.mdx) | 🟢 **Beginner** | Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe branching. |
| [Matching Tagged Unions with matchTag and matchTags](./content/published/pattern-matchtag.mdx) | 🟡 **Intermediate** | Use matchTag and matchTags to pattern match on specific tagged union cases, enabling precise and type-safe branching. |
| [Effectful Pattern Matching with matchEffect](./content/published/pattern-matcheffect.mdx) | 🟡 **Intermediate** | Use matchEffect to perform effectful branching based on success or failure, enabling rich workflows in the Effect world. |
| [Handling Specific Errors with catchTag and catchTags](./content/published/pattern-catchtag.mdx) | 🟡 **Intermediate** | Use catchTag and catchTags to recover from or handle specific error types in the Effect failure channel, enabling precise and type-safe error recovery. |

## Tagged Unions
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Matching Tagged Unions with matchTag and matchTags](./content/published/pattern-matchtag.mdx) | 🟡 **Intermediate** | Use matchTag and matchTags to pattern match on specific tagged union cases, enabling precise and type-safe branching. |
| [Handling Specific Errors with catchTag and catchTags](./content/published/pattern-catchtag.mdx) | 🟡 **Intermediate** | Use catchTag and catchTags to recover from or handle specific error types in the Effect failure channel, enabling precise and type-safe error recovery. |
| [Modeling Tagged Unions with Data.case](./content/published/data-case.mdx) | 🟡 **Intermediate** | Use Data.case to create tagged unions (algebraic data types) for robust, type-safe domain modeling and pattern matching. |

## Branching
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Matching on Success and Failure with match](./content/published/pattern-match.mdx) | 🟢 **Beginner** | Use match to handle both success and failure cases in a single, declarative place for Effect, Option, and Either. |
| [Checking Option and Either Cases](./content/published/pattern-option-either-checks.mdx) | 🟢 **Beginner** | Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe branching. |
| [Matching Tagged Unions with matchTag and matchTags](./content/published/pattern-matchtag.mdx) | 🟡 **Intermediate** | Use matchTag and matchTags to pattern match on specific tagged union cases, enabling precise and type-safe branching. |

## Conditional Logic
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Conditional Branching with if, when, and cond](./content/published/combinator-conditional.mdx) | 🟢 **Beginner** | Use combinators like if, when, and cond to express conditional logic declaratively across Effect, Stream, Option, and Either. |
| [Filtering Results with filter](./content/published/combinator-filter.mdx) | 🟢 **Beginner** | Use filter to keep or discard results based on a predicate, across Effect, Stream, Option, and Either. |

## Advanced Dependency Injection
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Manually Manage Lifecycles with `Scope`](./content/published/manual-scope-management.mdx) | 🟠 **Advanced** | Use `Scope` directly to manage complex resource lifecycles or when building custom layers. |

## Custom Layers
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Manually Manage Lifecycles with `Scope`](./content/published/manual-scope-management.mdx) | 🟠 **Advanced** | Use `Scope` directly to manage complex resource lifecycles or when building custom layers. |

## Tracing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Trace Operations Across Services with Spans](./content/published/observability-tracing-spans.mdx) | 🟡 **Intermediate** | Use Effect.withSpan to create custom tracing spans, providing detailed visibility into the performance and flow of your application's operations. |
| [Integrate Effect Tracing with OpenTelemetry](./content/published/observability-opentelemetry.mdx) | 🟠 **Advanced** | Connect Effect's tracing spans to OpenTelemetry for end-to-end distributed tracing and visualization. |

## Effectful Branching
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Effectful Pattern Matching with matchEffect](./content/published/pattern-matcheffect.mdx) | 🟡 **Intermediate** | Use matchEffect to perform effectful branching based on success or failure, enabling rich workflows in the Effect world. |

## Structural Equality
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Comparing Data by Value with Data.struct](./content/published/data-struct.mdx) | 🟢 **Beginner** | Use Data.struct to create immutable, structurally-typed objects that can be compared by value, not by reference. |
| [Working with Tuples using Data.tuple](./content/published/data-tuple.mdx) | 🟢 **Beginner** | Use Data.tuple to create immutable, type-safe tuples that support value-based equality and pattern matching. |
| [Working with Immutable Arrays using Data.array](./content/published/data-array.mdx) | 🟢 **Beginner** | Use Data.array to create immutable, type-safe arrays that support value-based equality and safe functional operations. |

## Branded Types
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Modeling Validated Domain Types with Brand](./content/published/brand-model-domain-type.mdx) | 🟡 **Intermediate** | Use Brand to create domain-specific types from primitives, making illegal states unrepresentable and preventing accidental misuse. |
| [Validating and Parsing Branded Types](./content/published/brand-validate-parse.mdx) | 🟡 **Intermediate** | Use Schema and Brand together to validate and parse branded types at runtime, ensuring only valid values are constructed. |

## Type Safety
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Modeling Validated Domain Types with Brand](./content/published/brand-model-domain-type.mdx) | 🟡 **Intermediate** | Use Brand to create domain-specific types from primitives, making illegal states unrepresentable and preventing accidental misuse. |

## Validation
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Validating and Parsing Branded Types](./content/published/brand-validate-parse.mdx) | 🟡 **Intermediate** | Use Schema and Brand together to validate and parse branded types at runtime, ensuring only valid values are constructed. |

## Parsing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Validating and Parsing Branded Types](./content/published/brand-validate-parse.mdx) | 🟡 **Intermediate** | Use Schema and Brand together to validate and parse branded types at runtime, ensuring only valid values are constructed. |

## Conversion
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Converting from Nullable, Option, or Either](./content/published/constructor-from-nullable-option-either.mdx) | 🟢 **Beginner** | Use fromNullable, fromOption, and fromEither to convert nullable values, Option, or Either into Effects or Streams, enabling safe and composable interop. |

## Type Classes
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Type Classes for Equality, Ordering, and Hashing with Data.Class](./content/published/data-class.mdx) | 🟡 **Intermediate** | Use Data.Class to derive and implement type classes for equality, ordering, and hashing, enabling composable and type-safe abstractions. |

## Equality
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Type Classes for Equality, Ordering, and Hashing with Data.Class](./content/published/data-class.mdx) | 🟡 **Intermediate** | Use Data.Class to derive and implement type classes for equality, ordering, and hashing, enabling composable and type-safe abstractions. |

## Ordering
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Type Classes for Equality, Ordering, and Hashing with Data.Class](./content/published/data-class.mdx) | 🟡 **Intermediate** | Use Data.Class to derive and implement type classes for equality, ordering, and hashing, enabling composable and type-safe abstractions. |

## Hashing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Type Classes for Equality, Ordering, and Hashing with Data.Class](./content/published/data-class.mdx) | 🟡 **Intermediate** | Use Data.Class to derive and implement type classes for equality, ordering, and hashing, enabling composable and type-safe abstractions. |

## Dependency Injection
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create a Service Layer from a Managed Resource](./content/published/scoped-service-layer.mdx) | 🟡 **Intermediate** | Use `Layer.scoped` with `Effect.Service` to transform a managed resource into a shareable, application-wide service. |
| [Compose Resource Lifecycles with `Layer.merge`](./content/published/compose-scoped-layers.mdx) | 🟡 **Intermediate** | Combine multiple resource-managing layers, letting Effect automatically handle the acquisition and release order. |

## Application Architecture
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Create a Service Layer from a Managed Resource](./content/published/scoped-service-layer.mdx) | 🟡 **Intermediate** | Use `Layer.scoped` with `Effect.Service` to transform a managed resource into a shareable, application-wide service. |
| [Compose Resource Lifecycles with `Layer.merge`](./content/published/compose-scoped-layers.mdx) | 🟡 **Intermediate** | Combine multiple resource-managing layers, letting Effect automatically handle the acquisition and release order. |

## Streams
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Collections](./content/published/constructor-from-iterable.mdx) | 🟢 **Beginner** | Use fromIterable and fromArray to create Streams or Effects from arrays, iterables, or other collections, enabling batch and streaming operations. |

## Batch Processing
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Creating from Collections](./content/published/constructor-from-iterable.mdx) | 🟢 **Beginner** | Use fromIterable and fromArray to create Streams or Effects from arrays, iterables, or other collections, enabling batch and streaming operations. |
| [Mapping and Chaining over Collections with forEach and all](./content/published/combinator-foreach-all.mdx) | 🟡 **Intermediate** | Use forEach and all to apply effectful functions to collections and combine the results, enabling batch and parallel processing. |

## Tuples
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Working with Tuples using Data.tuple](./content/published/data-tuple.mdx) | 🟢 **Beginner** | Use Data.tuple to create immutable, type-safe tuples that support value-based equality and pattern matching. |

## ADTs
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Modeling Tagged Unions with Data.case](./content/published/data-case.mdx) | 🟡 **Intermediate** | Use Data.case to create tagged unions (algebraic data types) for robust, type-safe domain modeling and pattern matching. |

## OpenTelemetry
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Integrate Effect Tracing with OpenTelemetry](./content/published/observability-opentelemetry.mdx) | 🟠 **Advanced** | Connect Effect's tracing spans to OpenTelemetry for end-to-end distributed tracing and visualization. |

## Distributed Systems
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Integrate Effect Tracing with OpenTelemetry](./content/published/observability-opentelemetry.mdx) | 🟠 **Advanced** | Connect Effect's tracing spans to OpenTelemetry for end-to-end distributed tracing and visualization. |

## Absence
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Lifting Errors and Absence with fail, none, and left](./content/published/constructor-fail-none-left.mdx) | 🟢 **Beginner** | Use fail, none, and left to represent errors or absence in Effect, Option, or Either, making failures explicit and type-safe. |

## Parallelism
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Mapping and Chaining over Collections with forEach and all](./content/published/combinator-foreach-all.mdx) | 🟡 **Intermediate** | Use forEach and all to apply effectful functions to collections and combine the results, enabling batch and parallel processing. |

## Option
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Checking Option and Either Cases](./content/published/pattern-option-either-checks.mdx) | 🟢 **Beginner** | Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe branching. |

## Either
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Checking Option and Either Cases](./content/published/pattern-option-either-checks.mdx) | 🟢 **Beginner** | Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe branching. |

## Checks
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Checking Option and Either Cases](./content/published/pattern-option-either-checks.mdx) | 🟢 **Beginner** | Use isSome, isNone, isLeft, and isRight to check Option and Either cases for simple, type-safe branching. |

## Date
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Work with Dates and Times using DateTime](./content/published/data-datetime.mdx) | 🟡 **Intermediate** | Use DateTime for immutable, time-zone-aware date and time values, enabling safe and precise time calculations. |

## Arrays
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Working with Immutable Arrays using Data.array](./content/published/data-array.mdx) | 🟢 **Beginner** | Use Data.array to create immutable, type-safe arrays that support value-based equality and safe functional operations. |

## State
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Manage Shared State Safely with Ref](./content/published/data-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |

## Mutable State
| Pattern | Skill Level | Summary |
| :--- | :--- | :--- |
| [Manage Shared State Safely with Ref](./content/published/data-ref.mdx) | 🟡 **Intermediate** | Use Ref<A> to model shared, mutable state in a concurrent environment, ensuring all updates are atomic and free of race conditions. |

