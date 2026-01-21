# Effect-Patterns Architecture Requirements
## System Architect Analysis & Requirements Definition

**Date**: December 2025  
**Status**: Requirements Gathering Phase  
**Context**: Refactoring from static documentation repo to multi-channel, queryable knowledge asset

---

## Executive Summary

This document defines the architectural requirements for transforming Effect-Patterns from a Git-based documentation repository into a queryable knowledge platform supporting:
- **Free Layer**: GitHub repo + open knowledge base
- **Lead Gen**: Interactive examples, side-by-side comparisons (Christmas 2025)
- **Revenue**: AI code review, codebase assessment, migration assistance (2026+)

**Key Architectural Decision**: Single Pattern entity with extensible metadata, maintaining the existing Application Pattern → Job → Effect Pattern hierarchy beneath it.

---

## 1. Critical Query Patterns

### 1.1 Lead Gen Site Queries (Free Tier - Christmas 2025)

**Priority**: P0 (Must have for launch)

| Query | Use Case | Performance Target |
|-------|----------|-------------------|
| `findPatterns({ type: "Application", skillLevel: "beginner", sortBy: "learningOrder" })` | Landing page: "Start Here" section | < 100ms |
| `findPatterns({ type: "Application", tags: ["concurrency"], skillLevel: "beginner" })` | Category browsing | < 150ms |
| `getPattern(id)` | Pattern detail page | < 50ms |
| `findRelatedPatterns(patternId, { limit: 5 })` | "Related Patterns" sidebar | < 100ms |
| `searchPatterns(query: string, { skillLevel?, tags?, limit: 20 })` | Site search | < 200ms |
| `getLearningPath({ goal: string, currentSkill: "beginner" })` | Learning path generator | < 500ms |

**Query Requirements**:
- Filter by: `type`, `skillLevel`, `tags`, `effectModule`, `applicationPatternId`
- Sort by: `learningOrder`, `skillLevel`, `relevance` (search)
- Pagination: Offset-based or cursor-based
- Faceted search: Count patterns by skill level, type, tags

### 1.2 AI Tools Queries (Subscription Tier - 2026 Q1+)

**Priority**: P1 (Required for revenue products)

| Query | Use Case | Performance Target |
|-------|----------|-------------------|
| `findPatternsWithRules({ tags: string[], effectVersion: "3.x\|4.x" })` | AI coding assistant rule generation | < 200ms |
| `getPatternRules(patternId)` | Extract actionable rules from patterns | < 100ms |
| `findPatternsByCodeSnippet(code: string, { threshold: 0.7 })` | Semantic code search | < 500ms |
| `getMigrationPatterns({ fromVersion: "3.x", toVersion: "4.x" })` | Migration assistance | < 300ms |
| `findPatternsByDependency(dependency: string)` | "What patterns use Schema?" | < 200ms |

**Query Requirements**:
- Full-text search on: `title`, `summary`, `content`, `code examples`
- Semantic search: Vector embeddings for code similarity
- Version filtering: `effectVersion`, `compatibility`
- Rule extraction: Structured `rule` objects from patterns

### 1.3 Migration Tools Queries (Revenue - 2026 Q1-Q2)

**Priority**: P1 (High-value revenue driver)

| Query | Use Case | Performance Target |
|-------|----------|-------------------|
| `findMigrationPatterns({ fromVersion: "3.x", toVersion: "4.x", category: "breaking-change" })` | Migration dashboard | < 300ms |
| `getPatternVersionDiff(patternId, fromVersion, toVersion)` | Side-by-side comparison | < 200ms |
| `findCodemods({ patternId, fromVersion, toVersion })` | Automated migration scripts | < 200ms |
| `getBreakingChanges({ effectVersion: "4.x" })` | Breaking changes catalog | < 150ms |

