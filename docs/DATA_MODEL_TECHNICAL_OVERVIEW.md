# Effect Patterns Data Model - Technical Overview

## Executive Summary

The Effect Patterns knowledge base implements a three-tier hierarchical data model that connects high-level application patterns to concrete code examples through an intermediate "Jobs-to-be-Done" layer. This architecture enables systematic coverage tracking, learning path generation, and automated content discovery while maintaining a clear separation between conceptual organization and implementation details.

---

## Architecture Overview

### Core Design Philosophy

The data model follows a **"What → Why → How"** hierarchy:

```
Application Pattern  ──►  Job  ──►  Effect Pattern
     (what)              (why)         (how)
```

This structure enables:
- **Systematic gap analysis**: Identify missing patterns by comparing jobs to implementations
- **Learning path generation**: Order patterns by skill level and dependencies
- **Content discovery**: Navigate from problem statements to solutions
- **Coverage metrics**: Track completeness across application domains

### Entity Relationship Diagram

```
┌─────────────────────────────┐
│   Application Pattern        │
│                             │
│ • id: string (PK)           │
│ • name: string              │
│ • description: string       │
│ • learningOrder: number     │
│ • effectModule?: string     │
│ • subPatterns: string[]     │
└──────────┬──────────────────┘
           │
           │ 1:N (has many)
           │
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   Job                │    │   Effect Pattern          │
│                      │    │                          │
│ • id: string (PK)    │    │ • id: string (PK)        │
│ • description: string│    │ • title: string          │
│ • applicationPattern │    │ • applicationPatternId   │
│   Id: string (FK)    │    │   : string (FK)          │
│ • category?: string  │    │ • skillLevel: enum       │
│ • status: enum       │    │ • summary: string        │
│ • fulfilledBy:       │    │ • tags: string[]         │
│   string[] (FK)      │    │ • rule?: object          │
└──────────┬───────────┘    │ • related: string[]      │
           │                │ • path: string           │
           │                └──────────────────────────┘
           │
           │ N:M (fulfills)
           │
           └─────────────────┘
```

---

## Entity Specifications

### 1. Application Pattern

**Purpose**: High-level domain classification representing a coherent approach to solving a class of problems with Effect.

**Storage**: `data/application-patterns.json` (centralized JSON index)

**Schema**:

```typescript
interface ApplicationPattern {
  // Primary identifier (kebab-case, URL-safe)
  id: string
  
  // Human-readable display name
  name: string
  
  // Brief description of the pattern domain
  description: string
  
  // Suggested learning sequence (1 = first, 16 = last)
  // Enables ordered navigation and curriculum generation
  learningOrder: number
  
  // Primary Effect module used (Effect, Schema, Stream, etc.)
  // Used for module-specific filtering and organization
  effectModule?: string
  
  // Sub-directory names within the pattern's content directory
  // Enables hierarchical organization (e.g., "getting-started", "coordination")
  subPatterns: string[]
}
```

**Key Design Decisions**:

1. **Centralized Index**: All Application Patterns defined in a single JSON file for:
   - Single source of truth
   - Easy validation
   - Programmatic access
   - Version control visibility

2. **Learning Order**: Numeric ordering enables:
   - Curriculum generation
   - Progressive disclosure
   - Dependency tracking
   - Navigation recommendations

3. **Sub-Patterns**: Directory-based organization allows:
   - Logical grouping within domains
   - URL-friendly structure
   - File system alignment
   - Hierarchical navigation

**Example**:

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

**Current Inventory**: 16 Application Patterns covering domains from "Getting Started" to "Tooling and Debugging"

---

### 2. Job (Jobs-to-be-Done)

**Purpose**: Represents a specific developer need or task within an Application Pattern domain.

**Storage**: `docs/*_JOBS_TO_BE_DONE.md` (one file per Application Pattern)

**Schema** (conceptual - currently in markdown, future: structured YAML/JSON):

