# Effect Patterns Data Model

## Overview

The Effect Patterns knowledge base is organized around three core entities:

```
Application Pattern  ──►  Job  ──►  Effect Pattern
     (what)              (why)         (how)
```

| Entity | Purpose | Example |
|--------|---------|---------|
| **Application Pattern** | A coherent approach to solving a class of problems | "Concurrency", "Schema Validation" |
| **Job** | What a developer needs to accomplish | "Run effects in parallel" |
| **Effect Pattern** | Concrete code showing how to do it | `concurrency-hello-world.mdx` |

---

## Entity Definitions

### 1. Application Pattern

**Definition:** A high-level pattern representing a coherent way to apply Effect to solve a class of problems.

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier (kebab-case) |
| `name` | string | ✓ | Human-readable name |
| `description` | string | ✓ | What this application pattern covers |
| `learningOrder` | number | ✓ | Suggested order for learning (1 = first) |
| `effectModule` | string | | Primary Effect module (Schema, Stream, etc.) |
| `subPatterns` | string[] | | Sub-directories for this AP |

**Source:** PostgreSQL database (`application_patterns` table)
**Legacy:** `data/application-patterns.json` (deprecated, used only for initial migration)

**Example:**

```json
{
  "id": "concurrency",
  "name": "Concurrency",
  "description": "Run effects in parallel, manage fibers, coordinate async work",
  "learningOrder": 5,
  "effectModule": "Effect",
  "subPatterns": ["getting-started", "coordination", "state"]
}
```

---

### 2. Job

**Definition:** A specific task or goal that a developer needs to accomplish within an Application Pattern.

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier |
| `description` | string | ✓ | What the developer needs to do |
| `applicationPatternId` | string | ✓ | Parent Application Pattern |
| `category` | string | | Grouping within the Application Pattern |
| `status` | enum | ✓ | `covered` \| `partial` \| `gap` |
| `fulfilledBy` | string[] | | IDs of Effect Patterns that fulfill this job |

**Source:** PostgreSQL database (`jobs` table)
**Legacy:** `docs/*_JOBS_TO_BE_DONE.md` files (deprecated, used only for initial migration)

**Example:**

```yaml
id: concurrency-parallel-execution
description: Run effects in parallel with Effect.all
applicationPatternId: concurrency
category: getting-started
status: covered
fulfilledBy:
  - concurrency-hello-world
```

---

### 3. Effect Pattern

**Definition:** A concrete code example demonstrating how to accomplish a job using Effect.

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier |
| `title` | string | ✓ | Human-readable title |
| `applicationPatternId` | string | ✓ | Parent Application Pattern |
| `skillLevel` | enum | ✓ | `beginner` \| `intermediate` \| `advanced` |
| `summary` | string | ✓ | Brief description |
| `tags` | string[] | | Searchable tags |
| `rule` | object | | Actionable guideline |
| `related` | string[] | | IDs of related patterns |
| `author` | string | | Pattern author |
| `content` | string | ✓ | Full markdown content (stored in database) |

**Source:** PostgreSQL database (`effect_patterns` table)
**Content:** Stored in the database `content` field (markdown, code examples, all sections)

**Example:**

```yaml
id: concurrency-hello-world
title: Your First Parallel Operation
applicationPatternId: concurrency
skillLevel: beginner
summary: Run multiple effects in parallel with Effect.all
tags: [concurrency, parallel, effect-all, getting-started]
rule:
  description: Use Effect.all with concurrency option to run independent effects in parallel
related: [concurrency-understanding-fibers, concurrency-race-timeout]
author: PaulJPhilp
slug: concurrency-hello-world
```

---

## Relationships

```
┌───────────────────┐
│ Application       │
│ Pattern           │
│                   │
│ id: concurrency   │
└────────┬──────────┘
         │
         │ has many (1:N)
         │
         ▼
┌───────────────────┐      fulfills (N:M)     ┌───────────────────┐
│ Job               │◄────────────────────────│ Effect Pattern    │
│                   │                          │                   │
│ "Run in parallel" │                          │ concurrency-      │
│                   │                          │ hello-world.mdx   │
└───────────────────┘                          └───────────────────┘
```

