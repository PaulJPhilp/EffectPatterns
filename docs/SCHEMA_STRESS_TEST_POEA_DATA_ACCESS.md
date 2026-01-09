# Schema Stress Test: PoEAA Data Access Patterns
## Validating the Unified Pattern Schema with Enterprise Concerns

**Date**: December 2025  
**Purpose**: Stress-test the new unified Pattern schema by mapping PoEAA's Data Source Architectural Patterns to Effect-native implementations.

---

## Executive Summary

This document prototypes how PoEAA (Patterns of Enterprise Application Architecture) patterns map into our unified Pattern schema, specifically focusing on **Data Access** patterns where OOP and FP paradigms collide most dramatically.

**Key Findings**:
- ✅ Schema handles PoEAA patterns elegantly via `sources` array
- ✅ Cross-pattern relationships work via `prerequisites` and `related_pattern_ids`
- ⚠️ Need `comparison` field for side-by-side OOP vs Effect comparisons
- ✅ Type enforcement (`Database`) correctly categorizes these patterns
- ✅ Jobs-to-be-Done structure accommodates enterprise concerns

---

## 1. Prototype: Repository Pattern

### 1.1 Pattern Entity (Database Schema)

```typescript
{
  // Primary Identity
  id: "data-access-repository",
  version: "1.0.0",
  
  // Classification
  type: "Database",                    // ✅ Enforced singular type
  sources: ["PoEAA:Repository", "Effect-SQL", "Effect.Service"],  // ✅ Multiple sources
  
  // Core Metadata
  title: "Repository Pattern with Effect Services",
  summary: "Decouple domain logic from data access using Effect.Service and Sql.Client, enabling testability and dependency injection.",
  description: "The Repository pattern provides a clean abstraction over data access, allowing business logic to work with domain objects rather than database queries. In Effect, we implement this using Effect.Service for the interface and Sql.Client for the implementation.",
  
  // Skill & Learning
  skillLevel: "intermediate",
  learningOrder: 1,                   // Within "data-access" Application Pattern
  
  // Organization
  applicationPatternId: "data-access", // FK (new Application Pattern)
  category: "abstraction",
  
  // Content
  content: "...",                      // Full MDX content (stored in database)
  // Note: contentPath no longer used - content is stored in database
  
  // Code & Rules
  codeExamples: [
    {
      id: "repository-service-definition",
      language: "typescript",
      code: "export class UserRepository extends Effect.Service<UserRepository>()(...)",
      description: "Define repository as Effect.Service"
    },
    {
      id: "repository-live-implementation",
      language: "typescript",
      code: "const UserRepositoryLive = UserRepository.pipe(Effect.provide(SqlClient.layer))",
      description: "Provide Live implementation with Sql.Client"
    },
    {
      id: "repository-test-implementation",
      language: "typescript",
      code: "const UserRepositoryTest = Layer.succeed(UserRepository, mockRepository)",
      description: "Test implementation for unit tests"
    }
  ],
  rule: {
    description: "Use Effect.Service to define repository interfaces and provide Live implementations using Sql.Client. Create Test layers for unit testing.",
    category: "data-access",
    effectVersions: ["3.x", "4.x"]
  },
  
  // Relationships
  tags: ["repository", "data-access", "sql", "service", "dependency-injection", "testing"],
  relatedPatternIds: [
    "data-access-unit-of-work",      // Related pattern
    "data-access-data-mapper",       // Related pattern
    "core-concepts-service-layer"    // Prerequisite concept
  ],
  prerequisites: [
    "core-concepts-service-layer",   // Must understand Effect.Service first
    "core-concepts-dependency-injection"
  ],
  
  // Version & Compatibility
  effectVersions: ["3.x", "4.x"],
  deprecated: false,
  
  // Metadata
  author: "PaulJPhilp",
  contributors: [],
  createdAt: "2025-12-20T00:00:00Z",
  updatedAt: "2025-12-20T00:00:00Z",
  
  // Comparison (NEW - for side-by-side OOP vs Effect)
  comparison: {
    oopApproach: {
      source: "PoEAA:Repository",
      description: "In OOP, Repository is typically an interface with CRUD methods, implemented by concrete classes that interact with the database.",
      example: `
interface UserRepository {
  findById(id: number): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: number): Promise<void>;
}

class SqlUserRepository implements UserRepository {
  constructor(private db: Database) {}
  async findById(id: number) { /* SQL queries */ }
  async save(user: User) { /* SQL INSERT/UPDATE */ }
  async delete(id: number) { /* SQL DELETE */ }
}`
    },
    effectApproach: {
      description: "In Effect, Repository is an Effect.Service that describes the interface. The Live implementation uses Sql.Client, and Test implementations use Layer.succeed for mocking.",
      example: `