```typescript
interface Job {
  // Unique identifier (format: {applicationPatternId}-{descriptive-name})
  id: string
  
  // Human-readable description of what the developer needs to accomplish
  description: string
  
  // Foreign key to Application Pattern
  applicationPatternId: string
  
  // Optional grouping within the Application Pattern
  // Often corresponds to subPatterns (e.g., "getting-started")
  category?: string
  
  // Coverage status
  // - "covered": Fully addressed by existing patterns
  // - "partial": Partially addressed, needs improvement
  // - "gap": Not addressed, needs new pattern
  status: "covered" | "partial" | "gap"
  
  // Array of Effect Pattern IDs that fulfill this job
  // Enables many-to-many relationship (one job can be fulfilled by multiple patterns)
  fulfilledBy: string[]
}
```

**Key Design Decisions**:

1. **Markdown Format (Current)**: 
   - Human-readable for contributors
   - Easy to review in PRs
   - No parsing overhead for manual updates
   - **Future**: Migrate to structured YAML/JSON for programmatic access

2. **Status Tracking**: Three-state system enables:
   - Gap analysis automation
   - Coverage reporting
   - Prioritization of new patterns
   - Progress tracking

3. **Many-to-Many Relationship**: Jobs can be fulfilled by multiple patterns because:
   - Different skill levels may address the same job
   - Multiple approaches may exist
   - Patterns may partially fulfill a job
   - Enables comprehensive coverage

**Example** (from `CONCURRENCY_JOBS_TO_BE_DONE.md`):

```markdown
## 1. Getting Started with Concurrency ✅ COMPLETE

### Jobs:
- [x] Run effects in parallel (Effect.all)
- [x] Understand what a Fiber is
- [x] Race effects and handle timeouts
- [x] Fork background work

### Patterns (4 beginner):
- `concurrency-hello-world` - Your First Parallel Operation
- `concurrency-understanding-fibers` - Understanding Fibers
- `concurrency-fork-basics` - Fork Background Work
- `concurrency-race-timeout` - Race Effects and Handle Timeouts
```

**Current Coverage**: 274 total jobs across 16 Application Patterns
- 227 covered (83%)
- 28 gaps (10%)
- 19 partial (7%)

---

### 3. Effect Pattern

**Purpose**: Concrete, executable code example demonstrating how to accomplish a job using Effect.

**Storage**: `content/published/patterns/{applicationPatternId}/{subPattern?}/{pattern-id}.mdx`

**Schema** (embedded in MDX frontmatter):

```typescript
interface EffectPattern {
  // Unique identifier (kebab-case, matches filename)
  id: string
  
  // Human-readable title
  title: string
  
  // Foreign key to Application Pattern
  // Derived from directory structure, validated against Application Pattern index
  applicationPatternId: string
  
  // Skill level classification
  // - "beginner": Entry point, minimal prerequisites
  // - "intermediate": Requires understanding of core concepts
  // - "advanced": Complex scenarios, requires deep knowledge
  skillLevel: "beginner" | "intermediate" | "advanced"
  
  // Brief description (used in listings, search results)
  summary: string
  
  // Searchable keywords and topics
  tags: string[]
  
  // Actionable guideline/rule extracted from the pattern
  // Used for AI coding assistant rules generation
  rule?: {
    description: string
  }
  
  // Related pattern IDs (for navigation and discovery)
  related?: string[]
  
  // Pattern author/contributor
  author?: string
  
  // File system path (derived, not stored in frontmatter)
  path: string
}
```

**Key Design Decisions**:

1. **MDX Format**: 
   - Combines markdown content with frontmatter metadata
   - Enables rich content (code blocks, examples)
   - Supports React components if needed
   - Standard format for documentation sites

2. **Directory-Based Organization**:
   - File system structure mirrors Application Pattern hierarchy
   - Enables intuitive navigation
   - Supports sub-pattern grouping
   - URL-friendly paths

