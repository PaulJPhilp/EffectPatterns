# @effect-patterns/mcp-server

> MCP 2.0 Compatible server for Effect Patterns with advanced code analysis and pattern management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.19+-purple.svg)](https://effect.website/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0+-black.svg)](https://nextjs.org/)
[![MCP](https://img.shields.io/badge/MCP-2.0-green.svg)](https://modelcontextprotocol.io)

A comprehensive MCP 2.0 server and HTTP API for the Effect Patterns ecosystem, providing pattern search, code analysis, refactoring capabilities, and modern authentication with enterprise-grade features.

## 🚀 MCP 2.0 Features

- **OAuth 2.1 Authentication**: Secure authorization with PKCE support
- **Streamable HTTP Transport**: Modern remote access with SSE support
- **Structured Tool Output**: Rich markdown responses with metadata
- **Enhanced Error Handling**: Contextual error messages with suggestions
- **Performance Tracking**: Execution timing and performance metrics
- **Smart Navigation**: Related tools and next steps guidance
- **JSON Schema 2020-12**: Modern validation and type safety

## 🎯 Core Capabilities

- **Pattern Search**: Search Effect-TS patterns by category, skill level, and keywords
- **Code Analysis**: TypeScript analysis with Effect-TS best practices and anti-pattern detection
- **Automated Refactoring**: AST-based code transformations with preview
- **Consistency Analysis**: Cross-file pattern consistency checking
- **Enterprise Features**: Rate limiting, caching, metrics, tracing, and comprehensive logging

**MCP Tool Surface**: Pattern search and rule catalog
**HTTP API / CLI Surface**: Code analysis, generation, consistency analysis, and automated refactoring

## 📋 MCP Tools Available

### Pattern Management

- `search_patterns` - Enhanced search with metadata and navigation
- `get_pattern` - Rich pattern documentation with usage guidance

### Code Analysis

- `analyze_code` - Detailed issue reporting with severity breakdowns
- `review_code` - AI-powered architectural analysis with priorities
- `list_analysis_rules` - Comprehensive rule listings with categories

### Advanced Features (HTTP API)

- `analyze_consistency` - Cross-file pattern consistency analysis
- `apply_refactoring` - Automated AST-based refactoring with preview
- `generate_pattern` - Template-based code generation

## 🔧 Transport Options

### MCP 2.0 Streamable HTTP (Recommended)

- **Endpoint**: `http://localhost:3001/mcp`
- **Authentication**: OAuth 2.1 with PKCE
- **Features**: Remote access, SSE, structured responses
- **Security**: Origin validation, token management

### Legacy Stdio Transport

- **Command**: `bun run mcp:stdio`
- **Authentication**: Optional (auth enforced at HTTP API)
- **Features**: Local development, backward compatibility
- **Use Case**: Development and testing

## Installation

```bash
# Clone the repository
git clone https://github.com/PaulJPhilp/Effect-Patterns.git
cd Effect-Patterns/packages/mcp-server

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
bun run migrate

# Start MCP 2.0 Streamable HTTP server
bun run mcp:http

# Or start legacy stdio server
bun run mcp:stdio
```

## Prerequisites

- **Node.js 18+** - Required for Next.js and modern JavaScript features
- **Bun 1.2+** - Recommended package manager and runtime
- **PostgreSQL 14+** - For pattern storage and analytics
- **OpenTelemetry Collector** (optional) - For distributed tracing

## MCP 2.0 Setup

### OAuth 2.1 Configuration

```bash
# Required for MCP 2.0 Streamable HTTP transport
OAUTH_CLIENT_ID=effect-patterns-mcp
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URIS=http://localhost:3000/callback,https://your-app.com/callback
OAUTH_SCOPES=mcp:access,patterns:read,analysis:run

# Optional PKCE settings (defaults to secure values)
PKCE_CODE_VERIFIER_LENGTH=128
PKCE_CODE_CHALLENGE_METHOD=S256
```

### Environment Variables

Create a `.env` file with the following variables:

```bash
# MCP Configuration
PATTERN_API_KEY=your-secret-api-key
NODE_ENV=development
PORT=3001

# MCP 2.0 Transport
MCP_TRANSPORT=http  # or "stdio" for legacy
MCP_PROTOCOL_VERSION=2025-11-25

# OAuth 2.1 (HTTP transport only)
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=effect-patterns-mcp
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URIS=http://localhost:3000/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/effect_patterns

# OpenTelemetry Tracing
TRACING_ENABLED=true
OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS=authorization=Bearer your-token
SERVICE_NAME=effect-patterns-mcp-server
SERVICE_VERSION=2.0.0

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Caching
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_MS=300000
CACHE_MAX_ENTRIES=1000

# Logging
LOGGING_ENABLED=true
LOG_LEVEL=info
MCP_DEBUG=false

# Metrics
METRICS_ENABLED=true

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.com
ENABLE_DNS_REBINDING_PROTECTION=true
```

## MCP 2.0 Usage

### Client Configuration

#### MCP 2.0 Streamable HTTP Client

```typescript
import { createMcpClient } from '@modelcontextprotocol/sdk/client/mcp.js';

const client = await createMcpClient({
  name: 'effect-patterns-client',
  version: '1.0.0',
}, {
  transport: {
    type: 'streamable-http',
    url: 'http://localhost:3001/mcp',
    headers: {
      'MCP-Protocol-Version': '2025-11-25',
      'Authorization': 'Bearer your-oauth-token'
    }
  }
});
```

#### OAuth 2.1 Authentication Flow

```typescript
// 1. Initiate OAuth flow
const authUrl = 'http://localhost:3001/auth?' + 
  'response_type=code&' +
  'client_id=effect-patterns-mcp&' +
  'redirect_uri=http://localhost:3000/callback&' +
  'code_challenge=abc123&' +
  'code_challenge_method=S256';

// 2. Exchange authorization code for access token
const tokenResponse = await fetch('http://localhost:3001/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: 'http://localhost:3000/callback',
    client_id: 'effect-patterns-mcp',
    code_verifier: pkceVerifier
  })
});

const { access_token } = await tokenResponse.json();
```

### Enhanced Tool Responses

MCP 2.0 tools now provide structured responses with rich metadata:

```typescript
// Example: search_patterns response
{
  content: [
    {
      type: "text",
      text: "# Pattern Search Results\n\n**Query**: service\n**Results Found**: 5\n**Execution Time**: 150ms\n\n## Search Results\n\n### 1. Service Pattern\n**Category**: service\n**Difficulty**: beginner\n\nDescription...\n\n```typescript\nexport const Service = Effect.gen(...)\n```"
    },
    {
      type: "text", 
      text: JSON.stringify({
        query: "service",
        resultsCount: 5,
        executionTime: "150ms",
        relatedTools: ["get_pattern", "list_analysis_rules"],
        nextSteps: ["Get detailed pattern information", "Analyze your code"]
      }, null, 2)
    }
  ]
}
```

## HTTP API Reference

### Authentication

Legacy endpoints (except `/api/health`) require authentication via API key:

```bash
# Header authentication (recommended)
curl -H "x-api-key: your-api-key" https://your-server.com/api/patterns

# Query parameter authentication
curl "https://your-server.com/api/patterns?key=your-api-key"
```

### Endpoints

#### Health Check

```http
GET /api/health
```

Returns service health status (no authentication required).

**Response:**

```json
{
  "ok": true,
  "version": "0.5.1",
  "service": "effect-patterns-mcp-server",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Pattern Search

```http
GET /api/patterns?q=query&category=error-handling&difficulty=beginner&limit=10
```

Search for Effect-TS patterns with optional filters.

**Parameters:**

- `q` (string): Search query
- `category` (string): Pattern category (e.g., "error-handling", "concurrency")
- `difficulty` (string): "beginner" | "intermediate" | "advanced"
- `limit` (number): Maximum results (default: 50)

**Response:**

```json
{
  "count": 5,
  "patterns": [
    {
      "id": "retry-with-backoff",
      "title": "Retry with Backoff",
      "description": "Exponential backoff retry pattern",
      "category": "error-handling",
      "skillLevel": "intermediate",
      "tags": ["retry", "backoff", "error"]
    }
  ],
  "traceId": "trace-123"
}
```

#### Get Pattern by ID

```http
GET /api/patterns/{patternId}
```

Retrieve a specific pattern by ID.

**Response:**

```json
{
  "id": "retry-with-backoff",
  "title": "Retry with Backoff",
  "description": "Exponential backoff retry pattern",
  "code": "export const retryWithBackoff = ...",
  "imports": ["import { Effect } from 'effect'"],
  "traceId": "trace-123"
}
```

#### Generate Code from Pattern

```http
POST /api/generate
Content-Type: application/json

{
  "patternId": "retry-with-backoff",
  "name": "myRetry",
  "moduleType": "esm"
}
```

Generate customized code from a pattern template.

**Parameters:**

- `patternId` (string): Pattern identifier
- `name` (string, optional): Custom function name
- `moduleType` (string): "esm" | "cjs"

**Response:**

```json
{
  "patternId": "retry-with-backoff",
  "name": "myRetry",
  "imports": ["import { Effect } from 'effect'"],
  "code": "export const myRetry = ...",
  "traceId": "trace-123"
}
```

#### Analyze Code

```http
POST /api/analyze-code
Content-Type: application/json

{
  "source": "const x = 1;",
  "filename": "example.ts",
  "analysisType": "all"
}
```

Analyze TypeScript code for Effect-TS best practices.

The analyzer also detects common anti-patterns in Effect-ish code, such as:

- **try/catch in Effect logic** (prefer `Effect.try` / `Effect.tryPromise`)
- **catch blocks that log and continue** (avoid swallowing failures)
- **throw inside Effect code** (prefer `Effect.fail` with tagged errors)

For `app/api/**/route.ts` files, `try/catch` is treated as boundary
guidance (low severity).

**Parameters:**

- `source` (string): Source code to analyze
- `filename` (string, optional): File name for context
- `analysisType` (string): "validation" | "patterns" | "errors" | "all"

**Response:**

```json
{
  "suggestions": [
    {
      "id": "any-type",
      "title": "Avoid any",
      "message": "Replace `any` with specific types",
      "severity": "high"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Review Code

```http
POST /api/review-code
Content-Type: application/json

{
  "code": "const x: any = 1;\nasync function foo() { return 1; }",
  "filePath": "example.ts"
}
```

Get high-fidelity architectural recommendations for Effect codebases.
Returns the top 3 highest-priority issues with actionable guidance.

**Response Characteristics:**

- Top 3 recommendations per request (sorted by severity, then line number)
- Unlimited queries
- Markdown-formatted output
- Upgrade message when more issues are found

**Validation:**

- Maximum file size: 100KB
- TypeScript files only (.ts, .tsx)
- Returns 413 for oversized files
- Returns 400 for non-TypeScript files

**Parameters:**

- `code` (string): Source code to review
- `filePath` (string, optional): File path for context and validation

**Response:**

```json
{
  "recommendations": [
    {
      "severity": "high",
      "title": "Raw Promise Usage",
      "line": 42,
      "message": "Direct usage of 'new Promise' bypasses Effect's interruption model. Wrap in 'Effect.async' or 'Effect.tryPromise'."
    },
    {
      "severity": "medium",
      "title": "Missing Error Type",
      "line": 15,
      "message": "Service method returns generic 'Error'. Define a specific schema for better observability."
    },
    {
      "severity": "medium",
      "title": "Legacy Import",
      "line": 2,
      "message": "Importing from 'node:fs' creates a hard dependency. Use '@effect/platform/FileSystem' for testability."
    }
  ],
  "meta": {
    "totalFound": 12,
    "hiddenCount": 9,
    "upgradeMessage": "9 more architectural issues found. Use the HTTP API or CLI to see all issues and auto-fix them."
  },
  "markdown": "# Code Review Results\n\nFound 12 issues...",
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Analyze Consistency

```http
POST /api/analyze-consistency
Content-Type: application/json

{
  "files": [
    {
      "filename": "a.ts",
      "source": "import { readFile } from 'node:fs/promises';"
    },
    {
      "filename": "b.ts", 
      "source": "import { FileSystem } from '@effect/platform';"
    }
  ]
}
```

Detect code inconsistencies across multiple files.

**Response:**

```json
{
  "issues": [
    {
      "type": "import-inconsistency",
      "description": "Mixed fs import patterns",
      "files": ["a.ts", "b.ts"],
      "suggestion": "Use @effect/platform consistently"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Apply Refactoring

```http
POST /api/apply-refactoring
Content-Type: application/json

{
  "refactoringId": "replace-node-fs",
  "files": [
    {
      "filename": "a.ts",
      "source": "import { readFile } from 'node:fs/promises';"
    }
  ],
  "preview": true
}
```

Apply automated refactoring patterns.

**Parameters:**

- `refactoringId` (string): Refactoring identifier
- `files` (array): Files to refactor
- `preview` (boolean): Preview changes without applying

**Response:**

```json
{
  "applied": false,
  "changes": [
    {
      "filename": "a.ts",
      "before": "import { readFile } from 'node:fs/promises';",
      "after": "import { FileSystem } from '@effect/platform';"
    }
  ],
  "traceId": "trace-123",
  "timestamp": "2024-01-13T12:00:00.000Z"
}
```

#### Trace Wiring Examples

```http
GET /api/trace-wiring
```

Get tracing setup examples for different languages/frameworks.

**Response:**

```json
{
  "effectNodeSdk": "import { NodeSdk } from '@effect/opentelemetry'...",
  "effectWithSpan": "Effect.fn('operation-name')(function* () {...})",
  "langgraphPython": "from langchain_community.callbacks import ...",
  "notes": "Configure OTLP endpoint for proper tracing",
  "traceId": "trace-123"
}
```

## Development

### Running Tests

Complete testing guide: **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**

This guide includes:
- Step-by-step instructions for all 7 test types
- Environment setup for each test type
- Troubleshooting for common issues
- CI/CD integration examples
- Performance optimization tips

Environment variables reference: **[ENV_VARS.md](./ENV_VARS.md)**

Quick test commands:

```bash
# Unit tests (10-15s)
bun run test

# Routes and handlers (45-60s)
bun run test:routes

# MCP protocol (30-40s)
bun run test:mcp

# Integration tests (20-30s, requires server startup)
bun run test:integration

# Deployment tests (90-120s, requires API key)
export STAGING_API_KEY="your-key"
bun run test:deployment:staging

# All critical tests
bun run test:full

# Test coverage
bun run test:coverage

# Stress tests
bun run test:stress:all
```

For detailed instructions on each test type, environment setup, and troubleshooting, see [TESTING_GUIDE.md](./TESTING_GUIDE.md).
For complete environment variable reference, see [ENV_VARS.md](./ENV_VARS.md).

### MCP 2.0 Development

```bash
# Start MCP 2.0 Streamable HTTP server with debug
MCP_DEBUG=true bun run mcp:http

# Start legacy stdio server
bun run mcp:stdio

# Test OAuth 2.1 flow
bun run mcp:oauth:test

# Test PKCE functionality
bun run mcp:pkce:test
```

### Database Operations

```bash
# Check database connectivity
curl -H "x-api-key: your-key" http://localhost:3001/api/db-check

# Run migrations
curl -X POST -H "x-api-key: your-key" http://localhost:3001/api/migrate

# Check environment configuration
curl -H "x-api-key: your-key" http://localhost:3001/api/env-check
```

### Monitoring

#### Metrics

Access Prometheus metrics:

```bash
curl http://localhost:3001/api/metrics
```

#### Tracing

View traces in your OpenTelemetry-compatible backend (Jaeger, Tempo, etc.).

#### Health Monitoring

The health endpoint provides basic service status:

```bash
curl http://localhost:3001/api/health
```

#### MCP 2.0 Health

Check MCP 2.0 specific health:

```bash
curl -H "MCP-Protocol-Version: 2025-11-25" http://localhost:3001/mcp/health
```

## Deployment

### MCP 2.0 Deployment

#### Vercel (Recommended for MCP 2.0)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `OAUTH_ENABLED=true`
   - `OAUTH_CLIENT_ID=effect-patterns-mcp`
   - `OAUTH_CLIENT_SECRET=your-client-secret`
   - `ALLOWED_ORIGINS=https://your-app.com`
3. Deploy automatically on push to main branch

#### Docker

```bash
# Build MCP 2.0 image
docker build -t effect-patterns-mcp-server .

# Run with MCP 2.0 environment variables
docker run -p 3001:3001 \
  -e OAUTH_ENABLED=true \
  -e OAUTH_CLIENT_ID=effect-patterns-mcp \
  -e OAUTH_CLIENT_SECRET=your-key \
  -e ALLOWED_ORIGINS=https://your-app.com \
  effect-patterns-mcp-server
```

### Environment-Specific Configuration

**Development:**

- `NODE_ENV=development`
- `MCP_DEBUG=true` for verbose logging
- Database connections use local credentials
- OAuth endpoints allow localhost

**Production:**

- `NODE_ENV=production`
- OAuth 2.1 required for HTTP transport
- All security features enabled
- Metrics and tracing enabled
- Origin validation enforced

## Architecture

```mermaid
graph TB
    %% Clients
    Client[Claude Code Client] -->|MCP 2.0 Protocol| HTTP[HTTP Transport]
    Client -->|Legacy MCP| Stdio[Stdio Transport]
    
    %% Transport Layer
    HTTP --> Auth[OAuth 2.1 Server]
    HTTP --> Security[Security Middleware]
    Stdio --> Auth
    
    %% API Layer
    Auth --> Router[Next.js API Routes]
    Security --> Router
    Router --> MCPTools[MCP Tool Handlers]
    Router --> REST[REST API Endpoints]
    
    %% Service Layer
    MCPTools --> Services[Effect-TS Services]
    REST --> Services
    
    %% Core Services
    Services --> Config[ConfigService]
    Services --> Patterns[PatternsService]
    Services --> Analyzer[CodeAnalyzerService]
    Services --> Refactor[RefactoringEngineService]
    Services --> Consistency[ConsistencyAnalyzerService]
    Services --> Tracing[TracingService]
    Services --> OAuth[OAuth2Service]
    
    %% Data Layer
    Patterns --> DB[(PostgreSQL)]
    Config --> Cache[(Redis Cache)]
    
    %% External Services
    Tracing --> OTLP[OpenTelemetry Collector]
    Analyzer --> AnalysisCore[@effect-patterns/analysis-core]
    Patterns --> Toolkit[@effect-patterns/toolkit]
    
    %% Monitoring
    Router --> Metrics[Prometheus Metrics]
    Services --> Logging[Structured Logging]
    
    %% Response Flow
    MCPTools --> Response[Structured Output Builder]
    Response --> Client
    
    %% Styling
    classDef client fill:#e1f5fe
    classDef transport fill:#f3e5f5
    classDef api fill:#e8f5e8
    classDef service fill:#fff3e0
    classDef data fill:#fce4ec
    classDef external fill:#f1f8e9
    classDef monitoring fill:#e0f2f1
    
    class Client client
    class HTTP,Stdio transport
    class Router,MCPTools,REST api
    class Config,Patterns,Analyzer,Refactor,Consistency,Tracing,OAuth service
    class DB,Cache data
    class OTLP,AnalysisCore,Toolkit external
    class Metrics,Logging monitoring
```

### Dataflow Diagram

```mermaid
---
config:
  theme: default
---
sequenceDiagram
    box User
      participant Client as Claude Code Client
    end
    box Authentication
      participant Auth as OAuth 2.1 Server
    end
    box Backend Gateway
      participant API as Next.js API Routes
      participant MCP as MCP Tool Handlers
    end
    box Service Layer & Data
      participant Services as Effect-TS Services
      participant DB as PostgreSQL
      participant Cache as Redis Cache
      participant Analysis as analysis-core
      participant Response as Response Builder
    end
    %% MCP 2.0 Authentication Flow
    Client->>Auth: Initiate OAuth Flow
    Auth->>Client: Authorization Code
    Client->>Auth: Exchange Code for Token
    Auth->>Client: Access Token
    %% Pattern Search Flow
    Client->>API: POST /mcp (search_patterns)
    Note over API: Bearer Token Auth
    API->>MCP: search_patterns tool call
    MCP->>Services: PatternsService.search()
    Services->>Cache: Check cache first
    alt Cache Hit
        Cache->>Services: Return cached patterns
    else Cache Miss
        Services->>DB: Query patterns table
        DB->>Services: Pattern results
        Services->>Cache: Store in cache
    end
    Services->>MCP: Pattern results
    MCP->>Response: Build structured output
    Response->>API: Markdown + metadata
    API->>Client: MCP response
    %% Code Analysis Flow
    Client->>API: POST /mcp (analyze_code)
    API->>MCP: analyze_code tool call
    MCP->>Services: CodeAnalyzerService.analyze()
    Services->>Analysis: AST analysis request
    Analysis->>Services: Issues + suggestions
    Services->>MCP: Analysis results
    MCP->>Response: Build rich response
    Response->>API: Formatted findings
    API->>Client: Analysis report
    %% Code Review Flow
    Client->>API: POST /api/review-code
    Note over API: API Key Auth
    API->>Services: ReviewCodeService.review()
    Services->>Analysis: Architectural analysis
    Analysis->>Services: Priority recommendations
    Services->>DB: Store review metrics
    Services->>API: Top 3 issues + capability message
    API->>Client: Review results
    %% Refactoring Flow
    Client->>API: POST /api/apply-refactoring
    API->>Services: RefactoringEngineService.apply()
    Services->>Analysis: AST transformation
    Analysis->>Services: Preview changes
    Services->>API: Before/after diff
    API->>Client: Refactoring preview
    %% Error Handling Flow
    API->>Services: Service call fails
    Services->>API: Tagged error type
    API->>Response: Error annotation
    Response->>Client: Structured error + suggestions
    %% Monitoring Flow
    API->>Services: Log request start
    Services->>API: Log request completion
    API->>Client: Include traceId in response

### MCP 2.0 Architecture

The MCP 2.0 server introduces several new architectural components:

#### Transport Layer

- **StreamableHTTPServerTransport**: Modern HTTP transport with SSE
- **OAuth2Server**: OAuth 2.1 authorization server with PKCE
- **SecurityMiddleware**: Origin validation and attack prevention

#### Enhanced Response System

- **StructuredOutput**: Rich markdown responses with metadata
- **ResponseBuilder**: Fluent API for constructing responses
- **AnnotationSystem**: Error, warning, and progress annotations

#### Schema System

- **JSON Schema 2020-12**: Modern validation dialect
- **ToolSchemas**: Comprehensive type definitions
- **TypeSafety**: Full TypeScript support throughout

### Service Layer

The server uses Effect-TS services for dependency injection:

- **ConfigService**: Environment configuration
- **PatternsService**: Database-backed pattern access
- **TracingService**: OpenTelemetry integration
- **CodeAnalyzerService**: Static code analysis
- **PatternGeneratorService**: Template-based code generation
- **ConsistencyAnalyzerService**: Multi-file analysis
- **RefactoringEngineService**: Automated refactoring
- **OAuth2Service**: OAuth 2.1 authorization management

### Error Handling

All errors use tagged error types for type-safe handling:

- `AuthenticationError`: API key or OAuth issues
- `ValidationError`: Invalid request data
- `RateLimitError`: Rate limit exceeded
- `PatternNotFoundError`: Pattern not found
- `ConfigurationError`: Server misconfiguration
- `OAuthError`: OAuth 2.1 flow errors

### Performance Features

- **Caching**: TTL-based with LRU eviction
- **Rate Limiting**: Sliding window algorithm
- **Metrics**: Prometheus-compatible export
- **Tracing**: OpenTelemetry integration
- **Connection Pooling**: Database connection management
- **Response Optimization**: Structured output with metadata

## Migration Guide

### From MCP 1.0 to MCP 2.0

#### Breaking Changes

- **Transport**: Stdio → Streamable HTTP (recommended)
- **Authentication**: API Key → OAuth 2.1 with PKCE
- **Schema**: Draft-07 → JSON Schema 2020-12
- **Responses**: Plain text → Structured markdown + metadata

#### Migration Steps

1. **Update Client Configuration**

   ```typescript
   // Old (MCP 1.0)
   const client = createStdioClient();
   
   // New (MCP 2.0)
   const client = await createMcpClient({
     name: 'effect-patterns-client',
     version: '1.0.0',
   }, {
     transport: {
       type: 'streamable-http',
       url: 'http://localhost:3001/mcp',
       headers: {
         'MCP-Protocol-Version': '2025-11-25',
         'Authorization': 'Bearer your-oauth-token'
       }
     }
   });
   ```

1. **Update Authentication**

   ```bash
   # Old: API Key
   PATTERN_API_KEY=your-key
   
   # New: OAuth 2.1
   OAUTH_ENABLED=true
   OAUTH_CLIENT_ID=effect-patterns-mcp
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

2. **Handle Enhanced Responses**

   ```typescript
   // Old: Simple text response
   const response = await client.call('search_patterns', { q: 'service' });
   console.log(response.content[0].text);
   
   // New: Structured response with metadata
   const response = await client.call('search_patterns', { q: 'service' });
   const markdown = response.content[0].text;
   const metadata = JSON.parse(response.content[1].text);
   console.log(markdown);
   console.log('Execution time:', metadata.executionTime);
   console.log('Related tools:', metadata.relatedTools);
   ```

#### Backward Compatibility

The MCP 2.0 server maintains backward compatibility:

- **Legacy Stdio Transport**: Available via `bun run mcp:stdio`
- **API Key Authentication**: Still supported for stdio transport
- **Simple Responses**: Clients can ignore metadata and use text content
- **JSON Schema Compatibility**: Tool schemas remain compatible

#### Recommended Migration Path

1. **Phase 1**: Deploy MCP 2.0 alongside existing MCP 1.0
2. **Phase 2**: Update clients to use OAuth 2.1 authentication
3. **Phase 3**: Migrate to Streamable HTTP transport
4. **Phase 4**: Adopt enhanced response features
5. **Phase 5**: Deprecate MCP 1.0 stdio transport

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass including MCP 2.0 compliance
5. Submit a pull request

### MCP 2.0 Development Guidelines

- Use JSON Schema 2020-12 for all tool schemas
- Provide structured responses with metadata
- Include execution timing in all tool responses
- Add related tools and next steps suggestions
- Test both HTTP and stdio transports
- Validate OAuth 2.1 flows

## License

MIT License

Copyright (c) 2023 Effect Patterns Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Part of the [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)**

## Support

- Create issues in the GitHub repository
- Check the MCP 2.0 compliance test output for connectivity issues
- Review logs for detailed error information
- Consult the OAuth 2.1 documentation for authentication issues

## Version History

### v2.0.0 - MCP 2.0 Release

- ✅ OAuth 2.1 authentication with PKCE
- ✅ Streamable HTTP transport with SSE
- ✅ Structured tool output and annotations
- ✅ JSON Schema 2020-12 validation
- ✅ Enhanced error handling and suggestions
- ✅ Performance tracking and metadata
- ✅ Security improvements (Origin validation, DNS rebinding protection)
- ✅ Backward compatibility with stdio transport

### v1.x.x - Legacy MCP 1.0

- Stdio transport only
- API key authentication
- Plain text responses
- JSON Schema draft-07
- Basic error handling

## Logging & Debugging

The server implements a hierarchical logging system to ensure production safety and protocol integrity.

### Log Levels

- `debug`: Detailed implementation tracing
- `info`: Standard operational events (default)
- `warn`: Recoverable issues
- `error`: Fatal or critical failures

### Configuration

- `LOG_LEVEL`: Set the minimum log level (default: `info`)
- `MCP_DEBUG`: Set to `true` to force `debug` level regardless of `LOG_LEVEL`

**Note:** All logs are strictly routed to `stderr` to prevent interference with the MCP protocol on `stdout`.

## Presentation Contract

The server output embeds stable, hidden contract markers to facilitate automated testing and client integration without relying on brittle markdown styling.

- **`<!-- kind:pattern-index:v1 -->`**: Indicates the presence of the search results index table.
- **`<!-- kind:pattern-card:v1 -->`**: Indicates the start of a pattern detail card.

These markers are guaranteed to be present in the raw tool output content, enabling robust regression testing of the presentation layer.

**Versioning Rule:** If marker semantics change, the version suffix (e.g., `v1`) must be incremented, and backward compatibility should be maintained where feasible.

## CI/CD Requirements

Integration tests (`test:integration`) require specific environment variables in your CI/CD pipeline:

- `PATTERN_API_KEY`: Required for all integration tests.
- `CI`: Set to `true` to enable strict assertions.

Integration tests will fail fast if these variables are missing in a CI environment.