export class UserRepository extends Effect.Service<UserRepository>()(
  "UserRepository",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient;
      return {
        findById: (id: number) => sql.query(/* ... */),
        save: (user: User) => sql.query(/* ... */),
        delete: (id: number) => sql.query(/* ... */)
      };
    }),
    dependencies: [SqlClient.Default]
  }
)`
    },
    keyDifferences: [
      "Effect uses Service.Tag for dependency injection instead of constructor injection",
      "Effect composes effects rather than returning Promises",
      "Effect enables testability via Layer composition, not mock frameworks",
      "Effect handles errors in the type system, not exceptions"
    ]
  },
  
  // Analytics
  viewCount: 0,
  searchRank: null
}
```

### 1.2 Database Schema (PostgreSQL)

**New Field Needed**: `comparison` JSONB column

```sql
ALTER TABLE patterns ADD COLUMN comparison JSONB;

-- Index for comparison queries (if needed)
CREATE INDEX idx_patterns_has_comparison ON patterns((comparison IS NOT NULL));
```

**Schema Validation**:
```typescript
const ComparisonSchema = Schema.Struct({
  oopApproach: Schema.Struct({
    source: Schema.String,              // "PoEAA:Repository"
    description: Schema.String,
    example: Schema.String
  }),
  effectApproach: Schema.Struct({
    description: Schema.String,
    example: Schema.String
  }),
  keyDifferences: Schema.Array(Schema.String)
});

const PatternSchema = Schema.Struct({
  // ... existing fields ...
  comparison: Schema.optional(ComparisonSchema)
});
```

---

## 2. Cross-Pattern Relationships: Unit of Work → Scope

### 2.1 The Challenge

**PoEAA Unit of Work** requires understanding **Effect Scope** (a Core Concept pattern). How does our schema handle this cross-type relationship?

### 2.2 Pattern: Unit of Work

```typescript
{
  id: "data-access-unit-of-work",
  type: "Database",                    // ✅ Type: Database (about transactions)
  sources: ["PoEAA:UnitOfWork", "Effect.Scope"],
  
  title: "Transactional Integrity with Scope",
  summary: "Ensure multiple database operations succeed or fail together using Effect.Scope and acquireRelease.",
  
  prerequisites: [
    "resource-management-scope",      // ✅ Cross-type relationship!
    "resource-management-acquire-release",
    "data-access-repository"          // Also needs Repository pattern
  ],
  
  relatedPatternIds: [
    "resource-management-scope",      // ✅ Related to Core Concept
    "data-access-repository",         // Related to Database pattern
    "data-access-identity-map"       // Related Database pattern
  ],
  
  comparison: {
    oopApproach: {
      source: "PoEAA:UnitOfWork",
      description: "In OOP, Unit of Work tracks all changes during a business transaction, then commits them atomically.",
      example: `
class UnitOfWork {
  private changes: Change[] = [];
  
  registerNew(entity: Entity) {
    this.changes.push({ type: 'new', entity });
  }
  
  registerDirty(entity: Entity) {
    this.changes.push({ type: 'dirty', entity });
  }
  
  async commit() {
    // Execute all changes in a transaction
    await db.transaction(async (tx) => {
      for (const change of this.changes) {
        await change.execute(tx);
      }
    });
  }
}`
    },
    effectApproach: {
      description: "In Effect, we compose all operations into a single Effect and use Scope to ensure atomic execution. acquireRelease handles transaction boundaries.",
      example: `
const unitOfWork = Effect.gen(function* () {
  const scope = yield* Scope.make();
  const db = yield* acquireDatabaseConnection(scope);
  
  // All operations composed into single Effect
  yield* Effect.all([
    userRepo.save(user1),
    userRepo.save(user2),
    orderRepo.save(order)
  ], { concurrency: 1 });  // Sequential within transaction
  
  // Scope ensures all-or-nothing: if any fails, all are rolled back
}).pipe(Effect.scoped);`
    },
    keyDifferences: [
      "Effect composes operations, OOP tracks them in mutable state",
      "Effect uses Scope for resource lifecycle, OOP uses explicit commit()",
      "Effect transactions are type-safe, OOP relies on runtime checks",
      "Effect failures propagate automatically, OOP requires try/catch"
    ]
  }
}
```

### 2.3 Relationship Resolution

