# Effect Patterns MCP Server — End User Guide

Use the **Effect Patterns MCP server** from your IDE (Cursor, Claude Code, Windsurf, or any MCP client) to search 700+ Effect-TS patterns and browse the rule catalog. The MCP server is a **patterns + rule catalog** tool only; it does not analyze, review, or refactor your code.

---

## What You Get

- **Pattern search** — Find patterns by keyword, category, or difficulty (beginner / intermediate / advanced).
- **Pattern details** — Full docs and code examples for any pattern by ID.
- **Rule catalog** (read-only) — List all analysis rule metadata (IDs, severity, categories). No code scanning.

Code analysis, review, refactoring, and pattern code generation are **not** available via MCP; they are offered through the [HTTP API](#http-api) and paid CLI only.

---

## Quick Start

### Option A: Use the Hosted Server (easiest)

You don't need to run anything. Point your MCP client at the **production** or **staging** API and provide an API key.

| Environment | Base URL | Use case |
|-------------|----------|----------|
| **Production** | `https://effect-patterns-mcp.vercel.app` | Day-to-day use |
| **Staging**   | `https://effect-patterns-mcp-staging.vercel.app` | Try new features |

You need a valid **API key** (`PATTERN_API_KEY` or `PRODUCTION_API_KEY` / `STAGING_API_KEY`). The MCP server itself is a thin client; it forwards tool calls to this HTTP API, which enforces authentication.

### Option B: Run Locally

Use this when developing the server or when you want the API and MCP process on your machine.

1. **Clone and install** (from repo root): clone the repository, then run `bun install` in the repo root.

2. **Start the API server** (in one terminal):
   ```bash
   cd packages/mcp-server
   bun run dev
   ```
   API runs at `http://localhost:3000`.

3. **Run the MCP server** (stdio, for your IDE):
   ```bash
   cd packages/mcp-server
   PATTERN_API_KEY=dev-key bun run mcp
   ```
   Or with debug logging: `MCP_DEBUG=true PATTERN_API_KEY=dev-key bun run mcp:debug`.

4. **Configure your IDE** to run the MCP server with `cwd` = `packages/mcp-server` and env `PATTERN_API_KEY` (and optionally `EFFECT_PATTERNS_API_URL=http://localhost:3000` for local API).

---

## IDE Configuration

Configure your MCP client so it starts the Effect Patterns MCP server (stdio) with the right working directory and environment.

### Cursor

In Cursor, add the server in MCP settings. Example (adjust paths and key):

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/Effect-Patterns/packages/mcp-server",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      }
    }
  }
}
```

For **local API**, set `EFFECT_PATTERNS_API_URL` to `http://localhost:3000`. Omit it to use the default (localhost); for **hosted**, set it to the production or staging URL above.

### Claude Code / Claude Desktop

1. Open **Settings → Developer → Model Context Protocol**.
2. Add a new MCP server.
3. Set:
   - **Command**: `bun`
   - **Arguments**: `["run", "mcp"]`
   - **Working directory**: full path to `Effect-Patterns/packages/mcp-server`
   - **Environment**: `PATTERN_API_KEY=your-api-key`, and optionally `EFFECT_PATTERNS_API_URL` (hosted or local).

### Windsurf

Create or edit `.windsurf/mcp_config.json` in your project (or use the path where Windsurf looks for MCP config):

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/path/to/Effect-Patterns/packages/mcp-server",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      },
      "disabled": false
    }
  }
}
```

### Using Hosted API Only (no local MCP process)

If your client can call an HTTP API directly, you can call the **hosted API** with an API key—no local MCP server needed. All MCP tools are backed by these endpoints; see [HTTP API](#http-api).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PATTERN_API_KEY` | Yes (for API) | API key. The MCP server passes it to the HTTP API; the API enforces auth. |
| `EFFECT_PATTERNS_API_URL` | No | Base URL of the API. Default: `http://localhost:3000`. Set to production/staging to use hosted. |
| `MCP_DEBUG` | No | Set to `true` to enable debug logs to stderr. |
| `MCP_ENV` | No | `local` / `staging` / `production` for environment-specific behavior. |

Never commit API keys; use environment variables or your IDE's secret storage.

---

## MCP Tools

The MCP server exposes **exactly five tools** in production and staging. No other tools (including code analysis or review) are available via MCP.

### 1. `search_patterns`

Search the pattern library by query and optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No* | Search query (e.g. "error handling", "retry"). *Empty or missing may trigger an elicitation prompt. |
| `category` | string | No | One of: `validation`, `service`, `error-handling`, `composition`, `concurrency`, `streams`, `resource`, `scheduling`. |
| `difficulty` | string | No | `beginner`, `intermediate`, or `advanced`. |
| `limit` | number | No | Max results (1–100). Default typically 10–20. |
| `format` | string | No | `markdown`, `json`, or `both`. |

**Example prompts:**

- "Search for error handling patterns for intermediate."
- "Find patterns about retry with difficulty advanced."
- "Show me service patterns."

---

### 2. `get_pattern`

Get full documentation and code for one pattern by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Pattern ID/slug (e.g. `effect-service`, `retry-with-backoff`). |

**Example prompts:**

- "Get the effect-service pattern."
- "Show me pattern error-management-match."

---

