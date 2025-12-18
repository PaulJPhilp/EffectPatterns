/**
 * generate.ts
 *
 * README generation based on Application Pattern data model
 */

// biome-ignore assist/source/organizeImports: <>
import matter from "gray-matter";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published/patterns");
const README_PATH = path.join(process.cwd(), "README.md");
const AP_INDEX_PATH = path.join(process.cwd(), "data/application-patterns.json");

interface ApplicationPattern {
  id: string;
  name: string;
  description: string;
  learningOrder: number;
  effectModule?: string;
  subPatterns: string[];
}

interface PatternFrontmatter {
  id: string;
  title: string;
  skillLevel?: string;
  skill?: string;
  applicationPatternId?: string;
  summary: string;
}

interface PatternWithPath extends PatternFrontmatter {
  path: string;
  directory: string;
  subDirectory?: string;
}

function getSkillLevel(pattern: PatternFrontmatter): string {
  return (pattern.skillLevel || pattern.skill || "intermediate").toLowerCase();
}

async function generateReadme() {
  console.log("Starting README generation...");

  // Load Application Patterns index
  const apIndexContent = await fs.readFile(AP_INDEX_PATH, "utf-8");
  const apIndex = JSON.parse(apIndexContent) as { applicationPatterns: ApplicationPattern[] };
  const applicationPatterns = apIndex.applicationPatterns.sort((a, b) => a.learningOrder - b.learningOrder);

  // Recursively find all MDX files
  async function findMdxFiles(dir: string): Promise<PatternWithPath[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: PatternWithPath[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findMdxFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        const content = await fs.readFile(fullPath, "utf-8");
        const { data } = matter(content);
        const pattern = data as PatternFrontmatter;
        
        // Extract directory structure
        const relPath = path.relative(PUBLISHED_DIR, fullPath);
        const parts = relPath.split(path.sep);
        const directory = parts[0]; // e.g., "concurrency", "schema"
        const subDirectory = parts.length > 2 ? parts.slice(1, -1).join("/") : undefined;
        
        files.push({
          ...pattern,
          path: path.relative(process.cwd(), fullPath),
          directory,
          subDirectory,
        });
      }
    }

    return files;
  }

  const allPatterns = await findMdxFiles(PUBLISHED_DIR);

  // Group patterns by Application Pattern
  const patternsByAP = new Map<string, PatternWithPath[]>();
  
  for (const pattern of allPatterns) {
    const apId = pattern.directory;
    if (!patternsByAP.has(apId)) {
      patternsByAP.set(apId, []);
    }
    patternsByAP.get(apId)?.push(pattern);
  }

  // Generate README content
  const sections: string[] = [];
  const toc: string[] = [];

  // Build TOC and sections in learning order
  toc.push("### Effect Patterns\n");

  for (const ap of applicationPatterns) {
    const patterns = patternsByAP.get(ap.id);
    if (!patterns || patterns.length === 0) continue;

    const anchor = ap.id.toLowerCase().replace(/\s+/g, "-");
    toc.push(`- [${ap.name}](#${anchor})`);
  }

  toc.push("\n");

  // Generate sections for each Application Pattern
  for (const ap of applicationPatterns) {
    const patterns = patternsByAP.get(ap.id);
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
          }** | ${pattern.summary || ""} |\n`
        );
      }

      sections.push("\n");
    }

    // Render sub-directories
    const subDirOrder = ["getting-started", ...Array.from(bySubDir.keys()).filter(k => k !== "getting-started").sort()];
    
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
        return (
          levels[getSkillLevel(a) as keyof typeof levels] -
          levels[getSkillLevel(b) as keyof typeof levels]
        );
      });

      for (const pattern of sortedSubPatterns) {
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
}

generateReadme().catch((error) => {
  console.error("Failed to generate README:", error);
  process.exit(1);
});
