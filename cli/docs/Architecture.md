Okay, Paul, let's create an Architecture Document for your Effect AI CLI. This document will outline the high-level structure, key components, and their interactions, providing a technical blueprint for the system's construction.

---

## **Architecture Document: Effect AI CLI**

**Document Version:** 1.0
**Date:** July 28, 2025
**Author:** AI Assistant (T3 Chat) - Designed in collaboration with Paul (Engineer)

---

### **1. Introduction**

This document describes the architectural design of the Effect AI CLI, building upon the features defined in the Product Requirements Document (PRD). The architecture emphasizes modularity, extensibility, testability, and adherence to Effect.js's principles of functional programming, explicit dependency management (Layers), and structured concurrency (Effects, Streams).

### **2. Architectural Principles**

*   **Modularity & Loose Coupling**: Components are designed as independent modules with well-defined interfaces.
*   **Dependency Inversion**: High-level modules (e.g., AI core logic) depend on abstractions, while low-level modules (e.g., concrete AI adapters, file system implementations) provide concrete implementations via Effect.js Layers.
*   **Type Safety**: Leveraging TypeScript extensively to ensure correctness and maintainability.
*   **Functional Core, Imperative Shell**: Core logic is pure and composable Effects/Streams, while side effects (I/O, console) are managed at the boundaries or within dedicated service implementations.
*   **Observability First**: Built-in support for metrics, tracing, and structured logging using OpenTelemetry.
*   **Explicit Error Handling**: Utilizing Effect.js's typed errors (`Data.TaggedError`) for predictable and robust error management.
*   **Reproducibility**: Favoring explicit inputs and structured outputs for consistent results.

### **3. High-Level Architecture**

The CLI adopts a **Layered Hexagonal Architecture** (or Ports and Adapters pattern), where the core application logic (the "domain") is isolated from external concerns (I/O, external APIs) by clearly defined interfaces (Effect services/Tags) and implemented by various adapters (Layers).

```
+-------------------------------------------------------------+
|                     CLI Application (main.ts)               |
| +---------------------------------------------------------+ |
| |                Orchestration & Argument Parsing         | |
| | +-----------------------------------------------------+ | |
| | |      Global Configuration & Environment Context     | | |
| | |   (Config Layer, Console Layer, OpenTelemetry SDK)  | | |
| | +-----------------------------------------------------+ | |
| +---------------------------------------------------------+ |
| +---------------------------------------------------------+ |
| |                     Domain Logic Layers                   | |
| |                                                         | |
| | +-----------------+   +---------------------+         | |
| | |   AI Core       |   | Prompt Input        |         | |
| | |  (AiLanguageModel)|   | (Text/MDX Parsing)  |         | |
| | +--------^--------+   +----------^----------+         | |
| |          |                     |                      | |
| | +--------+--------+   +--------+----------+          | |
| | | AI Adapters     |   | Run Management    |          | |
| | | (OpenAI, Anthropic,|   | (Run Folder I/O)  |          | |
| | |  Google (hypothetical))|   |             |          | |
| | +--------^--------+   +----------^----------+          | |
| |          |                     |                      | |
| | +--------+--------+   +----------+----------+          | |
| | | HTTP Client     |   | File System (NodeFs)|          | |
| | +-----------------+   +---------------------+          | |
| |                                                         | |
| +---------------------------------------------------------+ |
|                                                             |
| External Boundaries:                                        |
|   - LLM APIs (OpenAI, Anthropic, Google)                    |
|   - Local File System (for runs, prompts, configs)          |
|   - Operating System (environment variables, process.stdout/stderr) |
|   - OpenTelemetry Collector / Observability Backend         |
+-------------------------------------------------------------+
```

### **4. Key Components & Modules**

#### **4.1. CLI Entry & Orchestration (`src/cli.ts`)**
*   **Purpose**: The main entry point of the CLI application. Handles top-level argument parsing, initializes the Effect runtime, and composes the overall application `Effect` using provided Layers.
*   **Responsibilities**:
    *   Argument parsing (`yargs` or `Platform.CLI` for structured flags/commands).
    *   Global `Effect.provide` for base services (`Console`, `Config`, `NodeFs`, OTel SDK).
    *   Invokes command-specific logic based on parsed arguments.
    *   Top-level `Effect.catchAll` for unhandled errors.

