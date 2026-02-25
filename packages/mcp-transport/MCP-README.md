# Effect Patterns MCP Server

Search 700+ Effect-TS patterns, browse curated skill guides, and explore analysis rules -- all from your IDE via the Model Context Protocol.

**Production URL:** `https://effect-patterns-mcp.vercel.app`

---

## Quick Start

The MCP server runs as a local stdio process that forwards requests to the hosted API. You need to clone this repository and have [Bun](https://bun.sh) installed.

```bash
git clone https://github.com/PaulJPhilp/Effect-Patterns.git
cd Effect-Patterns
bun install
```

Then add the server to your IDE. Replace `/absolute/path/to/Effect-Patterns` with the actual path on your machine, and set your API key.

### Claude Desktop

Open **Settings > Developer > Model Context Protocol**, then add:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["--cwd", "packages/mcp-transport", "dist/mcp-stdio.js"],
      "cwd": "/absolute/path/to/Effect-Patterns",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      }
    }
  }
}
```

### Claude Code

Run from the repo root:

```bash
claude mcp add effect-patterns \
  --command "bun" \
  --args "--cwd" "packages/mcp-transport" "dist/mcp-stdio.js" \
  --env "PATTERN_API_KEY=your-api-key" \
  --env "EFFECT_PATTERNS_API_URL=https://effect-patterns-mcp.vercel.app"
```

### Cursor

Open **Settings > MCP Servers** and add:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["--cwd", "packages/mcp-transport", "dist/mcp-stdio.js"],
      "cwd": "/absolute/path/to/Effect-Patterns",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      }
    }
  }
}
```

### Windsurf

Create or edit `.windsurf/mcp_config.json` in your project:

```json
{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["--cwd", "packages/mcp-transport", "dist/mcp-stdio.js"],
      "cwd": "/absolute/path/to/Effect-Patterns",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      },
      "disabled": false
    }
  }
}
```

---

## MCP Tools