**Query Requirements**:
- Version-aware queries: Filter by Effect version compatibility
- Pattern evolution tracking: Historical versions of patterns
- Codemod storage: Executable migration scripts
- Change detection: Breaking vs. non-breaking changes

### 1.4 Analytics & Observability Queries

**Priority**: P2 (Important for product decisions)

| Query | Use Case | Performance Target |
|-------|----------|-------------------|
| `getPatternUsageStats({ patternId, timeRange, tier: "free\|pro\|enterprise" })` | Which patterns are most used? | < 500ms |
| `getLearningPathCompletion({ userId, learningPathId })` | User progress tracking | < 200ms |
| `getMigrationSuccessRate({ fromVersion, toVersion, timeRange })` | Migration tool effectiveness | < 300ms |
| `getPatternSearchAnalytics({ query, filters, results })` | Search query analysis | < 200ms |

**Query Requirements**:
- Time-series data: Pattern views, searches, completions
- User segmentation: Free vs. Pro vs. Enterprise
- A/B testing support: Track feature usage by tier
- Aggregation: Daily/weekly/monthly rollups

---

## 2. Minimum Viable Database Design

### 2.1 Core Entity: Pattern (Unified)

**Design Decision**: Single `Pattern` entity replaces the current Application Pattern vs. Effect Pattern distinction at the top level. The hierarchy (Application Pattern → Job → Effect Pattern) remains for organization, but queries operate on a unified Pattern entity.

```typescript
interface Pattern {
  // Primary Identity
  id: string                    // PK, kebab-case (e.g., "concurrency-hello-world")
  version: string               // Semantic version (e.g., "1.0.0")
  
  // Classification (NEW - replaces Application Pattern hierarchy)
  type: PatternType             // "Application" | "UI" | "Database" | "API" | ...
  sources: string[]             // ["PoEAA", "custom", "community"] - plural, flexible
  
  // Core Metadata
  title: string
  summary: string
  description?: string
  
  // Skill & Learning
  skillLevel: "beginner" | "intermediate" | "advanced"
  learningOrder?: number        // Within Application Pattern
  
  // Organization (preserves existing hierarchy)
  applicationPatternId?: string // FK to Application Pattern (optional for backward compat)
  category?: string            // Sub-pattern grouping
  
  // Content
  content: string               // Full MDX content
  contentPath: string           // File system path (for git sync)
  
  // Code & Rules
  codeExamples?: CodeExample[]  // Extracted code snippets
  rule?: Rule                   // AI coding assistant rule
  
  // Comparison (for OOP vs Effect side-by-side)
  comparison?: {
    oopApproach: {
      source: string            // e.g., "PoEAA:Repository"
      description: string
      example: string
    }
    effectApproach: {
      description: string
      example: string
    }
    keyDifferences: string[]    // Array of difference points
  }
  
  // Relationships
  tags: string[]
  relatedPatternIds: string[]   // Related patterns
  prerequisites?: string[]      // Pattern IDs that should be learned first
  
  // Version & Compatibility
  effectVersions: string[]      // ["3.x", "4.x"] - compatible versions
  deprecated?: boolean
  deprecatedInVersion?: string
  
  // Metadata
  author?: string
  contributors?: string[]
  createdAt: Date
  updatedAt: Date
  
  // Analytics (denormalized for performance)
  viewCount?: number
  searchRank?: number
}
```

**Key Design Decisions**:
1. **Single Pattern Entity**: Simplifies queries, enables unified search
2. **Type is Singular**: Enforced enum (Application, UI, Database, etc.)
3. **Sources are Plural**: Flexible array allows multiple attributions
4. **Backward Compatible**: `applicationPatternId` preserved for existing patterns
5. **Version-Aware**: `effectVersions` array supports multi-version patterns

### 2.2 Supporting Entities

#### Application Pattern (Preserved for Organization)

```typescript
interface ApplicationPattern {
  id: string                    // PK
  name: string
  description: string
  learningOrder: number
  effectModule?: string
  subPatterns: string[]
}
```

