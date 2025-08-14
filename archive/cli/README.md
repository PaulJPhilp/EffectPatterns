# Effect AI CLI

A comprehensive TypeScript CLI application built with Effect-TS for managing AI-powered pattern processing, run management, and observability.

## Overview

The Effect AI CLI is a production-ready command-line interface that demonstrates advanced Effect-TS patterns including service composition, resource management, observability, and AI integration. It provides tools for managing AI workflows, tracking metrics, and maintaining run history.

Execution Plans:
- By default, LLM calls use an ExecutionPlan with sensible retries and provider fallbacks.
- You can override attempts and timing and also customize fallback provider/model order with the `plan` command.

## Features

### Core Capabilities
- **AI Integration**: Seamless integration with multiple AI providers (OpenAI, Anthropic, Google)
- **Run Management**: Complete lifecycle management for AI processing runs
- **Metrics Tracking**: Comprehensive metrics collection and reporting
- **Observability**: Full OpenTelemetry integration for tracing and monitoring
- **Configuration Management**: Flexible configuration with environment variables
- **Authentication**: Secure API key management
- **Extensibility**: Plugin system to add custom commands via `CliPlugin`

### Quick Start

```bash
# Generate (streams by default)
effect-ai-cli generate "Write a haiku about Effect"

# Configure execution plan overrides
effect-ai-cli plan create --retries 2 --retry-ms 1200 \
  --fallbacks openai:gpt-4o-mini,anthropic:claude-3-5-haiku
effect-ai-cli plan list

# View metrics for recent runs
effect-ai-cli metrics last
effect-ai-cli metrics report --format console
```

### Commands

#### Core Commands
- `effect-ai-cli list` - List available patterns
- `effect-ai-cli generate` (alias `gen`) - Generate with AI
  - Input forms: inline text, file path, or stdin (`--stdin`)
  - Streaming by default for text format; buffer with `--no-stream`
  - `-o, --output <path>` write full output to file (tee when streaming)
  - `-p, --provider <openai|anthropic|google>` select provider
  - `-m, --model <name>` select model
  - `-f, --format <text|json>` select output format (default: text)
  - `--json` convenience for `--format=json`
  - `-s, --schema-prompt <file>` required when `--format=json`
  - `--quiet` suppress stdout (useful with `--output`)
  - Generation params: `--temperature`, `--max-tokens`, `--top-p`, `--seed`
- `effect-ai-cli health` - Check system health
- `effect-ai-cli config` - Manage configuration
- `effect-ai-cli auth` - Manage authentication
- `effect-ai-cli model` - Manage AI models
- `effect-ai-cli trace` - View traces
- `effect-ai-cli dry-run` - Test without execution

#### Execution Plan Management
- `effect-ai-cli plan create` — Set plan overrides
  - `--retries <n>` number of retries for the primary provider (attempts = retries + 1). Default: 1 retry
  - `--retry-ms <ms>` delay between attempts for the primary. Default: 1000
  - `--fallbacks <list>` comma-separated `provider:model` fallbacks, e.g. `openai:gpt-4o-mini,anthropic:claude-3-5-haiku`
- `effect-ai-cli plan list` — Show the current plan (effective defaults if unset)
- `effect-ai-cli plan clear` — Remove overrides
- `effect-ai-cli plan reset` — Reset to defaults

Defaults
- Primary: 2 attempts (1 retry) with 1000ms spacing
- Fallbacks: `openai:gpt-4o-mini` then `anthropic:claude-3-5-haiku`, each 1 attempt with 1500ms spacing

Note: `process-prompt` remains available as a legacy alias for backward compatibility.

#### Run Management
- `effect-ai-cli runs list` - List all runs
- `effect-ai-cli runs create` - Create a new run
- `effect-ai-cli runs update` - Update run information
- `effect-ai-cli runs delete` - Delete a run

#### Metrics
- `effect-ai-cli metrics report` — Report metrics
  - `--format <console|json|jsonl>` (default: console)
  - `-o, --output <path>` when `json` or `jsonl`, write to file
- `effect-ai-cli metrics last` — Pretty table for the most recent run
- `effect-ai-cli metrics clear` — Clear metrics history

## Architecture

### Service Architecture
The CLI uses a modern Effect-TS service architecture with:

- **Effect.Service Pattern**: All services use the modern Effect.Service pattern
- **Layer Composition**: Proper service layer composition with dependency injection
- **Resource Management**: Scoped resource management with automatic cleanup
- **Error Handling**: Comprehensive error handling with typed errors
- **Testing**: Full test coverage with real services (no mocks)

### Services

#### Core Services
- **LLMService**: AI provider integration and prompt processing
- **RunManagement**: Run lifecycle management
- **MetricsService**: Metrics collection and reporting
- **OtelService**: OpenTelemetry integration
- **ConfigService**: Configuration management
- **AuthService**: Authentication management

#### Service Dependencies
Services are composed using Effect layers with proper dependency management:

```typescript
// Platform services
const PlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer
);

// Application services
const AppServiceLayer = Layer.mergeAll(
  ConfigService.Default,
  AuthService.Default,
  MetricsService.Default,
  OtelService.Default,
  RunService.Default,
  LLMService.Default
);

// Complete layer composition
const MainLayer = PlatformLayer.pipe(
  Layer.provide(AppServiceLayer)
);
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd effect-ai-cli

# Install dependencies
bun install

# Build the project
bun run build

# Run the CLI
bun run cli:dev --help
```

## Configuration

