/**
 * Generate Skills (Claude, Gemini, OpenAI) from published Effect patterns
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  readPattern,
  groupPatternsByCategory,
  generateCategorySkill,
  writeSkill,
  generateGeminiSkill,
  writeGeminiSkill,
  generateOpenAISkill,
  writeOpenAISkill,
} from "../packages/cli/src/skills/skill-generator";

const PROJECT_ROOT = process.cwd();
const PATTERNS_DIR = path.join(PROJECT_ROOT, "content/published/patterns");

async function findMdxFiles(dir: string): Promise<string[]> {
  const mdxFiles: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findMdxFiles(fullPath);
      mdxFiles.push(...subFiles);
    } else if (entry.name.endsWith(".mdx")) {
      mdxFiles.push(fullPath);
    }
  }

  return mdxFiles;
}

async function main() {
  console.log("\n🎓 Generating Skills from Effect Patterns\n");

  // Read all pattern files
  console.log("📖 Reading published patterns...");
  const mdxFiles = await findMdxFiles(PATTERNS_DIR);
  console.log(`✓ Found ${mdxFiles.length} patterns\n`);

  // Parse patterns
  const patterns = [];
  for (const filePath of mdxFiles) {
    try {
      const pattern = await readPattern(filePath);
      if (pattern.applicationPatternId) {
        patterns.push(pattern);
      }
    } catch (error) {
      console.log(`⚠️  Skipped ${path.basename(filePath)}: ${error}`);
    }
  }
  console.log(`✓ Parsed ${patterns.length} patterns\n`);

  // Group by category
  console.log("🗂️  Grouping patterns by category...");
  const categoryMap = groupPatternsByCategory(patterns);
  console.log(`✓ Found ${categoryMap.size} categories\n`);

  // Generate all skills
  console.log("📝 Generating skills...\n");

  let claudeCount = 0;
  let geminiCount = 0;
  let openaiCount = 0;

  for (const [category, categoryPatterns] of categoryMap.entries()) {
    const skillName = `effect-patterns-${category}`;

    // Claude
    const claudeContent = generateCategorySkill(category, categoryPatterns);
    await writeSkill(skillName, claudeContent, PROJECT_ROOT);
    claudeCount++;

    // Gemini
    const geminiSkill = generateGeminiSkill(category, categoryPatterns);
    await writeGeminiSkill(geminiSkill, PROJECT_ROOT);
    geminiCount++;

    // OpenAI
    const openaiContent = generateOpenAISkill(category, categoryPatterns);
    await writeOpenAISkill(skillName, openaiContent, PROJECT_ROOT);
    openaiCount++;

    console.log(`  ✓ ${skillName} (${categoryPatterns.length} patterns)`);
  }

  console.log(`
════════════════════════════════════════════════════════════
✨ Skills Generation Complete!
════════════════════════════════════════════════════════════

Claude Skills:  ${claudeCount} (content/published/skills/claude/)
Gemini Skills:  ${geminiCount} (content/published/skills/gemini/)
OpenAI Skills:  ${openaiCount} (content/published/skills/openai/)
`);
}

main().catch(console.error);
