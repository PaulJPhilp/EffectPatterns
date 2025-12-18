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

**Source:** `data/application-patterns.json`

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

**Source:** `docs/*_JOBS_TO_BE_DONE.md` files

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
| `path` | string | ✓ | File path to .mdx file |

**Source:** `.mdx` files in `content/published/patterns/`

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
path: content/published/patterns/concurrency/getting-started/concurrency-hello-world.mdx
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
| `getting-started` | Getting Started | 6 | 6 | |
| `core-concepts` | Core Concepts | 55 | 29 | |
| `error-management` | Error Management | 18 | 3 | |
| `resource-management` | Resource Management | 5 | 1 | |
| `concurrency` | Concurrency | 24 | 4 | ✓ |
| `streams` | Streams | 18 | 5 | ✓ |
| `schema` | Schema | 77 | 34 | ✓ |
| `platform` | Platform | 8 | 4 | ✓ |
| `scheduling` | Scheduling | 4 | 0 | |
| `domain-modeling` | Domain Modeling | 12 | 0 | |
| `building-apis` | Building APIs | 8 | 4 | |
| `building-data-pipelines` | Building Data Pipelines | 10 | 3 | |
| `making-http-requests` | Making HTTP Requests | 3 | 0 | |
| `testing` | Testing | 5 | 0 | |
| `observability` | Observability | 7 | 0 | |
| `tooling-and-debugging` | Tooling and Debugging | 2 | 0 | |
| **Total** | | **262** | **93** | |

### Jobs Coverage

| Application Pattern | Total Jobs | Covered | Gaps |
|---------------------|------------|---------|------|
| Schema | 40 | 40 | 0 |
| Streams | 24 | 24 | 0 |
| Concurrency | 22 | 22 | 0 |
| Platform | 10 | 10 | 0 |
| *Others* | TBD | TBD | TBD |

### Beginner Coverage Gaps

| Application Pattern | Patterns | Beginner | Status |
|---------------------|----------|----------|--------|
| Domain Modeling | 12 | 0 | ❌ Needs work |
| Testing | 5 | 0 | ❌ Needs work |
| Scheduling | 4 | 0 | ❌ Needs work |
| Observability | 7 | 0 | ❌ Needs work |
| Making HTTP Requests | 3 | 0 | ❌ Needs work |
| Tooling and Debugging | 2 | 0 | ❌ Needs work |

---

## File Structure

```
Effect Patterns Repository
│
├── data/
│   └── application-patterns.json        # Application Pattern definitions
│
├── docs/
│   ├── DATA_MODEL.md                    # This file
│   ├── SCHEMA_JOBS_TO_BE_DONE.md       # Jobs for Schema AP
│   ├── STREAMS_JOBS_TO_BE_DONE.md      # Jobs for Streams AP
│   ├── CONCURRENCY_JOBS_TO_BE_DONE.md  # Jobs for Concurrency AP
│   └── PLATFORM_JOBS_TO_BE_DONE.md     # Jobs for Platform AP
│
└── content/published/patterns/
    ├── getting-started/                 # (6 patterns)
    ├── core-concepts/                   # (55 patterns)
    ├── error-management/                # (18 patterns)
    ├── resource-management/             # (5 patterns)
    ├── concurrency/                     # (24 patterns)
    │   └── getting-started/
    ├── streams/                         # (18 patterns)
    │   ├── getting-started/
    │   └── sinks/
    ├── schema/                          # (77 patterns)
    │   ├── getting-started/
    │   ├── primitives/
    │   ├── objects/
    │   ├── arrays/
    │   └── ... (16 subdirs)
    ├── platform/                        # (8 patterns)
    │   └── getting-started/
    ├── scheduling/                      # (4 patterns)
    ├── domain-modeling/                 # (12 patterns)
    ├── building-apis/                   # (8 patterns)
    ├── building-data-pipelines/         # (10 patterns)
    ├── making-http-requests/            # (3 patterns)
    ├── testing/                         # (5 patterns)
    ├── observability/                   # (7 patterns)
    └── tooling-and-debugging/           # (2 patterns)
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
  subPatterns: string[]
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
  applicationPatternId: string
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

1. **Structured Jobs** - Convert JTBD markdown docs to structured YAML/JSON
2. **Validation** - Add Effect.Schema validation for pattern frontmatter
3. **Coverage Reports** - Auto-calculate job coverage from pattern metadata
4. **Learning Paths** - Define ordered sequences through Application Patterns
5. **API** - Expose patterns via REST/GraphQL API
