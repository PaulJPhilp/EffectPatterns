```markdown
# Architecture Document
Product: Effect Patterns Claude Code Plugin (EP-Plugin)  
Owner: Paul J Philp  
Version: 0.1.0  
Last updated: 2025-10-09

Table of contents
1. Goals & constraints
2. High-level architecture
3. Component descriptions
4. Data flows & sequence diagrams
5. Runtime & Effect patterns
6. Tracing & observability
7. Security, secrets & governance
8. API contracts (summary)
9. Storage, caching & scaling
10. Testing, CI/CD & release
11. Deployment topology (Vercel)
12. Operational runbook (summary)
13. File layout / repo scaffold
14. Extensibility & roadmap
15. Risks, trade-offs & alternatives

---

1) Goals & constraints
- All server-side code (MCP server / API handlers) must be written using the Effect ecosystem (Effect primitives, schemas, Layers).
- Canonical domain schemas use Effect schema tooling. Zod is used only for tool-call boundaries (small edge surface).
- Deterministic snippet/template generation by default (no LLM calls unless opt-in).
- End-to-end tracing: every request produces an OTLP-exported trace and the response includes a traceId.
- Deployable on Vercel serverless via Next.js App Router (app/api route handlers) or an Effect-friendly Node server if needed.

---

2) High-level architecture
- Clients:
  - Claude Code plugin (slash commands, agents) installed by users.
  - Human developers (browser/CLI) for testing & admin.
- Toolkit (package):
  - Effect Patterns Toolkit (pure logic + Effect schemas + JSON Schema emitter).
- MCP Server (Effect-native):
  - HTTP API endpoints implemented with Effect (Next.js App Router route.ts or a small Effect-wrapped HTTP server).
  - Auth, rate-limit, tracing Layer, logging, templates.
- CI / Ingestion:
  - GitHub Action that ingests EffectPatterns repo and produces data/patterns.json.
- Observability:
  - OTLP collector (customer-provided or SaaS). LangGraph & other services send traces to same collector.
- Hosting:
  - Vercel serverless or Node host with environment variables for PATTERN_API_KEY, OTLP_ENDPOINT, OTLP_HEADERS.

ASCII diagram (logical)
Client (Claude Code)
  -> /plugin calls -> MCP Server (Next.js/App Router route handlers implemented with Effect)
     -> uses Toolkit (Effect schemas + snippet builder)
     -> writes logs & exports spans -> OTLP Collector
     -> returns JSON (includes traceId)
GitHub Actions -> generates data/patterns.json -> checked into MCP repo (or pulled at runtime)

---

3) Component descriptions

A. Effect Patterns Toolkit (canonical domain package)
- Responsibilities:
  - Domain types (Effect schemas): Pattern, PatternSummary, GenerateRequest, GenerateResponse.
  - Pure algorithms: search, ranking, getById, sanitizer, deterministic template builder.
  - JSON Schema emitter for tool-call schemas (used by LLM function-calling).
  - Minimal Effect wrappers for file I/O (load patterns.json) so server calls remain effectful.
- API surface (exports):
  - loadPatterns(path): Effect<never, Error, Pattern[]>
  - searchPatterns(patterns, query, opts): PatternSummary[]
  - getPatternById(patterns, id): Pattern | null
  - buildSnippet(pattern, opts): string
  - emitJsonSchemas(outDir): void (build-time)
- Tests:
  - Unit tests for search/ranking and snippet builder.
- Rationale:
  - Keeps deterministic logic out of server; easy to reuse in tests, agents, or other services.

B. MCP Server (Effect-native)
- Responsibilities:
  - HTTP API endpoints:
    - GET /api/patterns?q=
    - GET /api/patterns/:id
    - POST /api/generate
    - GET /api/trace-wiring
    - GET /api/health
  - Auth (API key), rate-limiting, request tracing, logging, input validation (Effect schemas).
  - Uses Toolkit for domain logic.
- Implementation choices:
  - Preferred: Next.js App Router (app/api/* route.ts) with handlers that call Effect.runPromise on the core Effect workflow. Keep resource init (OTLP exporter) as a singleton Layer (initialized at cold start).
  - Alternative: small standalone server using an Effect-compatible HTTP abstraction (e.g., @effect/http or Fastify with an Effect wrapper) for lower friction in the server lifecycle.
- Key modules:
  - tracing/otlpLayer.ts — Effect Layer to init OTLP exporter and provide startSpan API.
  - http/handlers/* — route handlers implemented as Effects.
  - auth/apiKey.ts — Effect middleware that checks x-api-key or ?key.
  - adapters/toolkitAdapter.ts — glue between HTTP event and toolkit functions.
  - rateLimiter.ts — simple token-bucket or sliding window stub (configurable).

C. Ingestion & CI
- GitHub Action: .github/workflows/generate-patterns.yml
  - Periodic / on-push: clone https://github.com/PaulJPhilp/EffectPatterns, parse MD/README or pattern files to produce data/patterns.json, commit/update repo or publish artifact.
  - Fallback behavior: if remote repo unavailable, keep sample patterns.json in repo.

D. Observability & tracing
- Tracing Layer uses @effect/opentelemetry (preferred) or a thin Effect Layer that wraps Node OTel SDK.
- OTLP exporter read from env vars OTLP_ENDPOINT and OTLP_HEADERS.
- Structured logging includes traceId and request id.

E. Claude plugin manifests
- .claude-plugin/marketplace.json and plugin manifest JSON (listing slash commands, agent definitions, and MCP server URL).
- Tool schemas (JSON Schema files) emitted from the toolkit used as the function parameter for LLM tool-call registration.

---

4) Data flows & sequence diagrams

Flow A — Search
User types: /pattern search retry
1. Claude plugin calls MCP: GET /api/patterns?q=retry (includes x-api-key).
2. MCP auth middleware verifies API key.
3. Tracing Layer: start root span "GET /api/patterns".
4. Handler loads patterns via Toolkit.loadPatterns (Effect) — cached in memory.
5. Toolkit.searchPatterns runs ranking and returns summaries.
6. Handler returns JSON with patterns[] and traceId; logs structured event.
7. OTLP exporter exports span to configured collector.

Flow B — Generate
User requests: /pattern generate retry-with-backoff --module esm --effect 0.54.0
1. Claude plugin POST /api/generate with body (patternId, moduleType, effectVersion) and x-api-key.
2. Auth check; Tracing Layer starts root span.
3. Handler decode body using Effect schema (GenerateRequest).
4. Handler calls Toolkit.getPatternById and Toolkit.buildSnippet with options.
5. Handler returns { snippet, traceId, timestamp }.
6. Trace exported; response contains traceId (and x-trace-id header).

Sequence diagram (compact)
Client -> MCP: Request (x-api-key)
MCP: Auth -> startSpan -> validate body (Effect schema)
MCP -> Toolkit: load/search/get/buildSnippet (Effect-based)
Toolkit -> MCP: result
MCP: log + return JSON (includes traceId)
MCP -> OTLP Collector: export spans

---

5) Runtime & Effect patterns
- Effect Layers:
  - TracingLayer: initializes OTLP exporter, exposes tracing client functions (startSpan, addAttributes, endSpan).
  - ConfigLayer: provides env vars typed through Effect schema decoding.
  - PatternsLayer: loads patterns.json at startup and exposes a read-only Ref/Cache.
- Handlers:
  - Each route handler composes Effects using forEach / flatMap / provide (Effect style). Use Effect.runPromise/Runtime only at the top-level Next.js handler boundary (to preserve Effect-first design while satisfying Next's handler signature).
- Resource Management:
  - OTLP exporter and any long-lived clients are Resources/Layer-managed and shut down gracefully on cold termination.
- Concurrency:
  - Use Effect primitives for concurrency when doing parallel search/aggregation or if supporting batch operations.
- Decoding:
  - Validate incoming requests with Effect schemas inside Effects; return HTTP 400 on decode failure with structured error object.

Implementation detail: Next.js integration pattern
- Initialize singleton Layers during module cold-start:
  - In app/api/_init.ts or a top-level module import, create and memoize the composed Layer (Tracing + Config + Patterns).
  - Each route handler imports the singleton runtime and calls runtime.runPromise(handlerEffect).
- Rationale: Vercel cold-starts require Layers to be initialized cheaply; treating Layers as singletons avoids re-init per request.

---

6) Tracing & observability
- Tracing responsibilities:
  - Start a root span per incoming request (resource, route name).
  - Attach attributes: service.name, route, method, patternId, client.ip (if available), claude.request.id (if provided).
  - Create child spans for heavy operations: patterns load (if not cached), template rendering, external network calls.
  - Export via OTLP exporter to OTLP_ENDPOINT with headers OTLP_HEADERS.
- Response includes:
  - Header: x-trace-id: <trace-id>
  - Body field: traceId
- Logs:
  - Use structured JSON logs (timestamp, level, traceId, requestId, route, message).
- Metrics:
  - Expose basic /metrics (Prometheus) endpoint optionally (for on-premise deployments) or push metrics to provider. At minimum collect:
    - request_count{route,status}
    - request_latency_ms{route,p50,p95}
    - generate_rate_limited_count
- Mock OTLP for tests:
  - Integration tests will run a mock OTLP HTTP server to assert that spans are exported and traceId appears.

---

7) Security, secrets & governance
- Authentication:
  - PATTERN_API_KEY is required for all API endpoints; accepted via x-api-key or ?key (for simple testing).
  - Keys stored in Vercel as masked env vars; document rotation steps.
- Rate limiting:
  - Implement a middleware stub for rate-limiting with in-memory/token bucket for MVP. For production, suggest moving to edge rate-limiter or API gateway.
- Input validation:
  - Use Effect schema decoders for all request payloads.
  - buildSnippet must sanitize inputs; do not execute generated code server-side.
- Marketplace governance:
  - Marketplace repo requires PR + code review for changes to .claude-plugin manifests and plugin code.
  - Releases should be signed and tagged. Encourage customers/orgs to host private marketplaces in org repos.
- Secrets & telemetry:
  - OTLP_HEADERS must be masked; store minimal and scoped tokens.
- Emergency revocation:
  - Steps: rotate PATTERN_API_KEY (Vercel env replacement) -> re-deploy; mark marketplace manifest as deprecated if urgent.

---

8) API contracts (summary)
(Full contracts in PRD; canonical types are Effect schemas.)

Headers:
- x-api-key: string
- optional: x-request-id, forward headers for client IP
- responses include header x-trace-id

Endpoints:
- GET /api/patterns?q=...
  - Response: { count: number, patterns: PatternSummary[] }
- GET /api/patterns/:id
  - Response: Pattern (detailed)
- POST /api/generate
  - Body: { patternId, name?, input?, moduleType?: "esm"|"cjs", effectVersion? }
  - Response: { patternId, title, snippet, traceId, timestamp }
- GET /api/trace-wiring
  - Response: { effectNodeSdk, effectWithSpan, langgraphPython, notes }
- GET /api/health
  - Response: { ok: true, version: "0.x.y" }

Errors:
- 401 Unauthorized: { error: { code: "unauthorized", message } }
- 400 Bad Request (schema decode): { error: { code: "invalid_request", message, details } }
- 404 Not found: { error: { code: "not_found", message } }
- 429 Rate limit: { error: { code: "rate_limited", message, retry_after } }
- 500 Internal error: structured error with traceId.

---

9) Storage, caching & scaling
- Patterns index:
  - Generated by GH Action into data/patterns.json checked into repo (fast deploy).
  - At runtime: patterns.json loaded at cold start into an in-memory read-only data structure (Effect Ref). This gives fastest search latency.
  - For larger datasets or dynamic updates: provide an optional runtime fetch-from-GitHub mode (periodic refresh with ETag).
- Caching:
  - In-memory cache for patterns list; Invalidate on restart or on admin-triggered reload endpoint (protected).
- Scaling:
  - MCP server is stateless; scale horizontally (Vercel serverless).
  - OTLP exporter: ensure collector endpoint can accept concurrent spans; for high-volume, batch configuration is recommended.
- Stateful features (future):
  - If persistent request logs or audit trail needed, use an append-only audit store (S3 or a small database) and ensure traces link to persisted records.

---

10) Testing, CI/CD & release
- Unit tests (Toolkit): Vitest or Jest; high coverage for search & snippet builder.
- Integration tests (Server):
  - Start server in test harness (Effect runtime) -> mock OTLP collector -> call endpoints (with test API key) -> assert responses and that mock OTLP received spans.
- E2E (manual):
  - Install plugin in a dev Claude Code instance; run slash commands; verify snippet response & traceId presence.
- CI:
  - GH Actions:
    - PR workflow: install, lint, build, run unit + integration tests (mock OTLP), run schema emitter.
    - Main branch: run generate-patterns action, run tests, and trigger Vercel deploy (or display deployment artifact).
- Release:
  - Tag releases (semantic versioning), create release notes focusing on breaking schema changes in toolkit.
  - Provide upgrade guide for effectVersion handling if templates change.

---

11) Deployment topology (Vercel)
- Vercel serverless functions (Next.js App Router) hosting app/api route handlers.
- Environment variables (Vercel project settings):
  - PATTERN_API_KEY (masked)
  - OTLP_ENDPOINT (optional)
  - OTLP_HEADERS (optional JSON string, masked)
  - NODE_ENV, SERVICE_VERSION, etc.
- Cold start considerations:
  - Initialize Layers lazily at module cold-start; avoid expensive blocking work on each request.
  - Keep patterns.json in the deployed artifact to avoid runtime fetch on first request.
- Alternative: run as a standalone Node service (Docker on ECS/Heroku) if OTLP collector cannot be reached from serverless environment.

---

12) Operational runbook (summary)
Common ops tasks:
- Revoke/rotate API key:
  1. Create new PATTERN_API_KEY in Vercel.
  2. Update plugin consumers (orgs) with new key (or rotate via API).
  3. Remove old key and redeploy.
- Disable marketplace quickly:
  - Remove or rename .claude-plugin/plugin.json in the marketplace repo (or mark it deprecated), or set a feature flag in server to reject calls.
- Investigate incident (high 5xx rate):
  - Use logs and search for traceId from client request; inspect OTLP traces; rollback to previous deployment tag if necessary.
- Trace debugging:
  - If user provides traceId, search OTLP backend for trace and find spans (MCP server root span + child spans).
- Audit:
  - For /generate actions, ensure logs contain traceId, patternId, and request metadata.

---

13) File layout / repo scaffold (recommended)
root/
- README.md
- MRD.md PRD.md ARCHITECTURE.md IMPLEMENTATION_PLAN.md
- packages/
  - toolkit/
    - src/
      - index.ts
      - schemas/
        - pattern.ts (Effect schemas)
        - generate.ts
      - search.ts
      - template.ts
      - io.ts
      - emit-schemas.ts (build script)
    - tests/
    - package.json tsconfig.json
- services/
  - mcp-server/
    - app/ (Next.js App Router or express/fastify)
      - api/
        - patterns/route.ts
        - patterns/[id]/route.ts
        - generate/route.ts
        - trace-wiring/route.ts
        - health/route.ts
    - src/
      - tracing/otlpLayer.ts
      - auth/apiKey.ts
      - adapters/toolkitAdapter.ts
      - rateLimiter.ts
      - config/env.ts
      - serverInit.ts
    - data/patterns.json
    - package.json tsconfig.json
- .claude-plugin/
  - marketplace.json
  - plugins/
    - effect-patterns/
      - plugin.json
      - commands/search.md
      - commands/explain.md
      - agents/recommender.md
- .github/
  - workflows/
    - ci.yml
    - generate-patterns.yml
- docs/
  - trace-wiring.md
  - SECURITY.md
- tests/
  - integration/mock-otlp-server.ts
  - e2e/README.md

---

14) Extensibility & roadmap
Short-term extensions
- Optional LLM-assisted codegen behind an opt-in flag with rate limits, audit logging, and cache.
- Private org marketplaces with per-org API keys and signing.
- tRPC or SDK for orgs to call MCP endpoints from internal tools.

Medium-term
- Fine-grained permissions for plugin operations (who can generate, who can install).
- Persisted audit logs & UI for admins to review generated snippets and their traces.
- Support for more snippet formats (Rust/other languages) if patterns expand.

Long-term
- Marketplace ranking, community-contributed patterns, signing and verification, vulnerability scanning of templates.

---

15) Risks, trade-offs & alternatives
- Using Next.js App Router vs standalone server:
  - App Router: easy Vercel deploy, but route handlers must bridge Effect runtime -> route function. Trade-off: require careful singleton Layer management.
  - Standalone: pure control over lifecycle; may require container infra. Trade-off: more infra ops.
- OTLP from serverless:
  - Some collectors may not be reachable or may add latency. Mitigation: use batching, timeouts, and document recommended collectors.
- Effect schemas as canonical:
  - Pros: seamless integration with Effect codebase.
  - Cons: smaller ecosystem vs Zod — mitigated by emitting JSON Schema for tool calls.
- Security vs convenience:
  - API key is simple for MVP; longer-term add OAuth/JWT for orgs.

---

Appendix: Quick checklist for implementers
- [ ] Implement toolkit with Effect schemas + emit JSON Schema for tool calls.
- [ ] Implement TracingLayer that initializes OTLP exporter and exposes startSpan API.
- [ ] Implement app/api route handlers: patterns, pattern id, generate, trace-wiring, health.
- [ ] Use Effect decoders for request bodies; return structured error responses.
- [ ] Include traceId in response header x-trace-id and response body.
- [ ] Add GitHub Action to generate data/patterns.json from EffectPatterns repo.
- [ ] Add unit and integration tests including mock OTLP server.
- [ ] Add .claude-plugin manifests and sample commands/agent docs.
- [ ] CI: lint, test, emit schemas, and deploy flow.

---