# Effect Patterns MCP Server

A Model Context Protocol (MCP) server that provides Effect-TS patterns, code analysis, and architectural recommendations for developers using Effect in their projects.

## 🚀 Features

- **Pattern Library**: 216+ Effect-TS patterns with examples and explanations
- **Code Review**: AI-powered architectural analysis for Effect codebases
- **Smart Search**: Find patterns by category, difficulty, or keywords
- **Type-Safe Recommendations**: Get contextual suggestions based on your code
- **Production Ready**: Deployed and scalable infrastructure

## 📦 Installation

### Claude Code IDE Integration

1. **Open Claude Code Settings**
   - Go to Settings → MCP Servers
   - Click "Add MCP Server"

2. **Configure the Server**

   ```json
   {
     "name": "effect-patterns",
     "command": "bun",
     "args": ["run", "mcp:production"],
     "cwd": "/path/to/your/project",
     "env": {
       "PATTERN_API_KEY": "ce9a3a239f8c028cbf543aa1b77637b8a98ade05814770e4950ff2bb32e9ee84"
     }
   }
   ```

3. **Alternative: Local Development**

   ```json
   {
     "name": "effect-patterns-local",
     "command": "bun",
     "args": ["run", "mcp"],
     "cwd": "/path/to/effect-patterns/packages/mcp-server",
     "env": {
       "PATTERN_API_KEY": "dev-key"
     }
   }
   ```

### Prerequisites

- **Node.js** 18+ or **Bun** latest
- **Effect-TS** project (recommended)
- API key (provided above)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PATTERN_API_KEY` | Authentication key | Required |
| `DATABASE_URL` | PostgreSQL connection | Auto-configured |
| `TIER_MODE` | Service tier (`free`/`paid`) | `free` |
| `NODE_ENV` | Environment mode | `development` |

### Claude Code Configuration

Create or update your `.claude_code_config.json`:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["run", "mcp:production"],
      "env": {
        "PATTERN_API_KEY": "ce9a3a239f8c028cbf543aa1b77637b8a98ade05814770e4950ff2bb32e9ee84"
      }
    }
  }
}
```

## 🎯 Usage

### Available Tools

The MCP server exposes the free-tier tool surface only:
- `search_patterns`
- `get_pattern`
- `list_analysis_rules`
- `analyze_code`
- `review_code`

Paid-tier features are available via the HTTP API only (not exposed as MCP tools).

#### 🔍 `search_patterns`

Find Effect patterns by category, difficulty, or keywords.

**Parameters:**

- `query` (string): Search terms
- `category` (string): Pattern category
- `difficulty` (string): `beginner` | `intermediate` | `advanced`
- `limit` (number): Maximum results (default: 10)

**Example:**

```
Search for error handling patterns for beginners
```

#### 📋 `list_analysis_rules`

View available code analysis rules for Effect-TS.

**Example:**

```
Show all available analysis rules
```

#### 🔧 `analyze_code`

Analyze Effect code for anti-patterns and improvements.

**Parameters:**

- `code` (string): Effect-TS code to analyze
- `filePath` (string): Optional file path for context

**Example:**

```
Analyze this Effect code for improvements:
const program = Effect.gen(function* () {
  const result = yield* someOperation()
  return result
})
```

#### 📝 `review_code`

Get architectural review and recommendations for Effect code.

**Parameters:**

- `code` (string): Effect-TS code to review
- `filePath` (string): Optional file path for context

**Returns:**

- **Recommendations**: Actionable improvement suggestions
- **Enhanced Analysis**: Detailed findings with confidence scores
- **Summary**: Machine-readable analysis summary
- **Fix Plans**: Step-by-step improvement guidance

#### 📖 `get_pattern`

Get detailed information about a specific pattern.

**Parameters:**

- `id` (string): Pattern identifier (slug)

**Example:**

```
Get details for pattern "error-management-match"
```

### Example Workflows

#### 1. Finding Error Handling Patterns

```
You: "Show me error handling patterns for intermediate developers"

MCP: Returns patterns like:
- Pattern Matching on Option and Either
- Custom Error Strategies  
- Error Propagation and Chains
- Accumulating Multiple Errors
```

#### 2. Code Review Session

```
You: "Review this Effect code for architectural improvements"

MCP: Analyzes and returns:
- 3 high-priority recommendations
- Enhanced findings with evidence
- Fix plans with step-by-step guidance
- Confidence scores for each finding
```

#### 3. Learning Path Guidance

```
You: "I'm new to Effect, what patterns should I learn first?"

MCP: Suggests beginner patterns:
- Why Effect? Comparing Effect to Promise
- Your First Effect Test
- Write Sequential Code with Effect.gen
- Wrap Synchronous Computations
```

## 📚 Pattern Categories

### 🚀 Getting Started

