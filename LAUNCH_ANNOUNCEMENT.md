# Effect Patterns Hub - Toolkit & MCP Server Launch Announcement

## Overview

We're excited to announce the launch of two powerful tools for the Effect-TS community:

1. **@effect-patterns/toolkit** - A type-safe Effect library for working with patterns
2. **Effect Patterns MCP Server** - A production-ready REST API for pattern access

Both are now available for the Effect-TS community to use in their projects and workflows!

## What's Launching

### @effect-patterns/toolkit v0.1.0

A pure Effect library providing canonical domain types, schemas, and utilities for searching, validating, and generating code from the Effect Patterns Hub.

**Key Features:**
- 🔍 Type-safe pattern search and filtering
- ✅ Runtime validation using `@effect/schema`
- 🎯 Code generation from pattern templates
- 📦 Zero dependencies beyond Effect ecosystem
- 🚀 Pure functional architecture with Effect-TS

**Installation:**
```bash
npm install @effect-patterns/toolkit effect @effect/schema @effect/platform
```

**Quick Example:**
```typescript
import { Effect } from "effect"
import { loadPatternsFromJson, searchPatterns, buildSnippet } from "@effect-patterns/toolkit"

const program = Effect.gen(function* () {
  const patternsIndex = yield* loadPatternsFromJson("./data/patterns.json")

  const results = yield* searchPatterns({
    patterns: patternsIndex.patterns,
    query: "retry",
    skillLevel: "intermediate",
  })

  // Generate code from a pattern
  if (results[0]) {
    const snippet = yield* buildSnippet({
      pattern: results[0],
      customName: "retryRequest",
      moduleType: "esm",
    })
    console.log(snippet)
  }
})

Effect.runPromise(program)
```

### Effect Patterns MCP Server v0.1.0

A production-ready REST API providing programmatic access to 150+ curated Effect-TS patterns. Built with Effect-TS and Next.js, deployed on Vercel.

**Key Features:**
- 🔍 Pattern search API with advanced filters
- 🔐 API key authentication
- 📊 OpenTelemetry tracing integration
- ⚡ Serverless deployment on Vercel Edge
- 🎯 Effect-native architecture
- 🚀 Production-ready with health checks and monitoring

**Live Deployment:**
- Production: `https://effect-patterns.vercel.app`
- Staging: `https://effect-patterns-staging.vercel.app`

**Example Usage:**
```bash
# Search patterns
curl -H "x-api-key: YOUR_API_KEY" \
  "https://effect-patterns.vercel.app/api/patterns?q=retry&skillLevel=intermediate"

# Get specific pattern
curl -H "x-api-key: YOUR_API_KEY" \
  "https://effect-patterns.vercel.app/api/patterns/retry-with-backoff"

# Generate code snippet
curl -X POST -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"patternId":"retry-with-backoff","customName":"retryRequest"}' \
  "https://effect-patterns.vercel.app/api/generate"
```

## Who Should Use This?

### Toolkit Users

The toolkit is perfect for:
- **Library Authors** - Integrate Effect patterns into your tools
- **CLI Developers** - Build pattern search and code generation tools
- **API Builders** - Create custom pattern APIs for your team
- **Content Creators** - Generate examples and documentation from patterns
- **Researchers** - Analyze and categorize Effect-TS patterns

### MCP Server Users

The MCP server is ideal for:
- **AI Agents & LLMs** - Give AI tools access to Effect patterns
- **CI/CD Pipelines** - Validate patterns in automated workflows
- **Internal Tools** - Build team dashboards showing pattern usage
- **Documentation Sites** - Embed live pattern examples
- **Learning Platforms** - Create interactive Effect-TS tutorials

## Use Cases

### Build a Pattern Search CLI

```typescript
import { Effect } from "effect"
import { loadPatternsFromJson, searchPatterns } from "@effect-patterns/toolkit"

const searchCli = (query: string) =>
  Effect.gen(function* () {
    const index = yield* loadPatternsFromJson("./data/patterns.json")
    const results = yield* searchPatterns({
      patterns: index.patterns,
      query,
      limit: 10,
    })

    for (const pattern of results) {
      console.log(`- ${pattern.title} (${pattern.id})`)
      console.log(`  ${pattern.summary}`)
    }
  })

Effect.runPromise(searchCli(process.argv[2]))
```

### Integrate with Your App