**Purpose**: Maintains existing organizational structure. Patterns reference Application Patterns, but queries don't require traversing this hierarchy.

#### Job (Jobs-to-be-Done)

```typescript
interface Job {
  id: string                    // PK
  description: string
  applicationPatternId: string  // FK
  category?: string
  status: "covered" | "partial" | "gap"
  fulfilledBy: string[]         // Pattern IDs (N:M relationship)
}
```

**Purpose**: Tracks coverage, enables gap analysis. Convert from markdown to structured format.

#### Migration Pattern (NEW)

```typescript
interface MigrationPattern {
  id: string                    // PK
  fromVersion: string           // "3.x"
  toVersion: string             // "4.x"
  patternId: string             // FK to Pattern
  changeType: "breaking" | "non-breaking" | "deprecation"
  codemod?: string              // Executable migration script
  description: string
  examples: CodeExample[]       // Before/after examples
}
```

**Purpose**: Powers migration tools. Links patterns to version transitions.

#### User Progress (NEW - for analytics)

```typescript
interface UserProgress {
  userId: string                // PK (from auth system)
  patternId: string             // PK
  status: "viewed" | "completed" | "bookmarked"
  completedAt?: Date
  timeSpent?: number            // seconds
}
```

**Purpose**: Track user engagement, learning path completion.

### 2.3 Database Schema (PostgreSQL)

**Recommended**: PostgreSQL with:
- **pgvector** extension for semantic search (vector embeddings)
- **Full-text search** (tsvector/tsquery) for text search
- **JSONB** for flexible metadata (sources, tags, etc.)

```sql
-- Core Patterns Table
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL DEFAULT '1.0.0',
  type TEXT NOT NULL CHECK (type IN ('Application', 'UI', 'Database', 'API', 'Infrastructure')),
  sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  learning_order INTEGER,
  application_pattern_id TEXT REFERENCES application_patterns(id),
  category TEXT,
  content TEXT NOT NULL,                    -- Full MDX content
  content_path TEXT NOT NULL,               -- Git file path
  code_examples JSONB,                      -- Extracted code snippets
  rule JSONB,                                -- AI rule object
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  related_pattern_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[],
  effect_versions TEXT[] NOT NULL DEFAULT ARRAY['3.x']::TEXT[],
  deprecated BOOLEAN NOT NULL DEFAULT FALSE,
  deprecated_in_version TEXT,
  author TEXT,
  contributors TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  view_count INTEGER NOT NULL DEFAULT 0,
  search_rank REAL,
  embedding VECTOR(1536)                     -- For semantic search (OpenAI ada-002)
);

-- Indexes
CREATE INDEX idx_patterns_type ON patterns(type);
CREATE INDEX idx_patterns_skill_level ON patterns(skill_level);
CREATE INDEX idx_patterns_application_pattern ON patterns(application_pattern_id);
CREATE INDEX idx_patterns_tags ON patterns USING GIN(tags);
CREATE INDEX idx_patterns_effect_versions ON patterns USING GIN(effect_versions);
CREATE INDEX idx_patterns_fulltext ON patterns USING GIN(to_tsvector('english', title || ' ' || summary));
CREATE INDEX idx_patterns_embedding ON patterns USING ivfflat (embedding vector_cosine_ops);

-- Application Patterns (preserved)
CREATE TABLE application_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_order INTEGER NOT NULL,
  effect_module TEXT,
  sub_patterns TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

-- Jobs (structured from markdown)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  application_pattern_id TEXT NOT NULL REFERENCES application_patterns(id),
  category TEXT,
  status TEXT NOT NULL CHECK (status IN ('covered', 'partial', 'gap')),
  fulfilled_by TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

-- Migration Patterns
CREATE TABLE migration_patterns (
  id TEXT PRIMARY KEY,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES patterns(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('breaking', 'non-breaking', 'deprecation')),
  codemod TEXT,
  description TEXT NOT NULL,
  examples JSONB NOT NULL
);

-- User Progress (for analytics)
CREATE TABLE user_progress (
  user_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES patterns(id),
  status TEXT NOT NULL CHECK (status IN ('viewed', 'completed', 'bookmarked')),
  completed_at TIMESTAMP,
  time_spent INTEGER,                        -- seconds
  PRIMARY KEY (user_id, pattern_id)
);
```

