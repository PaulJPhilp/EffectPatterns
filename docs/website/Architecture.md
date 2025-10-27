Here’s the Tech Stack / Architecture document, aligned with everything we agreed.

TECH STACK / ARCHITECTURE

Overview
- Goal: Build the Effect Patterns Hub as a real-time, interactive learning platform that showcases Effect best practices while remaining pragmatic for MVP delivery.
- Approach: Hybrid architecture using Convex for real-time state and actions, Postgres for durable pattern storage and future vector search, Next.js for the web app, Clerk for auth, Polar for billing, and Effect for core services and orchestration. For MVP, Convex functions call SDKs directly; Effect services are used in Next.js for business logic and are expanded over time.

Primary Technologies
- UI and App
  - Next.js 14 (App Router), TypeScript
  - Tailwind CSS + Shadcn/ui (in packages/components) with your blog’s design language
  - MDX for patterns (authored in repo)
  - effect-atom for local UI state
- Real-time Backend
  - Convex (queries, mutations, actions; real-time subscriptions)
- Auth
  - Clerk for authentication, session management, OAuth (Next + Convex integration)
  - effect-clerk (package): wrapper prepared for post-MVP extraction; MVP uses Clerk SDK directly in app and Convex
- Data Layer
  - Postgres (Vercel) for patterns and user records
  - Drizzle ORM for schema, migrations, typed queries
  - Repository pattern with Effect services backed by Drizzle
  - Future: vector embeddings in Postgres (pgvector) for semantic search/RAG
- Payments
  - Polar (Merchant of Record, subscriptions, entitlements)
- AI
  - Vercel AI SDK (Claude recommended) for personalized learning plan generation
  - AI Toolkit (package) for pattern search/fetch APIs; used by agent integrations and site
- Observability
  - Effect.log + spans in code; OTEL wiring later
  - Request correlation IDs, user tags at service boundaries

Monorepo Structure
- apps/
  - web/ (Next.js site; primary product)
  - openai-app/ (future)
  - gemini-app/ (future)
- packages/
  - components/ (Shadcn/ui + shared UI kit, theme tokens based on your blog)
  - effect-clerk/ (MVP: wrapper scaffolding; later extract)
  - effect-polar/ (placeholder for post-MVP; MVP integrates Polar in web)
  - ai-toolkit/ (existing)
  - mcp-server/ (existing)
- turbo.json (build orchestration)

Runtime Architecture

1) Frontend (Next.js)
- Server Components for:
  - Module index pages
  - Pattern lists/search pages
  - Pattern page MDX rendering
- Client Components for:
  - Dashboard (real-time subscriptions to Convex)
  - “Mark as read” interactions
  - Goal submission → generate plan
- State
  - effect-atom for local UI state (e.g., filters, tabs, scroll)
  - Convex subscriptions for server-source-of-truth session/plan/progress
- Code blocks
  - MDX renderer wraps Good Example blocks with a “Run in Playground” button
  - Button links to effect.website/play/?code={base64(code)}

2) Auth (Clerk)
- ClerkProvider at app root
- middleware.ts to protect /dashboard and API routes
- Convex uses Clerk auth integration for server-side identity
- Future extraction into packages/effect-clerk as Effect services/layers

3) Real-time Backend (Convex)
- Entities:
  - sessions: user session and current learning context
  - plans_rt: active plan state, completed pattern IDs
  - chat_threads (future)
- Functions:
  - queries: read session, plan, progress; subscribe in dashboard
  - mutations: update progress, set current pattern/module
  - actions: call Polar for checkout/session, call AI services if needed, sync to Postgres when required
- Integration notes:
  - MVP calls SDKs directly in Convex functions (Clerk, Polar)
  - Post-MVP: extract to effect-convex wrapper package (optional)

4) Persistent Data (Postgres + Drizzle)
- Purpose
  - Durable storage of patterns and metadata (including MDX mapping)
  - Durable user profile and learning plans (mirror of Convex state as needed)
  - Future embeddings for vector search and RAG
- Schema (initial)
  - patterns
    - id (text PK), title, summary, skill_level (enum), tags (text[])
    - modules (jsonb: { [moduleId]: { stage?: number, position: number } })
    - related (text[])
    - mdx_slug (text), content_path (text)
    - embedding (vector/float8[]) — later
  - users
    - id (text PK), clerk_id (unique), email (unique), tier (enum: free/pro/enterprise)
  - learning_plans
    - id (text PK), user_id (fk), goal (text), phases (jsonb), created_at
  - pattern_progress
    - id (text PK), user_id (fk), pattern_id (fk), status (enum), updated_at
    - unique index on (user_id, pattern_id)
