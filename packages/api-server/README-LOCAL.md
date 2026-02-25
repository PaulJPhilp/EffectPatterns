# Effect Patterns MCP Server - Local Development

This guide helps you set up and run the Effect Patterns MCP server locally for development and testing.

## Prerequisites

1. **Node.js/Bun**: Install Bun (see bun.sh or your package manager).

2. **PostgreSQL**: Set up a local PostgreSQL instance
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Create database
   createdb effect_patterns
   ```

3. **Git**: Clone the repository if you haven't already

## Quick Setup

Run the setup script to configure everything automatically:

```bash
cd packages/mcp-server
./setup-local.sh
```

## Manual Setup

### 1. Environment Configuration

Copy the environment template and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# API Security - Generate a secure key
PATTERN_API_KEY=your-secret-api-key-here

# Database Connection
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/effect_patterns

# Server Configuration
NODE_ENV=development
PORT=3000
```

### 2. Install Dependencies

```bash
# Install MCP server dependencies
bun install

# Build workspace dependencies
cd ../..
bun run --filter @effect-patterns/toolkit build
bun run --filter @effect-patterns/analysis-core build
cd packages/mcp-server
```

### 3. Database Setup

Ensure PostgreSQL is running and the database exists:

```bash
# Check PostgreSQL status
pg_isready

# Create database if needed
createdb effect_patterns

# Test connection (optional)
bun run test:db
```

## Running the Server

### Development Mode

```bash
bun run dev
```

Server starts at: http://localhost:3000

### Production Mode

```bash
bun run build
bun run start
```

## Testing the MCP Server

The MCP server has two components:

### 1. HTTP API Server (port 3000)

Test key endpoints:

```bash
# Generate code from a pattern
curl -X POST http://localhost:3000/api/generate \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"patternId": "use-pipe-for-composition", "name": "myFunction"}'

# Pattern search
curl http://localhost:3000/api/patterns \
  -H "x-api-key: your-api-key"
```

## API Endpoints

### Core Endpoints
- `GET /api/patterns` - List all patterns
- `GET /api/patterns/[id]` - Get specific pattern
- `GET /api/health` - Health check

### Extended Endpoints
- `POST /api/generate` - Generate code from pattern
- `POST /api/generate-pattern` - Generate custom pattern
- `POST /api/analyze-consistency` - Analyze code consistency
- `POST /api/apply-refactoring` - Apply refactoring suggestions

All endpoints require API key authentication:
```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/api/patterns
```

## Testing

```bash
# Unit tests
bun run test

# Integration tests (requires running server)
bun run test:integration

# Coverage
bun run test:coverage

# Smoke test
bun run smoke-test
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
pg_isready

# Reset database
dropdb effect_patterns && createdb effect_patterns

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 bun run dev
```

### Build Issues
```bash
# Clean build
rm -rf .next node_modules
bun install
bun run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `PATTERN_API_KEY` | - | API authentication key |
| `OTLP_ENDPOINT` | - | OpenTelemetry endpoint (optional) |

## Development Workflow

1. **Start**: `bun run dev`
2. **Test**: Use curl or API client to test endpoints
3. **Debug**: Check server logs and error responses

## Next Steps

- Configure your IDE to use the MCP server
- Explore the API documentation
- Contribute to the project!
