# Architecture Document
App: Pattern Explorer — ChatGPT App (OpenAI Apps SDK)  
Owner: Paul J Philp  
Version: 0.1.0  
Last updated: 2025-10-10

## 1. Goals & constraints
Goals:
- Provide a ChatGPT-integrated UI to search/explain/generate Effect Patterns by reusing the Toolkit + MCP server.
- Maintain a single canonical source of logic (toolkit) and enforce tracing and auth at MCP server.
Constraints:
- Widget assets must be safe for cross-origin iframe embedding.
- No secrets in client-side code. OpenAPI/ai-plugin.json published publicly should not include secret values.

## 2. High-level architecture
Components:
1. Effect Patterns Toolkit (packages/toolkit)
   - Effect schemas, search, snippet builder, JSON Schema emitter.
2. MCP Server (services/mcp-server)
   - Auth, TracingLayer, PatternsLayer (cache), HTTP endpoints (patterns, generate, trace-wiring).
   - Returns traceId and includes x-trace-id header.
3. ChatGPT App (Vercel Next.js + OpenAI Apps SDK / Vercel starter)
   - Hosts ai-plugin.json metadata (or points to hosted OpenAPI).
   - Hosts widget HTML/React assets under /resources/* (templateUri).
   - Proxy or call MCP server as server-side (to keep PATTERN_API_KEY secret) or provide client-side limited access via short-lived tokens.
4. OpenAI platform
   - Uses OpenAPI / function-calling JSON Schema to call app tools.
5. OTLP Collector
   - Receives traces from MCP server (backend), and optionally from the widget (if server calls are made).

Logical flow:
- ChatGPT user triggers a function-call or a plugin action.
- ChatGPT calls the app’s OpenAPI/tool endpoint (hosted on Vercel), which authenticates and forwards to the MCP server if needed.
- MCP server executes toolkit logic, produces snippet, creates a trace, and returns snippet + traceId + templateUri.
- ChatGPT may show a widget iframe (templateUri) that fetches / receives the snippet and renders copy/trace UI.

## 3. Key design decisions
- Use OpenAPI + ai-plugin.json: provides first-class integration into ChatGPT Apps.
- Keep all business logic and templates inside toolkit/MCP server (single source of truth).
- Widget as server-hosted HTML: avoids exposing secrets and enables richer UI and trace link formatting.
- Token exchange pattern (optional): ChatGPT may call the app directly; to keep PATTERN_API_KEY secret, app endpoints authenticate and forward to MCP server server-side.

## 4. Dataflows & sequence diagrams
Generate flow (high level):
1. User asks ChatGPT → ChatGPT decides to call pattern_generate (function/fetch OpenAPI).
2. OpenAI calls your app's OpenAPI endpoint `/tools/pattern_generate`.
3. App endpoint validates schema & auth, then forwards to MCP server `/api/generate` or calls toolkit directly (server-side).
4. MCP server starts a root span, calls toolkit.buildSnippet, returns snippet + traceId.
5. App endpoint returns response to OpenAI; if widget requested, response includes templateUri.
6. ChatGPT displays response and/or widget iframe; widget fetches additional resources and displays snippet + trace link.

## 5. Security and auth
- MVP: server-side PATTERN_API_KEY stored in Vercel env; app endpoints authenticate OpenAI calls (via signature or an app key).
- Public plugin: implement OAuth flow or token-exchange to avoid embedding PATTERN_API_KEY in client.
- Widget: sandboxed iframe, CSP headers, no inline scripts where possible, sanitize content served.
- Tracing: avoid including raw user code in traces; include minimal attributes (patternId, action, user-id-hash optional).

## 6. Schema & tool contract strategy
- Canonical domain types: @effect/schema in Toolkit.
- JSON Schema for function-calls: generated from Effect schemas (emit during build) and used for ChatGPT function-calling.
- OpenAPI generation: generate OpenAPI from toolkit/Effect schemas (or from emitted JSON Schema) and host under /.well-known/openapi.json to satisfy ChatGPT Apps.

## 7. Observability & monitoring
- Each generate request includes a traceId and emits OTLP span from MCP server.
- App server logs structured events with traceId.
- Widget instrumentation: optionally forward traceparent header for client-initiated fetches.

## 8. Deployment topology
- Vercel app hosting ChatGPT App UI + OpenAPI endpoints.
- MCP server: either:
  - co-located in the same Vercel project (server-side functions) and call toolkit locally; or
  - a separate service (Vercel or other) that the app proxies to — recommended to keep separation and reuse across adapters.
- OTLP collector: SaaS or customer-provided; configure via OTLP_ENDPOINT+OTLP_HEADERS.

## 9. Failures & resilient behavior
- If MCP generate fails, return structured error to ChatGPT; provide user-friendly guidance to retry.
- Widget fallback: if widget cannot load, show raw snippet in ChatGPT response.
- Rate limits: per-app request quotas and rate-limiter middleware on the app front.

## 10. File layout (ChatGPT App subset)
- app/ (Vercel starter)
  - public/
  - app/layout.tsx
  - app/page.tsx
  - app/mcp/ (OpenAPI endpoints or tool registration endpoints)
  - app/resources/snippet/route.tsx (widget)
  - next.config.js (assetPrefix config)
  - server/utils/openapiEmitter.ts (generates OpenAPI from emitted JSON Schema)
- .well-known/ai-plugin.json (ai-plugin.json)
- README.md, docs/trace-wiring.md, SECURITY.md

## 11. Extensibility
- Same OpenAPI can be re-used for other UIs: Claude plugins, Gemini extensions, VS Code extensions, CLI adapters.
- JSON Schema acts as single source for function-call signatures across platforms.