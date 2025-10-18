/**
 * Roadmap Parser
 *
 * Parses roadmap MDX files to extract pattern placement information.
 */

import { type FileSystem, Path } from '@effect/platform';
import { Effect } from 'effect';
import { MdxService, type MdxServiceSchema } from 'effect-mdx';
import type { ModuleId, NewPatternModulePlacement } from '../db/schema.js';
import { moduleIds } from '../db/schema.js';

/**
 * Roadmap file mapping
 *
 * Maps module IDs to roadmap filenames
 */
const roadmapFiles: Record<ModuleId, string> = {
  'module-1-foundations': 'ROADMAP-module1.mdx',
  'module-2-web-api': 'ROADMAP-module2.mdx',
  'module-3-data-pipelines': 'ROADMAP-module3.mdx',
  'module-4-scope-layer': 'ROADMAP-module4.mdx',
  'module-5-combinators': 'ROADMAP-module5.mdx',
  'module-6-constructors': 'ROADMAP-module6.mdx',
  'module-7-pattern-matching': 'ROADMAP-module7.mdx',
  'module-8-branded-types': 'ROADMAP-module8.mdx',
  'module-9-observability': 'ROADMAP-module9.mdx',
  'module-10-data-types': 'ROADMAP-module10.mdx',
};

/**
 * Extract pattern IDs from roadmap content
 *
 * Looks for markdown links in format: [Pattern Title](./content/pattern-id.mdx)
 */
const extractPatternIds = (
  content: string
): Array<{
  patternId: string;
  stage: number | null;
  position: number;
}> => {
  const placements: Array<{
    patternId: string;
    stage: number | null;
    position: number;
  }> = [];

  // Split by stage headings (### 📍 Stage N:)
  const stageRegex = /###\s+📍\s+Stage\s+(\d+):/g;
  const stages = content.split(stageRegex);

  let currentStage: number | null = null;
  let position = 0;

  for (let i = 0; i < stages.length; i++) {
    const section = stages[i];

    // Check if this is a stage number
    if (i > 0 && i % 2 === 1) {
      currentStage = Number.parseInt(section, 10);
      position = 0;
      continue;
    }

    // Extract pattern links from this section
    // Format: [Pattern Title](./content/pattern-id.mdx)
    const linkRegex = /\[([^\]]+)\]\(\.\/content\/([^)]+)\.mdx\)/g;
    let match;

    while ((match = linkRegex.exec(section)) !== null) {
      const patternId = match[2];
      position++;

      placements.push({
        patternId,
        stage: currentStage,
        position,
      });
    }
  }

  return placements;
};

/**
 * Parse a single roadmap file
 */
export const parseRoadmapFile = (
  moduleId: ModuleId,
  filePath: string
): Effect.Effect<
  NewPatternModulePlacement[],
  Error,
  FileSystem.FileSystem | MdxServiceSchema
> =>
  Effect.gen(function* () {
    const mdx = yield* MdxService;

    // Read and parse MDX file with effect-mdx
    const { mdxBody } = yield* mdx.readMdxAndFrontmatter(filePath);

    // Extract pattern placements from content
    const placements = extractPatternIds(mdxBody);

    // Build placement records
    const records: NewPatternModulePlacement[] = placements.map((p, index) => ({
      id: `${moduleId}-${p.patternId}`,
      patternId: p.patternId,
      moduleId,
      stage: p.stage,
      position: p.position,
      note: null,
    }));

    yield* Effect.logInfo(
      `Parsed ${records.length} placements for ${moduleId}`
    );

    return records;
  });

/**
 * Parse all roadmap files
 */
export const parseAllRoadmaps = (
  roadmapDir: string
): Effect.Effect<
  NewPatternModulePlacement[],
  Error,
  FileSystem.FileSystem | Path.Path | MdxServiceSchema
> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;

    const allPlacements: NewPatternModulePlacement[] = [];

    // Parse each module's roadmap
    for (const moduleId of moduleIds) {
      const filename = roadmapFiles[moduleId];
      const filePath = path.join(roadmapDir, filename);

      const result = yield* parseRoadmapFile(moduleId, filePath).pipe(
        Effect.either
      );

      if (result._tag === 'Right') {
        allPlacements.push(...result.right);
      } else {
        yield* Effect.logWarning(
          `Failed to parse roadmap for ${moduleId}: ${result.left.message}`
        );
      }
    }

    yield* Effect.logInfo(
      `Parsed ${allPlacements.length} total placements across all modules`
    );

    return allPlacements;
  });
