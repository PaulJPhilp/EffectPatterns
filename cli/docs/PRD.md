
## **Product Requirements Document: Effect AI CLI**

**Document Version:** 1.0
**Date:** July 28, 2025
**Author:** AI Assistant (T3 Chat) - Designed in collaboration with Paul (Engineer)

---

### **1. Introduction / Overview**

The Effect AI Command Line Interface (CLI) is a robust and developer-centric tool designed to simplify and enhance interactions with Large Language Models (LLMs) from various providers. Leveraging the power of the Effect.js ecosystem, this CLI prioritizes type-safe, observable, and reproducible AI interactions, enabling engineers to integrate, experiment with, and monitor LLMs more effectively in their workflows and scripts.

### **2. Goals**

*   **Primary Goal**: Provide a streamlined, provider-agnostic interface for common LLM operations.
*   **Reproducibility**: Enable easy replication of AI generation runs for experimentation and auditing.
*   **Observability**: Offer built-in metrics and OpenTelemetry support for detailed performance and usage insights.
*   **Scriptability**: Design commands and output formats to facilitate seamless integration into automated scripts and pipelines.
*   **Engineer-Centric Experience**: Deliver a powerful, configurable, and debuggable tool that resonates with engineering best practices.

### **3. Audience / Users**

*   **Primary**: Software Engineers, Developers, and Researchers working with Effect.js and LLMs.
*   **Secondary**: MLOps Engineers, Data Scientists, and anyone requiring structured, scriptable access to LLMs.
*   **User Needs**: Efficient prompt iteration, reproducible results, cost monitoring, deep observability, secure API key management, and streamlined automation.

### **4. High-Level Features**

1.  **Core AI Interactions**: Execute prompts, manage multi-turn conversations, and perform specific transformations.
2.  **Flexible Input Handling**: Support plain text and rich, parameterized prompt files.
3.  **Configurable Output**: Direct AI responses to console or files, and manage structured output formats.
4.  **Centralized Run Management**: Organize all command inputs, outputs, and telemetry within named, versioned directories.
5.  **Comprehensive Metrics**: Track LLM usage, performance, and estimated costs, including "thinking tokens."
6.  **Advanced Observability (OpenTelemetry)**: Emit standardized traces, metrics, and logs for integration with observability platforms.
7.  **Configuration & Authentication**: Securely manage API keys and CLI defaults.
8.  **Model & Provider Information**: Query available models and their capabilities.
9.  **Debugging & Utilities**: Dry runs, health checks, and detailed tracing for troubleshooting.

### **5. Detailed Features**

#### **5.1. Core AI Interaction Commands**

*   **`ai generate <prompt_string | --file <path>> [options]`**
    *   **Description**: Performs a single text generation request to an LLM.
    *   **Options**:
        *   `--provider <openai|anthropic|google>`: Specifies LLM provider.
        *   `--model <name>`: Specific LLM model.
        *   `--temp <value>`: Temperature for creativity (e.g., `0.0 - 1.0`).
        *   `--max-tokens <number>`: Max tokens in response.
        *   `--json`: Request JSON mode output (model permitting).
*   **`ai chat`**
    *   **Description**: Initiates an interactive, multi-turn conversational session.
    *   **Options**: `--provider <name>`, `--model <name>`, `--temp <value>`, `--system <prompt_string | --file <path>>`.
*   **`ai transform <type> <input_string | --file <path>>`**
    *   **Description**: Applies specific LLM-powered transformations.
    *   **Types (Subcommands)**: `summarize`, `rephrase`, `translate`, `extract-keywords`, `analyze-sentiment`, `code-review`.
    *   **Options**: `--provider <name>`, `--model <name>`, type-specific options (e.g., `--to <lang>` for `translate`).

#### **5.2. Input Handling**

*   **Prompt Sources**:
    *   Direct `prompt_string` argument.
    *   `--file <path>`:
        *   `.txt` files: Vanilla text prompt.
        *   `.mdx` files: Prompt content with YAML frontmatter.
            *   Frontmatter supports `provider`, `model`, and specific `parameters` (e.g., `temperature`, `max_tokens`, `response_format`).
*   **Override Logic**: CLI flags **always override** parameters specified in MDX frontmatter for the same option.

#### **5.3. Output Handling**

*   **Default**: Stream AI response directly to `stdout`.
*   **`--output <file_path>` (for `generate`, `transform`):**
    *   Writes the complete AI response to the specified file.
    *   **Overwrites** existing file by default.
    *   Suppresses output to `stdout` for the AI's primary content.
    *   Status/error messages always go to `stderr`.

#### **5.4. Run Management**

*   **`--run [name_prefix]` (Global Option):**
    *   Activates run mode.
    *   **Run Name Generation**: `[name_prefix_]<sequential_number>_<timestamp_YYYYMMDDTHHMMSS>`.
        *   `sequential_number` is globally incrementing and persistent.
    *   **Run Directory**: A dedicated folder named after the run name will be created within a default `runs/` directory (e.g., `runs/my-project_0002_20250728T194600/`).
    *   **Output Centralization**: All command outputs are redirected into the run directory.
        *   `response.md` / `response.txt` / `response.json`: Primary AI generation.
            *   `--output` flag dictates the *filename* within the run directory, not the directory path itself.
            *   No primary AI output to `stdout`.
        *   `metrics.jsonl`: Metrics for this run (always JSON Lines).
        *   `log.txt`: Detailed command execution log (timestamped messages, errors).
        *   `prompt.mdx` / `prompt.txt`: Copy of the input prompt file if `--file` was used.
    *   **Precedence**: `--run` takes precedence over `--output` (for location) and `--metrics-output`.

