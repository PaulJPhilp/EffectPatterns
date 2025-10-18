# Implementation Plan
Project: Pattern Explorer — ChatGPT App  
Owner: Paul J Philp  
Version: 0.1.0  
Last updated: 2025-10-10

## Overview
This plan turns the PRD and Architecture into executable epics, sprints, and tasks to implement a ChatGPT App on top of your Effect Patterns Toolkit + MCP server. Estimated team: 1–2 engineers (Effect + TypeScript), 1 SRE, sprint length: 2 weeks.

Total rough estimate: 4 sprints (8 weeks) for a solid public‑beta capable ChatGPT App (assuming toolkit + MCP server core already in progress).

---

Sprint 0 — Planning & scaffold (0.5 sprint)
- Tasks (0.5 sprint):
  - Create repo branch feat/chatgpt-app.
  - Add app/ Vercel starter (from Vercel ChatGPT Apps SDK Next.js starter) and baseline next.config.js.
  - Add ai-plugin.json placeholder in .well-known/.
  - Add script hooks to generate OpenAPI/JSON Schema from toolkit.
- Deliverable: repo branch scaffolded, starter app wired.

Sprint 1 — OpenAPI / Function Schema generation & Contract tests (1 sprint)
- Tasks (4–6 days):
  - Implement build script in packages/toolkit to emit JSON Schema for all tool functions (pattern_search, pattern_explain, pattern_generate).
  - Implement server-side OpenAPI emitter (app/server/utils/openapiEmitter.ts) that reads emitted JSON Schema and produces OpenAPI operations.
  - Add contract tests that verify generated OpenAPI matches Emitted JSON Schema and that endpoints accept/return expected shapes.
  - Add ai-plugin.json (metadata) in .well-known and point to generated OpenAPI.
- Deliverable: JSON Schema + OpenAPI generation pipeline + contract tests.