### Environment Variables
```bash
# AI Provider Configuration
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=effect-ai-cli

# Other Configuration
EFFECT_AI_CLI_CONFIG_PATH=/path/to/config
```

### Configuration File
Create a `.effect-ai-cli.json` file in your home directory:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-4",
  "outputDirectory": "./output",
  "enableMetrics": true,
  "enableTracing": true
}
```

## Usage Examples

### Basic Usage
```bash
# List all available patterns
effect-ai-cli list

# Inline prompt (streams to stdout)
effect-ai-cli generate "Create a React component"

# File prompt (MDX or text)
effect-ai-cli gen ./prompts/component.mdx

# From stdin
cat prompt.txt | effect-ai-cli generate --stdin

# Check system health
effect-ai-cli health

# Dry run (test without execution)
effect-ai-cli dry-run --pattern="component-pattern"
```

### Advanced Usage
```bash
# With provider/model and params
effect-ai-cli generate \
  -p anthropic \
  -m claude-3-sonnet \
  --temperature 0.2 \
  --max-tokens 800 \
  "Create a data processing pipeline"

# JSON mode with schema (buffers, writes metrics inside JSON)
effect-ai-cli generate ./prompts/object.mdx \
  --json \
  -s ./prompts/object-schema.mdx \
  -o result.json

# Plan overrides
effect-ai-cli plan create --retries 2 --retry-ms 1200 \
  --fallbacks openai:gpt-4o-mini,anthropic:claude-3-5-haiku
effect-ai-cli plan list

# Metrics reporting
effect-ai-cli metrics report --format console
effect-ai-cli metrics report --format json --output metrics.json
effect-ai-cli metrics last

# Quiet + output only
cat prompt.txt | effect-ai-cli gen --stdin --quiet -o out.txt
```

## Development

### Project Structure
```
cli/
├── src/
│   ├── commands/          # CLI commands
│   ├── services/          # Effect services
│   ├── runtime/           # Runtime configuration
│   ├── __tests__/         # Integration tests
│   └── main.ts           # Entry point
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Development Scripts
```bash
# Development mode
bun run cli:dev --help

# Run tests
bun run cli:test

# Run tests in watch mode
bun run cli:test:watch

# Build for production
bun run build
```

### Testing
The project uses Vitest for testing with real services (no mocks):

```bash
# Run all tests
bun run cli:test

# Run specific test file
bun run cli:test services/llm-service

# Run tests with coverage
bun run cli:test --coverage
```

### Service Testing
Tests use the managed runtime pattern for consistent service provision:

```typescript
// Test example
import { runTestEffect } from "./runtime/testing-runtime.js";

const test = async () => {
  const result = await runTestEffect(
    Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.myMethod();
    })
  );
  expect(result).toBe(expected);
};
```

## Effect Patterns Demonstrated

### 1. Service Composition
- Modern Effect.Service pattern usage
- Layer composition and dependency injection
- Scoped resource management

### 2. Error Handling
- Typed error handling with Effect
- Comprehensive error recovery
- Graceful degradation

### 3. Resource Management
- Automatic resource cleanup
- Scoped service lifecycle
- Memory-efficient operation

### 4. Observability
- OpenTelemetry integration
- Metrics collection
- Distributed tracing

### 5. Configuration
- Environment-based configuration
- Runtime configuration management
- Secure secret handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review the test examples
- Join the Effect community

## Advanced Configuration

### Custom Service Implementation
You can extend the CLI with custom services:

```typescript
// Custom service implementation
export class CustomService extends Effect.Service<CustomService>()(
  "CustomService",
  {
    effect: Effect.gen(function* () {
      // Your implementation here
    })
  }
) {}
```

## Extending the CLI
You can extend the CLI programmatically with your own commands by using the
plugin system defined in `src/core/index.ts`.

Key types and helpers:
- `CliPlugin` — a lightweight plugin descriptor `{ name, commands }`.
- `createCli(options)` — compose a root command from built-ins and plugins.
- `runCli(root, argv?)` — run the CLI with the appropriate runtime.

Minimal end‑to‑end example:

```ts
// custom-cli.ts
import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
  createCli,
  runCli,
  // Optional: reuse built‑in commands
  listCommand,
  generateCommand,
} from "./src/core/index.js";

// 1) Define a command
const echoText = Options.text("text");
export const hello = Command.make("hello", { echoText }, ({ text }) =>
  Effect.sync(() => {
    console.log(`Hello, ${text}!`);
  })
);

// 2) Package as a plugin
const myPlugin = {
  name: "my-plugin",
  commands: [hello],
};

// 3) Compose a CLI (optionally include built‑ins)
const root = createCli({
  name: "effect-ai-cli",
  commands: [listCommand, generateCommand],
  plugins: [myPlugin],
});

// 4) Run
runCli(root, process.argv);
```

Notes:
- A `CliPlugin` is simply: `{ name: string; commands: Command[] }`.
- Commands are standard `@effect/cli` commands. Provide any services within
  your command handlers using Effect layers as usual.
- You can also build a fully custom distribution by composing only your
  commands and plugins.

Reusing built‑in commands
- `src/core/index.ts` re‑exports common commands so you can compose them:
  - `listCommand`, `generateCommand`, `planCommand`, `metricsCommand`, etc.
  - See `src/core/index.ts` for the full list of exports.

This CLI serves as a comprehensive example of modern Effect‑TS patterns in a
production‑ready application, demonstrating best practices for service
composition, resource management, and observability.