---

## 3. Git vs. Database Interaction Strategy

### 3.1 Hybrid Approach (Recommended)

**Decision**: Git remains source of truth for content; database is queryable cache/index.

**Rationale**:
- ✅ Content authors work in familiar Git workflow
- ✅ Version control for content changes
- ✅ PR-based review process
- ✅ Database enables fast queries, search, analytics
- ✅ Database can be rebuilt from Git at any time

### 3.2 Sync Strategy

#### Option A: CI/CD Pipeline Sync (Recommended for MVP)

```
┌─────────────────┐
│ Git Repository  │
│ (Source Truth)  │
└────────┬────────┘
         │
         │ On push/PR merge
         ▼
┌─────────────────┐
│ CI/CD Pipeline  │
│ (GitHub Actions)│
└────────┬────────┘
         │
         │ 1. Parse MDX files
         │ 2. Extract metadata
         │ 3. Generate embeddings
         │ 4. Validate schemas
         │ 5. Upsert to database
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Query Cache) │
└─────────────────┘
```

**Implementation**:
- GitHub Action triggers on push to `main`
- Script: `scripts/sync/git-to-db.ts`
- Steps:
  1. Clone/checkout latest content
  2. Parse all MDX files (using existing `generate.ts` logic)
  3. Extract frontmatter + content
  4. Generate embeddings (OpenAI API or local model)
  5. Validate against Effect.Schema
  6. Upsert to PostgreSQL (idempotent)
  7. Update search indexes

**Pros**:
- Simple, reliable
- No webhook complexity
- Works with existing Git workflow
- Can run on schedule (daily sync)

**Cons**:
- Slight delay (minutes) between Git push and DB update
- Requires CI/CD infrastructure

#### Option B: Webhook-Based Sync (Future Enhancement)

```
Git Push → GitHub Webhook → API Endpoint → Queue Job → Sync to DB
```

**When to Use**: Real-time updates needed, high-volume contributions

### 3.3 What Goes Where?

| Data | Storage | Rationale |
|------|---------|-----------|
| **Pattern Content (MDX)** | Git | Source of truth, version control |
| **Pattern Metadata** | Git (frontmatter) + DB (indexed) | Git = source, DB = queryable |
| **Pattern Embeddings** | DB only | Generated, not source material |
| **User Progress** | DB only | Runtime data, not content |
| **Analytics** | DB only | Time-series, not versioned |
| **Migration Patterns** | Git (YAML) + DB (indexed) | Codemods versioned in Git |
| **Application Patterns** | Git (JSON) + DB (indexed) | Single source of truth in Git |

**Rule of Thumb**: If it's content → Git. If it's runtime/analytics → DB.

### 3.4 Conflict Resolution

**Scenario**: Pattern updated in Git, but user progress exists in DB.

**Strategy**: 
- Git sync always wins for content/metadata
- User progress preserved (separate table)
- No conflicts possible (different concerns)

---

## 4. Integration Points

### 4.1 MCP Server Integration (Non-Negotiable)

**Current State**: MCP server exists at `services/mcp-server/`

**Requirements**:
- ✅ Expose patterns via MCP protocol
- ✅ Support pattern search queries
- ✅ Return structured pattern data
- ✅ Version-aware queries

