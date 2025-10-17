Great. Delivering the first two documents: PRD and Architecture. After you review, I’ll produce the Implementation Plan and Agent Prompts.

PRODUCT REQUIREMENTS DOCUMENT (PRD)

1) Vision and Goals
- Vision: The Effect Patterns Hub is the go-to resource to learn Effect through curated roadmaps, interactive patterns, and AI-assisted learning, built as a living showcase of Effect best practices.
- Primary goals:
  - Make Effect approachable: reduce the learning cliff via 10 modular roadmaps and 130 patterns.
  - Provide an interactive learning experience: playground links, personalized plans, real-time progress.
  - Be the hub for the ecosystem: integrate MCP server, AI Toolkit, CLI, and later LSP/code review.
  - Establish sustainable monetization: free discovery + paid learning features and team/enterprise plans.

2) Audience and Personas
- Solo developer: Wants to learn Effect quickly through a guided path and interactive examples.
- Team lead/architect: Evaluates Effect adoption; needs structured training for a team and later code review.
- Advanced Effect user: References patterns; contributes patterns and modules.
- AI agent builders: Consume machine-readable patterns via AI Toolkit/MCP server.

3) MVP Scope
- Website (Next.js App Router):
  - Homepage with 10 roadmaps (modules), brand and design matching your blog.
  - Module pages: progressive disclosure (sections/stages → patterns).
  - Pattern pages: MDX rendering, Good Example with “Run in Playground” link, related patterns, tags.
  - Pattern explorer: global search/filter by module, skill, tags.
  - Links to MCP server, AI Toolkit, CLI.
- Accounts (Clerk):
  - Sign in/up (GitHub/Google/email).
  - Goal capture: “What’s your goal?” → generate personalized learning plan via LLM.
  - Dashboard: phases, progress, current pattern, mark-as-read.
- Data:
  - Patterns ingested from MDX into Postgres with metadata and embeddings (for RAG later).
- Real-time (Convex):
  - Session/progress state synced live across devices.
- Payments (Polar):
  - Basic subscription integration; entitlements for Pro features.
- Observability:
  - Effect logging + tracing in code; OTEL backend not launched yet.
- Design system:
  - Match paulphilp.com design language; shared components package.

4) Out of Scope (Post-MVP)
- Full chat tutor experience on-site.
- Code review tool and CI integration.
- LSP package.
- Full effect-convex/effect-polar libraries as published packages.
- OTEL backend deployment.

5) Success Metrics
- Engagement: time on site, patterns viewed per session, completion rate of a plan.
- Conversion: signups to plan generation, plan to Pro subscription.
- Community: inbound links, stars growth, contributions.
- SEO: impressions/clicks for “Effect patterns” and related keywords.

6) Constraints and Assumptions
- All business logic demonstrates Effect patterns (even when using Convex directly early on, we architect with Effect services/layers in mind).
- Design must align with your blog’s style.
- MCP server and AI toolkit exist and are linked; not primary blockers for MVP launch.
- Vector search comes online after embeddings pipeline is ready.


ARCHITECTURE DOCUMENT

High-Level System Design
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind + shared components (packages/components), effect-atom for UI-local state.
- Auth: Clerk.
- Real-time state + backend functions: Convex (queries, mutations, actions).
- Persistent store and semantic search: Postgres (Vercel) with embeddings; DrizzleORM for migrations where applicable; repository services abstract DB access.
- Payments: Polar (MoR); webhooks update entitlements.
- AI: Vercel AI SDK for learning plan generation (Claude recommended). AI Toolkit used for pattern search/context.

Monorepo Layout
- apps/
  - web/ (Next.js app)
  - openai-app/ (future)
  - gemini-app/ (future)
- packages/
  - components/ (Shadcn + custom UI, design tokens)
  - effect-clerk/ (MVP wrapper around Clerk SDK; services/layers prepared for later extraction)
  - effect-polar/ (placeholder; direct integration in web for MVP)
  - ai-toolkit/ (existing)
  - mcp-server/ (existing)
- turbo.json

Core Domains and Services
- PatternService (Effect): read/search patterns, fetch related, resolve module placement.
- LearningPlanService (Effect): generate personalized plan via LLM, store plan, mark progress.
- UserProgressService (Effect): state transitions (not_started → reading → completed).
- SearchService (Effect): keyword + semantic search (embeddings later).
- SessionService (Convex + effect-atom): source-of-truth in Convex; UI mirrors via subscriptions.
- AuthService (effect-clerk): user/session identity rich wrapper.
- BillingService (Polar): entitlements, webhooks, subscription checks.