3. **Skill Level Classification**:
   - Enables progressive learning paths
   - Filters for different audiences
   - Beginner patterns serve as entry points
   - **Current**: All 16 Application Patterns have beginner patterns

4. **Rule Extraction**:
   - Actionable guidelines extracted from patterns
   - Used for AI coding assistant rules
   - Enables automated code generation guidance
   - Links patterns to executable rules

**Example** (from `concurrency-hello-world.mdx`):

```yaml
---
title: Your First Parallel Operation
id: concurrency-hello-world
skillLevel: beginner
applicationPatternId: concurrency-getting-started
summary: >-
  Run multiple effects in parallel with Effect.all and understand when to use parallel vs sequential execution.
tags:
  - concurrency
  - parallel
  - effect-all
  - getting-started
rule:
  description: Use Effect.all with concurrency option to run independent effects in parallel.
author: PaulJPhilp
related:
  - concurrency-understanding-fibers
  - concurrency-race-timeout
---
```

**Current Inventory**: 276 total patterns
- 107 beginner (39%)
- 169 intermediate/advanced (61%)

---

## Data Flow and Processing

### 1. Content Discovery Pipeline

```
┌─────────────────────┐
│ File System         │
│ (MDX files)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Pattern Parser      │
│ (gray-matter)       │
│ • Extract frontmatter│
│ • Validate schema   │
│ • Derive metadata   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Application Pattern │
│ Index Loader        │
│ (application-       │
│  patterns.json)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Pattern Registry    │
│ • Group by AP        │
│ • Index by ID        │
│ • Build relationships│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Output Generation   │
│ • README.md          │
│ • Coverage reports   │
│ • API endpoints      │
└─────────────────────┘
```

**Implementation**: `scripts/publish/generate.ts`

**Key Operations**:
1. **Recursive File Discovery**: Traverse `content/published/patterns/` directory tree
2. **Frontmatter Parsing**: Extract YAML metadata using `gray-matter`
3. **Application Pattern Matching**: Match directory structure to Application Pattern IDs
4. **Validation**: Ensure `applicationPatternId` exists in index
5. **Aggregation**: Group patterns by Application Pattern, skill level, sub-pattern
6. **Output Generation**: Generate README, reports, indexes

### 2. Relationship Resolution

**Application Pattern → Effect Pattern**:
- **Resolution**: Directory structure (`content/published/patterns/{apId}/`)
- **Cardinality**: 1:N (one Application Pattern has many Effect Patterns)
- **Validation**: Pattern's `applicationPatternId` must exist in Application Pattern index

**Application Pattern → Job**:
- **Resolution**: File naming convention (`docs/{AP_ID}_JOBS_TO_BE_DONE.md`)
- **Cardinality**: 1:N (one Application Pattern has many Jobs)
- **Validation**: Job's `applicationPatternId` must match Application Pattern ID

**Job → Effect Pattern**:
- **Resolution**: `fulfilledBy` array in Job definition
- **Cardinality**: N:M (many-to-many)
- **Validation**: Pattern IDs in `fulfilledBy` must exist in pattern registry

### 3. Coverage Calculation

**Algorithm**:

```typescript
function calculateCoverage(jobs: Job[], patterns: EffectPattern[]): CoverageReport {
  const byStatus = {
    covered: jobs.filter(j => j.status === "covered"),
    partial: jobs.filter(j => j.status === "partial"),
    gap: jobs.filter(j => j.status === "gap")
  }
  
  const byApplicationPattern = groupBy(jobs, j => j.applicationPatternId)
  
  return {
    total: jobs.length,
    covered: byStatus.covered.length,
    partial: byStatus.partial.length,
    gaps: byStatus.gap.length,
    byApplicationPattern: Object.entries(byApplicationPattern).map(([apId, jobs]) => ({
      applicationPatternId: apId,
      total: jobs.length,
      covered: jobs.filter(j => j.status === "covered").length,
      gaps: jobs.filter(j => j.status === "gap").length
    }))
  }
}
```

