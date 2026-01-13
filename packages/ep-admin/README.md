# Effect Patterns Admin CLI

Administrative CLI for Effect Patterns maintainers, providing database management, content operations, and development utilities.

## Installation

```bash
# Install dependencies
bun install

# Build the CLI
bun run build

# Make available globally (optional)
npm link
```

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

### Required Variables

- `MCP_SERVER_URL`: URL of the MCP server (default: `http://localhost:3000`)
- `DATABASE_URL`: PostgreSQL connection string
- `AI_PROVIDER`: AI provider (`openai`, `anthropic`, or `google`)

### AI Provider Configuration

**OpenAI:**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
```

**Anthropic:**
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**Google AI:**
```bash
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_AI_MODEL=gemini-1.5-pro
```

### Optional Variables

- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)
- `OTEL_SERVICE_NAME`: OpenTelemetry service name
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector endpoint

## Usage

### Database Operations

```bash
# Check database connectivity
ep-admin db check

# Run database migrations
ep-admin db migrate

# Reset database (development only)
ep-admin db reset
```

### Content Management

```bash
# Process patterns from published to raw stage
ep-admin content process --input published --output raw

# Publish patterns from raw to published stage
ep-admin content publish --input raw --output published --source src

# Validate pattern code consistency
ep-admin content validate --input published --source src

# Generate README from patterns
ep-admin content generate-readme
```

### Development Tools

```bash
# Process a prompt with AI
ep-admin ai process-prompt --file prompt.mdx

# Generate pattern code
ep-admin ai generate-pattern --pattern-id validation-filter-or-fail

# Analyze code for best practices
ep-admin ai analyze-code --file example.ts

# Check code consistency
ep-admin ai analyze-consistency --files a.ts b.ts
```

### Configuration

```bash
# Show current configuration
ep-admin config show

# Test AI provider connection
ep-admin config test-ai

# Check MCP server connectivity
ep-admin config test-mcp
```

### Health & Diagnostics

```bash
# Run health checks
ep-admin health

# Trace configuration
ep-admin trace wiring

# Dry run commands (no side effects)
ep-admin --dry-run db migrate
```

## Development

### Running from Source

```bash
# Run directly from TypeScript source
bun run dev [command]

# Example:
bun run dev db check
```

### Testing

```bash
# Run all tests
bun run test

# Run tests with coverage
bun run test:coverage

# Type checking
bun run typecheck
```

### Building

```bash
# Build for distribution
bun run build

# Build output goes to ./dist/
```

## MCP Server Integration

The CLI communicates with the MCP server for database operations. Configure the server URL:

```bash
# Local development
MCP_SERVER_URL=http://localhost:3000

# Production/staging
MCP_SERVER_URL=https://effect-patterns-mcp-server.vercel.app
```

The CLI will automatically use the configured URL for:
- Database connectivity checks
- Migration operations
- Environment validation

## Error Handling

The CLI provides detailed error messages:

- **Connection errors**: Check MCP server URL and network connectivity
- **Authentication errors**: Verify API keys and permissions
- **Database errors**: Check DATABASE_URL and database status
- **AI provider errors**: Verify API keys and model availability

## Troubleshooting

### Common Issues

1. **"Service not found" errors**
   - Ensure MCP server is running
   - Check MCP_SERVER_URL configuration

2. **AI provider connection failures**
   - Verify API keys are valid
   - Check network connectivity to AI provider
   - Test with `ep-admin config test-ai`

3. **Database connection issues**
   - Verify DATABASE_URL format
   - Check database server status
   - Test with `ep-admin db check`

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug ep-admin [command]
```

### Dry Run Mode

Preview operations without making changes:

```bash
ep-admin --dry-run db migrate
ep-admin --dry-run content process --input published --output raw
```

## Architecture

The CLI uses Effect-TS services for:
- **Configuration management**: Environment variable handling
- **HTTP client**: MCP server communication
- **AI integration**: Multiple provider support
- **Error handling**: Type-safe error management
- **Logging**: Structured logging with levels

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