**API Surface** (free-tier MCP tools only; paid tools are HTTP API only):
```typescript
// MCP Tools
mcp_search_patterns(query: string, filters?: PatternFilters): Pattern[]
mcp_get_pattern(id: string): Pattern
mcp_get_migration_patterns(fromVersion: string, toVersion: string): MigrationPattern[]
```

**Implementation**: Extend existing MCP server to query database instead of file system.

### 4.2 REST API Endpoints

**Priority**: P0 for lead gen site, P1 for AI tools

**Endpoints**:

```
GET  /api/v1/patterns                    # List patterns (filtered, paginated)
GET  /api/v1/patterns/:id                # Get single pattern
GET  /api/v1/patterns/:id/related       # Get related patterns
GET  /api/v1/patterns/search             # Full-text + semantic search
GET  /api/v1/application-patterns        # List Application Patterns
GET  /api/v1/application-patterns/:id/patterns  # Patterns in AP
GET  /api/v1/migrations/:fromVersion/:toVersion  # Migration patterns
GET  /api/v1/learning-paths              # Generate learning paths
```

**Authentication**:
- Public endpoints: Rate-limited (100 req/min)
- Subscription endpoints: API key required
- Analytics endpoints: Internal only

### 4.3 GraphQL API (Future Consideration)

**When to Add**: If complex nested queries become common (e.g., "Get pattern with related patterns, jobs, and migration info")

**Current Priority**: P2 (not needed for MVP)

### 4.4 Webhook Integration

**Use Cases**:
- GitHub webhooks → Sync content to DB
- Polar webhooks → Update user tiers
- Analytics webhooks → External monitoring

**Priority**: P1 (needed for Git sync)

---

## 5. Search & Discovery

### 5.1 Full-Text Search

**Implementation**: PostgreSQL `tsvector`/`tsquery`

**Searchable Fields**:
- `title`
- `summary`
- `description`
- `content` (MDX, stripped of markdown)
- `tags`
- `code_examples` (code comments only)

**Query Example**:
```sql
SELECT * FROM patterns
WHERE to_tsvector('english', title || ' ' || summary || ' ' || content) 
  @@ plainto_tsquery('english', 'error handling');
```

### 5.2 Semantic Search (Vector Embeddings)

**Implementation**: pgvector extension + OpenAI embeddings

**Use Cases**:
- "Find patterns similar to this code snippet"
- "What patterns solve this problem?" (natural language)
- Related pattern discovery

**Embedding Generation**:
- Model: OpenAI `text-embedding-ada-002` (1536 dimensions)
- Input: `title + summary + code_examples`
- Storage: `patterns.embedding` column (VECTOR(1536))

**Query Example**:
```sql
SELECT *, embedding <=> $1::vector AS distance
FROM patterns
ORDER BY distance
LIMIT 10;
```

### 5.3 Faceted Search

**Facets**:
- `type` (Application, UI, Database, etc.)
- `skillLevel` (beginner, intermediate, advanced)
- `effectModule` (Effect, Schema, Stream, etc.)
- `tags` (concurrency, error-handling, etc.)
- `effectVersions` (3.x, 4.x, etc.)

**Implementation**: PostgreSQL aggregations + filters

### 5.4 Search Ranking

**Factors**:
1. **Relevance**: Full-text match score, semantic similarity
2. **Popularity**: `view_count` (normalized)
3. **Recency**: `updated_at` (boost for recent updates)
4. **Skill Match**: Boost patterns matching user's skill level
5. **Completeness**: Boost patterns with code examples, rules

**Formula** (simplified):
```
score = (text_relevance * 0.4) + 
        (semantic_similarity * 0.3) + 
        (popularity * 0.1) + 
        (recency * 0.1) + 
        (completeness * 0.1)
```

---

## 6. Versioning Strategy

### 6.1 Effect Version Compatibility

**Pattern Versioning**:
- Each pattern has `effectVersions: string[]` array
- Examples: `["3.x", "4.x"]`, `["4.x"]`, `["3.x"]`
- Patterns can be compatible with multiple versions

