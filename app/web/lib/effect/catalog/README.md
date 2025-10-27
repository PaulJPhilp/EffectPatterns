# Catalog Service

High-level service that provides fast in-memory access to patterns with full module placement data.

## Status

✅ **Catalog Service Implemented** - In-memory indexing with automatic initialization on Layer creation.

## Purpose

The Catalog service composes the PatternRepository with module placement data to provide:
- Fast in-memory lookups (no DB queries after initialization)
- Enriched `PatternMeta` with populated `modules` field
- Multiple indices for efficient queries (byId, byTag, byModule, bySkillLevel, byModuleStage)
- Module views with patterns grouped and ordered by stage

## Architecture

**Data Flow:**
1. On Layer creation, `loadCatalog()` runs automatically
2. Loads all patterns from DB via PatternRepository
3. Loads all placements from `pattern_module_placements` table
4. Enriches patterns with module placement data
5. Builds in-memory indices for fast lookups
6. Stores indices in a `Ref` for thread-safe access

**Key Types:**
- `CatalogPattern` - `PatternMeta` with populated `modules` field
- `ModulePlacement` - `{ stage: number | null, position: number, note?: string }`
- `ModuleView` - Patterns grouped by stage within a module
- `CatalogIndices` - In-memory maps for fast lookups

## API

### `getById(id: string): Effect<CatalogPattern, CatalogError>`

Get pattern by ID with full module placement data.

### `getAll(): Effect<readonly CatalogPattern[], CatalogError>`

Get all patterns with populated modules field.

### `getByTag(tag: string): Effect<readonly CatalogPattern[], CatalogError>`

Get patterns by tag.

### `getBySkillLevel(level: SkillLevel): Effect<readonly CatalogPattern[], CatalogError>`

Get patterns by skill level (beginner, intermediate, advanced).

### `getModuleView(moduleId: string): Effect<ModuleView, CatalogError>`

Get module view with patterns grouped by stage and ordered by position. Stages are sorted with null stages last.

### `getModuleStage(moduleId: string, stage: number | null): Effect<readonly CatalogPattern[], CatalogError>`

Get patterns for a specific module and stage, ordered by position.

### `refresh(): Effect<void, CatalogError>`

Reload catalog from database (useful after data changes).

## Usage Example

```typescript
import { Effect } from 'effect';
import { CatalogService, CatalogLive } from './service.js';

const program = Effect.gen(function* () {
  const catalog = yield* CatalogService;
  
  // Get pattern with full module data
  const pattern = yield* catalog.getById('error-handling');
  console.log(pattern.modules); // { 'module-1-foundations': { stage: 1, position: 2 } }
  
  // Get module view
  const moduleView = yield* catalog.getModuleView('module-1-foundations');
  for (const stage of moduleView.stages) {
    console.log(`Stage ${stage.stage}:`);
    for (const pattern of stage.patterns) {
      console.log(`  - ${pattern.title} (pos ${pattern.modules[moduleView.moduleId].position})`);
    }
  }
  
  // Get patterns by tag
  const retryPatterns = yield* catalog.getByTag('retry');
});

// CatalogLive automatically initializes on startup
Effect.runPromise(program.pipe(Effect.provide(CatalogLive)));
```

## Implementation Details

**Index Structure:**
- `byId`: Map<string, CatalogPattern> - O(1) lookup
- `byTag`: Map<string, Set<patternId>> - O(1) tag lookup
- `byModule`: Map<moduleId, Set<patternId>> - O(1) module lookup
- `byModuleStage`: Map<"moduleId:stage", Set<patternId>> - O(1) stage lookup
- `bySkillLevel`: Map<SkillLevel, Set<patternId>> - O(1) skill lookup

**Ordering:**
- Module stages: sorted with null stages last
- Patterns within stages: sorted by position ascending

**Thread Safety:**
- Indices stored in Effect `Ref` for safe concurrent access
- All lookups are read-only after initialization

## Testing

Unit tests use mock data with in-memory indices. See `__tests__/catalog.test.ts` (11 passing tests).

Run tests:
```bash
bun test app/web/lib/effect/catalog/__tests__
```

## Performance

- **Initialization**: O(n) where n = total patterns + placements
- **Lookups**: O(1) for byId, byTag, byModule, bySkillLevel, byModuleStage
- **Module views**: O(m log m) where m = patterns in module (for sorting)

For typical usage (~150 patterns), initialization takes <10ms and lookups are instant.

## Next Steps

1. **Pattern Explorer Pages**
   - `/modules` - List all modules
   - `/modules/[moduleId]` - Display ModuleView with stages
   - `/patterns/[patternId]` - Display pattern detail with MDX content

2. **Caching & Invalidation**
   - Add Redis caching layer if needed
   - Webhook to call `refresh()` after ingestion pipeline runs

3. **Search Enhancement**
   - Add full-text search index
   - Combine with Catalog for filtering

## Related Services

- [PatternRepository](../pattern/README.md) - Database access layer
- [PatternService](../pattern/README.md) - Higher-level pattern operations
