# Refactoring gray-matter to effect-mdx

## Current Implementation

The pattern-parser.ts currently uses:
- `gray-matter` for parsing MDX frontmatter
- Manual `FileSystem.readFileString()` calls
- `@effect/schema` for validation after parsing

## Why Refactor to effect-mdx?

1. **Unified API**: Single service for all MDX operations
2. **Built-in validation**: Frontmatter validation is integrated
3. **Effect-native**: Returns Effect types with proper error handling
4. **Type safety**: Consistent error types (InvalidMdxFormatError)
5. **Additional features**: HTML compilation, MDX compilation, parameter extraction

## Step-by-Step Refactoring Guide

### Step 1: Update Imports

**Before:**
```typescript
import { Effect } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { Schema } from '@effect/schema';
import matter from 'gray-matter';
```

**After:**
```typescript
import { Effect } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { Schema } from '@effect/schema';
import { MdxService } from 'effect-mdx';
```

**Changes:**
- Remove `gray-matter` import
- Add `MdxService` import from `effect-mdx`

### Step 2: Add MdxService to Effect Requirements

**Before:**
```typescript
export const parsePatternFile = (
  filePath: string
): Effect.Effect<
  NewPattern,
  Error,
  FileSystem.FileSystem | Path.Path
> =>
```

**After:**
```typescript
export const parsePatternFile = (
  filePath: string
): Effect.Effect<
  NewPattern,
  Error,
  FileSystem.FileSystem | Path.Path | MdxService
> =>
```

**Changes:**
- Add `| MdxService` to the requirements (R) type parameter

### Step 3: Replace File Reading + gray-matter with MdxService

**Before:**
```typescript
Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  // Read file content
  const content = yield* fs.readFileString(filePath);

  // Parse MDX with gray-matter
  const parsed = matter(content);

  // Decode frontmatter with schema validation
  const frontmatter = yield* Schema.decodeUnknown(
    PatternFrontmatterSchema
  )(parsed.data);
```

**After - Option A (File-based):**
```typescript
Effect.gen(function* () {
  const mdx = yield* MdxService;
  const path = yield* Path.Path;

  // Read and parse in one step
  const { frontmatter: rawFrontmatter, mdxBody } = 
    yield* mdx.readMdxAndFrontmatter(filePath);

  // Validate frontmatter with your schema
  const frontmatter = yield* Schema.decodeUnknown(
    PatternFrontmatterSchema
  )(rawFrontmatter);
```

**After - Option B (String-based, if you need content first):**
```typescript
Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const mdx = yield* MdxService;
  const path = yield* Path.Path;

  // Read file
  const content = yield* fs.readFileString(filePath);

  // Parse with effect-mdx
  const { attributes, body } = yield* mdx.parseMdxFile(content);

  // Validate with your schema
  const frontmatter = yield* Schema.decodeUnknown(
    PatternFrontmatterSchema
  )(attributes);
```

**Changes:**
- Replace `fs.readFileString() + matter()` with `mdx.readMdxAndFrontmatter()`
- OR replace `matter()` with `mdx.parseMdxFile()`
- Still use Schema validation for your custom schema

### Step 4: Update parseAllPatterns Requirements

**Before:**
```typescript
export const parseAllPatterns = (
  directory: string
): Effect.Effect<
  NewPattern[],
  Error,
  FileSystem.FileSystem | Path.Path
> =>
```

**After:**
```typescript
export const parseAllPatterns = (
  directory: string
): Effect.Effect<
  NewPattern[],
  Error,
  FileSystem.FileSystem | Path.Path | MdxService
> =>
```

**Changes:**
- Add `| MdxService` to requirements

### Step 5: Update Layer Provision

**Before (in pipeline.ts):**
```typescript
export const runDefaultIngestion = (): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const patternsDir = 'content/published';
    const roadmapsDir = 'roadmap';

    yield* runIngestion(patternsDir, roadmapsDir);
  }).pipe(Effect.provide(NodeContext.layer));
```