### Relationship Summary

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| Application Pattern → Job | 1:N | Each AP has many jobs |
| Application Pattern → Effect Pattern | 1:N | Each AP has many patterns |
| Job → Effect Pattern | N:M | Jobs can be fulfilled by multiple patterns |

---

## Current Inventory

### Application Patterns

| ID | Name | Patterns | Beginner | Jobs Doc |
|----|------|----------|----------|----------|
| `getting-started` | Getting Started | 6 | 6 | ✓ |
| `core-concepts` | Core Concepts | 55 | 29 | ✓ |
| `error-management` | Error Management | 19 | 4 | ✓ |
| `resource-management` | Resource Management | 8 | 1 | ✓ |
| `concurrency` | Concurrency | 24 | 4 | ✓ |
| `streams` | Streams | 18 | 5 | ✓ |
| `schema` | Schema | 77 | 34 | ✓ |
| `platform` | Platform | 8 | 4 | ✓ |
| `scheduling` | Scheduling | 6 | 2 | ✓ |
| `domain-modeling` | Domain Modeling | 15 | 3 | ✓ |
| `building-apis` | Building APIs | 13 | 4 | ✓ |
| `building-data-pipelines` | Building Data Pipelines | 14 | 3 | ✓ |
| `making-http-requests` | Making HTTP Requests | 10 | 2 | ✓ |
| `testing` | Testing | 10 | 2 | ✓ |
| `observability` | Observability | 13 | 2 | ✓ |
| `tooling-and-debugging` | Tooling and Debugging | 8 | 2 | ✓ |
| **Total** | | **304** | **107** | |

### Jobs Coverage ✅

All 16 Application Patterns now have **100% job coverage**:

| Application Pattern | Total Jobs | Covered | Gaps |
|---------------------|------------|---------|------|
| Getting Started | 9 | 9 | 0 |
| Core Concepts | 37 | 37 | 0 |
| Error Management | 18 | 18 | 0 |
| Resource Management | 11 | 11 | 0 |
| Concurrency | 22 | 22 | 0 |
| Streams | 24 | 24 | 0 |
| Schema | 40 | 40 | 0 |
| Platform | 10 | 10 | 0 |
| Scheduling | 10 | 10 | 0 |
| Domain Modeling | 17 | 17 | 0 |
| Building APIs | 14 | 14 | 0 |
| Building Data Pipelines | 14 | 14 | 0 |
| Making HTTP Requests | 14 | 14 | 0 |
| Testing | 13 | 13 | 0 |
| Observability | 17 | 17 | 0 |
| Tooling and Debugging | 14 | 14 | 0 |
| **Total** | **274** | **274** | **0** |

### Beginner Coverage ✅

All 16 Application Patterns now have beginner entry points:

| Application Pattern | Beginner Patterns |
|---------------------|-------------------|
| Getting Started | 6 |
| Core Concepts | 29 |
| Schema | 34 |
| Error Management | 4 |
| Concurrency | 4 |
| Streams | 5 |
| Platform | 4 |
| Building APIs | 4 |
| Building Data Pipelines | 3 |
| Domain Modeling | 3 |
| Scheduling | 2 |
| Testing | 2 |
| Observability | 2 |
| Making HTTP Requests | 2 |
| Tooling and Debugging | 2 |
| Resource Management | 1 |

---

## Data Storage

### Primary: PostgreSQL Database

All pattern metadata is stored in PostgreSQL using Drizzle ORM:

- **Application Patterns**: `application_patterns` table
- **Effect Patterns**: `effect_patterns` table
- **Jobs**: `jobs` table
- **Relationships**: `pattern_jobs` and `pattern_relations` tables

The database is the **primary source of truth** for all pattern metadata, relationships, and search functionality.

### Legacy Files (Migration Sources)

These files are maintained for reference and initial migration:

