/**
 * generate-simple.ts
 *
 * Simplified README generation that doesn't use effect-mdx
 */


// biome-ignore assist/source/organizeImports: <>
import  matter from "gray-matter";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const README_PATH = path.join(process.cwd(), "README.md");

interface PatternFrontmatter {
  id: string;
  title: string;
  skillLevel?: string;
  skill?: string;
  useCase?: string | string[];
  summary: string;
}

// Helper to get skill level from pattern (handles both skillLevel and skill fields)
function getSkillLevel(pattern: PatternFrontmatter): string {
  return (pattern.skillLevel || pattern.skill || "intermediate").toLowerCase();
}

async function generateReadme() {
  console.log("Starting README generation...");

  // Recursively find all MDX files with their directory info
  async function findMdxFilesWithCategory(
    dir: string
  ): Promise<Array<{ file: string; category: string }>> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: Array<{ file: string; category: string }> = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findMdxFilesWithCategory(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        // Extract category from path (e.g., 'core' or 'schema/composition')
        const relPath = path.relative(PUBLISHED_DIR, fullPath);
        const parts = relPath.split(path.sep);
        const category =
          parts.length > 2 ? parts.slice(1, -1).join("/") : parts[0];
        files.push({ file: fullPath, category });
      }
    }

    return files;
  }

  const mdxFilesWithCategory = await findMdxFilesWithCategory(PUBLISHED_DIR);

  // Separate core and schema patterns
  const corePatterns: Array<PatternFrontmatter & { path: string }> = [];
  const schemaPatterns: Map<
    string,
    Array<PatternFrontmatter & { path: string }>
  > = new Map();

  for (const { file, category } of mdxFilesWithCategory) {
    const content = await fs.readFile(file, "utf-8");
    const { data } = matter(content);
    const pattern = data as PatternFrontmatter & { path: string };
    pattern.path = path.relative(process.cwd(), file);

    if (category === "core") {
      corePatterns.push(pattern);
    } else {
      if (!schemaPatterns.has(category)) {
        schemaPatterns.set(category, []);
      }
      schemaPatterns.get(category)?.push(pattern);
    }
  }

  // Group core patterns by useCase
  const coreUseCaseGroups = new Map<
    string,
    Array<PatternFrontmatter & { path: string }>
  >();
  for (const pattern of corePatterns) {
    const useCases = Array.isArray(pattern.useCase)
      ? pattern.useCase
      : [pattern.useCase];

    for (const useCase of useCases) {
      if (!coreUseCaseGroups.has(useCase)) {
        coreUseCaseGroups.set(useCase, []);
      }
      coreUseCaseGroups.get(useCase)?.push(pattern);
    }
  }

  // Generate README content
  const sections: string[] = [];
  const toc: string[] = [];

  // Core Effect Patterns section
  toc.push("### Core Effect Patterns\n");
  const coreOrder = [
    "resource-management",
    "concurrency",
    "core-concepts",
    "testing",
    "domain-modeling",
    "building-apis",
    "error-management",
    "building-data-pipelines",
    "making-http-requests",
    "tooling-and-debugging",
    "observability",
    "project-setup--execution",
  ];

  // Add useCases from coreOrder to TOC
  for (const useCase of coreOrder) {
    if (coreUseCaseGroups.has(useCase)) {
      const anchor = useCase.toLowerCase().replace(/\s+/g, "-");
      toc.push(`- [${useCase}](#${anchor})`);
    }
  }

  // Add remaining useCases to TOC (alphabetically)
  const remainingUseCasesForToc = Array.from(coreUseCaseGroups.keys())
    .filter((uc) => !coreOrder.includes(uc))
    .sort();

  for (const useCase of remainingUseCasesForToc) {
    const anchor = useCase.toLowerCase().replace(/\s+/g, "-");
    toc.push(`- [${useCase}](#${anchor})`);
  }

  // Schema Patterns section
  toc.push("\n### Schema Patterns\n");
  const schemaOrder = [
    "composition",
    "transformations",
    "unions",
    "recursive",
    "error-handling",
    "async-validation",
    "validating-api-responses",
    "parsing-ai-responses",
    "defining-ai-output-schemas",
    "web-standards-validation",
    "form-validation",
    "json-file-validation",
    "json-db-validation",
    "environment-config",
  ];

  for (const category of schemaOrder) {
    const displayName = category
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const anchor = category.toLowerCase();
    toc.push(`- [${displayName}](#${anchor})`);
  }

  toc.push("\n");

  // Generate core patterns sections
  // First, include useCases from coreOrder (in order)
  const processedUseCases = new Set<string>();
  for (const useCase of coreOrder) {
    const patterns = coreUseCaseGroups.get(useCase);
    if (!patterns) continue;
    processedUseCases.add(useCase);

    const _anchor = useCase.toLowerCase().replace(/\s+/g, "-");
    sections.push(`## ${useCase}\n`);
    sections.push(
      "| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n"
    );

    // Sort patterns by skill level
    const sortedPatterns = patterns.sort((a, b) => {
      const levels = { beginner: 0, intermediate: 1, advanced: 2 };
      return (
        levels[getSkillLevel(a) as keyof typeof levels] -
        levels[getSkillLevel(b) as keyof typeof levels]
      );
    });

    for (const pattern of sortedPatterns) {
      const skillLevel = getSkillLevel(pattern);
      const skillEmoji =
        {
          beginner: "🟢",
          intermediate: "🟡",
          advanced: "🟠",
        }[skillLevel] || "⚪️";

      sections.push(
        `| [${pattern.title}](./${pattern.path}) | ${skillEmoji} **${
          skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
        }** | ${pattern.summary} |\n`
      );
    }

    sections.push("\n");
  }

  // Then, include all other useCases not in coreOrder (alphabetically)
  const remainingUseCases = Array.from(coreUseCaseGroups.keys())
    .filter((uc) => !processedUseCases.has(uc))
    .sort();

  for (const useCase of remainingUseCases) {
    const patterns = coreUseCaseGroups.get(useCase);
    if (!patterns) continue;

    const _anchor = useCase.toLowerCase().replace(/\s+/g, "-");
    sections.push(`## ${useCase}\n`);
    sections.push(
      "| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n"
    );

    // Sort patterns by skill level
    const sortedPatterns = patterns.sort((a, b) => {
      const levels = { beginner: 0, intermediate: 1, advanced: 2 };
      return (
        levels[getSkillLevel(a) as keyof typeof levels] -
        levels[getSkillLevel(b) as keyof typeof levels]
      );
    });

    for (const pattern of sortedPatterns) {
      const skillLevel = getSkillLevel(pattern);
      const skillEmoji =
        {
          beginner: "🟢",
          intermediate: "🟡",
          advanced: "🟠",
        }[skillLevel] || "⚪️";

      sections.push(
        `| [${pattern.title}](./${pattern.path}) | ${skillEmoji} **${
          skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
        }** | ${pattern.summary} |\n`
      );
    }

    sections.push("\n");
  }

  // Generate schema patterns sections
  for (const category of schemaOrder) {
    const patterns = schemaPatterns.get(`schema/${category}`);
    if (!patterns) continue;

    const displayName = category
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const _anchor = category.toLowerCase();

    sections.push(`## ${displayName}\n`);
    sections.push(
      "| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n"
    );

    // Sort patterns by skill level
    const sortedPatterns = patterns.sort((a, b) => {
      const levels = { beginner: 0, intermediate: 1, advanced: 2 };
      return (
        levels[getSkillLevel(a) as keyof typeof levels] -
        levels[getSkillLevel(b) as keyof typeof levels]
      );
    });

    for (const pattern of sortedPatterns) {
      const skillLevel = getSkillLevel(pattern);
      const skillEmoji =
        {
          beginner: "🟢",
          intermediate: "🟡",
          advanced: "🟠",
        }[skillLevel] || "⚪️";

      sections.push(
        `| [${pattern.title}](./${pattern.path}) | ${skillEmoji} **${
          skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)
        }** | ${pattern.summary} |\n`
      );
    }

    sections.push("\n");
  }

  // Generate full README
  const readme = `<!--
  ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY

  This file is automatically generated by the publishing pipeline.
  Any manual edits will be overwritten when the pipeline runs.

  To modify this file:
  - Run: bun run pipeline
  - Or edit: scripts/publish/pipeline.ts

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
}

generateReadme().catch((error) => {
  console.error("Failed to generate README:", error);
  process.exit(1);
});