**Migration Tracking**:
- `MigrationPattern` entity links patterns to version transitions
- Tracks breaking changes, deprecations
- Stores codemods for automated migration

### 6.2 Pattern Evolution

**Versioning Model**: Semantic versioning for patterns themselves
- `version: "1.0.0"` (major.minor.patch)
- Major: Breaking changes to pattern structure
- Minor: New examples, updated content
- Patch: Typo fixes, clarifications

**Deprecation**:
- `deprecated: boolean`
- `deprecatedInVersion: string` (Effect version)
- Deprecated patterns still queryable but marked in UI

### 6.3 Historical Tracking

**Current**: Not required for MVP

**Future**: Consider pattern version history table if patterns evolve significantly:
```sql
CREATE TABLE pattern_versions (
  pattern_id TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (pattern_id, version)
);
```

---

## 7. Content Types & Storage

### 7.1 Current Content Types

| Type | Format | Storage | Queryable |
|------|--------|---------|------------|
| Effect Patterns | MDX | Git | ✅ (via DB index) |
| Application Patterns | JSON | Git | ✅ (via DB index) |
| Jobs | Markdown | Git | ⚠️ (needs conversion) |

### 7.2 Future Content Types

| Type | Format | Storage | Priority |
|------|--------|---------|----------|
| **Codemods** | TypeScript/JavaScript | Git (`.ts` files) | P1 (migration tools) |
| **Migration Guides** | MDX | Git | P1 (migration tools) |
| **Side-by-Side Comparisons** | MDX + JSON | Git | P1 (lead gen site) |
| **Video Tutorials** | External (YouTube/Vimeo) | Metadata in DB | P2 |
| **Interactive Examples** | CodeSandbox/StackBlitz | Metadata in DB | P2 |

**Storage Strategy**:
- **Codemods**: `content/migrations/{fromVersion}-to-{toVersion}/{patternId}.ts`
- **Migration Guides**: `content/migrations/{fromVersion}-to-{toVersion}/guide.mdx`
- **Comparisons**: Embedded in pattern MDX or separate `comparison.mdx` files

### 7.3 Code Example Extraction

**Current**: Code examples embedded in MDX

**Future**: Extract to structured format:
```typescript
interface CodeExample {
  id: string
  language: "typescript" | "javascript"
  code: string
  description?: string
  runnable?: boolean                    // Can be executed?
  sandboxUrl?: string                   // CodeSandbox/StackBlitz link
}
```

**Storage**: `patterns.code_examples` JSONB column

---

## 8. Contribution & Quality Control

### 8.1 Community Submission Workflow

**Current**: PR-based (GitHub)

**Future**: Maintain PR workflow, add structured submission form:

```
1. Contributor fills form (title, summary, code example)
2. System creates draft PR with MDX template
3. Contributor completes MDX content
4. PR review (maintainers)
5. Merge → Auto-sync to DB
```

**Requirements**:
- ✅ PR-based review (non-negotiable)
- ✅ Automated validation (schema, linting)
- ✅ Attribution tracking (`author`, `contributors` fields)

### 8.2 Validation Pipeline

**Pre-Merge Checks** (CI/CD):
1. **Schema Validation**: Effect.Schema validates frontmatter
2. **Content Validation**: 
   - Required fields present
   - `applicationPatternId` exists in index
   - `related` pattern IDs exist
   - Code examples parse correctly
3. **Linting**: Biome/ESLint for code examples
4. **Coverage Check**: Update Jobs-to-be-Done status

**Post-Merge** (Sync to DB):
1. Generate embeddings
2. Extract code examples
3. Validate relationships
4. Update search indexes

### 8.3 Quality Metrics

**Track**:
- Pattern completeness (has code examples? rule? related patterns?)
- User engagement (views, completions)
- Search relevance (click-through rate)
- Migration success rate (for migration patterns)

