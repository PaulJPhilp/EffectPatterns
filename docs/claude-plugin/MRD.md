# Market Requirements Document (MRD)

**Product:** Effect Patterns Claude Code Plugin (EP-Plugin)
**Owner:** Paul J Philp
**Version:** 0.2.0
Last updated: 2025-10-09

---

## 1. Executive summary

EP-Plugin brings the EffectPatterns library directly into developer workflows inside Claude Code by providing:

- A curated Claude Code marketplace plugin (slash commands, agents)
- A secure, observable MCP server that serves pattern metadata and deterministic code snippets
- An Effect-native toolkit (library) that encapsulates search, ranking, and template generation logic

The product emphasizes deterministic, audit-friendly code generation (no default LLM calls), full Effect-based server implementation (including Next/Vercel endpoints written with Effect primitives), and trace-first observability (OpenTelemetry/OTLP + LangGraph guidance).

---

## 2. Goals & purpose

- Make canonical Effect patterns discoverable and actionable inside AI-assisted developer workflows.
- Provide deterministic snippet generation tailored to project settings (ESM/CJS, Effect version).
- Offer a safe, authenticated MCP server and a pure, testable toolkit that agents/LLMs can call.
- Ensure traceability: every API call is traced and linkable into customers' telemetry backends.

---

## 3. Target users & personas

Primary

- TypeScript engineers using Effect in production who want canonical, reusable patterns.

Secondary

- AI-assisted developers using Claude Code and Claude Code plugin ecosystem.
- Platform engineers who curate internal marketplaces for team-standard patterns and workflows.

---

## 4. Key user problems

- Slow discovery of appropriate Effect patterns for a given problem.
- Manual generation of snippets that mismatch project module type or Effect version.
- Lack of traceability / audit trail for AI-suggested code actions.
- Difficulty packaging and sharing pattern-based tooling across teams (agents, slash commands).

---

## 5. Value proposition

- Fast, reproducible pattern discovery and snippet generation directly in Claude Code.
- Deterministic code generation reduces risk and review effort vs. LLM-only generation.
- Trace-first design enables audits and observability of AI-driven actions.
- A toolkit + MCP server split enables robust testing, reuse, and safe exposure to LLMs/agents.

---

## 6. Core product features (MVP)

A. Marketplace & Plugin

- .claude-plugin/marketplace.json + plugin manifest exposing:
  - slash commands: /pattern search, /pattern explain, /pattern generate
  - agent definitions: recommender agent (maps problem descriptions → pattern suggestions)
  - install UX: /plugin marketplace add <owner/repo>

B. Effect Patterns Toolkit (intermediate deliverable)

- Pure library (TypeScript + Effect where appropriate) with:
  - loadPatternsFromJson, searchPatterns, getPatternById
  - buildSnippet(pattern, { moduleType, effectVersion, name, input })
  - zod schemas / validation and sanitized templating
  - tool descriptors for LLM function-calling & agent registration
- Deterministic logic; fully unit-tested.

C. Standalone MCP Server (intermediate deliverable → deployed on Vercel / serverless)

- All endpoints implemented with Effect (Next App Router or a lightweight Effect-friendly HTTP server):
  - GET /api/patterns?q=
  - GET /api/patterns/:id
  - POST /api/generate
  - GET /api/trace-wiring
  - GET /api/health
- Auth: API key (x-api-key or ?key); pluggable for org OAuth/JWT later.
- Tracing: @effect/opentelemetry layer → OTLP exporter (env: OTLP_ENDPOINT, OTLP_HEADERS).
- Response includes traceId and timestamp; structured logs include traceId.
- Rate-limit middleware stub; protection against template injection.

D. Observability & Tracing docs

- Example wiring: Effect + @effect/opentelemetry, OTLP exporter config, and LangGraph (Python) examples to share collector and correlate traces.

E. Automation & CI

- GitHub Action to extract metadata from <https://github.com/PaulJPhilp/EffectPatterns> → data/patterns.json (fallback to sample if unavailable).
- Tests (unit + integration), linting, formatting (Prettier printWidth=80), and CI workflow.

---

## 7. Acceptance criteria & success metrics

Functional acceptance

- All endpoints implemented and return expected JSON contracts (see API Contracts section).
- Toolkit functions correctly for search and snippet generation (unit test coverage).
- MCP server instrumented with OTLP spans for requests; generated responses include a traceId.
- Marketplace manifests present and valid.

Success metrics (first 90 days)

- 1,000 installs (public + orgs) OR adoption by 3 orgs for private marketplaces.
- 70% of installs generate ≥1 snippet within 7 days.
- p50 latency for search < 150ms; p95 < 300ms (on small pattern indexes).
- 95% of API calls produce OTLP traces visible in configured collector during integration tests.
- >= 80% test coverage for server-side code.

---

## 8. API contracts (MVP)

- GET /api/patterns?q=...
  - Auth: x-api-key header or ?key
  - Response 200:
    { count: number, patterns: PatternSummary[] }
  - PatternSummary: { id, title, summary, tags[], example: { lang: "ts", code }, detailsUrl }

- GET /api/patterns/:id
  - Response 200: Pattern object with details, prosCons, example, detailsUrl

- POST /api/generate
  - Body:
    { patternId: string, name?: string, input?: string, moduleType?: "esm"|"cjs", effectVersion?: string }
  - Response 200:
    { patternId, title, snippet, traceId, timestamp }

- GET /api/trace-wiring
  - Response 200: { effectNodeSdk: string, effectWithSpan: string, langgraphPython: string, notes: string }

