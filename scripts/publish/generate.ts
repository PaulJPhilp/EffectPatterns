/**
 * generate.ts
 * 
 * Part of the Effect Patterns documentation pipeline. This script generates the README.md
 * file from published MDX files. It:
 * 
 * 1. Reads all published MDX files
 * 2. Extracts frontmatter metadata
 * 3. Groups patterns by use case
 * 4. Sorts patterns by skill level within each group
 * 5. Generates a table of contents
 * 6. Creates tables for each use case group
 * 
 * The README format includes:
 * - Project description
 * - Table of contents with use case groups
 * - Tables for each use case showing:
 *   - Pattern title with link
 *   - Skill level with emoji
 *   - Pattern summary
 * 
 * Usage:
 * ```bash
 * npm run generate
 * ```
 * 
 * The script will:
 * - Read all MDX files from the published directory
 * - Generate a new README.md
 * - Exit with code 1 if any errors occur
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const README_PATH = path.join(process.cwd(), "README.md");

interface PatternFrontmatter {
  id: string;
  title: string;
  skillLevel: string;
  useCase: string[];
  summary: string;
}

interface GenerateOptions {
  indir?: string;
  outfile?: string;
}

/**
 * Generates README.md from published MDX files.
 * Groups patterns by use case and creates a table for each group.
 */
async function generateReadme({
  indir = PUBLISHED_DIR,
  outfile = README_PATH
}: GenerateOptions = {}) {
  console.log("Starting README generation...");

  // Read all MDX files and parse frontmatter
  const files = await fs.readdir(indir);
  const mdxFiles = files.filter(file => file.endsWith(".mdx"));
  
  const patterns: PatternFrontmatter[] = await Promise.all(
    mdxFiles.map(async file => {
      const content = await fs.readFile(path.join(indir, file), "utf-8");
      const { data } = matter(content);
      return data as PatternFrontmatter;
    })
  );

  // Group patterns by use case
  const useCaseGroups = new Map<string, PatternFrontmatter[]>();
  
  for (const pattern of patterns) {
    for (const useCase of pattern.useCase) {
      if (!useCaseGroups.has(useCase)) {
        useCaseGroups.set(useCase, []);
      }
      useCaseGroups.get(useCase)!.push(pattern);
    }
  }

  // Generate README content
  const sections: string[] = [];
  const toc: string[] = [];

  for (const [useCase, patterns] of useCaseGroups) {
    const anchor = useCase.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    toc.push(`- [${useCase}](#${anchor})`);

    sections.push(`## ${useCase}\n`);
    sections.push("| Pattern | Skill Level | Summary |");
    sections.push("| :--- | :--- | :--- |");

    // Sort patterns by skill level (beginner -> intermediate -> advanced)
    const sortedPatterns = patterns.sort((a, b) => {
      const levels = { beginner: 0, intermediate: 1, advanced: 2 };
      return levels[a.skillLevel as keyof typeof levels] - levels[b.skillLevel as keyof typeof levels];
    });

    for (const pattern of sortedPatterns) {
      const skillEmoji = {
        beginner: "🟢",
        intermediate: "🟡",
        advanced: "🟠"
      }[pattern.skillLevel] || "⚪️";

      sections.push(
        `| [${pattern.title}](./content/published/${pattern.id}.mdx) | ${skillEmoji} **${pattern.skillLevel.charAt(0).toUpperCase() + pattern.skillLevel.slice(1)}** | ${pattern.summary} |`
      );
    }

    sections.push("");
  }

  // Combine all sections
  const readmeContent = [
    "# The Effect Patterns Hub",
    "",
    "A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.",
    "",
    "This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the \"why\" behind the code.",
    "",
    "**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**",
    "",
    "## Table of Contents",
    "",
    ...toc,
    "",
    "---",
    "",
    ...sections
  ].join("\n");

  // Write README
  await fs.writeFile(outfile, readmeContent);
  console.log("✅ README.md has been successfully generated!");
}

// Run if called directly
if (require.main === module) {
  generateReadme().catch(error => {
    console.error("Failed to generate README:", error);
    process.exit(1);
  });
}

export { generateReadme };
