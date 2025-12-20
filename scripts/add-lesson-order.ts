import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

const PUBLISHED_DIR = path.join(process.cwd(), 'content/published/patterns');

interface Pattern {
  path: string;
  data: Record<string, unknown>;
  content: string;
}

async function findMdxFiles(dir: string): Promise<Pattern[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: Pattern[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMdxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = matter(content);
      files.push({
        path: fullPath,
        data: parsed.data as Record<string, unknown>,
        content: parsed.content,
      });
    }
  }
  return files;
}

function getSkillLevel(data: Record<string, unknown>): string {
  return (
    (data.skillLevel || data.skill || 'intermediate') as string
  ).toLowerCase();
}

async function main() {
  const allPatterns = await findMdxFiles(PUBLISHED_DIR);

  // Group by directory (Application Pattern)
  const byDir = new Map<string, Pattern[]>();
  for (const p of allPatterns) {
    const relPath = path.relative(PUBLISHED_DIR, p.path);
    const dir = relPath.split(path.sep)[0];
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)?.push(p);
  }

  let updated = 0;

  for (const [dir, patterns] of byDir) {
    // Group by skill level within each directory
    const bySkill = new Map<string, Pattern[]>();
    for (const p of patterns) {
      const skill = getSkillLevel(p.data);
      if (!bySkill.has(skill)) bySkill.set(skill, []);
      bySkill.get(skill)?.push(p);
    }

    // Assign lessonOrder within each skill level
    for (const [skill, skillPatterns] of bySkill) {
      // Sort alphabetically by title for consistent ordering
      skillPatterns.sort((a, b) => {
        const titleA = (a.data.title as string) || '';
        const titleB = (b.data.title as string) || '';
        return titleA.localeCompare(titleB);
      });

      let order = 1;
      for (const p of skillPatterns) {
        // Skip if already has lessonOrder
        if (p.data.lessonOrder !== undefined) {
          order++;
          continue;
        }

        // Add lessonOrder
        p.data.lessonOrder = order;
        order++;

        // Write back
        const newContent = matter.stringify(p.content, p.data);
        await fs.writeFile(p.path, newContent);
        updated++;
      }
    }
  }

  console.log(`Updated ${updated} patterns with lessonOrder`);
}

main().catch(console.error);