Sprint 2 — Widget resource & server endpoints (1 sprint)
- Tasks (5–7 days):
  - Implement widget route: app/resources/snippet/route.tsx or static HTML that fetches snippet and renders snippet + copy + trace link.
  - Implement server-side proxy endpoints (app/mcp/*) that accept ChatGPT/OpenAPI calls, validate with Effect-generated schemas (server-side decode), and call MCP server / toolkit server-side (to avoid exposing PATTERN_API_KEY).
  - Implement server-side logic that adds templateUri to generate responses when appropriate.
  - Add CSP and sandbox attributes to widget responses.
- Deliverable: hosted widget resource, app endpoints wired to MCP, CSP & security headers.

Sprint 3 — Auth, Tracing UX, Tests & CI (1 sprint)
- Tasks (5–7 days):
  - Add auth verification for incoming requests (basic for MVP: app checks a configured allowed-origin or signature header; document exchange for OAuth).
  - Ensure generate responses include traceId (from MCP) and app returns x-trace-id header.
  - Integration tests: mock MCP server responses and mock OTLP collector to assert traceId flows.
  - Add end-to-end tests: call pattern_generate via app OpenAPI, assert widget rendering via headless browser (Playwright) stub or simplified DOM check.
  - Add GitHub Actions CI pipeline: build, emit-schemas, run unit + integration + contract tests.
- Deliverable: Auth in place, tracing; CI green on PR.

Sprint 4 — Hardening, Docs, Release & Rollout (1 sprint)
- Tasks (5–7 days):
  - Security review: ensure no secrets in widget or app public code. Harden CSP.
  - Performance: ensure p95 latency within SLA. Add caching for frequent searches.
  - Documentation: README, integration how-to for admin, trace-wiring.md updated for ChatGPT app.
  - Release: versioned deployment to Vercel dev and optional register in ChatGPT dev mode for manual testing.
  - Prepare release notes + acceptance checklist.
- Deliverable: public beta release, documentation, runbook.

---

Implementation details & notes

OpenAPI & ai-plugin.json
- ai-plugin.json must point to an OpenAPI URL and include authentication info (Auth: None or Bearer for MVP).
- Generate OpenAPI programmatically at build-time by converting JSON Schema emitted by the toolkit into OpenAPI parameter schemas & request/response bodies.

Widget (templateUri)
- The generate response should optionally include templateUri and/or the widget can derive it from a known base URL plus traceId/patternId.
- Widget should be sandboxed:
  - <iframe sandbox="allow-scripts allow-same-origin"> with CSP headers to prevent XSS.
  - Use postMessage to transfer snippet or the widget fetches snippet server-side via a server endpoint that verifies traceId.

Auth & tokens
- MVP: server-to-server (ChatGPT → your app) calls are authenticated by OpenAI (hosted) or via a plugin registration. For local dev, use a simple key allowed list.
- Longer term: implement OAuth token exchange for the OpenAI plugin model.

Trace linkage & UX
- Include traceId in generate response JSON and x-trace-id header.
- Widget shows traceId and a formatted link (based on user-configured OTLP provider template) to jump to the trace view.

Testing strategy
- Unit tests: toolkit and schema decoding.
- Contract tests: generated OpenAPI vs emitted JSON Schema.
- Integration tests:
  - Mock MCP server (or use local dev MCP) and mock OTLP collector.
  - Call OpenAPI endpoints and assert response shape and trace propagation.
- E2E:
  - Register plugin in ChatGPT dev mode (manual) and run sample conversation flows.

CI & deployment
- GitHub Actions:
  - ci.yml: node matrix, lint, build, emit-schemas, unit tests, integration tests.
  - on: pull_request -> run ci.yml; on: push to main -> deploy to Vercel (or trigger Vercel deploy).
- Vercel:
  - Set env vars: MCP_BASE_URL, PATTERN_API_KEY (for server-side proxy calls), OTLP_ENDPOINT, OTLP_HEADERS, SERVICE_NAME.
  - Enable automatic deploys on main.

Acceptance checklist (PR)
- [ ] ai-plugin.json correct and OpenAPI hosted.
- [ ] JSON Schema generated and used for function definitions.
- [ ] Widget accessible via templateUri and sandboxed.
- [ ] Server endpoints validate inputs using Effect schemas and call MCP server.
- [ ] Responses include traceId in body and x-trace-id header.
- [ ] Contract tests & integration tests pass in CI.
- [ ] README.md + docs/trace-wiring.md + SECURITY.md present and clear.

Deliverables (concrete file list)
- .well-known/ai-plugin.json
- /.well-known/openapi.json (auto-generated at build time)
- app/resources/snippet/route.tsx (or static HTML/React widget)
- app/mcp/* endpoints mapping OpenAPI → MCP calls
- server/utils/openapiEmitter.ts
- tests/contract/*, tests/integration/* (mock OTLP)
- CI workflows: .github/workflows/ci.yml
- README.md, docs/trace-wiring.md, SECURITY.md
- IMPLEMENTATION_REPORT.md (final deliverable summarizing implemented files, how to run locally, test commands, and known limitations)

---

AI coding-agent prompt (to implement ChatGPT App)
Use this to instruct an AI or an engineering agent to implement the ChatGPT App.

You are an expert TypeScript engineer who must implement the "Pattern Explorer" ChatGPT App. The canonical business logic and Effect schemas live in packages/toolkit (already implemented). Your tasks:

1. Build-time:
   - Run the toolkit JSON Schema emitter to generate JSON Schema files for pattern_search, pattern_explain, pattern_generate.
   - Generate an OpenAPI spec that uses emitted JSON Schema for request & response bodies and expose it at /.well-known/openapi.json.

2. Vercel app:
   - Use the Vercel ChatGPT Apps SDK Next.js starter as base.
   - Add .well-known/ai-plugin.json pointing to the hosted OpenAPI.
   - Add server endpoints (app/mcp/*) that accept OpenAPI calls, decode using Effect schemas on server-side, and forward to MCP server / call toolkit server-side.
   - Add secure server-side proxy behavior: do not embed PATTERN_API_KEY in client.
   - Implement /resources/snippet widget page. Widget must accept snippet via postMessage or fetch it server-side using a traceId+token endpoint, and render copy + trace link + module toggle.

3. Security:
   - Add CSP & sandbox attributes. Do not include secrets in client code. Implement server-side auth for incoming plugin calls (MVP: API key allowlist).

4. Tracing & UX:
   - Ensure server code returns traceId (from MCP) and sets x-trace-id header on responses.
   - Widget shows traceId and a one-click link to trace UI (format based on SERVICE_TRACE_URL env var template).

5. Tests & CI:
   - Add contract tests asserting OpenAPI matches emitted JSON Schema.
   - Add integration tests with stub MCP server & mock OTLP collector verifying trace flows.
   - Add GitHub Action to run tests and deploy to Vercel.

Deliver:
- Working code in branch feat/chatgpt-app, PR to main with IMPLEMENTATION_REPORT.md listing files, how to run, and relevant env vars.

Begin by scaffolding the Vercel starter and adding the JSON Schema → OpenAPI generator.
