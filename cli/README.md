# Effect AI CLI

A comprehensive TypeScript CLI application built with Effect-TS for managing AI-powered pattern processing, run management, and observability.

## Overview

The Effect AI CLI is a production-ready command-line interface that demonstrates advanced Effect-TS patterns including service composition, resource management, observability, and AI integration. It provides tools for managing AI workflows, tracking metrics, and maintaining run history.

## Features

### Core Capabilities
- **AI Integration**: Seamless integration with multiple AI providers (OpenAI, Anthropic, Google)
- **Run Management**: Complete lifecycle management for AI processing runs
- **Metrics Tracking**: Comprehensive metrics collection and reporting
- **Observability**: Full OpenTelemetry integration for tracing and monitoring
- **Configuration Management**: Flexible configuration with environment variables
- **Authentication**: Secure API key management

### Commands

#### Core Commands
- `effect-ai-cli list` - List available patterns
- `effect-ai-cli process-prompt` - Process prompts with AI
- `effect-ai-cli health` - Check system health
- `effect-ai-cli config` - Manage configuration
- `effect-ai-cli auth` - Manage authentication
- `effect-ai-cli model` - Manage AI models
- `effect-ai-cli trace` - View traces
- `effect-ai-cli dry-run` - Test without execution

#### Run Management
- `effect-ai-cli runs list` - List all runs
- `effect-ai-cli runs create` - Create a new run
- `effect-ai-cli runs update` - Update run information
- `effect-ai-cli runs delete` - Delete a run

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

# Process a prompt with AI
effect-ai-cli process-prompt "Create a React component"

# Check system health
effect-ai-cli health

# Dry run (test without execution)
effect-ai-cli dry-run --pattern="component-pattern"
```

### Advanced Usage
```bash
# Process with specific provider and model
effect-ai-cli process-prompt \
  --provider=anthropic \
  --model=claude-3-sonnet \
  --prompt="Create a data processing pipeline"

# Process with custom configuration
effect-ai-cli process-prompt \
  --config=/path/to/config.json \
  --output=/path/to/output \
  --trace

# Run with metrics collection
effect-ai-cli process-prompt \
  --metrics \
  --otel-endpoint=http://localhost:4317 \
  "Create a testing utility"
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

### Plugin Architecture
The CLI supports plugin architecture for extending functionality:

```typescript
// Plugin registration
const plugin = {
  name: "my-plugin",
  commands: [myCommand],
  services: [MyService]
};
```

This CLI serves as a comprehensive example of modern Effect-TS patterns in a production-ready application, demonstrating best practices for service composition, resource management, and observability.