- Introduction to Effect concepts
- Comparison with Promise/async-await
- Basic patterns and terminology

### 🏗️ Core Concepts

- Effect composition and chaining
- Error handling fundamentals
- Data types (Option, Either, Chunk)
- Dependency injection

### ⚡ Concurrency

- Parallel operations
- Fiber management
- Resource coordination
- Race conditions and timeouts

### 🌐 Building APIs

- HTTP client/server patterns
- Request validation
- Error handling in APIs
- Authentication and authorization

### 📊 Domain Modeling

- Branded types and validation
- Schema definitions
- Business logic patterns
- Type-safe domain models

### 🧪 Testing

- Test organization strategies
- Mock-free testing
- Property-based testing
- Service testing patterns

### 🔍 Observability

- Structured logging
- Distributed tracing
- Metrics and monitoring
- Debugging techniques

### 🛠️ Platform Integration

- File system operations
- Environment configuration
- Terminal interactions
- External service integration

### 📈 Streams & Pipelines

- Stream processing
- Data transformation
- Backpressure handling
- Resource management

### ⏰ Scheduling

- Retry patterns
- Interval operations
- Cron expressions
- Debouncing and throttling

## 🔒 API Authentication

The MCP server uses API key authentication:

- **Production Key**: `ce9a3a239f8c028cbf543aa1b77637b8a98ade05814770e4950ff2bb32e9ee84`
- **Development Key**: `dev-key` (local only)

Include the key in your MCP server configuration or request headers.

## 🌐 Production Server

The production MCP server is deployed at:

- **URL**: <https://effect-patterns-mcp.vercel.app>
- **Status**: Production ready
- **Database**: 216+ patterns loaded
- **Uptime**: 99.9% (Vercel infrastructure)

## 🛠️ Local Development

### Setup

```bash
# Clone the repository
git clone https://github.com/effect-ts/effect-patterns.git
cd effect-patterns/packages/mcp-server

# Install dependencies
bun install

# Set up environment
cp .env.example .env.local

# Start development server
bun run dev
```

### Running MCP Server Locally

```bash
# Stdio interface (for Claude Code)
bun run mcp

# With debug logging
bun run mcp:debug

# Production client (HTTP interface)
bun run mcp:production
```

### Environment Setup

Create `.env.local`:

```env
PATTERN_API_KEY=dev-key
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/effect_patterns
TIER_MODE=free
NODE_ENV=development
```

## 📊 Service Tiers

### Free Tier (Default)

- **Code Review**: Top 3 architectural recommendations
- **Pattern Search**: Full access to pattern library
- **Analysis**: Basic rule-based analysis
- **Rate Limit**: 100 requests per 15 minutes

### Pro Tier (Coming Soon)

- **Code Review**: Unlimited recommendations
- **Enhanced Analysis**: AI-powered insights
- **Custom Patterns**: Organization-specific patterns
- **Priority Support**: Dedicated assistance

## 🐛 Troubleshooting

### Common Issues

#### MCP Server Not Found

```bash
# Check if server is running
curl https://effect-patterns-mcp.vercel.app/api/health

# Verify API key
curl -H "x-api-key: YOUR_KEY" https://effect-patterns-mcp.vercel.app/api/patterns
```

#### Authentication Errors

- Verify API key is correct
- Check environment variable spelling
- Ensure proper header format: `x-api-key`

#### Connection Issues

- Check network connectivity
- Verify Vercel status (<https://www.vercel-status.com>)
- Try alternative endpoint or local setup

#### Performance Issues

- Use free tier within rate limits
- Optimize search queries with specific filters
- Consider Pro tier for higher limits

### Debug Mode

Enable debug logging:

```bash
MCP_DEBUG=true bun run mcp:debug
```

### Health Check

Monitor server status:

```bash
curl https://effect-patterns-mcp.vercel.app/api/health
```

## 🤝 Contributing

### Adding Patterns

1. **Create Pattern File**: `content/published/patterns/[category]/[pattern-name].mdx`
2. **Follow Template**: Use existing patterns as reference
3. **Test Locally**: Verify with MCP server
4. **Submit PR**: Include examples and use cases

### Reporting Issues

- **Bugs**: Open issue with reproduction steps
- **Feature Requests**: Describe use case and benefits
- **Documentation**: Report unclear sections or examples

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🔗 Related Resources

- **Effect-TS Documentation**: <https://effect.website>
- **Effect Patterns Repository**: <https://github.com/effect-ts/effect-patterns>
- **Claude Code**: <https://docs.anthropic.com/claude/docs/claude-code>
- **MCP Protocol**: <https://modelcontextprotocol.io>

## 📞 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub repository issues
- **Community**: Effect-TS Discord server
- **Email**: <support@effect-patterns.com>

---

**Built with ❤️ by the Effect Patterns Team**

*Last updated: January 2026*