**Use**: Identify patterns needing improvement, prioritize content gaps

---

## 9. Analytics & Observability

### 9.1 Critical Metrics

**Product Metrics**:
- **Pattern Views**: Which patterns are most viewed? (by tier)
- **Search Queries**: What are users searching for?
- **Learning Path Completion**: % users completing paths
- **Migration Tool Usage**: Adoption of migration features
- **Time-to-Competency**: How long to complete beginner → advanced?

**Business Metrics**:
- **Tier Conversion**: Free → Pro → Enterprise
- **Churn Correlation**: Does pattern access correlate with retention?
- **Feature Usage**: Which features drive subscriptions?

### 9.2 Implementation

**Storage**: PostgreSQL `user_progress`, `analytics_events` tables

**Events to Track**:
```typescript
interface AnalyticsEvent {
  eventType: "pattern_view" | "pattern_search" | "pattern_complete" | 
              "migration_start" | "migration_complete" | "learning_path_start"
  userId?: string                    // Optional (anonymous allowed)
  patternId?: string
  metadata: Record<string, unknown>   // Flexible event data
  timestamp: Date
  tier?: "free" | "pro" | "enterprise"
}
```

**Privacy**: 
- Anonymize user IDs for free tier
- Aggregate data (daily/weekly rollups)
- GDPR-compliant (user data deletion)

### 9.3 Observability

**Effect.withSpan** around:
- Database queries (PostgreSQL)
- Search operations (full-text + semantic)
- Embedding generation (OpenAI API)
- Git sync operations

**Metrics**:
- Query latency (p50, p95, p99)
- Error rates
- Cache hit rates
- API usage (tier-based)

---

## 10. Implementation Phases

### Phase 1: MVP Database (Christmas 2025 - Lead Gen Site)

**Scope**:
- ✅ PostgreSQL schema (Pattern, ApplicationPattern, Job)
- ✅ Git → DB sync pipeline (CI/CD)
- ✅ Basic REST API (`/api/v1/patterns`)
- ✅ Full-text search
- ✅ MCP server integration

**Timeline**: 4-6 weeks

### Phase 2: Migration Tools (2026 Q1)

**Scope**:
- ✅ MigrationPattern entity
- ✅ Codemod storage & execution
- ✅ Version-aware queries
- ✅ Migration API endpoints

**Timeline**: 6-8 weeks

### Phase 3: Advanced Features (2026 Q2+)

**Scope**:
- ✅ Semantic search (vector embeddings)
- ✅ Learning path generation
- ✅ Analytics dashboard
- ✅ Interactive examples integration

**Timeline**: Ongoing

---

## 11. Open Questions & Decisions Needed

### 11.1 Database Choice

**Question**: PostgreSQL vs. alternatives?

**Recommendation**: **PostgreSQL** because:
- ✅ Excellent full-text search (tsvector)
- ✅ pgvector extension for semantic search
- ✅ JSONB for flexible metadata
- ✅ Mature, reliable, widely supported
- ✅ Effect has excellent PostgreSQL support

**Alternatives Considered**:
- **Supabase**: PostgreSQL-based, good DX, but vendor lock-in
- **Neon**: Serverless PostgreSQL, good for scaling
- **SQLite**: Too limited for production (no vector support)

**Decision Needed**: Confirm PostgreSQL choice

### 11.2 Embedding Generation

**Question**: OpenAI API vs. local model?

**Recommendation**: **OpenAI API** for MVP because:
- ✅ High-quality embeddings
- ✅ No infrastructure to manage
- ✅ Cost: ~$0.0001 per pattern (one-time)

**Future**: Consider local model (e.g., `all-MiniLM-L6-v2`) for cost savings

**Decision Needed**: Budget approval for OpenAI API usage

### 11.3 Hosting & Infrastructure

**Question**: Where to host database, API, sync jobs?