- GET /api/health
  - Response 200: { ok: true, version: string }

All endpoints must return structured error objects and use consistent status codes.

---

## 9. Intermediate deliverables (required)

1. Effect Patterns Toolkit (library)
   - Purpose: deterministic domain logic for search & snippet rendering callable by LLMs/agents.
   - Deliverables: npm/monorepo package, types, zod schemas, unit tests, LLM function descriptors.

2. Standalone MCP Server (Effect-native)
   - Purpose: authenticated, trace-instrumented HTTP interface exposing toolkit.
   - Deliverables: repo/app with Effect-based Next/Vercel route handlers (or an Effect-friendly server), tracing layer, CI, integration tests with mock OTLP collector.

These two allow parallel development: toolkit for correctness and safety; MCP server for infra, auth, and observability.

---

## 10. Non-goals & constraints

Non-goals (MVP)

- No default LLM-based generation in server (LLM-assisted generation is stage-2, opt-in).
- Not running arbitrary user code on server; deterministic templates only.
- Not providing paid hosting or SaaS for customers (customer-supplied OTLP endpoints).

Constraints

- All server runtime code must use Effect primitives / layers for side effects, concurrency, and tracing.
- Must run on Vercel serverless or an Effect-compatible node environment.
- Prettier printWidth = 80; TypeScript only.

---

## 11. Key assumptions

- Claude Code plugin platform supports MCP servers and slash-command plugin model as described.
- Effect and @effect/opentelemetry libraries are compatible with serverless environment used.
- Users/teams will supply OTLP/collector endpoints or use SaaS tracing.

---

## 12. Risks & mitigations

- Supply-chain / malicious plugin risk
  - Mitigation: private marketplaces, code review, signed releases, manual vetting step.

- OTLP exporter in serverless (cold start, network)
  - Mitigation: document recommended exporters, keep exporter warm (if possible), provide guidance for alternative ingestion methods (push from a persistent service).

- Rate-limits & outages in Claude
  - Mitigation: design for graceful failure, local caching, retry/backoff.

- Template injection or accidental code execution
  - Mitigation: strict sanitization, static templates only, no evaluation/execution of generated strings on server.

---

## 13. Observability & security requirements

Observability

- Each request creates a root span; include attributes: service.name, route, patternId, client.ip (if available).
- Export traces to OTLP collector configured via env vars (OTLP_ENDPOINT, OTLP_HEADERS).
- Responses include traceId; logs include traceId and request id.

Security

- PATTERN_API_KEY stored as masked env var in Vercel; rotate regularly.
- OTLP_HEADERS masked; scope credentials.
- Limit the surface: rate limiting, input validation, and audit logs for /generate.
- Marketplace governance: require PRs and code review for marketplace changes.

Compliance

- Avoid storing customer secrets; do not persist API keys sent by clients.
- Data retention policy: logs and traces retained per customer configuration; document defaults.

---

## 14. Dependencies

- Effect (TypeScript) and @effect/opentelemetry
- Next.js (App Router) or a lightweight HTTP server with Effect wrappers
- Vercel for serverless deployment (optional)
- GitHub Actions for patterns ingestion and CI
- Claude Code plugin marketplace (Anthropic/Claude) support for MCP servers and plugin manifests

---

## 15. Timeline & rough estimates

Assumptions: 1 product owner + 2 engineers (Effect + TS) + 1 SRE  
Total: ~8–12 weeks for high-quality public beta (MVP + docs + CI + tests)

Suggested phased schedule

- Week 0–1 (Sprint 0): Approve MRD; repo scaffold, tooling, Prettier/ESLint.
- Week 1–2: Implement Effect Patterns Toolkit + unit tests (2–4 days).
- Week 3–4: Implement MCP server core endpoints in Effect (search, get by id, health).
- Week 5: Implement /generate templating, validation, and include traceId in responses.
- Week 6: Integrate @effect/opentelemetry, mock OTLP tests, and trace-wiring docs.
- Week 7: CI, GH Action for patterns.json generation, integration tests.
- Week 8: Security review, marketplace manifests, alpha rollout (internal).
- Week 9–12: Private beta, iterate on feedback, public beta launch.

---

## 16. Stakeholders & roles

- Product owner: Paul J Philp (prioritize, review MRD/PRD)
- Engineers (2): implement toolkit and MCP server (Effect)
- SRE/Infra (1): OTLP config, Vercel setup, secrets management
- Security reviewer: vet marketplace governance and API key policies
- Early adopters / internal testers: validate UX and traces

---

## 17. Next steps (immediate)

1. Confirm MRD approval or requested changes.
2. Choose immediate first deliverable: Toolkit (recommended) or MCP server.
3. Create repo scaffold (monorepo with packages/toolkit + services/mcp).
4. Implement toolkit and unit tests (deliverable: package + npm linkable artifact).
5. Implement MCP server endpoints (Effect-based) that consume the toolkit; wire OTLP layer and CI.

---

## 18. Deliverables (MVP)

- MRD.md (this document)
- Toolkit package: source, types, zod schemas, unit tests
- MCP server: Effect-based Next/Vercel route handlers or Effect-friendly server, tracing layer
- .claude-plugin/marketplace.json and plugin.json
- .github/workflows/generate-patterns.yml
- docs/trace-wiring.md, README.md, SECURITY.md
- Tests: unit + integration; CI configured
- Release checklist + rollout plan

---

If you approve this MRD as-is I will convert it to the PRD and architecture docs next and can immediately scaffold the repository and produce the Effect Patterns Toolkit package as the first deliverable.
