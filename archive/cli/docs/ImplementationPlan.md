

## **Effect AI CLI: Implementation Plan**

**Guiding Principles for Each Stage:**
*   **Small, logically connected capabilities.**
*   **Builds on previous steps.**
*   **Minimizes risk.**
*   **Strict Exit Criteria (must be met before proceeding):**
    1.  All TypeScript type errors resolved.
    2.  All Biome lint errors resolved.
    3.  All newly added unit tests pass.

---

### **Stage 1: Project Initialization & Basic CLI Structure**

**Objective:** Set up the basic Node.js/TypeScript project, configure Biome, install core Effect dependencies, and create a barebones CLI entry point that can run a simple "hello world" program. This establishes the foundation and tooling.

**Key Deliverables:**
1.  **Project Setup**:
    *   Initialize `pnpm` project: `pnpm init -y`
    *   Install core dependencies: `pnpm add effect @effect/platform-node typescript dotenv`
    *   Install dev dependencies: `pnpm add -D @types/node @types/dotenv biome`
2.  **`tsconfig.json`**: Basic TypeScript configuration.
3.  **`biome.json`**: Basic Biome configuration.
4.  **CLI Entry Point (`src/index.ts`)**:
    *   A simple `Effect.gen` program that logs "Hello from Effect AI CLI!" to `Console`.
    *   Includes `import "dotenv/config";` at the very top.
    *   Provides `Console.Console` Layer.
    *   `Effect.runPromise` to execute the program.
5.  **`package.json` scripts**: `build`, `start`, `lint`.

**Testing Focus:**
*   **No specific unit tests yet.** This stage focuses on environment setup and basic execution.

**Success Criteria (before moving to Stage 2):**
*   `pnpm install` completes successfully.
*   `pnpm run build` compiles without TypeScript errors.
*   `pnpm run lint` (or `biome check .`) reports no lint errors.
*   `pnpm run start` (or `node dist/index.js`) executes and prints "Hello from Effect AI CLI!".

---

### **Stage 2: Single AI Generation with OpenAI (Non-Streaming)**

**Objective:** Get the core functionality of connecting to an LLM (OpenAI) and performing a non-streaming text generation. This validates the `Effect` to AI provider connection.

**Key Deliverables:**
1.  **Install OpenAI Adapter**: `pnpm add @effect/ai @effect/ai-openai`
2.  **`src/lib/ai-service.ts`**:
    *   Define a basic `generateText` function that takes `prompt`, `model` and returns `Effect<AiResponse.AiResponse, AiError.AiError | Error, AiLanguageModel | OpenAiClient>`.
    *   Use `AiLanguageModel.generateText` inside.
3.  **`src/index.ts` (CLI Entry Point Update)**:
    *   Take a hardcoded prompt for now.
    *   Call the `generateText` function from `ai-service.ts`.
    *   Provide `OpenAiClient.layerConfig` (reading `OPENAI_API_KEY` from `Config.redacted`) and `OpenAiLanguageModel.model` Layers.
    *   Log the successful response.
4.  **`.env` file**: Create a `.env` file in the project root with `OPENAI_API_KEY`.

**Testing Focus:**
*   **Unit Tests (`src/lib/ai-service.test.ts`)**:
    *   Test `generateText` with a mocked `AiLanguageModel` service. Ensure it composes correctly and returns the expected `Effect`. (Focus on function composition, not actual API calls in unit tests).
*   **Manual Test**: Run the CLI with a valid `OPENAI_API_KEY` to confirm it successfully generates text from OpenAI.

**Success Criteria (before moving to Stage 3):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests (for `ai-service`) pass.
*   Manual test confirms successful text generation from OpenAI.

---
Excellent, Paul! I'm glad to hear that. `gray-matter` is indeed a solid choice that will provide a robust and extensible foundation for your MDX prompt handling.

I will update **Stage 3: Advanced Prompt File Input (.txt and .mdx)** in the implementation plan to explicitly use `gray-matter`.