### 3. `list_analysis_rules`

List all analysis rule metadata (IDs, titles, severity, categories). This is a **read-only catalog** — it does not scan or analyze user code.

No parameters.

**Example prompts:**

- "List all analysis rules."
- "What rules does the analyzer use?"

---

### 4. `list_skills`

Search Effect-TS skills by query and optional category.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query string. |
| `category` | string | No | Skill category filter. |
| `limit` | number | No | Maximum results (1–100). |
| `format` | string | No | `markdown`, `json`, or `both`. |

### 5. `get_skill`

Get full details for one skill by slug.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Skill slug identifier. |

**Debug / local only:** The tool `get_mcp_config` is not part of the default production/staging surface; it only appears when `MCP_DEBUG=true` or `MCP_ENV=local`.

---

## HTTP API

When you use the **hosted** server, the MCP server forwards tool calls to the HTTP API for patterns and rules only. You can also call the API directly (e.g. from scripts or CI) with the same API key. **MCP tools do not call analysis/refactoring/generation endpoints** — those are available only when using the HTTP API or CLI directly.

- **Auth:** `x-api-key: <PATTERN_API_KEY>` on requests (or query param in some setups).
- **Base URLs:** Production: `https://effect-patterns-mcp.vercel.app`; Staging: `https://effect-patterns-mcp-staging.vercel.app`.

### Endpoints (summary)

**Used by MCP tools:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check (no auth). |
| GET | `/api/patterns` | Search patterns (query params: `q`, `category`, `difficulty`, `limit`). |
| GET | `/api/patterns/[id]` | Get pattern by ID. |
| GET | `/api/skills` | List/search skills (`q`, `category`, `limit`). |
| GET | `/api/skills/[slug]` | Get skill by slug. |
| POST | `/api/list-rules` | List rules metadata (read-only catalog). |

**HTTP API / CLI only (not exposed via MCP):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze-code` | Analyze one file (body: `source`, `filename`, `analysisType`, optional `config`). |
| POST | `/api/review-code` | Architectural review (body: `code`, `filePath`). |
| POST | `/api/list-fixes` | List available refactoring fixes. |
| POST | `/api/analyze-consistency` | Multi-file consistency analysis. |
| POST | `/api/apply-refactoring` | Apply refactorings with optional preview. |
| POST | `/api/generate-pattern` | Generate code from a pattern. |
| GET | `/api/trace-wiring` | Tracing setup examples. |

Full request/response shapes: see [MCP Server API Reference](../../docs/mcp-server-api-reference.md) and [MCP_CONFIG.md](../../MCP_CONFIG.md).

---

## Capability Boundaries

- **MCP surface:** Patterns and rule catalog only — `search_patterns`, `get_pattern`, `list_analysis_rules`. Rate limits apply (e.g. 100 requests per 15 minutes per key). MCP does not call analysis/refactoring/generation endpoints.
- **HTTP API / CLI surface:** Code analysis, code review, consistency analysis, apply refactoring, and generate pattern code.

---

## Troubleshooting

### "Server fails to start" or "API key" errors

- The MCP server does not validate the key itself; the **HTTP API** does. Ensure `PATTERN_API_KEY` is set in the environment your IDE uses when starting the MCP server.
- For hosted API, use a valid production/staging key. For local dev, `dev-key` is often accepted when the local API is configured for it.

### "Cannot find module" or similar

- From repo root run `bun install`. Run the MCP server from `packages/mcp-server` with the correct `cwd` in your IDE config.

### IDE doesn't connect to the server

- Confirm **working directory** is the **absolute** path to `Effect-Patterns/packages/mcp-server`.
- Confirm `PATTERN_API_KEY` (and optionally `EFFECT_PATTERNS_API_URL`) are set in the MCP server's environment in your IDE.
- Start the MCP server manually to verify:
  `cd packages/mcp-server && PATTERN_API_KEY=your-key bun run mcp:debug`
  If it works in the terminal, the issue is usually IDE env or cwd.

### Tools run but return errors

- **Backend not running:** If using local API, ensure `bun run dev` is running in `packages/mcp-server` and the API is at `http://localhost:3000`.
- **Wrong URL:** If using hosted, set `EFFECT_PATTERNS_API_URL` to `https://effect-patterns-mcp.vercel.app` (or staging).
- **Auth:** 401/403 usually mean invalid or missing API key. Check the key and that it's passed to the process that runs the MCP server.

### Debugging

- Run with `MCP_DEBUG=true` to see tool calls and API errors on stderr.
- Health check: `curl https://effect-patterns-mcp.vercel.app/api/health`
- Test API with key: `curl -H "x-api-key: $PATTERN_API_KEY" "https://effect-patterns-mcp.vercel.app/api/patterns?q=service"`

---

## More Information

- **Configuration and testing:** [MCP_CONFIG.md](../../MCP_CONFIG.md) (config, env vars, testing MCP against local/staging/production).
- **API reference:** [docs/mcp-server-api-reference.md](../../docs/mcp-server-api-reference.md).
- **Use cases and value:** [docs/mcp-server-use-cases.md](../../docs/mcp-server-use-cases.md).

---

*Effect Patterns MCP Server — End User Guide. For maintainers and operators, see [README.md](./README.md) and [MCP-README.md](./MCP-README.md).*
