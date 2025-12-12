/**
 * generate-claude-rules.ts
 *
 * Generates a comprehensive rules file for Claude by:
 * 1. Extracting rules from all published patterns
 * 2. Appending the contents of CLAUDE.md
 *
 * Output: rules/generated/rules-for-claude.md
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), 'content/published');
const CLAUDE_MD_PATH = path.join(process.cwd(), 'CLAUDE.md');
const OUTPUT_DIR = path.join(process.cwd(), 'rules/generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'rules-for-claude.md');

// --- COLORS ---
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// --- TYPE DEFINITIONS ---
interface PatternRule {
  id: string;
  title: string;
  description: string;
  skillLevel?: string;
  useCases?: string[];
  goodExample?: string;
  antiPattern?: string;
  rationale?: string;
}

// --- HELPER FUNCTIONS ---

/**
 * Extract a specific section from markdown content
 */
function extractSection(content: string, ...sectionNames: string[]): string {
  const contentLines = content.split('\n');
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of contentLines) {
    // Check if we're entering the target section
    if (
      sectionNames.some((name) => new RegExp(`^##\\s+${name}`, 'i').test(line))
    ) {
      inSection = true;
      continue;
    }

    // If we're in the section, collect lines until the next section
    if (inSection) {
      if (line.startsWith('## ')) {
        break;
      }
      sectionLines.push(line);
    }
  }

  return sectionLines.length > 0 ? sectionLines.join('\n').trim() : '';
}

/**
 * Extract rules from all published MDX files
 */
async function extractRules(): Promise<PatternRule[]> {
  console.log(
    colorize('📖 Extracting rules from published patterns...', 'cyan'),
  );

  const files = await fs.readdir(PUBLISHED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));
  const rules: PatternRule[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(PUBLISHED_DIR, file);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Only include patterns that have a rule definition
    if ((data as any).rule?.description) {
      // Extract Good Example section
      const goodExample = extractSection(content, 'Good Example');
      // Extract Anti-Pattern section
      const antiPattern = extractSection(content, 'Anti-Pattern');
      // Extract Rationale section
      const rationale = extractSection(content, 'Rationale', 'Explanation');

      rules.push({
        id: (data as any).id,
        title: (data as any).title,
        description: (data as any).rule.description,
        skillLevel: (data as any).skillLevel,
        useCases: Array.isArray((data as any).useCase)
          ? (data as any).useCase
          : [(data as any).useCase],
        goodExample,
        antiPattern,
        rationale,
      });
    }
  }

  console.log(
    colorize(`✓ Found ${rules.length} patterns with rules\n`, 'green'),
  );
  return rules.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Generate the rules content from pattern rules
 */
function generateRulesContent(rules: PatternRule[]): string {
  const content: string[] = [];

  content.push('# Effect-TS Patterns - Coding Rules for Claude\n\n');
  content.push(
    'This file contains auto-generated coding rules from Effect-TS patterns, ',
  );
  content.push(
    'followed by project-specific guidance for working in this repository.\n\n',
  );
  content.push('---\n\n');
  content.push('# Part 1: Effect-TS Pattern Rules\n\n');
  content.push(
    `Generated from ${rules.length} published patterns. These rules provide best practices for working with Effect-TS.\n\n`,
  );

  // Group by skill level for better organization
  const bySkillLevel = {
    beginner: rules.filter((r) => r.skillLevel === 'beginner'),
    intermediate: rules.filter((r) => r.skillLevel === 'intermediate'),
    advanced: rules.filter((r) => r.skillLevel === 'advanced'),
  };

  // Generate beginner rules
  if (bySkillLevel.beginner.length > 0) {
    content.push('## 🟢 Beginner Patterns\n\n');
    for (const rule of bySkillLevel.beginner) {
      content.push(...formatRule(rule));
    }
  }

  // Generate intermediate rules
  if (bySkillLevel.intermediate.length > 0) {
    content.push('## 🟡 Intermediate Patterns\n\n');
    for (const rule of bySkillLevel.intermediate) {
      content.push(...formatRule(rule));
    }
  }

  // Generate advanced rules
  if (bySkillLevel.advanced.length > 0) {
    content.push('## 🟠 Advanced Patterns\n\n');
    for (const rule of bySkillLevel.advanced) {
      content.push(...formatRule(rule));
    }
  }

  return content.join('');
}