---

### **Stage 3: Advanced Prompt File Input (.txt and .mdx)**

**Objective:** Implement the `readPromptFile` utility to handle both plain text and MDX files with frontmatter, establishing flexible input. This stage explicitly adopts `gray-matter` for MDX parsing.

**Key Deliverables:**
1.  **Install `gray-matter`**: `pnpm add gray-matter`
2.  **`src/lib/prompt-parser.ts`**:
    *   Define `ParsedPromptFile` interface.
    *   Implement `readPromptFile` function: `(filePath: string) => Effect<ParsedPromptFile, Error, NodeFs.NodeFs>`.
    *   Use `NodeFs.readFileString` and **`gray-matter`** for MDX parsing.
    *   Include error handling for file not found/unreadable and malformed frontmatter (e.g., from `gray-matter` parsing errors).
3.  **`src/index.ts` (CLI Entry Point Update)**:
    *   Modify argument parsing to accept either a direct prompt string or a `--file <path>`. (Start with basic `process.argv` parsing, can upgrade to `yargs` later).
    *   Use `readPromptFile` if `--file` is present.
    *   Integrate parsed `prompt`, `model`, `provider`, `parameters` from MDX into the `generateText` call.
    *   Implement CLI flag overrides for `provider`, `model` over MDX data.

**Testing Focus:**
*   **Unit Tests (`src/lib/prompt-parser.test.ts`)**:
    *   Test `readPromptFile` with mock `NodeFs` service.
    *   Test valid `.txt` files (content only).
    *   Test valid `.mdx` files (frontmatter and content extraction **using `gray-matter`**).
    *   Test `.mdx` with missing/malformed frontmatter (**ensuring `gray-matter` parsing errors are handled**).
    *   Test non-existent files.
*   **Manual Test**: Run CLI with `.txt` and `.mdx` files to confirm correct prompt and parameter parsing.

**Success Criteria (before moving to Stage 4):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests (for `prompt-parser`) pass.
*   Manual tests confirm correct file parsing and parameter application.

---

### **Stage 4: Streaming AI Results**

**Objective:** Convert the AI generation to use streaming, which is a core capability of Effect AI and a better user experience for long responses.

**Key Deliverables:**
1.  **`src/lib/ai-service.ts` Update**:
    *   Add a `streamText` function: `(prompt, model, provider, parameters) => Stream<string, Error, AiLanguageModel | ClientType>`.
    *   This function will encapsulate `AiLanguageModel.streamText` and related `Stream.provideLayer`, `Stream.map`, `Stream.tapError` (for `logAiError`) calls, as refined in previous discussions.
    *   Ensure `Stream.unwrapEffect` is used correctly.
2.  **`src/index.ts` (CLI Entry Point Update)**:
    *   Use the new `streamText` function.
    *   Consume the `Stream` using `Stream.runForEach` to print chunks to `process.stdout.write`.
    *   Add a `--stream` flag to explicitly enable streaming (or make it default for `generate` if desired).

**Testing Focus:**
*   **Unit Tests (`src/lib/ai-service.test.ts`)**:
    *   Test `streamText` with a mocked `AiLanguageModel` that emits a sequence of chunks. Assert that the `Stream` transforms and emits correctly.
*   **Manual Test**: Run CLI with a long prompt to observe streaming output in the console.

**Success Criteria (before moving to Stage 5):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests (for streaming in `ai-service`) pass.
*   Manual test confirms successful streaming output.

---

### **Stage 5: Robust AI Error Handling**

**Objective:** Implement comprehensive and Effect-like error handling for AI interactions, combining specific `AiError` tags with your `description`-parsing fallback.

