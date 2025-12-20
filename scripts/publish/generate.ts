/**
 * generate.ts
 *
 * README generation based on Application Pattern data model
 * Now uses PostgreSQL database as primary source of truth.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createDatabase } from "../../packages/toolkit/src/db/client.js";
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
} from "../../packages/toolkit/src/repositories/index.js";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published/patterns");
const README_PATH = path.join(process.cwd(), "README.md");

interface PatternWithPath {
  id: string;
  slug: string;
  title: string;
  skillLevel: string;
  summary: string;
  lessonOrder?: number | null;
  applicationPatternId: string | null;
  path: string;
  directory: string;
  subDirectory?: string;
}

function getSkillLevel(skillLevel: string): string {
  return skillLevel.toLowerCase();
}

/**
 * Find actual file path for a pattern by searching the filesystem
 */
async function findPatternPath(
  slug: string,
  applicationPatternSlug: string | null
): Promise<string> {
  // Try common locations
  const candidates: string[] = [];

  if (applicationPatternSlug) {
    // Try direct location
    candidates.push(
      path.join(PUBLISHED_DIR, applicationPatternSlug, `${slug}.mdx`)
    );

    // Try in subdirectories
    try {
      const apDir = path.join(PUBLISHED_DIR, applicationPatternSlug);
      const entries = await fs.readdir(apDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          candidates.push(path.join(apDir, entry.name, `${slug}.mdx`));
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Try root patterns directory
  candidates.push(path.join(PUBLISHED_DIR, `${slug}.mdx`));

  // Check which file actually exists
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return path.relative(process.cwd(), candidate);
    } catch {
      // File doesn't exist, try next
    }
  }

  // Fallback: construct expected path
  if (applicationPatternSlug) {
    return `content/published/patterns/${applicationPatternSlug}/${slug}.mdx`;
  }
  return `content/published/patterns/${slug}.mdx`;
}

async function generateReadme() {
  console.log("Starting README generation...");

  // Connect to database
  const { db, close } = createDatabase();
  const apRepo = createApplicationPatternRepository(db);
  const epRepo = createEffectPatternRepository(db);

  try {
    // Load Application Patterns from database
    console.log("Loading application patterns from database...");
    const applicationPatterns = await apRepo.findAll();
    const sortedAPs = applicationPatterns.sort(
      (a, b) => a.learningOrder - b.learningOrder
    );

    // Load all Effect Patterns from database
    console.log("Loading effect patterns from database...");
    const allDbPatterns = await epRepo.findAll();

    // Create a map of application pattern IDs to slugs
    const apIdToSlug = new Map(
      applicationPatterns.map((ap) => [ap.id, ap.slug])
    );

    // Convert database patterns to PatternWithPath
    console.log("Finding file paths for patterns...");
    const allPatterns: PatternWithPath[] = [];

    for (const dbPattern of allDbPatterns) {
      const applicationPatternId = dbPattern.applicationPatternId;
      const apSlug = applicationPatternId
        ? apIdToSlug.get(applicationPatternId) || null
        : null;

      // Find actual file path
      const patternPath = await findPatternPath(dbPattern.slug, apSlug);

      // Extract directory structure from path
      // patternPath is already relative to process.cwd(), e.g., "content/published/patterns/getting-started/hello-world.mdx"
      const relPath = patternPath.replace("content/published/patterns/", "");
      const parts = relPath.split(path.sep);
      const directory = parts[0] || apSlug || "unknown";
      const subDirectory =
        parts.length > 2 ? parts.slice(1, -1).join("/") : undefined;

      allPatterns.push({
        id: dbPattern.slug,
        slug: dbPattern.slug,
        title: dbPattern.title,
        skillLevel: dbPattern.skillLevel,
        summary: dbPattern.summary,
        lessonOrder: dbPattern.lessonOrder,
        applicationPatternId: applicationPatternId || null,
        path: patternPath,
        directory,
        subDirectory,
      });
    }

    // Group patterns by Application Pattern slug (from database relationship)
    const patternsByAP = new Map<string, PatternWithPath[]>();

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
    toc.push("### Effect Patterns\n");

    for (const ap of sortedAPs) {
      const patterns = patternsByAP.get(ap.slug);
      if (!patterns || patterns.length === 0) continue;

      const anchor = ap.slug.toLowerCase().replace(/\s+/g, "-");
      toc.push(`- [${ap.name}](#${anchor})`);
    }

    toc.push("\n");

    // Generate sections for each Application Pattern
    for (const ap of sortedAPs) {
      const patterns = patternsByAP.get(ap.slug);
      if (!patterns || patterns.length === 0) continue;

      sections.push(`## ${ap.name}\n`);
      sections.push(`${ap.description}\n\n`);

      // Group by sub-directory if present
      const bySubDir = new Map<string, PatternWithPath[]>();
      const noSubDir: PatternWithPath[] = [];

      for (const pattern of patterns) {
        if (pattern.subDirectory) {
          if (!bySubDir.has(pattern.subDirectory)) {
            bySubDir.set(pattern.subDirectory, []);
          }
          bySubDir.get(pattern.subDirectory)?.push(pattern);
        } else {
          noSubDir.push(pattern);
        }
      }

      // Render patterns without sub-directory first
      if (noSubDir.length > 0) {
        sections.push(
          "| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n"
        );

        const sortedPatterns = noSubDir.sort((a, b) => {
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

        for (const pattern of sortedPatterns) {
          const skillLevel = getSkillLevel(pattern.skillLevel);
          const skillEmoji =
            {
              beginner: "🟢",
              intermediate: "🟡",
              advanced: "🟠",
            }[skillLevel] || "⚪️";

          sections.push(
            `| [${pattern.title}](./${pattern.path}) | ${skillEmoji} **${
              skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
            }** | ${pattern.summary || ""} |\n`
          );
        }

        sections.push("\n");
      }

      // Render sub-directories
      const subDirOrder = [
        "getting-started",
        ...Array.from(bySubDir.keys())
          .filter((k) => k !== "getting-started")
          .sort(),
      ];

      for (const subDir of subDirOrder) {
        const subPatterns = bySubDir.get(subDir);
        if (!subPatterns) continue;

        const subDisplayName = subDir
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        sections.push(`### ${subDisplayName}\n`);
        sections.push(
          "| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n"
        );

        const sortedSubPatterns = subPatterns.sort((a, b) => {
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

        for (const pattern of sortedSubPatterns) {
          const skillLevel = getSkillLevel(pattern.skillLevel);
          const skillEmoji =
            {
              beginner: "🟢",
              intermediate: "🟡",
              advanced: "🟠",
            }[skillLevel] || "⚪️";

          sections.push(
            `| [${pattern.title}](./${pattern.path}) | ${skillEmoji} **${
              skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
            }** | ${pattern.summary || ""} |\n`
          );
        }

        sections.push("\n");
      }
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

${toc.join("\n")}

---

${sections.join("")}`;

    // Write README
    await fs.writeFile(README_PATH, readme, "utf-8");
    console.log(`✅ Generated README.md at ${README_PATH}`);
    console.log(`   Loaded ${sortedAPs.length} application patterns`);
    console.log(`   Loaded ${allPatterns.length} effect patterns`);
  } finally {
    await close();
  }
}

generateReadme().catch((error) => {
  console.error("Failed to generate README:", error);
  process.exit(1);
});