**Query**: "Find all patterns that require Scope"

```sql
SELECT p.*
FROM patterns p
WHERE 'resource-management-scope' = ANY(p.prerequisites)
   OR 'resource-management-scope' = ANY(p.related_pattern_ids);
```

**Query**: "Find all Database patterns that depend on Core Concept patterns"

```sql
SELECT 
  p.id,
  p.title,
  p.type,
  prereq.id as prerequisite_id,
  prereq.type as prerequisite_type,
  prereq.title as prerequisite_title
FROM patterns p
CROSS JOIN LATERAL unnest(p.prerequisites) AS prereq_id
JOIN patterns prereq ON prereq.id = prereq_id
WHERE p.type = 'Database'
  AND prereq.type = 'Application'  -- Core Concepts are Application type
ORDER BY p.id;
```

**Result**: ✅ Schema handles cross-type relationships elegantly via arrays and joins.

---

## 3. Jobs-to-be-Done for Data Access

### 3.1 Current Structure (Markdown)

**File**: `docs/DATA_ACCESS_JOBS_TO_BE_DONE.md`

```markdown
# Data Access Jobs-to-be-Done

## 1. Repository Pattern ✅ COMPLETE

### Jobs:
- [x] "I need to query the database without coupling my logic to SQL"
- [x] "I need to mock the database for testing"
- [x] "I need to handle database connection pooling"

### Patterns (3 intermediate):
- `data-access-repository` - Repository Pattern with Effect Services
- `data-access-repository-testing` - Testing with Repository Pattern
- `data-access-repository-pooling` - Connection Pooling with Repository

---

## 2. Unit of Work ⚠️ PARTIAL

### Jobs:
- [x] "I need to ensure multiple database writes succeed or fail together"
- [x] "I need to batch database operations"
- [ ] "I need to handle nested transactions"  ← GAP

### Patterns (2 intermediate):
- `data-access-unit-of-work` - Transactional Integrity with Scope
- `data-access-batch-operations` - Batch Database Operations

---

## 3. Data Mapper ✅ COMPLETE

### Jobs:
- [x] "I need to transform raw database rows into domain types"
- [x] "I need to handle nullable columns safely"
- [x] "I need to map relationships (one-to-many, many-to-many)"

### Patterns (3 intermediate):
- `data-access-data-mapper` - Data Mapping with Effect.Schema
- `data-access-nullable-columns` - Handling Nullable Columns
- `data-access-relationships` - Mapping Relationships

---

## 4. Identity Map ⚠️ GAP

### Jobs:
- [ ] "I need to prevent duplicate queries for the same entity"  ← GAP
- [ ] "I need to cache loaded entities during a request"  ← GAP
- [ ] "I need to invalidate cached entities on updates"  ← GAP

### Patterns: None yet

---

## 5. Optimistic Offline Lock ⚠️ GAP

### Jobs:
- [ ] "I need to prevent multiple users from editing the same record"  ← GAP
- [ ] "I need to detect concurrent modifications"  ← GAP
- [ ] "I need to handle version conflicts gracefully"  ← GAP

### Patterns: None yet

---

## Audit Summary

| Category | Jobs | Patterns | Beginner | Status |
|----------|------|----------|----------|--------|
| Repository | 3 | 3 | 0 | ✅ |
| Unit of Work | 3 | 2 | 0 | ⚠️ PARTIAL |
| Data Mapper | 3 | 3 | 0 | ✅ |
| Identity Map | 3 | 0 | 0 | ❌ GAP |
| Optimistic Offline Lock | 3 | 0 | 0 | ❌ GAP |

**Total**: 15 jobs, 8 patterns, 0 beginner patterns
- ✅ Covered: 8 jobs (53%)
- ⚠️ Partial: 2 jobs (13%)
- ❌ Gaps: 5 jobs (33%)
```

### 3.2 Structured Format (Future)

**Database Schema** (from requirements doc):

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  application_pattern_id TEXT NOT NULL REFERENCES application_patterns(id),
  category TEXT,
  status TEXT NOT NULL CHECK (status IN ('covered', 'partial', 'gap')),
  fulfilled_by TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);
```

**Example Jobs**:

```sql
-- Repository Pattern Jobs
INSERT INTO jobs (id, description, application_pattern_id, category, status, fulfilled_by) VALUES
  ('data-access-query-without-sql-coupling', 
   'I need to query the database without coupling my logic to SQL',
   'data-access', 'repository', 'covered', 
   ARRAY['data-access-repository']),
  
  ('data-access-mock-for-testing',
   'I need to mock the database for testing',
   'data-access', 'repository', 'covered',
   ARRAY['data-access-repository', 'data-access-repository-testing']),
  
  ('data-access-connection-pooling',
   'I need to handle database connection pooling',
   'data-access', 'repository', 'covered',
   ARRAY['data-access-repository-pooling']);