Layers and DI (Effect)
- ConfigLayer: runtime config, API keys, environment flags.
- AuthLayer: provides current user and claims (via effect-clerk).
- RepoLayer:
  - PatternRepository: read-only patterns from Postgres (JSON + text/TS vector later).
  - PlanRepository: store learning plans and associations; backed by Convex as the real-time state, mirrored where necessary.
- AIPlannerLayer: Vercel AI SDK client, with timeout/retry Schedule.
- BillingLayer: Polar client with webhook verification.
- SessionLayer: Convex subscription → Effect stream adapters (post-MVP).

Data Model (MVP)
- Postgres (Drizzle):
  - patterns
    - id (text, PK)
    - title (text)
    - summary (text)
    - skill_level (enum)
    - tags (text[])
    - modules (jsonb) // { [moduleId]: { stage?: number, position: number } }
    - related (text[])
    - mdx_slug (text)
    - content_path (text)
    - embedding (vector or float8[]) // later
  - users
    - id (text, PK)
    - clerk_id (text, unique)
    - email (text, unique)
    - tier (enum: free, pro, enterprise)
  - learning_plans
    - id (text, PK)
    - user_id (fk users)
    - goal (text)
    - phases (jsonb)
    - created_at (timestamptz)
  - pattern_progress
    - id (text, PK)
    - user_id (fk users)
    - pattern_id (fk patterns)
    - status (enum: not_started, reading, completed)
    - updated_at (timestamptz)
    - unique (user_id, pattern_id)

- Convex (real-time):
  - sessions
    - userId (clerk)
    - currentModule
    - currentPattern
    - currentPhase
    - subscriptionTier
    - updatedAt
  - plans_rt
    - userId
    - planId
    - activePhase
    - completedPatternIds
  - chat_threads (future)
    - userId
    - messages
    - metadata

- Polar:
  - No local DB mirror required for MVP; store entitlement snapshot in users.tier on webhook.

Auth Flow
- Clerk authenticates in Next.js and Convex.
- Middleware uses Clerk to allow public pages and protect dashboard/plan routes.
- AuthLayer exposes current identity to Effect services.
- Polar webhooks update user tier in Convex + Postgres.

Routing and Data Flow
- Public pages:
  - / → modules overview, links, search.
  - /modules/:id → module page (SSR or SSG, reads from Postgres).
  - /patterns/:id → pattern page (MDX rendering; insert “Run in Playground” button for Good Examples only).
- Auth pages:
  - /dashboard → subscribes to Convex state for live progress; fetches plan from Convex/PG.
  - /api/plan/create → calls AIPlannerLayer to generate plan; persists in Postgres + updates Convex session/plan_rt.
  - /api/progress/mark → mutation to Convex; mirror to Postgres asynchronously if needed.

LLM Orchestration (Learning Plans)
- Input: user goal, available patterns (title/id/module/skill/prereqs), optional preferred pace.
- Output JSON: phases[] with ordered patternIds, rationale per phase, estimate.
- Effect Schedule for retries/backoff; guardrails on token/timeouts.
- Store: learning_plans.phases as jsonb; update Convex plan_rt for real-time UI.

Playground Integration
- MDX renderer detects “Good Example” blocks.
- Add top-right “Run in Playground” button.
- Button links to effect.website/play/?code={base64(code)}.
- Keep Anti-Patterns non-runnable.

Observability
- Use Effect.log, Effect.logInfo, with spans via Effect.withSpan on service boundaries.
- Add RequestId correlation and userId tagging.
- OTEL exporter wiring later.

Security
- AuthN via Clerk; AuthZ via entitlements (tier) + ownership checks.
- Rate limiting (basic) on plan generation endpoints.
- Webhook verification for Polar.
- Sanitize/escape code snippets; do not execute on server.

Performance
- Server Components for module/pattern lists.
- Cache MDX render results.
- Use Postgres indices on tags/title; plan for embedding index later.
- Convex for state eliminates polling.

Monetization Gates (MVP)
- Free:
  - View all patterns, search, browse modules.
  - Generate 1 plan total (or 1/month).
- Pro:
  - Unlimited plans.
  - Progress sync across devices (real-time).
  - Early access to chat tutor.
- Enterprise (post-MVP):
  - Team plans, admin dashboard, custom roadmaps, SSO, SLAs.

Open Questions to Track
- Exact plan limits for free tier (1 total vs 1/month).
- Domain selection and SEO plan.
- Exact list of Good Example blocks in MDX (annotation scheme).
- Embeddings pipeline choice and timing (OpenAI, Voyage, local).
- Convex↔Postgres sync strategy details (one-way vs two-way for plan/progress).


NEXT STEPS
- If this PRD and Architecture look right, I’ll deliver:
  - Implementation Plan (milestones, tasks, scaffolds)
  - Agent Prompts (phase-by-phase build instructions and Q&A flow)

Say the word and I’ll proceed with the Implementation Plan.
