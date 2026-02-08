#!/usr/bin/env bun

/**
 * Load skills from SKILL.md files into the skills and skill_patterns tables
 *
 * Reads Claude-format SKILL.md files from content/published/skills/claude/,
 * parses frontmatter, and upserts into the database. Optionally links skills
 * to their constituent effect_patterns via the skill_patterns join table.
 *
 * Usage:
 *   bun run scripts/load-skills.ts
 *
 * Environment:
 *   DATABASE_URL  — PostgreSQL connection string (default: local)
 *   DRY_RUN=1    — Parse and report without writing to the database
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { createDatabase } from '../packages/toolkit/src/db/client.js';
import {
  applicationPatterns,
  effectPatterns,
  skillPatterns,
  skills,
} from '../packages/toolkit/src/db/schema/index.js';
import {
  deriveCategory,
  extractPatternCount,
  parseFrontmatter,
} from './load-skills-parser.js';

// ============================================
// Types
// ============================================

interface ParsedSkill {
  readonly dirName: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly patternCount: number;
  readonly content: string;
}

// ============================================
// Main program
// ============================================

const loadSkillsProgram = Effect.gen(function* () {
  const isDryRun = process.env.DRY_RUN === '1';
  const skillsDir = join(process.cwd(), 'content/published/skills/claude');

  console.log('Loading skills from SKILL.md files...');
  if (isDryRun) {
    console.log('(DRY RUN — no database writes)\n');
  }

  // 1. Discover skill directories
  const entries = yield* Effect.tryPromise({
    try: () => readdir(skillsDir, { withFileTypes: true }),
    catch: (error) => new Error(`Failed to read skills directory: ${error}`),
  });

  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  console.log(`Found ${dirs.length} skill directories\n`);

  // 2. Parse each SKILL.md
  const parsed: ParsedSkill[] = [];
  const errors: string[] = [];

  for (const dirName of dirs) {
    const filePath = join(skillsDir, dirName, 'SKILL.md');
    const raw = yield* Effect.tryPromise({
      try: () => readFile(filePath, 'utf-8'),
      catch: (error) => new Error(`Failed to read ${filePath}: ${error}`),
    });

    const frontmatter = parseFrontmatter(raw);
    if (!frontmatter) {
      errors.push(`${dirName}: could not parse frontmatter`);
      continue;
    }

    const category = deriveCategory(frontmatter.name);
    const patternCount = extractPatternCount(raw);

    parsed.push({
      dirName,
      slug: frontmatter.name,
      name: frontmatter.name,
      description: frontmatter.description,
      category,
      patternCount,
      content: raw,
    });
  }

  if (errors.length > 0) {
    console.log(`Warnings (${errors.length}):`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
    console.log();
  }

  console.log(`Parsed ${parsed.length} skills successfully\n`);

  if (isDryRun) {
    for (const skill of parsed) {
      console.log(
        `  ${skill.slug}  (${skill.patternCount} patterns, category: ${skill.category})`,
      );
    }
    console.log('\nDry run complete — no database changes made.');
    return parsed.length;
  }

  // 3. Connect to database
  const { db, close } = createDatabase();

  try {
    // 4. Build lookup: applicationPattern slug → id
    const appPatterns = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: applicationPatterns.id,
            slug: applicationPatterns.slug,
          })
          .from(applicationPatterns),
      catch: (error) =>
        new Error(`Failed to query application_patterns: ${error}`),
    });
    const appPatternMap = new Map(appPatterns.map((ap) => [ap.slug, ap.id]));

    // 5. Build lookup: effectPattern applicationPatternId + slug → id
    //    We'll need this for linking skill_patterns
    const allEffectPatterns = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: effectPatterns.id,
            applicationPatternId: effectPatterns.applicationPatternId,
          })
          .from(effectPatterns),
      catch: (error) => new Error(`Failed to query effect_patterns: ${error}`),
    });

    // Group effect pattern IDs by applicationPatternId
    const patternsByAppId = new Map<string, string[]>();
    for (const ep of allEffectPatterns) {
      if (ep.applicationPatternId) {
        const list = patternsByAppId.get(ep.applicationPatternId) ?? [];
        list.push(ep.id);
        patternsByAppId.set(ep.applicationPatternId, list);
      }
    }

    // 6. Upsert skills and link patterns
    let upserted = 0;
    let linked = 0;

    for (const skill of parsed) {
      const appPatternId = appPatternMap.get(skill.category) ?? null;

      // Upsert the skill row
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(skills)
            .values({
              slug: skill.slug,
              name: skill.name,
              description: skill.description,
              category: skill.category,
              content: skill.content,
              version: 1,
              patternCount: skill.patternCount,
              applicationPatternId: appPatternId,
              validated: false,
            })
            .onConflictDoUpdate({
              target: skills.slug,
              set: {
                name: skill.name,
                description: skill.description,
                category: skill.category,
                content: skill.content,
                patternCount: skill.patternCount,
                applicationPatternId: appPatternId,
                updatedAt: new Date(),
              },
            })
            .returning(),
        catch: (error) =>
          new Error(`Failed to upsert skill ${skill.slug}: ${error}`),
      });

      const skillId = result[0].id;
      upserted++;
      console.log(`  Upserted: ${skill.slug} (${skill.patternCount} patterns)`);

      // Link to effect_patterns via skill_patterns join table
      if (appPatternId) {
        const patternIds = patternsByAppId.get(appPatternId) ?? [];
        if (patternIds.length > 0) {
          // Clear existing links for this skill
          yield* Effect.tryPromise({
            try: () =>
              db
                .delete(skillPatterns)
                .where(eq(skillPatterns.skillId, skillId)),
            catch: (error) =>
              new Error(
                `Failed to clear skill_patterns for ${skill.slug}: ${error}`,
              ),
          });

          // Insert new links
          yield* Effect.tryPromise({
            try: () =>
              db.insert(skillPatterns).values(
                patternIds.map((patternId) => ({
                  skillId,
                  patternId,
                })),
              ),
            catch: (error) =>
              new Error(`Failed to link patterns for ${skill.slug}: ${error}`),
          });

          linked += patternIds.length;
          console.log(`    Linked ${patternIds.length} patterns`);
        }
      }
    }

    // 7. Summary
    const totalSkills = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(skills)
          .then((r) => r.length),
      catch: (error) => new Error(`Failed to count skills: ${error}`),
    });

    const totalLinks = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(skillPatterns)
          .then((r) => r.length),
      catch: (error) => new Error(`Failed to count skill_patterns: ${error}`),
    });

    console.log(`\nDone!`);
    console.log(`  Skills upserted: ${upserted}`);
    console.log(`  Pattern links created: ${linked}`);
    console.log(`  Total skills in database: ${totalSkills}`);
    console.log(`  Total skill-pattern links: ${totalLinks}`);

    return upserted;
  } finally {
    yield* Effect.promise(() => close());
  }
});

// Run
Effect.runPromise(loadSkillsProgram).catch((error) => {
  console.error('Error loading skills:', error);
  process.exit(1);
});