#### **5.5. Metrics Reporting**

*   **`--metrics [format]` (Global Option):** Enables metric collection.
    *   `format`: `console` (default, human-readable to `stderr`) or `json` (machine-readable to `stderr`).
*   **`--metrics-output <file_path>` (Global Option):**
    *   Requires `--metrics`.
    *   Writes metrics to the specified file.
    *   Metrics are **appended** in **JSON Lines (JSONL)** format.
    *   Suppresses metrics output to `stderr`.
*   **Key Metrics (for LLM commands):**
    *   `command`, `timestamp`, `durationMs`, `status`, `errorMessage`, `cliVersion`.
    *   `provider`, `model`, `inputTokens`, `outputTokens`, `thinkingTokens` (if exposed by provider), `totalTokens` (sum of all token types), `estimatedCost`.
    *   `estimatedCost` must factor in `thinkingTokens` pricing.

#### **5.6. OpenTelemetry (OTel) Support**

*   **`--otel` (Global Option):** Enables OTel instrumentation.
*   **Telemetry Types:**
    *   **Traces**: Root span per command, child spans for `ai.prompt.read`, `ai.api.call`, `fs.write.response/metrics/log`.
        *   Spans include attributes like `command.name`, `llm.provider`, `llm.model`, token counts, `http.status_code`, `stream.firstTokenLatencyMs`, etc.
        *   Errors are reported as `ERROR` span status with exception details.
    *   **Metrics**: Custom OTel metrics (counters, histograms) for command duration, LLM call counts, total tokens, estimated cost, streaming latencies.
    *   **Logs**: All `Console.log`/`error`/`warn` messages captured as OTel Log Records, automatically linked to active spans.
*   **Configuration**: Primarily via standard `OTEL_` environment variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`).
*   **CLI Overrides**: `--otel-exporter <otlp|console>`, `--otel-endpoint <url>`, `--otel-service-name <name>`.
*   **Integration**: Leverages Effect's `Effect.log`, `Effect.tracer`, `Effect.metrics` for seamless OTel integration.

#### **5.7. Configuration & Authentication Commands**

*   **`ai config`**
    *   `set <key> <value>`: Set CLI-wide configuration (e.g., default provider/model).
    *   `get <key>`: Retrieve config value.
    *   `list`: Display all config.
*   **`ai auth`**
    *   `add <provider>`: Securely store API keys.
    *   `remove <provider>`: Remove stored API key.
    *   `list`: List configured providers (no key exposure).

#### **5.8. Model & Provider Information**

*   **`ai model`**
    *   `list [provider]`: List available models for provider(s).
    *   `info <model_name>`: Detailed info on specific model.

#### **5.9. Utility & Debugging Commands**

*   **`ai dry-run <prompt_string | --file <path>>`**: Estimate token usage/cost without API call.
*   **`ai health [provider]`**: Check connectivity and auth for provider(s).
*   **`ai trace <command_with_args>`**: Execute a command and output detailed internal logs/payloads (beyond OTel, for deeper debugging).

#### **5.10. Meta Commands**

*   **`ai help [command]`**: Display usage.
*   **`ai version`**: Display CLI version.

### **6. Non-Functional Requirements**

*   **Performance**: Responsive execution, especially for streaming outputs; optimized for low latency where possible.
*   **Security**: Secure handling and storage of API keys; avoidance of sensitive data in stdout/logs unless explicitly enabled for debugging.
*   **Reliability**: Robust error handling (Effect's typed errors, retries via `ExecutionPlan`); graceful failure modes.
*   **Maintainability**: Modular design using Effect.js patterns (Layers, Streams); clear separation of concerns; comprehensive unit/integration tests.
*   **Extensibility**: Easy to add new LLM providers, models, and transformation types.
*   **User Experience (UX)**: Intuitive command structure; clear, concise, and helpful output; informative error messages; progress indicators for long-running operations.
*   **Portability**: Node.js compatibility across major OS platforms.

### **7. Success Metrics**

*   **Adoption**: Number of downloads/installs; active user count (via anonymous telemetry, if implemented).
*   **User Satisfaction**: Positive feedback, low bug report rate for core features.
*   **Stability**: Low crash rate; high success rate of core commands (tracked via metrics/OTel).
*   **Performance**: Measured latency improvements (e.g., first token latency) over direct API calls (if applicable) or other tools.
*   **Observability Value**: Successful integration with OTel backends; valuable insights derived from collected traces and metrics.

### **8. Future Considerations (Out of Scope for V1)**

*   **Caching Layer**: For frequently requested content or prompts.
*   **Agentic Workflows**: Support for multi-tool agents or RAG (Retrieval-Augmented Generation) patterns.
*   **Model Fine-Tuning**: Commands for initiating/monitoring fine-tuning jobs.
*   **Local LLM Support**: Integration with local inference engines (e.g., Ollama, Llama.cpp).
*   **Pre-built Binaries**: Distribute as standalone executables (e.g., via `pkg` or `nexe`).
*   **Templating Language Integration**: Deeper support for templating engines within prompts.
*   **Interactive Chat History Management**: Loading/saving specific chat sessions.