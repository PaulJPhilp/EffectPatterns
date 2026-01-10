/**
 * Generate Skills (Claude, Gemini, OpenAI) from published Effect patterns
 * Now uses PostgreSQL database as the source of truth.
 */

import {
  generateCategorySkill,
  generateGeminiSkill,
  generateOpenAISkill,
  groupPatternsByCategory,
  patternFromDatabase,
  writeGeminiSkill,
  writeOpenAISkill,
  writeSkill,
} from '../packages/ep-cli/src/skills/skill-generator.js';
import { createDatabase } from '../packages/toolkit/src/db/client.js';
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
} from '../packages/toolkit/src/repositories/index.js';

const PROJECT_ROOT = process.cwd();

async function main() {
  console.log('\n🎓 Generating Skills from Effect Patterns\n');

  // Connect to database
  const { db, close } = createDatabase();
  const apRepo = createApplicationPatternRepository(db);
  const epRepo = createEffectPatternRepository(db);

  try {
    // Load patterns from database
    console.log('📖 Loading patterns from database...');
    const dbPatterns = await epRepo.findAll();
    console.log(`✓ Found ${dbPatterns.length} patterns\n`);

    // Load application patterns to map IDs to slugs
    const applicationPatterns = await apRepo.findAll();
    const apIdToSlug = new Map(
      applicationPatterns.map((ap) => [ap.id, ap.slug]),
    );

    // Convert database patterns to PatternContent
    const patterns = [];
    for (const dbPattern of dbPatterns) {
      if (dbPattern.applicationPatternId) {
        const pattern = patternFromDatabase(dbPattern);
        // Map application pattern ID to slug for grouping
        const apSlug = apIdToSlug.get(dbPattern.applicationPatternId);
        if (apSlug) {
          pattern.applicationPatternId = apSlug;
          patterns.push(pattern);
        }
      }
    }
    console.log(
      `✓ Processed ${patterns.length} patterns with application patterns\n`,
    );

    // Group by category
    console.log('🗂️  Grouping patterns by category...');
    const categoryMap = groupPatternsByCategory(patterns);
    console.log(`✓ Found ${categoryMap.size} categories\n`);

    // Generate all skills
    console.log('📝 Generating skills...\n');

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

Claude Skills:  ${claudeCount} (content/published/skills/claude/ AND .claude-plugin/plugins/effect-patterns/skills/)
Gemini Skills:  ${geminiCount} (content/published/skills/gemini/)
OpenAI Skills:  ${openaiCount} (content/published/skills/openai/)
`);
  } finally {
    await close();
  }
}

main().catch(console.error);
