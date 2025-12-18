/**
 * generate-simple.ts
 *
 * Simplified README generation that doesn't use effect-mdx
 */

// biome-ignore assist/source/organizeImports: <>
import matter from "gray-matter";
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
  // Each pattern appears only once - assigned to its primary useCase
  const coreUseCaseGroups = new Map<
    string,
    Array<PatternFrontmatter & { path: string }>
  >();
  // Ordered by learning progression: beginner → intermediate → advanced
  // All entries are kebab-case to match standardized useCase values
  const coreOrder = [
    "project-setup--execution",
    "core-concepts",
    "resource-management",
    "domain-modeling",
    "error-management",
    "testing",
    "building-apis",
    "making-http-requests",
    "building-data-pipelines",
    "concurrency",
    "observability",
    "tooling-and-debugging",
    "branded-types",
    "combinators",
    "constructors",
    "control-flow",
    "data-types",
    "pattern-matching",
    "concurrency-coordination",
    "concurrent-state-management",
    "error-handling",
    "error-handling-resilience",
    "platform-integration",
    "platform-specific-operations",
    "scheduling",
    "scheduling-periodic-tasks",
    "stream-error-handling",
    "stream-persistence",
    "stream-processing",
    "value-handling",
    "working-with-streams",
  ];

  for (const pattern of corePatterns) {
    const useCases = Array.isArray(pattern.useCase)
      ? pattern.useCase
      : [pattern.useCase];

    // Find the primary useCase: first one that matches coreOrder, otherwise first useCase
    let primaryUseCase = useCases[0];
    for (const uc of useCases) {
      if (coreOrder.includes(uc)) {
        primaryUseCase = uc;
        break;
      }
    }

    if (!coreUseCaseGroups.has(primaryUseCase)) {
      coreUseCaseGroups.set(primaryUseCase, []);
    }
    coreUseCaseGroups.get(primaryUseCase)?.push(pattern);
  }

  // Generate README content
  const sections: string[] = [];
  const toc: string[] = [];

  // Core Effect Patterns section
  toc.push("### Core Effect Patterns\n");

  // Add useCases from coreOrder to TOC with Title Case formatting
  for (const useCase of coreOrder) {
    if (coreUseCaseGroups.has(useCase)) {
      // Preserve Title Case if useCase already has it (e.g., "Branded Types", "Control Flow")
      // Otherwise convert kebab-case to Title Case
      let displayName: string;
      if (useCase.includes(" ") || /^[A-Z]/.test(useCase)) {
        // Already Title Case - preserve it
        displayName = useCase
          .replace(/--/g, " & ")
          .replace(/Api/g, "API")
          .replace(/Http/g, "HTTP");
      } else {
        // Convert kebab-case to Title Case
        displayName = useCase
          .replace(/--/g, "-&-")
          .split("-")
          .filter((word) => word.length > 0)
          .map((word) => {
            if (word === "&") return "&";
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(" ")
          .replace(/Api/g, "API")
          .replace(/Http/g, "HTTP")
          .replace(/\s+/g, " ");
      }
      const anchor = useCase.toLowerCase().replace(/\s+/g, "-");
      toc.push(`- [${displayName}](#${anchor})`);
    }
  }

  // Note: All important useCases are now in coreOrder, so we don't add remaining ones
  // This keeps the README focused on the learning progression

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

    // Convert ALL useCase values to Title Case for display
    // Handle both kebab-case and existing Title Case
    let displayName: string;
    if (useCase.includes(" ") || /^[A-Z]/.test(useCase)) {
      // Already Title Case - just clean it up
      displayName = useCase
        .replace(/--/g, " & ")
        .replace(/Api/g, "API")
        .replace(/Http/g, "HTTP");
    } else {
      // Convert kebab-case to Title Case
      displayName = useCase
        .replace(/--/g, "-&-")
        .split("-")
        .filter((word) => word.length > 0)
        .map((word) => {
          if (word === "&") return "&";
          // Capitalize first letter, lowercase the rest
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ")
        .replace(/Api/g, "API")
        .replace(/Http/g, "HTTP")
        .replace(/\s+/g, " ");
    }
    const _anchor = useCase.toLowerCase().replace(/\s+/g, "-");
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

  // Note: All important useCases are now in coreOrder, so we don't add remaining ones
  // This keeps the README focused on the learning progression

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