-- Unit of Work Jobs
INSERT INTO jobs (id, description, application_pattern_id, category, status, fulfilled_by) VALUES
  ('data-access-atomic-writes',
   'I need to ensure multiple database writes succeed or fail together',
   'data-access', 'unit-of-work', 'covered',
   ARRAY['data-access-unit-of-work']),
  
  ('data-access-batch-operations',
   'I need to batch database operations',
   'data-access', 'unit-of-work', 'covered',
   ARRAY['data-access-batch-operations']),
  
  ('data-access-nested-transactions',
   'I need to handle nested transactions',
   'data-access', 'unit-of-work', 'gap',
   ARRAY[]::TEXT[]);

-- Identity Map Jobs (GAPS)
INSERT INTO jobs (id, description, application_pattern_id, category, status, fulfilled_by) VALUES
  ('data-access-prevent-duplicate-queries',
   'I need to prevent duplicate queries for the same entity',
   'data-access', 'identity-map', 'gap',
   ARRAY[]::TEXT[]),
  
  ('data-access-cache-during-request',
   'I need to cache loaded entities during a request',
   'data-access', 'identity-map', 'gap',
   ARRAY[]::TEXT[]),
  
  ('data-access-invalidate-on-update',
   'I need to invalidate cached entities on updates',
   'data-access', 'identity-map', 'gap',
   ARRAY[]::TEXT[]);
```

**Query**: "Find all gaps in Data Access patterns"

```sql
SELECT 
  j.id,
  j.description,
  j.category,
  ap.name as application_pattern
FROM jobs j
JOIN application_patterns ap ON j.application_pattern_id = ap.id
WHERE j.status = 'gap'
  AND ap.id = 'data-access'
