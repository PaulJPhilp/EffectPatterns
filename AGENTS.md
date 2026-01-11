# Effect Patterns Agents

This document describes the AI agents and automation tools used in the Effect Patterns project.

## Overview

The Effect Patterns project uses AI agents for various tasks including content generation, pattern analysis, and automated testing. These agents are designed to work with the Effect-TS ecosystem and follow established patterns.

## Current Agents

### 1. Pattern Analyzer Agent
**Location**: `docs/agents/analyzer/` (archived)

**Purpose**: Analyzes Effect-TS patterns for correctness, best practices, and potential improvements.

**Features**:
- Pattern validation against Effect-TS idioms
- Code quality assessment
- Performance optimization suggestions
- Error handling pattern detection

**Status**: Archived - functionality integrated into CLI tools

### 2. MCP (Model Context Protocol) Server
**Location**: `app/mcp/mcp-server/`

**Purpose**: Provides Effect Patterns to Claude Code via MCP protocol.

**Features**:
- Serves patterns to Claude Code IDE
- Real-time pattern search and retrieval
- Context-aware pattern suggestions
- API key authentication

**Deployment**: 
- Staging: `https://effect-patterns-mcp-staging.vercel.app`
- Production: `https://effect-patterns-mcp.vercel.app`

### 3. MCP Server STDIO
**Location**: `app/mcp/mcp-server-stdio/`

**Purpose**: STDIO-based MCP server for local development.

**Features**:
- Local MCP server instance
- Direct CLI integration
- Development and testing

## Agent Architecture

### Common Patterns

All agents follow these architectural patterns:

1. **Effect-TS Native**: Built using Effect for composability and error handling
2. **Type Safety**: Full TypeScript typing with @effect/schema
3. **Service Pattern**: Modular, testable service architecture
4. **Configuration**: Environment-based configuration management
5. **Observability**: Structured logging and metrics

### Service Structure

```
agents/
├── analyzer/
│   ├── api.ts          # Public interface
│   ├── schema.ts        # Type definitions
│   ├── service.ts       # Core logic
│   ├── types.ts         # Domain types
│   └── __tests__/       # Test suite
```

## Integration Points

### CLI Integration
Agents integrate with the `ep-admin` CLI through:
- Service composition
- Shared configuration
- Common error handling
- Unified logging

### Database Integration
- PostgreSQL for pattern storage
- Effect repositories for data access
- Connection pooling and management

### API Integration
- RESTful endpoints for external access
- MCP protocol for IDE integration
- Authentication and authorization

## Development Guidelines

### Creating New Agents

1. **Use Effect Services**: Follow the established service pattern
2. **Type Safety**: Define schemas with @effect/schema
3. **Error Handling**: Use Effect's error types
4. **Testing**: Comprehensive test coverage
5. **Documentation**: Clear API docs and examples

### Example Agent Structure

```typescript
import { Effect } from "effect"
import { Schema } from "@effect/schema"

// Define types
const AgentConfigSchema = Schema.Struct({
  name: Schema.String,
  enabled: Schema.Boolean,
})

// Create service
export class MyAgent extends Effect.Service<MyAgent>()("MyAgent", {
  effect: Effect.gen(function* () {
    // Agent implementation
    return {
      analyze: (input: string) => Effect.succeed("result")
    }
  })
})
```

## Configuration

### Environment Variables
```bash
# Agent configuration
AGENT_ENABLED=true
AGENT_LOG_LEVEL=info
AGENT_TIMEOUT=30000

# MCP Server
PATTERN_API_KEY=your_api_key
MCP_SERVER_URL=https://effect-patterns-mcp.vercel.app
```

### Configuration Files
- `.ai-cli-config.json` - AI CLI settings
- `config/environments.ts` - Environment configs
- `vercel.json` - Deployment settings

## Testing

### Unit Tests
```bash
bun run test:agents
```

### Integration Tests
```bash
bun run test:e2e
```

### MCP Server Tests
```bash
cd app/mcp/mcp-server
bun run smoke-test
```

## Deployment

### MCP Server
Deployed to Vercel with automatic scaling:
- Staging environment for testing
- Production environment for live use
- Health checks and monitoring

### Local Development
```bash
# Run MCP server locally
cd app/mcp/mcp-server
bun run dev

# Test MCP connection
bun run smoke-test
```

## Security

### Authentication
- API key-based authentication
- Environment-specific keys
- Secure key rotation

### Rate Limiting
- 100 requests per 15 minutes
- Per-IP tracking
- Graceful degradation

### Data Privacy
- No sensitive data logging
- Secure data transmission
- GDPR compliance

## Monitoring

### Metrics
- Request counts and response times
- Error rates and types
- Resource utilization
- User interaction patterns

### Logging
- Structured logs with correlation IDs
- Different log levels for environments
- Centralized log aggregation

### Health Checks
- `/health` endpoint for monitoring
- Database connectivity checks
- Service dependency verification

## Future Roadmap

### Planned Agents
1. **Pattern Generator**: Automated pattern creation
2. **Test Generator**: Automated test case generation
3. **Documentation Agent**: Auto-generate documentation
4. **Migration Agent**: Assist with code migrations

### Enhancements
1. **Multi-Model Support**: Support for multiple AI providers
2. **Context Awareness**: Better understanding of project context
3. **Collaboration**: Multi-agent coordination
4. **Learning**: Agent improvement over time

## Contributing

When contributing to agents:

1. Follow Effect-TS patterns and conventions
2. Maintain backward compatibility
3. Add comprehensive tests
4. Update documentation
5. Consider security implications

## Resources

- [Effect-TS Documentation](https://effect.website)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Claude Code Integration Guide](https://docs.anthropic.com/claude/docs/claude-code)
- [Project Architecture](./docs/architecture/ARCHITECTURE.md)

---

*Last updated: January 2026*