```typescript
// Server-side pattern search
app.get("/api/search", async (req, res) => {
  const response = await fetch(
    `https://effect-patterns.vercel.app/api/patterns?q=${req.query.q}`,
    {
      headers: {
        "x-api-key": process.env.PATTERN_API_KEY,
      },
    }
  )

  const data = await response.json()
  res.json(data)
})
```

### AI Agent Integration

```typescript
// Give your AI agent access to Effect patterns
const patternTool = {
  name: "search_effect_patterns",
  description: "Search for Effect-TS patterns to help solve programming problems",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      skillLevel: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"]
      },
    },
  },
  async handler({ query, skillLevel }) {
    const response = await fetch(
      `https://effect-patterns.vercel.app/api/patterns?q=${query}&skillLevel=${skillLevel}`,
      {
        headers: { "x-api-key": process.env.PATTERN_API_KEY },
      }
    )
    return response.json()
  },
}
```

## Documentation

### Toolkit
- [README](./packages/toolkit/README.md) - Full API documentation
- [CHANGELOG](./packages/toolkit/CHANGELOG.md) - Version history
- [Source Code](./packages/toolkit/src) - Browse the implementation

### MCP Server
- [README](./services/mcp-server/README.md) - API reference and setup
- [VERCEL_SETUP](./services/mcp-server/VERCEL_SETUP.md) - Deployment guide
- [CHANGELOG](./services/mcp-server/CHANGELOG.md) - Version history
- [Smoke Tests](./services/mcp-server/smoke-test.ts) - Test your deployment

## Getting Started

### Option 1: Use the Public MCP Server

1. **Request API Access**: Contact us for an API key
2. **Start Using**: No installation needed, just make HTTP requests

### Option 2: Use the Toolkit Locally

1. **Install the Package**:
   ```bash
   npm install @effect-patterns/toolkit
   ```

2. **Download Pattern Data**:
   ```bash
   curl -o patterns.json https://raw.githubusercontent.com/PaulJPhilp/Effect-Patterns/main/data/patterns.json
   ```

3. **Start Coding**:
   ```typescript
   import { loadPatternsFromJson } from "@effect-patterns/toolkit"
   ```

### Option 3: Deploy Your Own MCP Server

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/PaulJPhilp/Effect-Patterns.git
   cd Effect-Patterns/services/mcp-server
   ```

2. **Set Up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel
   ```

See [VERCEL_SETUP.md](./services/mcp-server/VERCEL_SETUP.md) for detailed instructions.

## Technical Highlights

### Built with Effect-TS Best Practices

Both the toolkit and MCP server follow Effect-TS best practices:

- **Pure Functions** - All business logic is pure and testable
- **Effect Wrappers** - All I/O operations return `Effect`
- **Layer Composition** - Dependency injection using Effect's Layer system
- **Tagged Errors** - Explicit error types in Effect channels
- **Schema Validation** - Runtime validation with `@effect/schema`

### Architecture

#### Toolkit Architecture
```
Pattern Data (JSON)
    ↓
Schema Validation (@effect/schema)
    ↓
Pure Effect Functions
    ↓
Search, Filter, Generate
```

#### MCP Server Architecture
```
ConfigLayer
    ↓
TracingLayer (OpenTelemetry)
    ↓
PatternsLayer (In-memory cache)
    ↓
API Routes (Next.js)
    ↓
JSON Responses
```

### Performance

**Toolkit:**
- 148 passing unit tests
- Zero runtime dependencies (besides Effect)
- ~20KB minified bundle size
- Sub-millisecond search on 150+ patterns

**MCP Server:**
- Health check: <50ms
- Pattern search: <100ms
- Pattern retrieval: <50ms
- Code generation: <100ms
- Cold start: ~2s

### Security

Both projects follow security best practices:
- ✅ API key authentication (MCP Server)
- ✅ Input sanitization
- ✅ HTTPS only (Vercel)
- ✅ No code execution
- ✅ No hardcoded secrets
- ✅ 0 critical/high vulnerabilities

## What's Next?

### Toolkit Roadmap (v0.2.0)
- Pattern caching with TTL
- Fuzzy search support
- Pattern similarity matching
- Advanced filtering options
- Streaming results for large datasets

### MCP Server Roadmap (v0.2.0)
- OpenAPI/Swagger documentation endpoint
- GraphQL API
- WebSocket support for real-time updates
- Pattern usage analytics
- Rate limiting per API key
- Redis caching layer

### Effect Patterns Hub
- 150+ patterns and growing
- Community contributions welcome
- New patterns added weekly
- AI-powered pattern discovery from Discord

See [ROADMAP.md](./ROADMAP.md) for full roadmap.

## Contributing

We welcome contributions! Here's how you can help:

1. **Add New Patterns** - Share your Effect-TS knowledge
2. **Improve Documentation** - Help others learn
3. **Report Bugs** - Help us improve quality
4. **Feature Requests** - Tell us what you need
5. **Code Contributions** - PRs welcome!

See [CONTRIBUTING.md](./docs/guides/CONTRIBUTING.md) for guidelines.

## Community

- **GitHub**: [PaulJPhilp/Effect-Patterns](https://github.com/PaulJPhilp/Effect-Patterns)
- **Issues**: [Report bugs or request features](https://github.com/PaulJPhilp/Effect-Patterns/issues)
- **Discussions**: [Ask questions, share ideas](https://github.com/PaulJPhilp/Effect-Patterns/discussions)
- **Effect Discord**: Join the [Effect-TS Discord](https://discord.gg/effect-ts) and discuss in #patterns

## Acknowledgments

Special thanks to:
- The **Effect-TS team** for building an amazing framework
- The **Effect-TS community** for sharing patterns and best practices
- **Contributors** who helped shape this project
- **Early testers** who provided valuable feedback

## Get Started Today!

Try the toolkit:
```bash
npm install @effect-patterns/toolkit
```

Use the MCP server:
```bash
curl https://effect-patterns.vercel.app/api/health
```

Read the docs:
- [Toolkit README](./packages/toolkit/README.md)
- [MCP Server README](./services/mcp-server/README.md)
- [Main Project README](./README.md)

## Support

- **Documentation**: Check the READMEs and guides
- **Issues**: [Create a GitHub issue](https://github.com/PaulJPhilp/Effect-Patterns/issues/new)
- **Questions**: [Start a discussion](https://github.com/PaulJPhilp/Effect-Patterns/discussions/new)
- **Security**: See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities

---

**Built with ❤️ for the Effect-TS community**

License: MIT © Paul Philp

---

## Announcement Channels

### Social Media Posts

**Twitter/X:**
```
🚀 Launching @effect-patterns Toolkit v0.1.0!