**Key Deliverables:**
1.  **`src/lib/ai-service.ts` Update**:
    *   Enhance the `streamText` (and `generateText` if kept) function with a `Stream.catchTags` block.
    *   Prioritize catching specific `AiError` tags (`"RateLimitError"`, `"InvalidInputError"`, etc.).
    *   Include the generic `"AiError"` tag handler that inspects `error.description` for keywords like "rate limit", "quota", "too many requests" as you previously discovered.
    *   Ensure each error handler returns an `Effect.Stream` (e.g., `Stream.fail` or `Stream.fromIterable` for fallback messages).
    *   Add a final `Stream.catchAll` for any other errors (network, unknown).
2.  **`src/utils/error-logger.ts`**: A dedicated utility for `logAiError` or general error logging to `Console.error`.

**Testing Focus:**
*   **Unit Tests (`src/lib/ai-service.test.ts`)**:
    *   Mock `AiLanguageModel` to return `Effect.fail` with various `AiError` instances (specific tags like `AiError.RateLimitError` and generic `AiError` instances with different `description` strings).
    *   Assert that the `catchTags` logic correctly maps errors to fallback messages or re-throws as expected.
*   **Manual Test**:
    *   Run CLI with an invalid API key to trigger `PermissionDenied` or `AiError`.
    *   Temporarily introduce a fake rate limit or invalid prompt (if possible with your provider) to test those specific paths.

**Success Criteria (before moving to Stage 6):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for error handling pass.
*   Manual tests confirm correct error messages for different failure scenarios.

---

### **Stage 6: Output File Redirection (`--output`)**

**Objective:** Implement the `--output` flag to save the AI's response to a specified file instead of the console.

**Key Deliverables:**
1.  **`src/index.ts` (CLI Entry Point Update)**:
    *   Add `--output <path>` argument parsing.
    *   Conditional logic based on `--output` flag presence:
        *   If present: `streamText.pipe(Stream.runCollect, Effect.flatMap(fullResponse => NodeFs.writeFileString(outputPath, fullResponse)))`.
        *   If not present: `streamText.pipe(Stream.runForEach(...))`.
    *   Ensure `NodeFs.NodeFsLive` is provided as a Layer.
    *   Add `Console.info` messages for file saving operations.
    *   Add `Effect.catchAll` for `NodeFs.writeFileString` errors.
2.  **Refine `package.json`**: Update `start` script to pass arguments.

**Testing Focus:**
*   **Unit Tests (`src/output-writer.test.ts`)**: (If you extract output writing logic into a separate module)
    *   Mock `NodeFs`. Test writing a string to a file.
    *   Test error cases like permission denied.
*   **Manual Test**:
    *   Run `ai generate --output my_response.txt ...` and verify the file content.
    *   Test with an invalid output path to trigger a file write error.

**Success Criteria (before moving to Stage 7):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests (for output writing) pass.
*   Manual tests confirm correct file output and error handling for file operations.

---

### **Stage 7: Comprehensive Metrics Reporting (`--metrics`, `--metrics-output`)**

**Objective:** Integrate metrics collection for all commands, including token usage and cost, with flexible console and file reporting.

**Key Deliverables:**
1.  **`src/lib/metrics-service.ts`**:
    *   Define a `MetricsService` (Tag and Type).
    *   Implement methods to record: `startCommand`, `endCommand`, `recordLLMUsage` (input, output, thinking tokens), `recordEstimatedCost`.
    *   Implement `reportMetrics(format: 'console' | 'json', outputFile?: string)` method.
    *   Calculate `totalTokens` and `estimatedCost` based on collected data.
    *   Depends on `NodeFs` for file writing.
2.  **Integrate Metrics Service**:
    *   `src/index.ts`: Add global `--metrics [format]` and `--metrics-output <path>` argument parsing.
    *   Wrap core command execution (`main` Effect) with `MetricsService.startCommand` and `MetricsService.endCommand`.
    *   Modify `ai-service.ts` to `Effect.tap` `AiLanguageModel` responses and `Effect.tapError` errors to `MetricsService.recordLLMUsage`.
    *   Provide `MetricsService` Layer.

