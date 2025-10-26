/**
 * generate-simple.ts
 *
 * Simplified README generation that doesn't use effect-mdx
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), 'content/published');
const README_PATH = path.join(process.cwd(), 'README.md');

interface PatternFrontmatter {
  id: string;
  title: string;
  skillLevel: string;
  useCase: string[];
  summary: string;
}

async function generateReadme() {
  console.log('Starting README generation...');

  // Read all MDX files and parse frontmatter
  const files = await fs.readdir(PUBLISHED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  const patterns: PatternFrontmatter[] = [];
  for (const file of mdxFiles) {
    const content = await fs.readFile(path.join(PUBLISHED_DIR, file), 'utf-8');
    const { data } = matter(content);
    patterns.push(data as PatternFrontmatter);
  }

  // Group patterns by use case
  const useCaseGroups = new Map<string, PatternFrontmatter[]>();

  for (const pattern of patterns) {
    for (const useCase of pattern.useCase) {
      if (!useCaseGroups.has(useCase)) {
        useCaseGroups.set(useCase, []);
      }
      useCaseGroups.get(useCase)?.push(pattern);
    }
  }

  // Generate README content
  const sections: string[] = [];
  const toc: string[] = [];

  for (const [useCase, patterns] of useCaseGroups) {
    const anchor = useCase.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    toc.push(`- [${useCase}](#${anchor})`);

    sections.push(`## ${useCase}\n`);
    sections.push(
      '| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n',
    );

    // Sort patterns by skill level (beginner -> intermediate -> advanced)
    const sortedPatterns = patterns.sort((a, b) => {
      const levels = { beginner: 0, intermediate: 1, advanced: 2 };
      return (
        levels[a.skillLevel as keyof typeof levels] -
        levels[b.skillLevel as keyof typeof levels]
      );
    });

    for (const pattern of sortedPatterns) {
      const skillEmoji =
        {
          beginner: '🟢',
          intermediate: '🟡',
          advanced: '🟠',
        }[pattern.skillLevel] || '⚪️';

      sections.push(
        `| [${pattern.title}](./content/published/${pattern.id}.mdx) | ${skillEmoji} **${pattern.skillLevel.charAt(0).toUpperCase() + pattern.skillLevel.slice(1)}** | ${pattern.summary} |\n`,
      );
    }

    sections.push('\n');
  }

  // Generate full README
  const readme = `# The Effect Patterns Hub

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
}

generateReadme().catch((error) => {
  console.error('Failed to generate README:', error);
  process.exit(1);
});
