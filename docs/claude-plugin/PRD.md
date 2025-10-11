```markdown
# Product Requirements Document (PRD)

- **Product:** Effect Patterns Claude Code Plugin (EP-Plugin)
- **Owner:** Paul J Philp
- **Version:** 0.1.0
Last updated: 2025-10-09

---

## 1. Purpose / Overview
Deliver a secure, observable, and Effect-native Claude Code plugin and backend that lets developers discover EffectPatterns, get explanations, and generate deterministic TypeScript Effect snippets tailored to project settings (ESM/CJS, Effect version). The implementation must be Effect-first: canonical domain schemas and server logic use Effect primitives, with Zod used only at the tiny tool-call boundary for LLM function schemas.

Primary outputs:
- Effect Patterns Toolkit (library) — canonical domain logic and schemas.
- MCP Server (Next.js App Router serverless / Effect runtime on Vercel) — authenticated HTTP API exposed to Claude Code plugins.
- Claude Code marketplace manifests (.claude-plugin) and agent/command definitions.
- CI, tests, observability (OTLP), docs and release artifacts.

---

## 2. Goals & Success Metrics
Goals (90 days)
- Provide search/explain/generate tooling integrated into Claude Code.
- Ensure deterministic generation (no LLM by default).
- Ensure every request is traceable (traceId in responses) and exportable to OTLP collector.

Success metrics
- 1,000 installs OR adoption by ≥3 orgs for private marketplaces.
- 70% of installs generate ≥1 snippet within 7 days.
- p50 latency for search < 150ms; p95 < 300ms (small index).
- ≥ 95% of API calls produce OTLP traces in integration tests.
- ≥ 80% test coverage for server code.

---

## 3. Scope (MVP)
Included:
- Toolkit: load/index/search patterns, build deterministic snippet templates, Effect schemas for domain types, JSON Schema emitter for tool calls.
- Server: Effect-based API handlers for:
  - GET /api/patterns?q=
  - GET /api/patterns/:id
  - POST /api/generate
  - GET /api/trace-wiring
  - GET /api/health
- Auth: API-key (x-api-key or ?key). Pluggable to OAuth/JWT later.
- Tracing: @effect/opentelemetry → OTLP exporter (env: OTLP_ENDPOINT, OTLP_HEADERS).
- Plugin manifests: .claude-plugin/marketplace.json + plugin.json exposing slash commands and agents.
- GH Action: ingest patterns from https://github.com/PaulJPhilp/EffectPatterns → data/patterns.json (fallback to sample).
- Tests: unit + integration (mock OTLP).
- Docs: README, SECURITY, trace-wiring docs.

Excluded (non-goals):
- Default LLM-based generation; optional, opt-in in later stage.
- Running arbitrary user code on the server.
- Paid SaaS hosting of plugin.

---

## 4. User stories
- As a TS/Effect dev, I want to search for patterns by keyword so I can find best-practice implementations quickly.
- As a dev, I want a generated snippet tailored to my project (ESM vs CJS, Effect version) so it drops into my codebase with fewer edits.
- As a platform engineer, I want to host a private marketplace so I can govern what patterns my team uses.
- As an auditor/SRE, I want each codegen action traceable to an OTLP trace so I can correlate actions to runtime telemetry.
- As an LLM/agent integrator, I want small, deterministic tool-call schemas so I can wire the toolkit into an agent safely.

---

## 5. Functional requirements (FR)
FR1 — Patterns listing
- Endpoint: GET /api/patterns?q=
- Auth: x-api-key or ?key
- Returns: { count, patterns[] } (PatternSummary)

FR2 — Pattern details
- Endpoint: GET /api/patterns/:id
- Returns full Pattern object: id, title, summary, tags, example, detailsUrl, prosCons, docs

FR3 — Generate snippet
- Endpoint: POST /api/generate
- Request body: { patternId, name?, input?, moduleType?: "esm"|"cjs", effectVersion? }
- Behaviour: deterministic snippet built from canonical example and template; sanitize inputs; do NOT execute code.
- Response: { patternId, title, snippet, traceId, timestamp }

FR4 — Trace wiring docs
- Endpoint: GET /api/trace-wiring
- Returns code snippets and notes for Effect + @effect/opentelemetry and LangGraph examples.

FR5 — Health
- Endpoint: GET /api/health
- Returns service status.

FR6 — Toolkit API
- Expose pure Effect functions for: loadPatternsFromJson, searchPatterns, getPatternById, buildSnippet, validateGenerateRequest.
- Provide JSON Schema emitter for tool-call schemas.

FR7 — Tool-call schemas for LLMs
- Generate JSON Schema (from Effect schemas) for functions used by LLM/agent tool-calling.
- Provide a tiny Zod schema only when required by external tool library.

FR8 — Metrics & tracing
- Each request starts a root span; attach attributes (service.name, route, patternId).
- Include traceId in responses and logs.

FR9 — Auth & rate-limiting
- API Key middleware; rate-limiter stub (configurable).
- Admin ability to revoke/rotate PATTERN_API_KEY.

FR10 — CI and tests
- Unit tests for toolkit (search, snippet builder).
- Integration tests for endpoints, including verifying OTLP export to a mock collector.
- Coverage >= 80% for server code.

---

## 6. Non-functional requirements (NFR)
NFR1 — Implementation style: all server-side logic and resource management must use Effect primitives and Layers; avoid ad-hoc Promise usage in core flows.

NFR2 — Performance: search latency p50 < 150ms; p95 < 300ms with small index (<= few hundred patterns).

NFR3 — Observability: traces exported to OTLP; structured logs with traceId.

NFR4 — Security: PATTERN_API_KEY and OTLP_HEADERS stored masked; input sanitization and no execution of generated strings.

NFR5 — Code quality: Prettier (printWidth=80), ESLint, TypeScript strict mode.

NFR6 — Deployability: server runs on Vercel (serverless) or Node-compatible server; OTLP exporter must be configurable.

---

## 7. API contracts & types (canonical)
Canonical schemas are defined with Effect schemas. Tool-call schemas for LLMs are emitted as JSON Schema (and optionally small Zod for tool libs).

PatternSummary (Pattern list)
- id: string
- title: string
- summary: string
- tags: string[]
- example: { lang: "ts", code: string }
- detailsUrl?: string

Pattern (detailed)
- PatternSummary fields plus:
- details: string (long-form)
- prosCons?: { pros: string[], cons: string[] }
- metadata?: { sinceVersion?: string, complexity?: string }

GenerateRequest (runtime)
- patternId: string
- name?: string
- input?: string
- moduleType?: "esm" | "cjs"
- effectVersion?: string

GenerateResponse
- patternId: string
- title: string
- snippet: string
- traceId: string (hex or W3C traceparent-derived)
- timestamp: ISO string

ErrorResponse
- error: { code: string, message: string, details?: any }

---

## 8. Schema strategy
- Use Effect schemas as canonical domain schemas for all server & toolkit validation.
- Emit JSON Schema from Effect schemas at build time for LLM tool registration and Claude/OpenAI-style function-calls.
- Create minimal Zod schemas only for tool registration when a library requires Zod; include CI parity check tests to ensure Zod (if present) matches canonical Effect schema behavior.

---

## 9. Security & privacy
Auth
- PATTERN_API_KEY used in x-api-key header or ?key query param.
- Keys stored masked in Vercel and rotated periodically.

Input & generated code safety
- Strict validation of inputs with Effect schema decoders.
- Snippets built via templating/concatenation; no eval/exec.
- Rate-limiter on /api/generate.

Secrets & telemetry
- OTLP_HEADERS and other secrets must be masked and scoped.
- Do not persist customer secrets received in requests.

Governance
- Marketplace repo requires PR, code review, and signed releases for org marketplaces.
- Emergency revocation plan: replace env key + re-deploy; deprecate marketplace manifest if necessary.

---

## 10. Observability & tracing details
- Tracing layer:
  - Initialize OTLP exporter from OTLP_ENDPOINT and OTLP_HEADERS.
  - Use @effect/opentelemetry where available; otherwise provide a thin Effect Layer wrapping Node OTel SDK.
- Request instrumentation:
  - Each API handler creates root span with attributes: service.name, route, method, patternId (if present), client.ip (if available).
  - Child spans for I/O (reading patterns.json, template rendering).
- Response:
  - Return traceId in header `x-trace-id` and in response body.
  - Log structured JSON with traceId and request id.
- Integration test includes a mock OTLP collector that asserts traces were exported.

---

## 11. UX / Developer flows
- Install marketplace: /plugin marketplace add pauljphilp/effect-patterns-marketplace
- Browse plugin: use /plugin menu inside Claude Code.
- Slash commands:
  - /pattern search <query> → shows list of PatternSummary items.
  - /pattern explain <pattern-id> → full details and example.
  - /pattern generate <pattern-id> [--module esm|cjs] [--effect vX.Y.Z] → calls /api/generate and returns snippet + trace link.
- Agent: /plugin agent run recommender — provide problem description → returns 1–3 recommended patterns with rationale and example snippets.
- Trace link UX: The generate response includes traceId and a user-visible link format (instructions to paste traceId into downstream tracing UI) — exporter-specific links vary by provider and are documented in trace-wiring docs.

---

## 12. Testing & QA
Unit tests
- Toolkit: search ranking, snippet builder, input sanitization.
- Schema decoders: valid & invalid cases.

Integration tests
- Start server in-process using Effect runtime; call endpoints with test PATTERN_API_KEY; assert responses & status codes.
- Mock OTLP collector: capture exported traces and assert presence of spans and traceId matching response.

E2E / Manual
- Manual install in a dev Claude Code workspace, run /pattern search → /pattern generate flow and confirm snippet and traceId.

CI
- GH Actions:
  - PR checks run lint, tests, and build-schema job (emit JSON Schema).
  - On main merge: run tests, run GH Action to generate patterns.json, and trigger Vercel deploy (or a placeholder if Vercel integration is not configured).

Acceptance tests
- All endpoints return expected JSON and include traceId.
- Toolkit unit tests pass.
- Integration tests confirm traces exported to mock OTLP.

---

## 13. Rollout & rollout criteria
Stages
- Internal alpha (invite only): internal team installs and validates core flows, 1 week.
- Private beta: selected orgs; confirm metrics and reliability, 2–3 weeks.
- Public beta: open marketplace listing after stability & metrics satisfied.

Go/no-go criteria for public beta
- Endpoint reliability: p95 < 300ms for search on small index.
- Tracing: 95% of API calls show OTLP traces in mock collector during CI.
- Security review completed; revocation & rotation tested.

---

## 14. Risks & mitigations
- OTLP exporter in serverless: guidance for collector endpoints and example config; include alternative collector recommendations.
- Plugin supply-chain: private marketplaces and code-review gates; require signed releases for production orgs.
- Input/template injection: canonical Effect schemas + strict templates; no code execution on server.
- Claude/Anthropic outages: client-side caching & graceful failures; document behavior.

---

## 15. Implementation milestones & rough estimates
Assumptions: 2 engineers (Effect + TS), 1 SRE, 2-week sprints.

Sprint 0 (setup, 1 week)
- Repo scaffold, Prettier/ESLint, monorepo layout.

Sprint 1 (toolkit, 1 week)
- Implement toolkit (Effect schemas, search, snippet builder), unit tests, JSON Schema emitter.

Sprint 2–3 (server core, 2 weeks)
- Implement Effect-based server handlers (patterns list, detail, health), auth, tests.

Sprint 4 (generate + templates, 1 week)
- Implement /api/generate templating with moduleType/effectVersion, sanitization, include traceId.

Sprint 5 (tracing & observability, 1 week)
- OTLP Layer, instrumentation, mock OTLP tests, trace-wiring docs.

Sprint 6 (CI, GH Action, manifests, 1 week)
- GH Action to ingest patterns, .claude-plugin manifests, integration tests, docs.

Sprint 7 (security review & alpha rollout, 1 week)
- Security audit, remediation, internal alpha.

Total: ~7–8 weeks to MVP.

---

## 16. Dependencies
- Effect (TypeScript) and @effect/schema, @effect/opentelemetry
- Next.js (App Router) for Vercel serverless routes or an Effect-friendly HTTP server (if chosen)
- Vercel for deployment (optional; must support Effect runtime constraints)
- GitHub Actions for CI and patterns ingestion
- Claude Code plugin marketplace features

---

## 17. Roles & responsibilities
- Product owner: Paul J Philp — acceptance, prioritization.
- Engineers (2): implement toolkit, server, tests.
- SRE: OTLP collector integration, Vercel env and secret management.
- Security reviewer: review threat model and run security checklist.
- Early adopters: manual verification and feedback.

---

## 18. Deliverables
- Effect Patterns Toolkit package (src, tests, emitted JSON Schema)
- MCP server implemented entirely with Effect (app/api routes or Effect-friendly server)
- .claude-plugin/marketplace.json and plugin.json with commands & agents
- GH Action to generate data/patterns.json
- docs: README.md, trace-wiring.md, SECURITY.md, IMPLEMENTATION_REPORT.md
- Tests and CI workflows

---

## 19. Acceptance criteria (final)
- Toolkit and MCP server implemented using Effect primitives and layers.
- All API endpoints function per API contract; each response includes traceId.
- JSON Schema files emitted for tool calls and available in repo.
- CI green: unit & integration tests pass; coverage >= 80%.
- Marketplace manifests present and validated.
- Observability validated with mock OTLP collector in CI.

---

## 20. Next steps (immediate)
1. Confirm PRD approval or request edits.
2. Authorize initial sprint: create monorepo scaffold and implement the Effect Patterns Toolkit (recommended first deliverable).
3. On toolkit completion, implement MCP server endpoints and wire tracing layer.
4. Produce .claude-plugin manifests and run internal alpha.
```