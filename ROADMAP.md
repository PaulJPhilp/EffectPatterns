
---

### 📍 Stage 1: The Foundation - "Why and What is Effect?"

This stage answers the most fundamental questions: Why does Effect exist, and what is it?

-   **1. The Limitations of Promises** `(Beginner)`
    -   🟣 [Solve Promise Problems with Effect](./content/solve-promise-problems-with-effect.mdx)
-   **2. Effects are Lazy Blueprints** `(Beginner)`
    -   🟣 [Understand that Effects are Lazy Blueprints](./content/effects-are-lazy.mdx)
-   **3. Fully Describe your Program** `(Beginner)`
    -   🟣 [The Three Effect Channels (A, E, R)](./content/understand-effect-channels.mdx)
-   **4. Run Your Program** `(Beginner)`
    -   🟣 [Executing Effects (`runPromise`, `runSync`)](./content/execute-with-runpromise.mdx)

---

### 📍 Stage 2: The Building Blocks - Creating Complex Programs

This stage introduces the "Lego Principle": how to build large, robust programs by creating and joining small, reliable pieces.

-   **5. Creating the Blocks** `(Beginner)`
    -   🟣 [How to Create Effects (`succeed`, `fail`, `sync`, `try`)](./content/create-pre-resolved-effect.mdx)
-   **6. Joining the Blocks** `(Beginner)`
    -   🟣 [Composition with `pipe`, `map`, and `flatMap`](./content/transform-effect-values.mdx)
-   **7. Building Multi-Step Sequences** `(Beginner)`
    -   🟣 [Sequential Workflows with `Effect.gen`](./content/write-sequential-code-with-gen.mdx)

---

### 📍 Stage 3: Modeling Failures - Building Resilient Programs

This stage covers how to handle the reality of failure, moving from just crashing to building robust, resilient applications.

-   **8. Defining Your Own Errors** `(Intermediate)`
    -   🟣 [Creating Type-Safe Errors with `Data.TaggedError`](./content/define-tagged-errors.mdx)
-   **9. Handling Errors** `(Intermediate)`
    -   🟣 [Recovering from Failures with `catchTag` & `catchAll`](./content/handle-errors-with-catch.mdx)
-   **10. Transforming Errors** `(Intermediate)`
    -   🟣 [Mapping Errors to Fit Your Domain](./content/mapping-errors.mdx)

---

### 📍 Stage 4: Modeling Data - Working with Effect's Data Types

This stage provides a tour of Effect's powerful, immutable data structures that solve common problems in data manipulation.

-   **11. Handling Optional Values** `(Intermediate)`
    -   🟣 [Modeling Absence Safely with `Option`](./content/model-optional-values-with-option.mdx)
-   **12. Accumulating Errors** `(Intermediate)`
    -   🟣 [Handling Multiple Errors with `Either`](./content/accumulate-multiple-errors-with-either.mdx)
-   **13. High-Performance Collections** `(Intermediate)`
    -   🟣 [Using `Chunk` for Efficient Data Processing](./content/use-chunk-for-high-performance-collections.mdx)
-   **14. Comparing Data by Value** `(Intermediate)`
    -   🟣 [Structural Equality with `Equal`](./content/comparing-data-by-value-with-structural-equality.mdx)

---

### 📍 Stage 5: Modeling Time - Building Time-Based Logic

This stage introduces the tools for making time a safe, testable, and first-class citizen in your applications, moving beyond the limitations of native JavaScript APIs.

-   **15. Handling Real World Dates** `(Intermediate)`
    -   🟣 [Beyond the `Date` Type: Dates, Times, and Timezones](./content/beyond-the-date-type.mdx)
-   **16. Representing Time Spans** `(Intermediate)`
    -   🟣 [Using `Duration` for Safe Time Intervals](./content/representing-time-spans-with-duration.mdx)
-   **17. Controlling Repetition** `(Intermediate)`
    -   🟣 [Creating Repeating Logic with `Schedule`](./content/control-repetition-with-schedule.mdx)
-   **18. Accessing the Current Time** `(Intermediate)`
    -   🟣 [Using the `Clock` Service for Testability](./content/accessing-current-time-with-clock.mdx)

---

### 📍 Stage 6: Modeling Domains - Building a Type-Safe Domain

This stage focuses on creating a rich, type-safe, and validated representation of your domain.

-   **19. Defining Data Contracts** `(Intermediate)`
    -   🟣 [Using `Schema` to Define Your Models](./content/define-contracts-with-schema.mdx)
-   **20. Validating and Transforming Data** `(Intermediate)`
    -   🟣 [Using `Schema` to Parse and Convert Data](./content/transform-data-with-schema.mdx)
-   **21. Creating Hyper-Specific Types** `(Intermediate)`
    -   🟣 [Using `Brand` to Create Validated Domain Types](./content/model-validated-domain-types-with-brand.mdx)

---

### 📍 Stage 7: Observability - Understanding Your Application in Production

This stage covers the three pillars of observability, giving you the tools to understand how your application behaves once it's deployed. Effect's observability is built on the industry-standard **OpenTelemetry (OTEL)** framework.

-   **22. Instrumenting Your Code with Logs** `(Intermediate)`
    -   🟣 [Using `Effect`'s Built-in Structured Logging](./content/leverage-structured-logging.mdx)
-   **23. Tracking Key Indicators with Metrics** `(Intermediate)`
    -   🟣 [Using `Metric` to Track Application Health](./content/add-custom-metrics.mdx)
-   **24. Debugging Performance with Traces** `(Intermediate)`
    -   🟣 [Using `Spans` to Trace Operations Across Services](./content/trace-operations-with-spans.mdx)

---

### 📍 Stage 8: Tooling and Debugging Patterns

-   **25. Supercharge Your Editor** `(Intermediate)`
    -   🟣 [Getting Rich Feedback with the Effect LSP](./content/supercharge-your-editor-with-the-effect-lsp.mdx)
-   **26. Deep Debugging** `(Advanced)`
    -   🟣 [Understanding Failures with `Exit` and `Cause`](./content/deep-debugging-with-exit-and-cause.mdx)
-   **27. Teach your AI Agents Effect** `(Advanced)`
    -   🟣 [Using the MCP Server to Guide AI](./content/teach-your-ai-agents-effect-with-the-mcp-server.mdx)
```

---

### 🚀 Next Chapters: From Patterns to Applications

The stages above cover the core patterns and building blocks of Effect. The next phase of this roadmap will focus on **"Recipes"**—comprehensive guides that show how to compose these patterns to build complete, real-world applications.

This section is actively under development. Community contributions and suggestions for new recipes are highly encouraged!

-   **Building a Web Server / Full API**
-   **Building Enterprise Applications**
-   **Building SaaS Applications**
-   **Building Real-time Apps (e.g., with WebSockets)**
-   **Building AI-powered Applications**
-   **Building Runtimes for AI Agents**
-   **Building a Blog**