#### **4.2. Configuration Management (`src/ConfigService.ts`, Effect's `Config`)**
*   **Purpose**: Provides a centralized, type-safe way to access configuration parameters (e.g., API keys, default models).
*   **Responsibilities**:
    *   Reads environment variables via `Effect/Config`.
    *   Manages persistent CLI configuration (e.g., `ai config` command reads/writes to a local JSON file) via an internal configuration service (Layer).
    *   Handles secure storage of API keys (`ai auth` command) potentially using `NodeOs.OsFs` for secure file system access.

#### **4.3. Prompt Input & Parsing (`src/PromptReader.ts`)**
*   **Purpose**: Abstracts the complexity of reading and interpreting prompt inputs.
*   **Responsibilities**:
    *   Reads `.txt` and `.mdx` files.
    *   Parses MDX frontmatter using `gray-matter` to extract `provider`, `model`, and `parameters`.
    *   Handles errors for file not found, unreadable files, or malformed frontmatter.
    *   Provides a `ParsedPromptFile` service or data type.

#### **4.4. AI Core (`@effect/ai`)**
*   **Purpose**: The central, provider-agnostic interface for interacting with LLMs. Defined by `AiLanguageModel` Tag.
*   **Responsibilities**:
    *   Defines abstract operations like `generateText`, `streamText`.
    *   Defines canonical `AiError` types (e.g., `RateLimitError`, `InvalidInputError`).
    *   Handles common AI response structures (`AiResponse.AiResponse`, `AiResponse.TextPart`).

#### **4.5. AI Adapters (`@effect/ai-openai`, `@effect/ai-anthropic`, custom/hypothetical Google)**
*   **Purpose**: Concrete implementations of the `AiLanguageModel` service for specific LLM providers.
*   **Responsibilities**:
    *   Make actual HTTP requests to external LLM APIs (e.g., OpenAI API, Anthropic API).
    *   **Crucially**: Map raw API responses and errors from the provider's specific format into the generic `AiResponse` and `AiError` types defined by `@effect/ai`. This is where `thinkingTokens` would be extracted if available.
    *   Manage provider-specific authentication and parameters.
    *   Provided as a `Layer` to inject the concrete `AiLanguageModel` instance.
    *   Depends on the `NodeHttpClient` Layer for network communication.

#### **4.6. Output Management (`src/OutputService.ts`)**
*   **Purpose**: Centralizes logic for directing AI responses.
*   **Responsibilities**:
    *   Receives `Stream<AiResponse.TextPart, ...>`.
    *   Conditionally directs the stream to:
        *   `process.stdout` (console).
        *   A file specified by `--output <path>`.
        *   A file within the `--run` directory (e.g., `response.md`).
    *   Collects streamed chunks into a single string when writing to a file.
    *   Depends on `NodeFs` for file writing.

#### **4.7. Run Management (`src/RunService.ts`)**
*   **Purpose**: Manages the lifecycle and organization of individual command "runs."
*   **Responsibilities**:
    *   Generates unique run names (`[name_prefix_]<sequential_number>_<timestamp>`).
    *   Persists and increments the `sequential_number` (e.g., in a hidden CLI config file).
    *   Creates dedicated run directories.
    *   Directs `OutputService`, `MetricsService`, and `LogService` to write outputs within the run directory.
    *   Copies input prompt files to the run directory.
    *   Provides `RunContext` as a service containing current run details.
    *   Depends on `NodeFs` for directory and file operations.

#### **4.8. Metrics Service (`src/MetricsService.ts`)**
*   **Purpose**: Collects, aggregates, and reports command execution metrics.
*   **Responsibilities**:
    *   Captures `command`, `durationMs`, `status`, `tokens`, `cost`, `thinkingTokens`.
    *   Exposes an API for other components (e.g., AI Adapters) to report token usage.
    *   Formats metrics (console or JSON).
    *   Reports metrics to `stderr` or a file (`metrics.jsonl` within run folder / `--metrics-output` file).
    *   Depends on `NodeFs` for file writing.

#### **4.9. OpenTelemetry (OTel) Integration (`src/OtelService.ts`)**
*   **Purpose**: Instruments the CLI for standardized observability.
*   **Responsibilities**:
    *   Initializes the OTel Node.js SDK (TracerProvider, MeterProvider, LoggerProvider).
    *   Configures OTel Exporters (e.g., OTLPExporter, ConsoleSpanExporter).
    *   Hooks into Effect's `Effect.log`, `Effect.tracer`, `Effect.metrics` for automatic instrumentation.
    *   Manually creates spans for major operations (`ai generate` root, `ai.api.call`, `fs.write.*`).
    *   Attaches relevant attributes to spans (command details, LLM parameters, token counts).
    *   Emits OTel Metrics (counters, histograms) based on data from `MetricsService`.
    *   Uses OTel API's `context.with` to ensure proper trace context propagation.

