/**
 * generate.ts
 *
 * README generation based on Application Pattern data model
 * Now uses PostgreSQL database as primary source of truth.
 */

import * as fs from 'node:fs/promises';
import { createDatabase } from '../../packages/toolkit/src/db/client.js';
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
} from '../../packages/toolkit/src/repositories/index.js';

// --- CONFIGURATION ---
const README_PATH = 'README.md';

interface PatternInfo {
  slug: string;
  title: string;
  skillLevel: string;
  summary: string;
  lessonOrder?: number | null;
  applicationPatternId: string | null;
}

function getSkillLevel(skillLevel: string): string {
  return skillLevel.toLowerCase();
}

/**
 * Generate a link path for a pattern based on its slug and application pattern
 */
function generatePatternLink(
  slug: string,
  applicationPatternSlug: string | null,
): string {
  // Generate a consistent URL structure based on slug
  // This can be updated to point to a docs site or API endpoint
  if (applicationPatternSlug) {
    return `#${slug}`; // Anchor link for now
  }
  return `#${slug}`;
}

async function generateReadme() {
  console.log('Starting README generation...');

  // Connect to database
  const { db, close } = createDatabase();
  const apRepo = createApplicationPatternRepository(db);
  const epRepo = createEffectPatternRepository(db);

  try {
    // Load Application Patterns from database
    console.log('Loading application patterns from database...');
    const applicationPatterns = await apRepo.findAll();
    const sortedAPs = applicationPatterns.sort(
      (a, b) => a.learningOrder - b.learningOrder,
    );

    // Load all Effect Patterns from database
    console.log('Loading effect patterns from database...');
    const allDbPatterns = await epRepo.findAll();

    // Create a map of application pattern IDs to slugs
    const apIdToSlug = new Map(
      applicationPatterns.map((ap) => [ap.id, ap.slug]),
    );

    // Convert database patterns to PatternInfo
    console.log('Processing patterns from database...');
    const allPatterns: PatternInfo[] = [];

    for (const dbPattern of allDbPatterns) {
      const applicationPatternId = dbPattern.applicationPatternId;

      allPatterns.push({
        slug: dbPattern.slug,
        title: dbPattern.title,
        skillLevel: dbPattern.skillLevel,
        summary: dbPattern.summary,
        lessonOrder: dbPattern.lessonOrder,
        applicationPatternId: applicationPatternId || null,
      });
    }

    // Group patterns by Application Pattern slug (from database relationship)
    const patternsByAP = new Map<string, PatternInfo[]>();

    for (const pattern of allPatterns) {
      // Use applicationPatternId to get the correct AP slug from database
      const apSlug = pattern.applicationPatternId
        ? apIdToSlug.get(pattern.applicationPatternId) || null
        : null;

      // Skip patterns without an application pattern association
      if (!apSlug) continue;

      if (!patternsByAP.has(apSlug)) {
        patternsByAP.set(apSlug, []);
      }
      patternsByAP.get(apSlug)?.push(pattern);
    }

    // Generate README content
    const sections: string[] = [];
    const toc: string[] = [];

    // Build TOC and sections in learning order
    toc.push('### Effect Patterns\n');

    for (const ap of sortedAPs) {
      const patterns = patternsByAP.get(ap.slug);
      if (!patterns || patterns.length === 0) continue;

      const anchor = ap.slug.toLowerCase().replace(/\s+/g, '-');
      toc.push(`- [${ap.name}](#${anchor})`);
    }

    toc.push('\n');

    // Generate sections for each Application Pattern
    for (const ap of sortedAPs) {
      const patterns = patternsByAP.get(ap.slug);
      if (!patterns || patterns.length === 0) continue;

      sections.push(`## ${ap.name}\n`);
      sections.push(`${ap.description}\n\n`);

      // Sort patterns by skill level and lesson order
      const sortedPatterns = patterns.sort((a, b) => {
        const levels = { beginner: 0, intermediate: 1, advanced: 2 };
        const levelDiff =
          levels[getSkillLevel(a.skillLevel) as keyof typeof levels] -
          levels[getSkillLevel(b.skillLevel) as keyof typeof levels];
        if (levelDiff !== 0) return levelDiff;
        // Secondary sort by lessonOrder (if present)
        const orderA = a.lessonOrder ?? 999;
        const orderB = b.lessonOrder ?? 999;
        return orderA - orderB;
      });

      // Render patterns table
      sections.push(
        '| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n',
      );

      for (const pattern of sortedPatterns) {
        const skillLevel = getSkillLevel(pattern.skillLevel);
        const skillEmoji =
          {
            beginner: '🟢',
            intermediate: '🟡',
            advanced: '🟠',
          }[skillLevel] || '⚪️';

        const link = generatePatternLink(pattern.slug, ap.slug);

        sections.push(
          `| [${pattern.title}](${link}) | ${skillEmoji} **${
            skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
          }** | ${pattern.summary || ''} |\n`,
        );
      }

      sections.push('\n');
    }

    // Generate full README
    const readme = `<!--
  ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY

  This file is automatically generated by the publishing pipeline.
  Any manual edits will be overwritten when the pipeline runs.

  To modify this file:
  - Run: bun run pipeline
  - Or edit: scripts/publish/generate.ts

  For project information, see ABOUT.md
-->

> [!WARNING]
> **This is an auto-generated file.** Manual edits will be overwritten by the publishing pipeline.
> For project information, see [ABOUT.md](./ABOUT.md)

# The Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.

**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**

## Table of Contents

${toc.join('\n')}

---

${sections.join('')}`;

    // Write README
    await fs.writeFile(README_PATH, readme, 'utf-8');
    console.log(`✅ Generated README.md at ${README_PATH}`);
    console.log(`   Loaded ${sortedAPs.length} application patterns`);
    console.log(`   Loaded ${allPatterns.length} effect patterns`);
  } finally {
    await close();
  }
}

generateReadme().catch((error) => {
  console.error('Failed to generate README:', error);
  process.exit(1);
});
