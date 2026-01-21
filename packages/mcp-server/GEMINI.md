# Effect Patterns MCP Server

Advanced API server for the Effect Patterns Claude Code Plugin, providing pattern search, code analysis, and refactoring capabilities using Effect-TS and Model Context Protocol (MCP) 2.0.

## Project Overview

- **Type**: Next.js Application / MCP 2.0 Server
- **Core Technologies**: 
  - **Effect-TS**: Extensive use of `Effect`, `Layer`, `Schema`, and `Service`.
  - **MCP 2.0**: Supports `stdio` and `streamable-http` transports.
  - **Next.js**: API routes in `app/api/` serve as the backend for MCP and other clients.
  - **TypeScript**: High type safety throughout the codebase.
  - **OAuth 2.1**: Custom implementation with PKCE for secure HTTP transport.
  - **Drizzle ORM & Postgres**: For pattern storage and management.
- **Architecture**:
  - The project follows a service-oriented architecture using Effect's dependency injection.
  - Granular services (config, logger, cache, etc.) are composed into an `AppLayer`.
  - The MCP server acts as a proxy/transport layer over the internal Next.js API.
  - Local libraries (`lib-analysis-core`, `lib-toolkit`) encapsulate core logic and shared utilities.

## Directory Structure

- `app/`: Next.js application structure, primarily API routes (`app/api/`).
- `src/`: Core logic for the MCP server.
  - `src/services/`: Effect-TS service implementations.
  - `src/tools/`: MCP tool definitions and implementations.
  - `src/auth/`: Authentication logic (API Key, OAuth 2.1, PKCE).
  - `src/server/`: Server initialization and error handling.
  - `src/mcp-stdio.ts`: Entry point for legacy stdio transport.
  - `src/mcp-streamable-http.ts`: Entry point for MCP 2.0 HTTP transport.
- `lib-analysis-core/`: Logic for Effect-TS best practices and anti-pattern detection.
- `lib-toolkit/`: Shared database repositories, schemas, and common utilities.
- `scripts/`: Deployment and testing scripts.
- `tests/`: Comprehensive test suite including unit, integration, stress, and MCP compliance tests.

## Building and Running

- **Install Dependencies**: `bun install`
- **Development Server**: `bun run dev` (starts Next.js)
- **MCP Server (Stdio)**: `bun run mcp:stdio`
- **MCP Server (HTTP)**: `bun run mcp:http` (defaults to port 3001)
- **Build**: `bun run build` (Next.js build)
- **Typecheck**: `bun run typecheck`
- **Lint**: `bun run lint`

## Testing

The project uses `vitest` with multiple configurations:

- **Unit Tests**: `bun run test`
- **Integration Tests**: `bun run test:integration` (requires running server)
- **MCP Compliance**: `bun run test:mcp`
- **Stress Tests**: `bun run test:stress`
- **Full CI Suite**: `bun run test:ci`

## Development Conventions

- **Effect-TS First**: All new features should be implemented using Effect-TS patterns.
- **Absolute Imports**: Use absolute paths (e.g., `@/src/...`) or package-level imports for local libraries.
- **Service Pattern**: Use `Effect.Service<T>()(...)` for defining and implementing services.
- **Errors as Values**: Prefer returning tagged errors in Effects rather than throwing exceptions.
- **Validation**: Use `@effect/schema` for all data validation and decoding.
- **Documentation**: Keep `README.md` and `MCP-README.md` updated with API and tool changes.
- **MCP 2.0**: Adhere to MCP 2.0 specifications, including structured tool outputs and metadata.
