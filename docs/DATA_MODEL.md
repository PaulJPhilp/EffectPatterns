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
| `hasGettingStarted` | boolean | | Whether beginner patterns exist |
| `jobsDocument` | string | | Path to JTBD markdown file |

**Example:**

```yaml
id: concurrency
name: Concurrency
description: Run effects in parallel, manage fibers, coordinate async work
learningOrder: 6
effectModule: Effect
hasGettingStarted: true
jobsDocument: docs/CONCURRENCY_JOBS_TO_BE_DONE.md
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
| `applicationPatternId` | string | ✓ | Parent Application Pattern (via `useCase`) |
| `skillLevel` | enum | ✓ | `beginner` \| `intermediate` \| `advanced` |
| `summary` | string | ✓ | Brief description |
| `tags` | string[] | | Searchable tags |
| `rule` | object | | Actionable guideline |
| `related` | string[] | | IDs of related patterns |
| `author` | string | | Pattern author |
| `path` | string | ✓ | File path to .mdx file |

**Example:**

```yaml
id: concurrency-hello-world
title: Your First Parallel Operation
applicationPatternId: concurrency-getting-started
skillLevel: beginner
summary: Run multiple effects in parallel with Effect.all
tags: [concurrency, parallel, effect-all, getting-started]
rule:
  description: Use Effect.all with concurrency option to run independent effects in parallel
related: [concurrency-understanding-fibers, concurrency-race-timeout]
author: PaulJPhilp
path: content/published/patterns/core/concurrency-hello-world.mdx
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

### Application Patterns (Current)

| ID | Name | Jobs Doc | Effect Patterns | Beginner |
|----|------|----------|-----------------|----------|
| `schema` | Schema Validation | ✓ | 77 | 13 |
| `streams` | Working with Streams | ✓ | 8 | 0 |
| `streams-getting-started` | Streams Getting Started | ✓ | 4 | 4 |
| `streams-sinks` | Stream Sinks | ✓ | 6 | 0 |
| `concurrency` | Concurrency | ✓ | 20 | 0 |
| `concurrency-getting-started` | Concurrency Getting Started | ✓ | 4 | 4 |
| `platform` | Platform Operations | ✓ | 6 | 2 |
| `platform-getting-started` | Platform Getting Started | ✓ | 2 | 2 |
| `core-concepts` | Core Concepts | | 19 | 10 |
| `getting-started` | Getting Started | | 6 | 6 |
| `building-apis` | Building APIs | | 8 | 4 |
| `building-data-pipelines` | Building Data Pipelines | | 10 | 3 |
| `domain-modeling` | Domain Modeling | | 10 | 0 |
| `error-management` | Error Management | | 8 | 0 |
| `testing` | Testing | | 5 | 0 |
| `resource-management` | Resource Management | | 5 | 1 |

### Jobs Coverage

| Application Pattern | Total Jobs | Covered | Gaps |
|---------------------|------------|---------|------|
| Schema | 40 | 40 | 0 |
| Streams | 24 | 24 | 0 |
| Concurrency | 22 | 22 | 0 |
| Platform | 10 | 10 | 0 |
| *Others* | TBD | TBD | TBD |

### Effect Patterns by Skill Level

| Skill Level | Count | Percentage |
|-------------|-------|------------|
| Beginner | ~50 | ~19% |
| Intermediate | ~120 | ~46% |
| Advanced | ~50 | ~19% |
| Unknown | ~42 | ~16% |
| **Total** | **262** | 100% |

---

## File Structure Mapping

```
Effect Patterns Repository
│
├── docs/
│   ├── DATA_MODEL.md                    # This file
│   ├── SCHEMA_JOBS_TO_BE_DONE.md       # Jobs for Schema AP
│   ├── STREAMS_JOBS_TO_BE_DONE.md      # Jobs for Streams AP
│   ├── CONCURRENCY_JOBS_TO_BE_DONE.md  # Jobs for Concurrency AP
│   └── PLATFORM_JOBS_TO_BE_DONE.md     # Jobs for Platform AP
│
├── content/published/patterns/
│   ├── core/                            # Effect Patterns (core module)
│   │   ├── concurrency-hello-world.mdx
│   │   ├── stream-hello-world.mdx
│   │   └── ...
│   │
│   └── schema/                          # Effect Patterns (Schema module)
│       ├── getting-started/
│       ├── primitives/
│       └── ...
│
└── data/
    └── patterns-index.json              # Generated index
```

---

## Schema (TypeScript)

```typescript
interface ApplicationPattern {
  id: string
  name: string
  description: string
  learningOrder: number
  effectModule?: string
  hasGettingStarted: boolean
  jobsDocument?: string
}

interface Job {
  id: string
  description: string
  applicationPatternId: string
  category?: string
  status: "covered" | "partial" | "gap"
  fulfilledBy: string[]
}

interface EffectPattern {
  id: string
  title: string
  applicationPatternId: string  // maps to useCase in frontmatter
  skillLevel: "beginner" | "intermediate" | "advanced"
  summary: string
  tags: string[]
  rule?: { description: string }
  related?: string[]
  author?: string
  path: string
}
```

---

## Future Considerations

1. **Structured Data Files** - Consider moving from markdown JTBD docs to structured YAML/JSON
2. **Validation** - Add schema validation for pattern frontmatter
3. **Generated Index** - Auto-generate `data/application-patterns.json` from patterns
4. **Coverage Reports** - Auto-calculate job coverage from pattern metadata
5. **Learning Paths** - Define ordered sequences through Application Patterns