```
Effect Patterns Repository
│
├── data/
│   ├── application-patterns.json        # Legacy: Used for initial migration
│   └── patterns-index.json              # Legacy: Used for initial migration
│
├── docs/
│   ├── DATA_MODEL.md                    # This file
│   ├── GETTING_STARTED_JOBS_TO_BE_DONE.md  # Legacy: Used for initial migration
│   ├── CORE_CONCEPTS_JOBS_TO_BE_DONE.md
│   └── ... (other job files)
│
└── (No published pattern files - all content stored in database)
```

### Content Storage

All pattern content (markdown, code examples, sections like "Good Example", "Anti-Pattern", "Rationale") is stored in the PostgreSQL database `content` field of the `effect_patterns` table. The database is the single source of truth for both metadata and content.

---

## Database Schema

The database schema is defined using Drizzle ORM in `packages/toolkit/src/db/schema/index.ts`.

### Application Patterns Table

```typescript
interface ApplicationPattern {
  id: string              // UUID primary key
  slug: string           // Unique identifier (kebab-case)
  name: string
  description: string
  learningOrder: number
  effectModule?: string
  subPatterns: string[] // JSONB array
  createdAt: Date
  updatedAt: Date
}
```

### Effect Patterns Table

```typescript
interface EffectPattern {
  id: string              // UUID primary key
  slug: string           // Unique identifier
  title: string
  summary: string
  skillLevel: "beginner" | "intermediate" | "advanced"
  category?: string
  difficulty?: string
  tags: string[]         // JSONB array
  examples: CodeExample[] // JSONB array
  useCases: string[]     // JSONB array
  rule?: PatternRule     // JSONB object
  content?: string       // Full MDX content
  author?: string
  lessonOrder?: number
  applicationPatternId?: string // FK to application_patterns
  createdAt: Date
  updatedAt: Date
}
```

### Jobs Table

```typescript
interface Job {
  id: string              // UUID primary key
  slug: string           // Unique identifier
  description: string
  category?: string
  status: "covered" | "partial" | "gap"
  applicationPatternId?: string // FK to application_patterns
  createdAt: Date
  updatedAt: Date
}
```

### Relationship Tables

- **pattern_jobs**: Many-to-many relationship between patterns and jobs
- **pattern_relations**: Self-referential many-to-many for related patterns

## Accessing Data

### Using the Toolkit

```typescript
import { createDatabase, createEffectPatternRepository } from "@effect-patterns/toolkit"

const { db, close } = createDatabase()
const repo = createEffectPatternRepository(db)

// Search patterns
const patterns = await repo.search({ query: "retry", skillLevel: "intermediate" })

// Get pattern by slug
const pattern = await repo.findBySlug("concurrency-hello-world")

await close()
```

### Using Effect Services

```typescript
import { Effect } from "effect"
import { DatabaseLayer, searchEffectPatterns } from "@effect-patterns/toolkit"

const program = Effect.gen(function* () {
  const patterns = yield* searchEffectPatterns({ query: "error" })
  return patterns
})

const result = await program.pipe(
  Effect.provide(DatabaseLayer),
  Effect.runPromise
)
```

---

## Database Migration

The project migrated from file-based storage to PostgreSQL in December 2024. The migration:

1. **Preserves all data** - All patterns, jobs, and application patterns are migrated
2. **Maintains compatibility** - Legacy file-based functions still work but are deprecated
3. **Enables new features** - Full-text search, complex queries, relationships

### Migration Process

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Push schema
bun run db:push

# 3. Migrate data
bun run db:migrate

# 4. Verify
bun run db:verify
```

See [MIGRATION_TESTING.md](./MIGRATION_TESTING.md) for detailed migration guide.

## Future Considerations

1. ✅ **Database Storage** - Migrated to PostgreSQL (December 2024)
2. ✅ **Structured Jobs** - Jobs now stored in database
3. ✅ **API** - MCP server uses database for pattern access
4. **Validation** - Add Effect.Schema validation for database inserts
5. **Coverage Reports** - Auto-calculate job coverage from database queries
6. **Learning Paths** - Define ordered sequences through Application Patterns
7. **Full-text Search** - Enhance search with PostgreSQL full-text search capabilities
8. **Caching Layer** - Add Redis caching for frequently accessed patterns