**Options**:
- **Vercel** (current): Good for API, but no PostgreSQL
- **Railway/Render**: Full-stack hosting with PostgreSQL
- **AWS/GCP**: More control, more complexity

**Recommendation**: **Railway** or **Render** for simplicity

**Decision Needed**: Infrastructure choice

### 11.4 Authentication & Authorization

**Question**: How to handle user tiers (free/pro/enterprise)?

**Current**: Polar integration exists

**Requirements**:
- ✅ Tier-based feature gating
- ✅ API key management for Pro/Enterprise
- ✅ User progress tracking (authenticated)

**Decision Needed**: Confirm Polar integration approach

---

## 12. Success Criteria

### 12.1 Lead Gen Site (Christmas 2025)

**Metrics**:
- ✅ Site loads in < 2s
- ✅ Pattern search returns results in < 200ms
- ✅ 1000+ unique visitors/month
- ✅ 10%+ conversion to email signup

### 12.2 Migration Tools (2026 Q1-Q2)

**Metrics**:
- ✅ 100+ migrations assisted
- ✅ 80%+ migration success rate
- ✅ 20%+ conversion to Pro tier

### 12.3 Overall Platform

**Metrics**:
- ✅ 90%+ uptime
- ✅ < 500ms p95 query latency
- ✅ Zero data loss (Git sync reliability)
- ✅ 100% pattern coverage in database

---

## Appendix A: Current State Analysis

### A.1 Existing Infrastructure

**Content**:
- 304 Effect Patterns (MDX files)
- 16 Application Patterns (JSON index)
- 274 Jobs (Markdown files)
- Auto-generation pipeline (`scripts/publish/generate.ts`)

**APIs**:
- MCP server (`services/mcp-server/`)
- REST API (`api/index.ts`) - basic rules endpoint
- Patterns chat app (`app/patterns-chat-app/`)

**Storage**:
- Git repository (source of truth)
- Supermemory (for semantic search in chat app)
- No production database yet

### A.2 Gaps Identified

1. **No unified query layer**: Patterns scattered across file system
2. **No version tracking**: Can't query by Effect version
3. **No migration support**: No codemods or migration patterns
4. **Limited search**: File-system based, no semantic search
5. **No analytics**: No user progress or usage tracking
6. **Jobs unstructured**: Markdown format limits programmatic access

---

## Appendix B: Reference Queries

### B.1 Lead Gen Site Queries (TypeScript/Effect)

```typescript
// Find beginner patterns for landing page
const beginnerPatterns = yield* PatternRepository.findPatterns({
  skillLevel: "beginner",
  sortBy: "learningOrder",
  limit: 10
})

// Search patterns
const results = yield* PatternRepository.search({
  query: "error handling",
  filters: { skillLevel: "beginner", tags: ["error-management"] },
  limit: 20
})

// Get pattern with related patterns
const pattern = yield* PatternRepository.getPattern("concurrency-hello-world")
const related = yield* PatternRepository.getRelatedPatterns(pattern.id, { limit: 5 })
```

### B.2 Migration Tool Queries

```typescript
// Find migration patterns for v3 → v4
const migrations = yield* MigrationRepository.findMigrations({
  fromVersion: "3.x",
  toVersion: "4.x",
  changeType: "breaking"
})

// Get codemod for specific pattern
const codemod = yield* MigrationRepository.getCodemod({
  patternId: "schema-validate-object",
  fromVersion: "3.x",
  toVersion: "4.x"
})
```

---

## Next Steps

1. **Review & Approve**: This requirements document
2. **Technical Design**: Detailed database schema, API contracts
3. **Prototype**: MVP database + sync pipeline
4. **Implementation**: Phase 1 (Lead Gen Site support)
5. **Testing**: Load testing, query performance validation
6. **Deployment**: Production database, CI/CD pipeline

---

**Document Status**: Draft - Awaiting Review  
**Last Updated**: December 2025  
**Next Review**: After stakeholder feedback