The server exposes **5 tools** in production. Code analysis, review, refactoring, and generation are available only via the [HTTP API](#http-api-reference).

### search_patterns

Search the pattern library by keyword, category, and difficulty.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query (e.g. "error handling", "retry"). |
| `category` | string | No | One of: `validation`, `service`, `error-handling`, `composition`, `concurrency`, `streams`, `resource`, `scheduling`. |
| `difficulty` | string | No | `beginner`, `intermediate`, or `advanced`. |
| `limit` | number | No | Max results (1--100). |
| `format` | string | No | `markdown`, `json`, or `both`. Default: `markdown`. |

**Try asking:** "Search for error handling patterns for intermediate developers."

### get_pattern

Get full documentation and code examples for a single pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Pattern ID/slug (e.g. `effect-service`, `retry-with-backoff`). |
| `format` | string | No | `markdown`, `json`, or `both`. Default: `markdown`. |

**Try asking:** "Show me the effect-service pattern."

### list_analysis_rules

List all available code analysis rules (IDs, titles, severity, categories). This is a read-only catalog -- it does not scan your code.

No parameters.

**Try asking:** "What analysis rules are available?"

### list_skills

Search curated Effect-TS skill guides that combine multiple patterns into practical workflows.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query. |
| `category` | string | No | Skill category filter. |
| `limit` | number | No | Max results (1--100). |
| `format` | string | No | `markdown`, `json`, or `both`. Default: `markdown`. |

**Try asking:** "List skills for service architecture."

### get_skill

Get the full content of a specific skill guide.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Skill slug identifier. |
| `format` | string | No | `markdown`, `json`, or `both`. Default: `markdown`. |

**Try asking:** "Get the skill for error-handling."

---

## Example Conversations

### Finding patterns for a task

> **You:** "How do I handle retries with exponential backoff in Effect?"
>
> Claude calls `search_patterns` with `q: "retry backoff"`, then shows matching patterns with descriptions and code examples.

### Learning path for beginners

> **You:** "I'm new to Effect, where should I start?"
>
> Claude calls `search_patterns` with `difficulty: "beginner"` and returns foundational patterns like "Your First Effect Test" and "Write Sequential Code with Effect.gen".

### Exploring a skill guide

> **You:** "Show me the error handling skill guide."
>
> Claude calls `list_skills` with `q: "error handling"`, finds the matching skill, then calls `get_skill` with its slug to return the full guide.

---

## Authentication

The MCP server passes your API key to the HTTP API, which enforces authentication.

- Set `PATTERN_API_KEY` in your MCP server environment configuration.
- The key is sent as an `x-api-key` header on HTTP requests.
- Never commit API keys to version control.

---

## HTTP API Reference

The MCP tools call a subset of the HTTP API. You can also call these endpoints directly (e.g. from scripts or CI).

**Base URLs:**

| Environment | URL |
|-------------|-----|
| Production | `https://effect-patterns-mcp.vercel.app` |
| Staging | `https://effect-patterns-mcp-staging.vercel.app` |

**Authentication:** Include `x-api-key: <your-key>` header on all requests (except `/api/health`).

### Endpoints used by MCP tools

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check (no auth required). |
| GET | `/api/patterns?q=...&category=...&difficulty=...&limit=...` | Search patterns. |
| GET | `/api/patterns/[id]` | Get pattern by ID. |
| GET | `/api/skills?q=...&category=...&limit=...` | Search skills. |
| GET | `/api/skills/[slug]` | Get skill by slug. |
| POST | `/api/list-rules` | List analysis rules (read-only catalog). |

### Endpoints available via HTTP API only

These are **not** exposed as MCP tools.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze-code` | Analyze code for anti-patterns. |
| POST | `/api/review-code` | Architectural code review. |
| POST | `/api/list-fixes` | List available refactoring fixes. |
| POST | `/api/analyze-consistency` | Multi-file consistency analysis. |
| POST | `/api/apply-refactoring` | Apply automated refactorings. |
| POST | `/api/generate-pattern` | Generate code from a pattern. |
| GET | `/api/trace-wiring` | Tracing setup examples. |

---

## Running Locally

For development or contributing:

1. **Clone and install:**
   ```bash
   git clone https://github.com/PaulJPhilp/Effect-Patterns.git
   cd Effect-Patterns
   bun install
   ```

2. **Start the API server** (in one terminal):
   ```bash
   cd packages/mcp-transport
   bun run dev
   ```
   The API runs at `http://localhost:3000`.

3. **Start the MCP server** (stdio, for your IDE):
   ```bash
   cd packages/mcp-transport
   PATTERN_API_KEY=dev-key bun run mcp
   ```

4. **With debug logging:**
   ```bash
   MCP_DEBUG=true PATTERN_API_KEY=dev-key bun run mcp:debug
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PATTERN_API_KEY` | Yes | API key for authentication. |
| `EFFECT_PATTERNS_API_URL` | No | API base URL. Default: `http://localhost:3000`. Set to production/staging URL for hosted use. |
| `MCP_DEBUG` | No | Set to `true` for verbose debug logging to stderr. |
| `MCP_ENV` | No | `local`, `staging`, or `production`. Controls environment-specific behavior. |

---

## Troubleshooting

### Server won't start

- Ensure you're in the correct directory (`packages/mcp-transport`) or using the `cwd` config.
- Run `bun install` from the repo root.
- Check that Bun is installed: `bun --version`.

### Authentication errors (401/403)

- Verify `PATTERN_API_KEY` is set in the environment your IDE passes to the MCP process.
- For hosted API, use a valid production or staging key.
- For local development, the API accepts `dev-key` when running locally.

### Tools return errors

- **Using hosted API:** Confirm `EFFECT_PATTERNS_API_URL` points to `https://effect-patterns-mcp.vercel.app`.
- **Using local API:** Confirm `bun run dev` is running in `packages/mcp-transport`.
- Run with `MCP_DEBUG=true` to see detailed error output on stderr.

### Health check

```bash
curl https://effect-patterns-mcp.vercel.app/api/health
```

### Test API access with your key

```bash
curl -H "x-api-key: $PATTERN_API_KEY" \
  "https://effect-patterns-mcp.vercel.app/api/patterns?q=service"
```

---

## Links

- **Production:** https://effect-patterns-mcp.vercel.app
- **Health check:** https://effect-patterns-mcp.vercel.app/api/health
- **GitHub:** https://github.com/PaulJPhilp/Effect-Patterns
- **Advanced configuration and testing:** [MCP_CONFIG.md](../../MCP_CONFIG.md)