Type-safe Effect library for pattern search, validation, and code generation.

✅ 150+ curated Effect-TS patterns
✅ Runtime validation with @effect/schema
✅ Code generation from templates
✅ Zero dependencies (besides Effect)

npm install @effect-patterns/toolkit

Docs: [link]
#EffectTS #TypeScript
```

**LinkedIn:**
```
Excited to announce the launch of Effect Patterns Toolkit and MCP Server! 🎉

These tools bring 150+ curated Effect-TS patterns to your fingertips:

📦 @effect-patterns/toolkit - A type-safe Effect library for pattern operations
🌐 MCP Server - Production REST API deployed on Vercel

Both follow Effect-TS best practices with pure functions, Layer composition, and schema validation.

Perfect for:
- Building Effect-TS applications
- Integrating AI agents with Effect patterns
- Creating custom pattern tools
- Learning Effect-TS best practices

Check out the docs and get started today!
[link to GitHub]

#EffectTS #TypeScript #FunctionalProgramming #OpenSource
```

### Discord Announcement (Effect-TS Server)

```
Hey Effect community! 👋

We're launching two new tools for working with Effect-TS patterns:

**@effect-patterns/toolkit v0.1.0**
A type-safe Effect library for pattern search, validation, and code generation
- 150+ patterns indexed
- Runtime validation with @effect/schema
- Code generation from templates
- Pure Effect architecture

**Effect Patterns MCP Server v0.1.0**
Production REST API for programmatic pattern access
- Live at https://effect-patterns.vercel.app
- API key authentication
- OpenTelemetry tracing
- Effect-native architecture

Use cases:
- Build pattern search CLIs
- Integrate patterns into your apps
- Give AI agents Effect knowledge
- Create custom pattern tools

Docs: [GitHub link]
Feedback welcome in #patterns!
```

### Reddit Post (r/typescript, r/functionalprogramming)

**Title:** [Release] Effect Patterns Toolkit & MCP Server - Type-safe library and REST API for Effect-TS patterns

**Body:**
```
I'm excited to share two new tools I've built for the Effect-TS community:

## @effect-patterns/toolkit

A pure Effect library providing type-safe operations on 150+ curated Effect-TS patterns.

Features:
- Pattern search and filtering with Effect
- Runtime validation using @effect/schema
- Code generation from pattern templates
- Zero dependencies (besides Effect ecosystem)
- 148 passing unit tests

npm install @effect-patterns/toolkit

## Effect Patterns MCP Server

A production-ready REST API deployed on Vercel for programmatic access to patterns.

Features:
- Pattern search API with filters
- API key authentication
- OpenTelemetry tracing
- Effect-native architecture
- <100ms response times

Live at: https://effect-patterns.vercel.app

## Use Cases

- Build pattern search CLIs
- Integrate patterns into documentation
- Give AI agents access to Effect knowledge
- Create custom pattern tooling
- Learn Effect-TS best practices

Both projects follow Effect best practices: pure functions, Layer composition, tagged errors, schema validation.

Check out the docs on GitHub: [link]

Feedback and contributions welcome!
```

### Dev.to / Hashnode Article

**Title:** Launching Effect Patterns Toolkit & MCP Server: Type-Safe Pattern Operations for Effect-TS

**Tags:** #typescript #effectts #functionalprogramming #opensource

**Content:** [Expanded version of this announcement with code examples and architecture diagrams]
