# Product Requirements Document (PRD)

**Product:** Pattern Explorer — ChatGPT App for Effect Patterns
**Owner:** Paul J Philp
**Version:** 0.1.0
Last updated: 2025-10-10

## 1. Purpose / Overview

Pattern Explorer is a ChatGPT App (OpenAI Apps SDK / ChatGPT Apps) that exposes the Effect Patterns Toolkit through a conversational UI. It allows developers to search, explore, and generate deterministic TypeScript Effect snippets (ESM/CJS, Effect version) via ChatGPT function-calls or a widget iframe. The ChatGPT App reuses the existing Effect Patterns MCP server and toolkit as the canonical backend.

Goals:

- Make EffectPatterns easily discoverable and actionable inside ChatGPT.
- Reuse the canonical Toolkit + MCP server for business logic, auth, tracing and policy.
- Provide a developer-friendly widget for rich snippet display and trace linking.
- Emit JSON Schema for function-calling and provide an OpenAPI spec for plugin registration.

## 2. Target users & personas

Primary:

- TypeScript engineers using Effect, who use ChatGPT to speed development.
Secondary:
- Platform/DevTools teams who want to expose org-curated patterns inside ChatGPT.

## 3. Key user problems

- Slow discovery of appropriate Effect patterns while coding.
- Need for snippets tailored to project config (module type, Effect version).
- Desire to trace and audit AI-driven code suggestions.

## 4. Value proposition

- Fast in-chat search & generate: one-shot snippet generation with traceability.
- Deterministic outputs from canonical toolkit reduce review cost vs pure LLM generation.
- A widget UI for copy/paste and trace linking inside ChatGPT.

## 5. Core features (MVP)

1. ChatGPT App registration artifacts:
   - ai-plugin.json (OpenAI plugin descriptor) and OpenAPI spec that maps to MCP endpoints.
2. Function-calling support:
   - JSON Schema generated from Effect toolkit for function params (pattern_search, pattern_generate, pattern_explain).
3. Widget (iframe) resource:
   - A hosted HTML/React snippet renderer (templateUri) that receives generate responses and displays snippet + copy + trace link + module type toggle.
4. App flows:
   - Search: ChatGPT calls function pattern_search → shows list.
   - Explain: pattern_explain → detailed pattern doc + example.
   - Generate: pattern_generate → returns snippet + traceId + templateUri to show widget.
5. Auth options:
   - API key for private/internal testing; OAuth (OpenAI plugin OAuth) or token-based scheme optional for public plugin.
6. Tracing:
   - ChatGPT App shows traceId; backend MCP server returns traceId in response and x-trace-id header.
7. Docs and examples:
   - README, developer instructions for local dev, and trace-wiring docs.

## 6. Functional requirements

FR1: Function definitions

- pattern_search(params: { q: string }): returns list of PatternSummary objects.
- pattern_explain(params: { patternId: string }): returns Pattern details.
- pattern_generate(params: { patternId, moduleType?, effectVersion?, name?, input? }): returns snippet, traceId, templateUri.

FR2: Widget resource

- Endpoint that renders snippet HTML using safe escaping and is embeddable in ChatGPT iframe.

FR3: OpenAPI / ai-plugin.json

- Provide OpenAPI spec (auto-generated from Effect schemas) and ai-plugin.json complying with OpenAI plugin format.

FR4: Auth & security

- Support x-api-key for MVP; document how to migrate to OAuth or an exchange flow for public usage.

FR5: Observability

- Return traceId for all generate actions; include guidance in widget to link into OTLP viewer.

## 7. Non-functional requirements

NFR1: All server-side business logic remains in canonical Effect Patterns toolkit/MCP server (no duplicate logic).
NFR2: ChatGPT app UI assets must not expose secrets.
NFR3: Response latency for function calls should be consistent with MCP server SLA (p50 < 200ms, p95 < 400ms).
NFR4: Security: sanitize all inputs rendered in the widget (no XSS).
NFR5: Tests and CI must include contract tests for function-calling JSON Schema and OpenAPI correctness.

## 8. API contracts (high level)

These map directly to the MCP server endpoints.

pattern_search

- POST /openai/tools/pattern_search (or function-calling spec)
- Request: { q: string }
- Response: { count: number, patterns: PatternSummary[] }

pattern_explain

- POST /openai/tools/pattern_explain
- Request: { patternId: string }
- Response: { pattern: Pattern }

pattern_generate

- POST /openai/tools/pattern_generate
- Request: { patternId: string, moduleType?: "esm"|"cjs", effectVersion?: string, name?: string, input?: string }
- Response: { patternId, title, snippet, traceId, templateUri, timestamp }

widget resource

- GET /resources/snippet?traceId=...&patternId=...
- Returns: HTML page that fetches snippet or receives it via postMessage and renders copy + trace link UI.

## 9. Success metrics (30/60/90 days)

- 30d: 100 installs (developer usage); 70% of users perform a generate within first week.
- 60d: 500 installs; 90% of generate responses have valid trace exported to OTLP mock.
- 90d: 1,000 installs OR adoption by 3 orgs; p95 latency < 400ms.

## 10. Acceptance criteria

- ai-plugin.json + OpenAPI hosted and reachable.
- JSON Schema for function parameters emitted and used for ChatGPT function-calls.
- Widget hosted and renders snippet safely from generate responses.
- End-to-end flow passes integration tests (function call → MCP generate → response includes traceId → widget displays snippet and trace link).
- CI green and docs present.

## 11. Risks & mitigations

- App visibility: if public, ensure OAuth or safer token exchange; mitigate by MVP using org-limited keys.
- XSS in widget: sanitize and use sandboxed iframe.
- OTLP privacy: don’t leak sensitive code; only store minimal tracing attributes and optionally mock traces for public demos.

## 12. Next steps

1. Generate JSON Schema from toolkit and emit OpenAPI.
2. Create ai-plugin.json + host OpenAPI at /.well-known/openapi.json or as required by ChatGPT Apps.
3. Implement widget HTML page and integrate into Vercel starter.
4. Run integration tests with mock OTLP and OpenAI ChatGPT developer mode (or local Apps SDK).