- Repository services (Effect)
  - PatternRepository (read-only)
  - PlanRepository (durable copy; maps from Convex plan state)
  - UserRepository (read/write)
- Ingestion
  - Build-time script parses MDX frontmatter → inserts/updates Postgres
  - Stores content mapping and metadata; MDX content remains in repo for rendering (fast SSR via file access) or optional caching in Postgres

5) Payments (Polar)
- Flow
  - Frontend → Convex action to create checkout or customer portal
  - Polar webhooks → Convex endpoint → update user tier in Convex + Postgres
- Entitlements
  - Tier-gated features (e.g., plan generation limit, chat access)
  - Middleware checks tier on protected routes
- MVP: integrate Polar in app/web via Convex actions; extract to effect-polar later

6) AI (Learning Plans)
- Service
  - LearningPlanService (Effect) wraps Vercel AI SDK calls
  - Inputs: user goal, catalog of patterns (title, id, module, skill, prerequisites if defined)
  - Output: phases[] with ordered patternIds, rationale, estimated duration
- Policies
  - Timeouts and retries via Effect Schedule
  - Guard token usage; telemetry via Effect.log
- Storage & Sync
  - Store plan in Postgres (jsonb) and set plans_rt in Convex for real-time UI
  - Respect free tier limits (1 plan total or per month)

7) Observability and Diagnostics
- Effect.withSpan around:
  - Repo calls (Postgres)
  - Convex sync calls
  - AI calls (plan generation)
  - Polar actions
- Effect.log with context fields: userId, requestId, planId
- OTEL SDK wiring prepared but disabled until platform launch
- Error strategy:
  - Domain errors are Data.TaggedError
  - Route handlers map domain errors to HTTP
  - Convex functions return typed results (ok/error shape)

8) Security and Compliance
- AuthN via Clerk; AuthZ via entitlements and ownership checks
- Polar MoR handles taxes and compliance
- Input validation via @effect/schema (for API inputs and plan generation parameters)
- Webhook signature verification for Polar
- Rate limiting (basic) on plan generation (server-side guard)
- Do not execute user-submitted code on server; playground link only

Data Flows

1) Anonymous browse (public)
- User visits homepage → Next SSR renders modules
- User searches patterns → Next RSC queries Postgres (PatternRepository)
- User opens a pattern → MDX rendered, Good Example shows playground button

2) Sign up and generate learning plan
- User signs in via Clerk
- Submits goal → Next API route calls LearningPlanService (Effect) → Vercel AI SDK
- Service builds plan, writes to Postgres (learning_plans), updates Convex plans_rt
- Dashboard subscribes to plans_rt for live view

3) Mark pattern as completed
- Client calls Convex mutation to set pattern status completed
- Convex updates plans_rt and sessions
- Optional: background sync to Postgres pattern_progress (durability), via Convex action/cron

4) Upgrade to Pro
- Client triggers Convex action to create Polar checkout
- On webhook: Convex verifies signature, updates user tier in sessions and Postgres
- Middleware and UI conditionally unlock features

Deployment and Environments
- Vercel for app/web hosting
- Convex hosted backend (managed)
- Postgres (Vercel Postgres or managed Postgres)
- Environment config via Next runtime env and Effect Config layer for services
- Build pipeline (Turborepo) builds packages/components, app/web

Roadmap for Post-MVP Architecture Evolution
- Extract effect-convex: Effect Layer/Service for Convex queries/mutations/actions; unify error handling; typed responses with Schema
- Extract effect-polar: type-safe Effect wrapper for Polar SDK and webhook utilities
- Enable pgvector and embeddings pipeline; semantic search in SearchService with RAG for tutor/chat
- Migrate more backend logic from Convex actions to Effect services where beneficial; keep Convex as real-time state and transport
- OTEL backend launch; export traces/metrics/logs
- Introduce code review service (LangGraph-based), integrated with user plans and patterns
- Add MCP server and AI Toolkit deep links from site
- Multi-app distribution (apps/openai-app, apps/gemini-app) using shared components and services

Design System Integration
- Use packages/components for:
  - Typography scale and spacing matching your blog
  - CodeBlock component with Copy + Run in Playground
  - Sidebar navigation for modules/roadmaps
  - Cards for module selection on homepage
  - Progress components (phase bars, checklist)
- Tailwind theme tokens align with paulphilp.com palette (neutral, spacious, content-first)

Open Items to Finalize
- Free tier limits: 1 plan total vs 1 plan/month
- Domain and SEO checklist (title/meta/og tags, sitemap, canonical URLs)
- Exact tagging of Good Example blocks in MDX (frontmatter key or code fence annotation)
- Embeddings provider choice and schedule for rollout
- Convex ↔ Postgres sync cadence for plan/progress (realtime update vs batch)
