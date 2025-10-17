/**
 * MDX Pattern Parser
 *
 * Parses pattern MDX files and extracts frontmatter metadata.
 */

import { FileSystem, Path } from '@effect/platform';
import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { MdxService, type MdxServiceSchema } from 'effect-mdx';
import type { NewPattern } from '../db/schema.js';

/**
 * Pattern frontmatter schema
 *
 * Based on analysis of /content/published/ files
 */
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
      description: Schema.String,
    })
  ),
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
  FileSystem.FileSystem | Path.Path | MdxServiceSchema
> =>
  Effect.gen(function* () {
    const mdx = yield* MdxService;
    const path = yield* Path.Path;

    // Read and parse MDX file with effect-mdx
    const { frontmatter: rawFrontmatter } =
      yield* mdx.readMdxAndFrontmatter(filePath);

    // Validate frontmatter with schema
    const frontmatter = yield* Schema.decodeUnknown(PatternFrontmatterSchema)(
      rawFrontmatter
    );

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
      contentPath: filePath,
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
  FileSystem.FileSystem | Path.Path | MdxServiceSchema
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

      const result = yield* parsePatternFile(filePath).pipe(Effect.either);

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