#### **4.10. Shared Utilities (`src/utils/*.ts`)**
*   **Purpose**: Common helper functions and services.
*   **Responsibilities**:
    *   File path manipulation (`path` module).
    *   Error handling utilities.
    *   Any other cross-cutting concerns that don't belong in core components.

### **5. Data Flow (Example: `ai generate --run my-test --file prompt.mdx --metrics json --output results.txt`)**

1.  **CLI Entry**: `cli.ts` starts, `Effect.runPromise`. Global `Console`, `Config`, `NodeFs`, `OtelService` Layers are provided.
2.  **Argument Parsing**: CLI arguments are parsed. `CommandConfig` object is created (`provider`, `model`, `promptFilePath`, `runPrefix`, `metricsFormat`, `outputFile`).
3.  **Run Management**: `RunService` creates `runs/my-test_0001_YYYYMMDDTHHMMSS/` directory. `RunContext` service is updated.
4.  **OTel**: `OtelService` starts root span for `"ai generate"`.
5.  **Prompt Reading**: `PromptReader` (using `NodeFs`) reads `runs/my-test_0001_YYYYMMDDTHHMMSS/prompt.mdx`. Parses frontmatter, extracts `prompt` and overrides default `CommandConfig` if any. `ai.prompt.read` OTel span.
6.  **AI Generation**:
    *   `AiCore` receives the prompt and config.
    *   Selects appropriate `AiAdapter` Layer (e.g., `OpenAiLanguageModel` along with `OpenAiClient` and `NodeHttpClient`) based on `provider`.
    *   `AiAdapter` makes streaming API call. `ai.api.call` OTel span starts.
    *   Token usage (input, output, thinking) is captured by `MetricsService`.
    *   Streamed chunks are fed to `OutputService`.
7.  **Output Writing**: `OutputService` receives stream. Since `--run` is active and `outputFile` is `results.txt`, it collects stream into a string and writes it to `runs/my-test_0001_YYYYMMDDTHHMMSS/results.txt` via `NodeFs`. `fs.write.response` OTel span.
8.  **Metrics Reporting**: `MetricsService` finalizes collected metrics. `metricsFormat` is `json`, `--metrics-output` is overridden by `--run`. Metrics are written to `runs/my-test_0001_YYYYMMDDTHHMMSS/metrics.jsonl` via `NodeFs`. `fs.write.metrics` OTel span.
9.  **Logging**: `LogService` (internal to `Console`/`Effect.log` or a dedicated service) writes detailed execution logs to `runs/my-test_0001_YYYYMMDDTHHMMSS/log.txt` via `NodeFs`. `fs.write.log` OTel span.
10. **OTel Finalization**: All OTel spans are completed and exported to the configured collector.
11. **Completion**: CLI exits with appropriate status code.

### **6. Technology Stack**

*   **Runtime**: Node.js (LTS versions)
*   **Language**: TypeScript
*   **Core Framework**: Effect.js (encompassing `Effect`, `Layer`, `Stream`, `Config`, `Console`, `Data`, etc.)
*   **AI Integration**: `@effect/ai`, `@effect/ai-openai`, `@effect/ai-anthropic` (and custom/hypothetical for Google AI).
*   **HTTP Client**: `@effect/platform-node` (`NodeHttpClient`).
*   **File System**: `@effect/platform-node` (`NodeFs`).
*   **Argument Parsing**: `yargs` or `commander.js` (or potentially `Platform.CLI` once stable).
*   **Environment Variables**: `dotenv`.
*   **MDX Frontmatter**: `gray-matter`.
*   **Telemetry**: OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-node`, `@opentelemetry/api`, exporters etc.).

### **7. Deployment Considerations**

*   **Distribution**: NPM package (source code). Potentially a standalone executable using tools like `pkg` or `nexe` in the future.
*   **Dependencies**: Requires Node.js runtime. External LLM APIs accessible via network.
*   **Configuration**: Relies heavily on environment variables (`.env` for dev, native ENV vars for prod).
*   **Observability Backend**: Assumes an OTel Collector or compatible observability platform (e.g., Jaeger, Prometheus+Grafana, cloud services) to receive telemetry data.