**After:**
```typescript
import { MdxService } from 'effect-mdx';
import { MdxConfigService } from 'effect-mdx';

export const runDefaultIngestion = (): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const patternsDir = 'content/published';
    const roadmapsDir = 'roadmap';

    yield* runIngestion(patternsDir, roadmapsDir);
  }).pipe(
    Effect.provide(MdxService.Default),
    Effect.provide(MdxConfigService.Default),
    Effect.provide(NodeContext.layer)
  );
```

**Changes:**
- Add `MdxService.Default` layer
- Add `MdxConfigService.Default` layer (required dependency)
- Order: Service layers first, then NodeContext.layer
- Note: `NodeContext.layer` provides FileSystem which MdxService needs

### Step 6: Error Handling Updates

**Before:**
```typescript
try {
  const pattern = yield* parsePatternFile(filePath);
  patterns.push(pattern);
  yield* Effect.logInfo(`Parsed pattern: ${pattern.id}`);
} catch (error) {
  yield* Effect.logWarning(
    `Failed to parse ${file}: ${error}`
  );
}
```

**After (Effect-style error handling):**
```typescript
const result = yield* parsePatternFile(filePath).pipe(
  Effect.either
);

if (result._tag === 'Right') {
  patterns.push(result.right);
  yield* Effect.logInfo(`Parsed pattern: ${result.right.id}`);
} else {
  yield* Effect.logWarning(
    `Failed to parse ${file}: ${result.left.message}`
  );
}
```

**OR using catchAll:**
```typescript
yield* parsePatternFile(filePath).pipe(
  Effect.tap((pattern) => {
    patterns.push(pattern);
    return Effect.logInfo(`Parsed pattern: ${pattern.id}`);
  }),
  Effect.catchAll((error) =>
    Effect.logWarning(`Failed to parse ${file}: ${error.message}`)
  )
);
```

**Changes:**
- Remove try/catch from Effect.gen
- Use Effect.either, Effect.catchAll, or Effect.catchTag instead

## Complete Refactored Example

```typescript
/**
 * MDX Pattern Parser - Refactored with effect-mdx
 */

import { Effect } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { Schema } from '@effect/schema';
import { MdxService } from 'effect-mdx';
import type { NewPattern } from '../db/schema.js';

export class PatternFrontmatterSchema extends Schema.Class<PatternFrontmatterSchema>(
  'PatternFrontmatter'
)({
  id: Schema.String,
  title: Schema.String,
  summary: Schema.String,
  skillLevel: Schema.Literal('beginner', 'intermediate', 'advanced'),
  tags: Schema.Array(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  related: Schema.optional(Schema.Array(Schema.String)),
  author: Schema.optional(Schema.String),
  rule: Schema.optional(
    Schema.Struct({
      description: Schema.String
    })
  )
}) {}

export type PatternFrontmatter = typeof PatternFrontmatterSchema.Type;

/**
 * Parse a single pattern MDX file
 */
export const parsePatternFile = (
  filePath: string
): Effect.Effect<
  NewPattern,
  Error,
  FileSystem.FileSystem | Path.Path | MdxService
> =>
  Effect.gen(function* () {
    const mdx = yield* MdxService;
    const path = yield* Path.Path;

    // Read and parse MDX file
    const { frontmatter: rawFrontmatter } = 
      yield* mdx.readMdxAndFrontmatter(filePath);

    // Validate with schema
    const frontmatter = yield* Schema.decodeUnknown(
      PatternFrontmatterSchema
    )(rawFrontmatter);

    // Extract filename for slug
    const filename = path.basename(filePath);
    const mdxSlug = filename.replace(/\.mdx$/, '');

    // Build pattern record
    const pattern: NewPattern = {
      id: frontmatter.id,
      title: frontmatter.title,
      summary: frontmatter.summary,
      skillLevel: frontmatter.skillLevel,
      tags: [...frontmatter.tags],
      useCase: frontmatter.useCase ? [...frontmatter.useCase] : undefined,
      related: frontmatter.related ? [...frontmatter.related] : undefined,
      author: frontmatter.author,
      mdxSlug,
      contentPath: filePath
    };

    return pattern;
  });

/**
 * Parse all pattern files in a directory
 */
export const parseAllPatterns = (
  directory: string
): Effect.Effect<
  NewPattern[],
  Error,
  FileSystem.FileSystem | Path.Path | MdxService
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Read directory
    const files = yield* fs.readDirectory(directory);

    // Filter MDX files
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

    // Parse each file
    const patterns: NewPattern[] = [];
    for (const file of mdxFiles) {
      const filePath = path.join(directory, file);
      
      const result = yield* parsePatternFile(filePath).pipe(
        Effect.either
      );

      if (result._tag === 'Right') {
        patterns.push(result.right);
        yield* Effect.logInfo(`Parsed pattern: ${result.right.id}`);
      } else {
        yield* Effect.logWarning(
          `Failed to parse ${file}: ${result.left.message}`
        );
      }
    }

    yield* Effect.logInfo(`Parsed ${patterns.length} patterns total`);
    return patterns;
  });
```

