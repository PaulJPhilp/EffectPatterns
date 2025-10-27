# Pattern Repository

Repository layer for querying Effect patterns from the database.

## Status

✅ **PatternRepository Implemented** - Drizzle-based repository with Effect wrappers.

## Purpose

The PatternRepository provides low-level database access for pattern metadata:
- Query patterns by ID, tag, or search filters
- Paginate results with limit/offset
- Order patterns by module placement (stage + position)

**Important:** The repository does NOT populate the `modules` field on `PatternMeta`. That is the responsibility of the Catalog service, which composes repository data with placement information to build in-memory indices.

## API

### `findById(id: PatternID): Effect<PatternMeta, PatternNotFound | PatternQueryError>`

Find a pattern by its ID. Fails with `PatternNotFound` if not found.

### `findAll(params?: PageParams): Effect<PageResult<PatternMeta>, PatternQueryError>`

Get all patterns with pagination.

### `findByTag(tag: string, params?: PageParams): Effect<PageResult<PatternMeta>, PatternQueryError>`

Find patterns by tag with pagination.

### `search(filter: PatternFilter, params?: PageParams): Effect<PageResult<PatternMeta>, PatternQueryError>`

Search patterns by query, skill level, and tags with pagination.

### `listByModule(moduleId: string, stage?: number): Effect<readonly PatternMeta[], PatternQueryError>`

List patterns by module ID, ordered by stage ASC NULLS LAST, position ASC. Optionally filter by stage.

## Implementation Notes

- Uses Drizzle ORM with singleton `db` client from `lib/db/client.ts`
- All queries wrapped in `Effect.tryPromise` with error mapping to `PatternQueryError`
- Maps database rows to `PatternMeta` using `toPatternMeta` utility
- `modules` field left empty - Catalog service will enrich

## Database Schema

Base tables:
- `patterns` - Pattern metadata (id, title, summary, skillLevel, tags, etc.)
- `pattern_module_placements` - Module placements (moduleId, stage, position)

Indices:
- `patterns.title` (btree)
- `patterns.tags` (GIN)
- `placements(module_id, stage, position)` (composite)

## Usage Example

```typescript
import { Effect, Layer } from 'effect';
import {
  PatternRepositoryService,
  PatternRepositoryLive,
} from './service.js';

const program = Effect.gen(function* () {
  const repo = yield* PatternRepositoryService;
  
  // Find by ID
  const pattern = yield* repo.findById('error-handling');
  
  // Search with filters
  const results = yield* repo.search({
    query: 'retry',
    skillLevel: 'intermediate',
  });
  
  // List by module
  const modulePatterns = yield* repo.listByModule('module-1-foundations');
});

Effect.runPromise(program.pipe(Effect.provide(PatternRepositoryLive)));
```

## Testing

Unit tests use mocked repository implementations with in-memory data. See `__tests__/pattern.repository.test.ts`.

Run tests:
```bash
bun test app/web/lib/effect/pattern/__tests__
```

## Next Steps

After the repository, implement the Catalog service to:
1. Load all patterns + placements into memory at startup
2. Build indices: byId, byTag, byModule, byModuleStage, bySkill
3. Populate `modules` field on `PatternMeta` with placement data
4. Provide as an Effect Layer for fast lookups

## Related Patterns

- [Service Layer Pattern](https://github.com/PaulJPhilp/Effect-Patterns) - Effect.Service with Layer composition
- [Repository Pattern](https://github.com/PaulJPhilp/Effect-Patterns) - Data access abstraction
