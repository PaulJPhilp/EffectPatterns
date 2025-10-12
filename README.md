# Effect Patterns Hub

[![CI](https://github.com/PaulJPhilp/Effect-Patterns/actions/workflows/ci.yml/badge.svg)](https://github.com/PaulJPhilp/Effect-Patterns/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/PaulJPhilp/Effect-Patterns/branch/main/graph/badge.svg)](https://codecov.io/gh/PaulJPhilp/Effect-Patterns)
[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](./CHANGELOG-CLI.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A comprehensive, community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS. This repository helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.

## What's Included

### 📚 Pattern Library
- **150+ curated patterns** covering beginner to advanced topics
- Goal-oriented organization by use case
- Real-world examples with working TypeScript code
- Anti-patterns and best practices

### 🤖 AI Coding Rules
- **Machine-readable rules** for AI IDEs and coding agents
- Support for 10+ AI tools (Cursor, Windsurf, Cline, etc.)
- Automatic installation via CLI
- Always up-to-date with latest patterns

### 🛠️ Effect Patterns Toolkit
- **Type-safe MCP server** for AI agents and tools
- **REST API** for programmatic access
- **OpenTelemetry integration** for observability
- Deployed on Vercel with staging and production environments

### 🤖 Data Analysis Engine
- **Discord Exporter Service** (`@effect-patterns/effect-discord`) to create datasets from community conversations
- **AI-Powered Analysis Agent** (`scripts/analyzer.ts`) using LangGraph to perform thematic analysis on ingested data
- **Data-Driven Content Strategy** to identify community pain points and guide new pattern creation

### 🌐 ChatGPT App
- **Interactive pattern explorer** via ChatGPT interface
- Natural language pattern search
- Code generation and examples
- Real-time pattern recommendations

### 📋 CLI Tool (`ep`)
- Search and discover patterns
- Install AI coding rules
- Validate and test patterns
- Generate documentation

## Quick Start

### Installation

```bash
# Install globally with Bun (recommended)
bun install -g effect-patterns-hub

# Or with npm
npm install -g effect-patterns-hub

# Or with pnpm
pnpm install -g effect-patterns-hub
```

### Usage

```bash
# Search patterns
ep search "error handling"

# List all patterns
ep list --skill-level intermediate

# Install AI coding rules
ep install add --tool cursor

# Get help
ep --help
```

## Features

### 🎯 Goal-Oriented Organization

Patterns are organized by **what you want to achieve**, not just by API:

- **Building APIs** - HTTP servers, routes, validation
- **Error Management** - Recovery, retries, logging
- **Concurrency** - Parallelism, resource management, queues
- **Testing** - Mocking, dependency injection, test patterns
- **Observability** - Tracing, metrics, structured logging
- **Data Modeling** - Domain types, validation, transformations
- And 90+ more categories...

### 🚀 Multiple Access Methods

**1. Browse the Repository**
```bash
# Clone and explore
git clone https://github.com/PaulJPhilp/Effect-Patterns.git
cd Effect-Patterns
```

**2. Use the CLI**
```bash
# Search patterns
ep search "concurrent processing"

# Show pattern details
ep show process-collection-in-parallel-with-foreach
```

**3. Use the MCP Server**
```bash
# Start the server
bun run mcp:dev

# Or use the deployed API
curl https://effect-patterns.vercel.app/api/patterns/search?q=retry
```

**4. ChatGPT App**
Visit the deployed app or run locally:
```bash
cd app
npm install
npm run dev
```

### 🤖 AI IDE Integration

Install patterns as coding rules for your AI IDE:

```bash
# Cursor
ep install add --tool cursor

# Windsurf
ep install add --tool windsurf

# Cline
ep install add --tool cline

# List supported tools
ep install list-tools
```

Supported AI tools:
- Cursor
- Windsurf
- Cline
- Continue
- Aider
- Claude Code
- GitHub Copilot
- Cody
- Tabnine
- Supermaven

## 🤖 Agent Workflows

- **Pattern Analyzer (`scripts/analyzer/graph.ts`)**
  Runs the LangGraph workflow that chunks Discord exports, calls
  `LLMServiceLive` for thematic analysis, and saves reports to disk.
  The live test `scripts/analyzer/__tests__/graph.test.ts` exercises
  the full pipeline with real services.
- **Discord Import Utilities (`packages/effect-discord/`)**
  Provide parsing helpers and tests for converting Discord channel
  exports into typed `ChannelExport` data consumed by analyzers.
- **Chat Assistant (`app/chat-assistant/`)**
  Hosts the Next.js interface and shared Effect runtime powering the
  AI assistant tools like `searchPatterns` and `reviewCodeSnippet`.
- **MCP Server (`services/mcp-server/`)**
  Supplies Effect-driven endpoints and streaming responses so
  external agents can integrate with the patterns hub.

### 📊 Pattern Categories

Browse patterns by category:

<details>
<summary><b>Core Concepts</b> (20 patterns) - Start here if you're new to Effect</summary>

- Effects are lazy blueprints
- Sequential code with Effect.gen
- Transform values with map/flatMap
- Understanding Effect channels (A, E, R)
- And more...
</details>

<details>
<summary><b>Error Management</b> (15 patterns) - Handle failures gracefully</summary>

- catchTag for tagged errors
- Retry with backoff strategies
- Distinguish not-found from errors
- Error mapping and transformation
- And more...
</details>

<details>
<summary><b>Concurrency</b> (18 patterns) - Parallel processing and resource management</summary>

- Run effects in parallel with Effect.all
- Race concurrent effects
- Manage shared state with Ref
- Graceful shutdown
- Decouple fibers with Queues
- And more...
</details>

<details>
<summary><b>Building APIs</b> (8 patterns) - HTTP servers and REST APIs</summary>

- Create HTTP servers
- Handle GET/POST requests
- Validate request bodies with Schema
- Provide dependencies to routes
- Handle API errors
- And more...
</details>

<details>
<summary><b>Data Modeling</b> (25 patterns) - Type-safe domain modeling</summary>

- Option for optional values
- Either for multiple errors
- Tagged unions with Data.case
- Branded types for validation
- BigDecimal for financial calculations
- And more...
</details>

<details>
<summary><b>Testing</b> (8 patterns) - Test Effect applications</summary>

- Mock dependencies with layers
- Testable time with Clock
- Use .Default layer in tests
- Write tests that adapt to code
- And more...
</details>

<details>
<summary><b>Observability</b> (7 patterns) - Monitor and debug applications</summary>

- Structured logging
- Custom metrics (counters, gauges, histograms)
- Distributed tracing with spans
- OpenTelemetry integration
- Effect.fn for instrumentation
- And more...
</details>

<details>
<summary><b>Streams</b> (10 patterns) - Process data pipelines</summary>

- Create streams from files/APIs
- Process items concurrently
- Batch processing
- Retry on failure
- Manage resources safely
- And more...
</details>

[See all 90+ categories in the full README](#table-of-contents)

## Project Structure

```
Effect-Patterns/
├── app/                    # ChatGPT Next.js app
│   ├── app/               # Next.js app directory
│   ├── server/            # API routes and server logic
│   └── mcp/               # MCP server integration
├── packages/
│   ├── toolkit/           # Effect Patterns Toolkit
│   └── effect-discord/    # Effect-native Discord Exporter Service
├── services/
│   └── mcp-server/        # MCP server implementation
│       ├── src/
│       │   ├── auth/      # API key authentication
│       │   ├── tracing/   # OpenTelemetry integration
│       │   └── handlers/  # Request handlers
│       └── tests/         # Integration tests
├── content/
│   ├── published/         # Published patterns (150+)
│   ├── new/               # New patterns being developed
│   └── src/               # TypeScript examples
├── scripts/
│   ├── analyzer/          # LangGraph Analysis Agent logic
│   ├── ingest-discord.ts  # Script to run the Discord ingestion pipeline
│   ├── publish/           # Publishing pipeline
│   ├── ingest/            # Pattern ingestion
│   └── ep.ts              # CLI entry point
├── rules/                 # AI coding rules
│   └── generated/         # Generated from patterns
└── docs/                  # Documentation
    ├── guides/            # User guides
    ├── implementation/    # Technical docs
    └── claude-plugin/     # Plugin docs
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.0+ (recommended) or Node.js v18+
- TypeScript 5.8+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/PaulJPhilp/Effect-Patterns.git
cd Effect-Patterns

# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint
```

### Working with Patterns

#### Add a New Pattern

```bash
# 1. Create pattern files
mkdir -p content/new/src
touch content/new/src/my-pattern.ts
touch content/new/my-pattern.mdx

# 2. Fill out the pattern
# Edit the .ts file with your example
# Fill out the .mdx template

# 3. Run the ingest pipeline
bun run ingest

# 4. Run the full publishing pipeline
bun run pipeline
```

#### Test the CLI

```bash
# Run CLI in development
bun run ep search "retry"

# Test specific command
bun run ep install add --tool cursor --dry-run

# Run CLI tests
bun test scripts/__tests__/ep-cli.test.ts
```

#### Work on the MCP Server

```bash
# Start in development mode
bun run mcp:dev

# Run tests
bun run mcp:test

# Run integration tests
bun run mcp:test:integration

# Build for production
bun run mcp:build
```

#### Work on the ChatGPT App

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

```bash
# Pattern Management
bun run ingest          # Ingest new patterns
bun run pipeline        # Full publishing pipeline
bun run validate        # Validate patterns
bun run publish         # Publish patterns

# Data Pipeline
bun run ingest:discord  # Ingests and anonymizes data from Discord
bun run analyze         # Runs thematic analysis on ingested data

# Testing
bun test                # Run all tests
bun run test:behavioral # Behavioral tests
bun run test:integration # Integration tests
bun run test:all        # All tests
bun run test:server     # Server tests
bun run test:cli        # CLI tests

# Linting & Type Checking
bun run lint            # Lint code with Biome
bun run lint:effect     # Effect-specific linting
bun run typecheck       # TypeScript type check

# CLI
bun run ep              # Run CLI
ep --help               # CLI help

# MCP Server
bun run mcp:dev         # Development mode
bun run mcp:build       # Build for production
bun run mcp:test        # Run tests

# Toolkit
bun run toolkit:build   # Build toolkit
bun run toolkit:test    # Test toolkit

# ChatGPT App
cd app && npm run dev   # Development mode
cd app && npm run build # Build for production
```

## Deployment

### MCP Server (Vercel)

The MCP server is deployed to Vercel with staging and production environments:

```bash
# Deploy to staging
vercel --env PATTERN_API_KEY=your-staging-key

# Deploy to production
vercel --prod --env PATTERN_API_KEY=your-production-key
```

**Deployed URLs:**
- Production: `https://effect-patterns.vercel.app`
- Staging: `https://effect-patterns-staging.vercel.app`

See [services/mcp-server/README.md](./services/mcp-server/README.md) for details.

### ChatGPT App

The ChatGPT app is deployed separately:

```bash
cd app
npm run build
vercel
```

See [app/README.md](./app/README.md) for details.

## Security

We take security seriously. See [SECURITY.md](./SECURITY.md) for:
- Security best practices
- Vulnerability reporting
- API key rotation
- Security audit reports

**Current Security Posture:** ✅ GOOD
- 0 critical/high vulnerabilities
- API key authentication
- Input sanitization
- OpenTelemetry integration

## Contributing

We welcome contributions! See [docs/guides/CONTRIBUTING.md](./docs/guides/CONTRIBUTING.md) for:
- How to add new patterns
- Code style guidelines
- Pull request process
- Community guidelines

**Quick Contribution Guide:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-pattern`)
3. Add your pattern in `content/new/`
4. Run the pipeline (`bun run pipeline`)
5. Commit your changes (`git commit -am 'Add my pattern'`)
6. Push to the branch (`git push origin feature/my-pattern`)
7. Create a Pull Request

## Documentation

### User Guides
- [Setup Guide](./SETUP.md) - Getting started
- [Testing Guide](./TESTING.md) - Testing patterns
- [Release Guide](./docs/release/QUICK-RELEASE-GUIDE.md) - Release process

### Technical Documentation
- [Implementation Report](./IMPLEMENTATION_REPORT.md) - Architecture overview
- [MCP Server Docs](./services/mcp-server/README.md) - Server implementation
- [Toolkit API](./packages/toolkit/README.md) - Toolkit usage
- [Claude Plugin Docs](./docs/claude-plugin/) - Plugin development

### Project Management
- [Roadmap](./ROADMAP.md) - Future features
- [Changelog](./CHANGELOG-CLI.md) - Version history
- [Security Audit](./SECURITY_AUDIT_REPORT.md) - Security status

## API Access

### REST API

Access patterns programmatically:

```bash
# Search patterns
curl "https://effect-patterns.vercel.app/api/patterns/search?q=retry"

# Get specific pattern
curl "https://effect-patterns.vercel.app/api/patterns/handle-flaky-operations-with-retry-timeout"

# Explain a pattern
curl -X POST "https://effect-patterns.vercel.app/api/patterns/explain" \
  -H "Content-Type: application/json" \
  -d '{"patternId": "retry-based-on-specific-errors", "context": "HTTP requests"}'
```

### MCP Protocol

Use with Claude Desktop or other MCP clients:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["run", "mcp:dev"],
      "env": {
        "PATTERN_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Community

- **GitHub Discussions:** [Ask questions, share patterns](https://github.com/PaulJPhilp/Effect-Patterns/discussions)
- **Issues:** [Report bugs, request features](https://github.com/PaulJPhilp/Effect-Patterns/issues)
- **Twitter:** [@EffectPatterns](https://twitter.com/effectpatterns) (if available)
- **Discord:** [Effect Discord Server](https://discord.gg/effect-ts)

## Roadmap

Upcoming features:

### High Priority
- [ ] Package manager support (npm, pnpm)
- [ ] Re-enable Effect-TS linter
- [ ] Interactive rule selection CLI

### Medium Priority
- [ ] Additional AI tool support
- [ ] Rule update notifications
- [ ] Pattern templates

### Low Priority
- [ ] Web UI for pattern browsing
- [ ] VS Code extension
- [ ] Pattern marketplace

See [ROADMAP.md](./ROADMAP.md) for details.

## Performance & Scale

- **150+ patterns** indexed and searchable
- **Sub-100ms** search response times
- **Type-safe** end-to-end with Effect
- **Serverless** deployment on Vercel
- **OpenTelemetry** observability built-in

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built with:
- [Effect-TS](https://effect.website/) - Powerful TypeScript framework
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Next.js](https://nextjs.org/) - React framework
- [Vercel](https://vercel.com/) - Deployment platform
- [OpenTelemetry](https://opentelemetry.io/) - Observability
- [Biome](https://biomejs.dev/) - Fast linter and formatter

Special thanks to the Effect-TS community for their support and contributions.

---

## Full Table of Contents

<details>
<summary>Click to expand all pattern categories</summary>

### Data Types (19 patterns)
- Model Optional Values Safely with Option
- Accumulate Multiple Errors with Either
- Comparing Data by Value with Data.struct
- Working with Tuples using Data.tuple
- Working with Immutable Arrays using Data.array
- Representing Time Spans with Duration
- Use Chunk for High-Performance Collections
- Work with Immutable Sets using HashSet
- Redact and Handle Sensitive Data
- Modeling Effect Results with Exit
- Work with Arbitrary-Precision Numbers using BigDecimal
- Type Classes for Equality, Ordering, and Hashing with Data.Class
- Modeling Tagged Unions with Data.case
- Work with Dates and Times using DateTime
- Manage Shared State Safely with Ref
- Handle Unexpected Errors by Inspecting the Cause

### Time (2 patterns)
- Representing Time Spans with Duration
- Work with Dates and Times using DateTime

### Domain Modeling (25 patterns)
- Model Optional Values Safely with Option
- Accumulate Multiple Errors with Either
- Use Effect.gen for Business Logic
- Transform Data During Validation with Schema
- Define Type-Safe Errors with Data.TaggedError
- Define Contracts Upfront with Schema
- Modeling Validated Domain Types with Brand
- Parse and Validate Data with Schema.decode
- Validating and Parsing Branded Types
- Avoid Long Chains of .andThen
- Distinguish 'Not Found' from Errors
- And more...

### Combinators (9 patterns)
- Combining Values with zip
- Conditional Branching with if, when, and cond
- Transforming Values with map
- Chaining Computations with flatMap
- Filtering Results with filter
- Sequencing with andThen, tap, and flatten
- Handling Errors with catchAll, orElse, and match
- Mapping and Chaining over Collections with forEach and all

### Error Management (13 patterns)
- Handle Errors with catchTag, catchTags, and catchAll
- Mapping Errors to Fit Your Domain
- Control Repetition with Schedule
- Define Type-Safe Errors with Data.TaggedError
- Retry Operations Based on Specific Errors
- Handle Flaky Operations with Retries and Timeouts
- Distinguish 'Not Found' from Errors
- Handle Unexpected Errors by Inspecting the Cause

### Collections (5 patterns)
- Creating from Collections
- Working with Immutable Arrays
- Use Chunk for High-Performance Collections
- Work with Immutable Sets using HashSet
- Mapping and Chaining over Collections

### Constructors (6 patterns)
- Creating from Synchronous and Callback Code
- Lifting Values with succeed, some, and right
- Converting from Nullable, Option, or Either
- Wrapping Synchronous and Asynchronous Computations
- Creating from Collections
- Lifting Errors and Absence with fail, none, and left

### Core Concepts (20 patterns)
- Understand that Effects are Lazy Blueprints
- Wrap Asynchronous Computations with tryPromise
- Write Sequential Code with Effect.gen
- Transform Effect Values with map and flatMap
- Create Pre-resolved Effects with succeed and fail
- Solve Promise Problems with Effect
- Use .pipe for Composition
- Understand the Three Effect Channels (A, E, R)
- Control Repetition with Schedule
- Process Streaming Data with Stream
- Understand Fibers as Lightweight Threads

### Concurrency (18 patterns)
- Control Repetition with Schedule
- Race Concurrent Effects for the Fastest Result
- Manage Shared State Safely with Ref
- Run Independent Effects in Parallel with Effect.all
- Process a Collection in Parallel with Effect.forEach
- Add Caching by Wrapping a Layer
- Manage Resource Lifecycles with Scope
- Run Background Tasks with Effect.fork
- Execute Long-Running Apps with Effect.runFork
- Implement Graceful Shutdown for Your Application
- Decouple Fibers with Queues and PubSub
- Poll for Status Until a Task Completes
- Understand Fibers as Lightweight Threads

### Testing (8 patterns)
- Accessing the Current Time with Clock
- Write Tests That Adapt to Application Code
- Use the Auto-Generated .Default Layer in Tests
- Mocking Dependencies in Tests
- Model Dependencies as Services
- Create a Testable HTTP Client Service
- Organize Layers into Composable Modules

### Observability (7 patterns)
- Instrument and Observe Function Calls with Effect.fn
- Leverage Effect's Built-in Structured Logging
- Add Custom Metrics to Your Application
- Trace Operations Across Services with Spans
- Integrate Effect Tracing with OpenTelemetry

### Building APIs (8 patterns)
- Handle a GET Request
- Send a JSON Response
- Extract Path Parameters
- Create a Basic HTTP Server
- Validate Request Body
- Provide Dependencies to Routes
- Handle API Errors
- Make an Outgoing HTTP Client Request

### Resource Management (7 patterns)
- Safely Bracket Resource Usage with acquireRelease
- Create a Service Layer from a Managed Resource
- Compose Resource Lifecycles with Layer.merge
- Manage Resource Lifecycles with Scope
- Manually Manage Lifecycles with Scope
- Implement Graceful Shutdown
- Create a Managed Runtime for Scoped Resources

### Streams (10 patterns)
- Create a Stream from a List
- Run a Pipeline for its Side Effects
- Collect All Results into a List
- Turn a Paginated API into a Single Stream
- Process Items Concurrently
- Process Items in Batches
- Process collections of data asynchronously
- Process a Large File with Constant Memory
- Automatically Retry Failed Operations
- Manage Resources Safely in a Pipeline

### Pattern Matching (5 patterns)
- Matching on Success and Failure with match
- Checking Option and Either Cases
- Matching Tagged Unions with matchTag and matchTags
- Effectful Pattern Matching with matchEffect
- Handling Specific Errors with catchTag and catchTags

### Application Architecture (10 patterns)
- Model Dependencies as Services
- Understand Layers for Dependency Injection
- Organize Layers into Composable Modules
- Build a Basic HTTP Server
- Create a Reusable Runtime from Layers
- Create a Managed Runtime for Scoped Resources

### Project Setup & Execution (6 patterns)
- Execute Synchronous Effects with Effect.runSync
- Execute Asynchronous Effects with Effect.runPromise
- Set Up a New Effect Project
- Execute Long-Running Apps with Effect.runFork
- Create a Reusable Runtime from Layers
- Create a Managed Runtime for Scoped Resources

[... and 60+ more categories]

</details>

---

**Made with ❤️ by the Effect community**

**Questions?** [Open an issue](https://github.com/PaulJPhilp/Effect-Patterns/issues/new) or [start a discussion](https://github.com/PaulJPhilp/Effect-Patterns/discussions/new)