**Current Metrics**:
- **Overall Coverage**: 83% (227/274 jobs covered)
- **Beginner Coverage**: 100% (all 16 Application Patterns have beginner entry points)
- **Gap Analysis**: 28 identified gaps across 8 Application Patterns

---

## Type System and Validation

### Current State

**Application Patterns**: 
- ✅ Validated JSON schema (implicit via TypeScript interface)
- ✅ Loaded and parsed in `generate.ts`
- ✅ Validated at runtime during README generation

**Effect Patterns**:
- ⚠️ Frontmatter parsed but not validated against schema
- ⚠️ No type checking for required fields
- ⚠️ No validation of `applicationPatternId` against index
- ⚠️ No validation of `related` pattern IDs

**Jobs**:
- ⚠️ Currently in markdown format (unstructured)
- ⚠️ No programmatic validation
- ⚠️ Manual status tracking

### Future Validation Strategy

**Recommended**: Use Effect.Schema for runtime validation

```typescript
import { Schema } from "effect"

const ApplicationPatternSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  learningOrder: Schema.Number,
  effectModule: Schema.optional(Schema.String),
  subPatterns: Schema.Array(Schema.String)
})

const EffectPatternFrontmatterSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  applicationPatternId: Schema.String,
  skillLevel: Schema.Literal("beginner", "intermediate", "advanced"),
  summary: Schema.String,
  tags: Schema.Array(Schema.String),
  rule: Schema.optional(Schema.Struct({
    description: Schema.String
  })),
  related: Schema.optional(Schema.Array(Schema.String)),
  author: Schema.optional(Schema.String)
})

// Validation pipeline
const validatePattern = (frontmatter: unknown) =>
  Schema.decodeUnknown(EffectPatternFrontmatterSchema)(frontmatter)
```

---

## File System Organization

### Directory Structure

```
Effect-Patterns/
├── data/
│   └── application-patterns.json          # Application Pattern index
│
├── docs/
│   ├── DATA_MODEL.md                       # Conceptual documentation
│   ├── DATA_MODEL_TECHNICAL_OVERVIEW.md    # This document
│   ├── {AP_ID}_JOBS_TO_BE_DONE.md         # Job definitions (16 files)
│   └── ...
│
├── content/published/patterns/
│   ├── getting-started/                    # AP: getting-started
│   │   └── *.mdx                           # Effect Patterns
│   ├── core-concepts/                      # AP: core-concepts
│   │   └── *.mdx
│   ├── concurrency/                        # AP: concurrency
│   │   ├── getting-started/               # Sub-pattern
│   │   │   └── *.mdx
│   │   ├── coordination/                  # Sub-pattern
│   │   │   └── *.mdx
│   │   └── state/                         # Sub-pattern
│   │       └── *.mdx
│   └── ...
│
└── scripts/publish/
    └── generate.ts                         # Content discovery & generation
```

### Naming Conventions

**Application Pattern IDs**: 
- Format: `kebab-case`
- Examples: `getting-started`, `core-concepts`, `error-management`

**Effect Pattern IDs**:
- Format: `{applicationPatternId}-{descriptive-name}`
- Examples: `concurrency-hello-world`, `schema-validate-object`

**Job IDs**:
- Format: `{applicationPatternId}-{descriptive-name}`
- Examples: `concurrency-parallel-execution`, `schema-validate-primitive`

**File Names**:
- Effect Patterns: `{pattern-id}.mdx`
- Jobs: `{AP_ID}_JOBS_TO_BE_DONE.md`

---

## Integration Points

### 1. README Generation

**Script**: `scripts/publish/generate.ts`

**Process**:
1. Load Application Pattern index
2. Discover all MDX files recursively
3. Parse frontmatter from each file
4. Group patterns by Application Pattern
5. Sort by learning order and skill level
6. Generate markdown tables
7. Write to `README.md`