/**
 * Format a single rule
 */
function formatRule(rule: PatternRule): string[] {
  const lines: string[] = [];

  lines.push(`### ${rule.title}\n\n`);
  lines.push(`**Rule:** ${rule.description}\n\n`);

  if (rule.useCases && rule.useCases.length > 0) {
    lines.push(`**Use Cases:** ${rule.useCases.join(', ')}\n\n`);
  }

  if (rule.rationale) {
    lines.push(`**Why:**\n\n${rule.rationale}\n\n`);
  }

  if (rule.goodExample) {
    lines.push(`**Good Example:**\n\n${rule.goodExample}\n\n`);
  }

  if (rule.antiPattern) {
    lines.push(`**Anti-Pattern:**\n\n${rule.antiPattern}\n\n`);
  }

  lines.push('---\n\n');

  return lines;
}

/**
 * Main execution
 */
async function main() {
  console.log(colorize('\n🚀 Generating Claude Rules File\n', 'bright'));

  try {
    // Step 1: Extract rules from patterns
    const rules = await extractRules();

    // Step 2: Generate rules content
    console.log(colorize('📝 Generating rules content...', 'cyan'));
    const rulesContent = generateRulesContent(rules);
    console.log(colorize('✓ Rules content generated\n', 'green'));

    // Step 3: Read CLAUDE.md
    console.log(colorize('📖 Reading CLAUDE.md...', 'cyan'));
    let claudeMdContent: string;
    try {
      claudeMdContent = await fs.readFile(CLAUDE_MD_PATH, 'utf-8');
      console.log(colorize('✓ CLAUDE.md loaded\n', 'green'));
    } catch (_error) {
      console.log(colorize('⚠️  CLAUDE.md not found, skipping...\n', 'yellow'));
      claudeMdContent = '';
    }

    // Step 4: Combine content
    console.log(colorize('🔀 Combining content...', 'cyan'));
    const finalContent =
      rulesContent +
      '\n\n' +
      '---\n\n' +
      '# Part 2: Repository-Specific Guidance\n\n' +
      (claudeMdContent ||
        'No repository-specific guidance available (CLAUDE.md not found).');
    console.log(colorize('✓ Content combined\n', 'green'));

    // Step 5: Ensure output directory exists
    console.log(colorize('📁 Creating output directory...', 'cyan'));
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(colorize('✓ Output directory ready\n', 'green'));

    // Step 6: Write the final file
    console.log(colorize('💾 Writing rules file...', 'cyan'));
    await fs.writeFile(OUTPUT_FILE, finalContent, 'utf-8');
    console.log(colorize('✓ File written successfully\n', 'green'));

    // Summary
    console.log(colorize('='.repeat(60), 'cyan'));
    console.log(colorize('✨ Rules file generated successfully!', 'green'));
    console.log(colorize('='.repeat(60), 'cyan'));
    console.log(`\n📄 Output file: ${colorize(OUTPUT_FILE, 'bright')}`);
    console.log(
      `📊 Pattern rules: ${colorize(rules.length.toString(), 'bright')}`,
    );
    console.log(
      `📏 File size: ${colorize(
        `${Math.round(finalContent.length / 1024).toString()} KB`,
        'bright',
      )}`,
    );
    console.log('');
  } catch (error) {
    console.error(colorize('\n❌ Error generating rules file:', 'red'));
    if (error instanceof Error) {
      console.error(colorize(error.message, 'red'));
      console.error(colorize(error.stack || '', 'dim'));
    }
    process.exit(1);
  }
}

main();