ORDER BY j.category, j.id;
```

---

## 4. Schema Validation: Where It "Stretches"

### 4.1 ✅ What Works Perfectly

1. **Multiple Sources**: `sources: ["PoEAA:Repository", "Effect-SQL"]` ✅
2. **Type Enforcement**: `type: "Database"` correctly categorizes ✅
3. **Cross-Type Relationships**: `prerequisites` and `related_pattern_ids` arrays handle Database → Core Concept relationships ✅
4. **Version Compatibility**: `effectVersions: ["3.x", "4.x"]` supports multi-version patterns ✅
5. **Jobs-to-be-Done**: Structured format enables gap analysis ✅

### 4.2 ⚠️ What Needs Enhancement

#### 4.2.1 Comparison Field (NEW)

**Requirement**: Side-by-side OOP vs Effect comparisons for lead gen site.

**Solution**: Add `comparison` JSONB field (as shown above).

**Use Cases**:
- Lead gen site: "See how Effect compares to traditional OOP patterns"
- Migration tools: "Understand the conceptual shift from OOP to FP"
- Learning: "Compare PoEAA implementation to Effect-native approach"

**Query**: "Find all patterns with comparisons"

```sql
SELECT id, title, comparison->>'oopApproach'->>'source' as poeaa_source
FROM patterns
WHERE comparison IS NOT NULL;
```

#### 4.2.2 Pattern Evolution Tracking

**Requirement**: Track how patterns evolve (e.g., Repository v1 → v2).

**Current**: `version: "1.0.0"` exists, but no history.

**Future Consideration**: Pattern version history table (as mentioned in requirements doc).

#### 4.2.3 Codemod Storage

**Requirement**: Store executable migration scripts (e.g., "Convert OOP Repository to Effect Service").

**Current**: Not in schema.

**Solution**: Add to `MigrationPattern` entity (already in requirements doc):

```typescript
interface MigrationPattern {
  id: string
  fromVersion: string              // "PoEAA:Repository"
  toVersion: string                // "Effect:Service"
  patternId: string                // FK to Pattern
  changeType: "breaking" | "non-breaking" | "deprecation"
  codemod?: string                 // Executable TypeScript migration script
  description: string
  examples: CodeExample[]          // Before/after examples
}
```

---

## 5. Application Pattern: Data Access

### 5.1 New Application Pattern Entry

**File**: `data/application-patterns.json`

```json
{
  "id": "data-access",
  "name": "Data Access",
  "description": "Patterns for accessing and managing data persistence, including repositories, transactions, and data mapping. Maps PoEAA Data Source Architectural Patterns to Effect-native implementations.",
  "learningOrder": 17,  // After "Tooling and Debugging" (16)
  "effectModule": "Effect",
  "subPatterns": [
    "repository",
    "unit-of-work",
    "data-mapper",
    "identity-map",
    "optimistic-lock"
  ]
}
```

**Rationale**: 
- New Application Pattern for enterprise data access concerns
- Maps PoEAA patterns to Effect implementations
- Positioned after Tooling (advanced topic)
- Sub-patterns align with PoEAA categories

### 5.2 Jobs-to-be-Done File

**File**: `docs/DATA_ACCESS_JOBS_TO_BE_DONE.md` (as shown in section 3.1)

---

## 6. Query Patterns for Data Access

### 6.1 Lead Gen Site Queries

**Query**: "Find all Database patterns with PoEAA sources"

```typescript
const poeaaPatterns = yield* PatternRepository.findPatterns({
  type: "Database",
  sources: ["PoEAA"],  // Filter by source prefix
  sortBy: "learningOrder"
});
```

**Query**: "Find patterns that compare OOP to Effect"

```typescript
const comparisonPatterns = yield* PatternRepository.findPatterns({
  hasComparison: true,  // New filter
  type: "Database"
});
```

**Query**: "Find prerequisites for Unit of Work pattern"

```typescript
const unitOfWork = yield* PatternRepository.getPattern("data-access-unit-of-work");
const prerequisites = yield* PatternRepository.getPatternsByIds(
  unitOfWork.prerequisites
);
// Returns: [Scope pattern, AcquireRelease pattern, Repository pattern]
```

### 6.2 Migration Tool Queries

**Query**: "Find migration patterns from PoEAA to Effect"

```typescript
const migrations = yield* MigrationRepository.findMigrations({
  fromVersion: "PoEAA:Repository",
  toVersion: "Effect:Service"
});
```

**Query**: "Find codemods for converting OOP patterns"

```typescript
const codemods = yield* MigrationRepository.getCodemods({
  fromSource: "PoEAA",
  toSource: "Effect"
});
```

---

## 7. Stress Test Results

### 7.1 ✅ Schema Handles Enterprise Patterns

| Concern | Schema Support | Status |
|---------|----------------|--------|
| Multiple sources (PoEAA + Effect) | `sources` array | ✅ Works |
| Type enforcement (Database) | `type` enum | ✅ Works |
| Cross-type relationships | `prerequisites` array | ✅ Works |
| Version compatibility | `effectVersions` array | ✅ Works |
| Jobs-to-be-Done | Structured format | ✅ Works |
| Comparisons (OOP vs Effect) | `comparison` JSONB | ⚠️ Needs addition |
| Codemods | `MigrationPattern` entity | ✅ Already planned |

### 7.2 ⚠️ Enhancements Needed

1. **Add `comparison` field** to Pattern schema (JSONB)
2. **Add Application Pattern** "data-access" to index
3. **Create Jobs-to-be-Done** file for Data Access
4. **Implement comparison queries** in API layer

### 7.3 ✅ Schema Validation: PASSED

The unified Pattern schema successfully handles:
- ✅ PoEAA pattern attribution
- ✅ Cross-pattern relationships (Database → Core Concept)
- ✅ Enterprise concerns (transactions, repositories, mapping)
- ✅ Side-by-side comparisons (with proposed `comparison` field)
- ✅ Jobs-to-be-Done tracking for gaps

---

## 8. Next Steps

### 8.1 Immediate Actions

1. **Add `comparison` field** to database schema
2. **Create Data Access Application Pattern** entry
3. **Draft Jobs-to-be-Done** markdown file
4. **Prototype Repository pattern** MDX content

### 8.2 Future Enhancements

1. **Pattern version history** (track evolution)
2. **Codemod execution** (automated OOP → Effect conversion)
3. **Comparison UI** (side-by-side viewer on lead gen site)
4. **Migration guides** (PoEAA → Effect migration paths)

---

## Conclusion

The unified Pattern schema **successfully handles** PoEAA Data Access patterns with minimal enhancements:

- ✅ Core schema supports all requirements
- ⚠️ Need `comparison` field for side-by-side comparisons
- ✅ Cross-pattern relationships work elegantly
- ✅ Jobs-to-be-Done structure accommodates enterprise concerns

**Recommendation**: Proceed with schema implementation, adding `comparison` field as proposed.

---

**Document Status**: Prototype - Ready for Implementation  
**Last Updated**: December 2025