**Output**: Auto-generated README with:
- Table of contents
- Application Pattern sections
- Pattern listings with skill levels
- Sub-pattern groupings

### 2. Coverage Reporting

**Current**: Manual tracking in `*_JOBS_TO_BE_DONE.md` files

**Future**: Automated coverage calculation:
- Parse Job definitions
- Match `fulfilledBy` arrays to pattern registry
- Calculate coverage percentages
- Generate coverage reports
- Identify gaps automatically

### 3. API Endpoints (Future)

**Proposed Structure**:

```typescript
GET /api/application-patterns
  → List all Application Patterns (ordered by learningOrder)

GET /api/application-patterns/:id
  → Get Application Pattern details + related patterns

GET /api/patterns
  → List all Effect Patterns (with filters: skillLevel, applicationPatternId, tags)

GET /api/patterns/:id
  → Get Effect Pattern details + related patterns

GET /api/jobs
  → List all Jobs (with filters: applicationPatternId, status)

GET /api/coverage
  → Get coverage metrics by Application Pattern
```

---

## Design Patterns and Principles

### 1. Single Source of Truth

- **Application Patterns**: Centralized in `application-patterns.json`
- **Effect Patterns**: File system is source of truth
- **Jobs**: Markdown files are source of truth (future: structured format)

### 2. Convention over Configuration

- Directory structure determines Application Pattern membership
- File naming determines pattern IDs
- Sub-directories determine sub-patterns

### 3. Progressive Enhancement

- Basic structure: File system + frontmatter
- Enhanced: Application Pattern index for validation
- Future: Schema validation, API layer, structured Jobs

### 4. Separation of Concerns

- **Content**: MDX files (human-authored)
- **Metadata**: Frontmatter (structured data)
- **Organization**: Application Pattern index (curation)
- **Discovery**: Generation scripts (automation)

---

## Current Limitations and Future Improvements

### Limitations

1. **Jobs Format**: Markdown format limits programmatic access
2. **Validation**: No schema validation for frontmatter
3. **Coverage**: Manual tracking, prone to drift
4. **Relationships**: No explicit foreign key validation
5. **Search**: No full-text search capability
6. **API**: No programmatic access layer

### Planned Improvements

1. **Structured Jobs**: Convert to YAML/JSON format
2. **Schema Validation**: Add Effect.Schema validation pipeline
3. **Automated Coverage**: Calculate coverage from pattern metadata
4. **Relationship Validation**: Validate foreign keys at build time
5. **Search Index**: Build searchable index from patterns
6. **REST API**: Expose data model via API endpoints
7. **GraphQL API**: Enable flexible queries and relationships
8. **Learning Paths**: Define ordered sequences through patterns

---

## Metrics and Statistics

### Current State (as of latest generation)

**Application Patterns**: 16 total
- Ordered from 1 (Getting Started) to 16 (Tooling and Debugging)
- All have beginner entry points
- Cover all major Effect modules

**Effect Patterns**: 276 total
- 107 beginner (39%)
- 169 intermediate/advanced (61%)
- Distributed across 16 Application Patterns

**Jobs**: 274 total
- 227 covered (83%)
- 19 partial (7%)
- 28 gaps (10%)

**Coverage by Application Pattern**:
- 8 Application Patterns: 100% coverage
- 8 Application Patterns: Partial coverage (gaps identified)

---

## Conclusion

The Effect Patterns data model provides a robust foundation for organizing, discovering, and tracking code patterns. The three-tier hierarchy (Application Pattern → Job → Effect Pattern) enables systematic coverage analysis while maintaining flexibility for content evolution.

The current implementation balances human readability (markdown, frontmatter) with programmatic access (JSON index, generation scripts), enabling both manual curation and automated tooling.

Future enhancements will focus on:
1. Structured data formats for better programmatic access
2. Schema validation for data integrity
3. Automated coverage tracking
4. API layer for external integration
5. Advanced discovery and search capabilities

This architecture supports the project's goal of being a "living document" that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.