## Benefits After Refactoring

1. **Fewer dependencies**: Remove `gray-matter` from package.json
2. **Consistent error types**: All MDX errors are `InvalidMdxFormatError`
3. **Future extensibility**: Easy to add HTML/MDX compilation later
4. **Better error messages**: effect-mdx provides detailed error context
5. **Effect-native**: No mixing of imperative parsing with Effect code

## Testing the Refactor

```typescript
// Run typecheck
bun run typecheck

// Run ingestion
bun run ingest:patterns

// Check for errors in logs
```

## Advanced: Using Additional effect-mdx Features

### Compile Pattern Body to HTML

```typescript
const { frontmatter, mdxBody } = yield* mdx.readMdxAndFrontmatter(filePath);

// Compile to HTML for preview
const html = yield* mdx.compileMdxToHtml(mdxBody);

// Store in database
const pattern: NewPattern = {
  // ... other fields
  htmlPreview: html,
};
```

### Extract Parameters from Frontmatter

```typescript
const { frontmatter } = yield* mdx.readMdxAndFrontmatter(filePath);

// Extract parameter definitions
const params = mdx.extractParameters(frontmatter);

// params is Record<string, ParameterDefinition>
```

### Custom MDX Configuration

```typescript
import { MdxConfigService, makeMdxConfigLayer } from 'effect-mdx';
import remarkSlug from 'remark-slug';
import remarkAutolinkHeadings from 'remark-autolink-headings';

const customMdxConfig = makeMdxConfigLayer({
  remarkPlugins: [remarkSlug, remarkAutolinkHeadings],
  rehypePlugins: [],
  sanitize: false,
  slug: true,
  autolinkHeadings: true,
});

// Provide custom config instead of Default
Effect.provide(MdxService.Default, customMdxConfig);
```

## Rollback Plan

If issues arise:

1. Keep `gray-matter` in package.json during testing
2. Create a feature flag to switch between implementations
3. Run both parsers in parallel and compare results
4. Once validated, remove gray-matter dependency

## Common Issues and Solutions

### Issue: "Missing MdxService in context"

**Cause:** Forgot to provide MdxService.Default layer

**Fix:**
```typescript
Effect.provide(MdxService.Default)
```

### Issue: "Missing FileSystem in context"

**Cause:** MdxService needs FileSystem for file operations

**Fix:**
```typescript
Effect.provide(MdxService.Default)
  .pipe(Effect.provide(NodeContext.layer))
```

### Issue: "Missing MdxConfigService in context"

**Cause:** MdxService depends on MdxConfigService

**Fix:**
```typescript
Effect.provide(MdxService.Default)
  .pipe(Effect.provide(MdxConfigService.Default))
  .pipe(Effect.provide(NodeContext.layer))
```

### Issue: Schema validation fails differently

**Cause:** effect-mdx sanitizes frontmatter to JSON-only

**Solution:** This is expected - functions/undefined are stripped. Update schema to match.

## Next Steps

1. ✅ Read this guide
2. Update pattern-parser.ts with changes
3. Update roadmap-parser.ts (similar process)
4. Update pipeline.ts layer provision
5. Run typecheck
6. Test with sample files
7. Remove gray-matter from package.json
8. Update documentation