**Testing Focus:**
*   **Unit Tests (`src/lib/metrics-service.test.ts`)**:
    *   Mock `Console` and `NodeFs`.
    *   Test recording various metrics (start/end command, token usage).
    *   Test `reportMetrics` for `console` format (assert `Console.log` calls) and `json` format (assert `NodeFs.writeFileString` calls with correct JSONL).
    *   Test metrics are collected for both success and failure scenarios.
*   **Manual Test**:
    *   Run CLI with `--metrics console`, `--metrics json`, `--metrics-output file.jsonl`. Verify output to console/file.
    *   Observe metrics for different prompt lengths and error cases.

**Success Criteria (before moving to Stage 8):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for metrics pass.
*   Manual tests confirm correct metrics collection and reporting.

---

### **Stage 8: Run Management System (`--run`)**

**Objective:** Implement the "run" concept, centralizing all inputs, outputs, logs, and metrics for a command execution into a unique, named folder.

**Key Deliverables:**
1.  **`src/lib/run-service.ts`**:
    *   Define `RunService` (Tag and Type).
    *   Implement `createRunDirectory(namePrefix?: string)`: Generates run name, creates directory, persists `sequential_number`.
    *   Implement `getRunPath()` and `getRunFilePath(filename)`.
    *   Provide `RunService` Layer.
2.  **Global CLI Integration (`src/index.ts` Update)**:
    *   Add `--run [name_prefix]` argument parsing.
    *   If `--run` is active:
        *   Call `RunService.createRunDirectory` at the start of the `main` Effect.
        *   Override `--output` and `--metrics-output` to point to files within the run directory (`response.*`, `metrics.jsonl`).
        *   Introduce a `LogService` or redirect `Console.log`/`Console.error` to `log.txt` within the run directory.
        *   Copy input prompt file (`--file`) to the run directory.
        *   Log run directory path to `stderr`.

**Testing Focus:**
*   **Unit Tests (`src/lib/run-service.test.ts`)**:
    *   Mock `NodeFs` (for directory/file creation) and `Config` (for `sequential_number` persistence).
    *   Test run name generation (with/without prefix, sequential numbers).
    *   Test directory creation.
    *   Test behavior of `getRunFilePath`.
*   **Integration Tests**:
    *   Run full CLI commands with `--run` flag. Verify the creation of the run directory and all expected files within it (`response.*`, `metrics.jsonl`, `log.txt`, `prompt.*`).
    *   Verify that `stdout` and `stderr` are clean of primary content/metrics.

**Success Criteria (before moving to Stage 9):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for run service pass.
*   Integration tests confirm correct run folder creation and content.

---

### **Stage 9: OpenTelemetry (OTel) Integration**

**Objective:** Instrument the CLI with OpenTelemetry for comprehensive tracing, metrics, and structured logging.

**Key Deliverables:**
1.  **Install OTel SDK**: `pnpm add @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/exporter-otlp-proto @opentelemetry/semantic-conventions`
    *   (Choose specific exporter based on your target backend, OTLP is common).
2.  **`src/lib/otel-service.ts`**:
    *   Define `OtelService` (Tag and Type).
    *   Implement initialization logic (`initOtelSDK`): Sets up `NodeSDK`, `ConsoleSpanExporter` (for dev), `OTLPTraceExporter`, `OTLPMetricExporter`, `LoggerProvider`.
    *   Implement methods for creating spans (`startSpan`, `endSpan`, `addEvent`, `recordException`) and metrics (`recordCounter`, `recordHistogram`).
    *   Provide `OtelService` Layer.
3.  **Integrate OTel into CLI**:
    *   `src/index.ts`: Add `--otel` (and optional `otel-exporter`, `otel-endpoint`, `otel-service-name`) argument parsing.
    *   Conditionally provide `OtelService` Layer based on `--otel`.
    *   Wrap major CLI commands/sections with `OtelService.startSpan`/`endSpan` (e.g., around `main` effect, `prompt-parser`, `ai-service` calls, `output-writer`, `metrics-service`).
    *   Hook `Effect.log` and `Console` calls into the OTel logger.
    *   Feed collected metrics from `MetricsService` into `OtelService`'s metrics API.

**Testing Focus:**
*   **Unit Tests (`src/lib/otel-service.test.ts`)**:
    *   Mock OTel SDK classes to verify `initOtelSDK` configures correctly.
    *   Test `startSpan`/`endSpan` and attribute recording.
    *   Test metric recording.
*   **Integration Tests**:
    *   Run CLI with `--otel --otel-exporter console`. Verify OTel span/metric/log output appears in the console.
    *   If you have a local OTel Collector (e.g., Docker `otel/opentelemetry-collector-contrib` with Jaeger/Prometheus), run CLI and confirm traces/metrics/logs arrive in your observability backend.

**Success Criteria (before moving to Stage 10):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for OTel service pass.
*   Integration tests confirm OTel data is emitted and received by console exporter or a collector.

---

### **Stage 10: Configuration and Authentication Commands**

**Objective:** Provide `ai config` and `ai auth` commands for managing persistent settings and API keys.

**Key Deliverables:**
1.  **`src/commands/config.ts`**: Implement `ai config set/get/list` logic.
    *   Manages a JSON config file (e.g., `~/.config/ai-cli/config.json`).
    *   Depends on `NodeFs`.
2.  **`src/commands/auth.ts`**: Implement `ai auth add/remove/list` logic.
    *   Securely stores API keys. Consider using platform-specific credential management (e.g., `keytar` package) or a basic encrypted file. Start with environment variables as primary, and secure storage as a progressive enhancement.
    *   Depends on `NodeFs` (or `keytar`).
3.  **`src/index.ts` (CLI Entry Point Update)**: Register `config` and `auth` subcommands with argument parser.

**Testing Focus:**
*   **Unit Tests (`src/commands/config.test.ts`, `src/commands/auth.test.ts`)**:
    *   Mock `NodeFs` for config/auth file interactions.
    *   Test setting/getting/listing config properties.
    *   Test adding/removing auth keys (mock secure storage).
*   **Manual Test**: Confirm `ai config` and `ai auth` commands work as expected.

**Success Criteria (before moving to Stage 11):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for config/auth pass.
*   Manual tests confirm correct config and auth management.

---

### **Stage 11: Model Info and Utility Commands**

**Objective:** Add helpful commands for discovering models and dry-running prompts.

**Key Deliverables:**
1.  **`src/commands/model.ts`**: Implement `ai model list/info`.
    *   `list`: Query providers (e.g., OpenAI API) for available models.
    *   `info`: Fetch and display details about a specific model.
    *   Depends on `AiLanguageModel` and specific client Layers.
2.  **`src/commands/dry-run.ts`**: Implement `ai dry-run`.
    *   Estimates token usage and cost without making an actual LLM API call. This involves using a local tokenization library (e.g., `tiktoken` for OpenAI models, `tokenizer` for Anthropic).
    *   Depends on `PromptReader` and tokenization library.
3.  **`src/commands/health.ts`**: Implement `ai health`.
    *   Performs quick API calls to configured providers to check connectivity and API key validity.
    *   Depends on `AiLanguageModel` and specific client Layers.
4.  **`src/index.ts` (CLI Entry Point Update)**: Register new subcommands.

**Testing Focus:**
*   **Unit Tests**: Test logic of model listing, info parsing, token counting for dry-run, and health checks with mocked services.
*   **Manual Test**: Verify `ai model list`, `ai dry-run`, `ai health` commands work.

**Success Criteria (Project Completion):**
*   All TypeScript type errors resolved.
*   All Biome lint errors resolved.
*   All unit tests for new commands pass.
*   Manual tests confirm new commands work as expected.