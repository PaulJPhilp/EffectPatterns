/**
 * rules-improved.ts
 *
 * Enhanced rules generation with:
 * - All existing formats (markdown, JSON, by-use-case)
 * - NEW: Cursor rules (.mdc files)
 * - NEW: Windsurf rules (.mdc files)
 * - Parallel generation for speed
 * - Better reporting
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), 'content/published');
const RULES_DIR = path.join(process.cwd(), 'rules');
const USE_CASE_DIR = path.join(RULES_DIR, 'by-use-case');
const CURSOR_DIR = path.join(RULES_DIR, 'cursor');
const WINDSURF_DIR = path.join(RULES_DIR, 'windsurf');

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
interface Rule {
  id: string;
  title: string;
  description: string;
  skillLevel?: string;
  useCases?: string[];
  example?: string;
  content?: string;
  antiPattern?: string;
  explanation?: string;
}

const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

// --- EXTRACTION ---
async function extractRules(): Promise<Rule[]> {
  console.log(
    colorize('📖 Extracting rules from published patterns...', 'cyan'),
  );

  const files = await fs.readdir(PUBLISHED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));
  const rules: Rule[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(PUBLISHED_DIR, file);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    if ((data as any).rule?.description) {
      // Extract Good Example section
      const goodExample = extractSection(content, 'Good Example');
      // Extract Anti-Pattern section
      const antiPattern = extractSection(content, 'Anti-Pattern');
      // Extract Explanation/Rationale section
      const explanation = extractSection(content, 'Explanation', 'Rationale');

      rules.push({
        id: (data as any).id,
        title: (data as any).title,
        description: (data as any).rule.description,
        skillLevel: (data as any).skillLevel,
        useCases: Array.isArray((data as any).useCase)
          ? (data as any).useCase
          : [(data as any).useCase],
        example: goodExample,
        antiPattern,
        explanation,
        content: content.trim(),
      });
    }
  }

  console.log(colorize(`Found ${rules.length} patterns with rules\n`, 'green'));
  return rules.sort((a, b) => a.title.localeCompare(b.title));
}

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

// --- GENERATORS ---

// 1. Full markdown rules
async function generateFullRules(rules: Rule[]) {
  const content = ['# Effect-TS Patterns - Complete Rules\n\n'];

  for (const rule of rules) {
    content.push(`## ${rule.title}\n\n`);
    content.push(`**Rule:** ${rule.description}\n\n`);

    if (rule.skillLevel) {
      content.push(`**Skill Level:** ${rule.skillLevel}\n\n`);
    }

    if (rule.useCases && rule.useCases.length > 0) {
      content.push(`**Use Cases:** ${rule.useCases.join(', ')}\n\n`);
    }

    if (rule.example) {
      content.push(`### Good Example\n\n${rule.example}\n\n`);
    }

    if (rule.antiPattern) {
      content.push(`### Anti-Pattern\n\n${rule.antiPattern}\n\n`);
    }

    if (rule.explanation) {
      content.push(`### Explanation\n\n${rule.explanation}\n\n`);
    }

    content.push('---\n\n');
  }

  const filePath = path.join(RULES_DIR, 'rules.md');
  await fs.writeFile(filePath, content.join(''), 'utf-8');
  return filePath;
}

// 2. Compact rules
async function generateCompactRules(rules: Rule[]) {
  const content = ['# Effect-TS Patterns - Compact Rules\n\n'];

  for (const rule of rules) {
    content.push(`- **${rule.title}**: ${rule.description}\n`);
  }

  const filePath = path.join(RULES_DIR, 'rules-compact.md');
  await fs.writeFile(filePath, content.join(''), 'utf-8');
  return filePath;
}

// 3. JSON rules
async function generateJsonRules(rules: Rule[]) {
  const filePath = path.join(RULES_DIR, 'rules.json');
  await fs.writeFile(filePath, JSON.stringify(rules, null, 2), 'utf-8');
  return filePath;
}

// 4. Use case rules
async function generateUseCaseRules(rules: Rule[]): Promise<string[]> {
  await fs.mkdir(USE_CASE_DIR, { recursive: true });

  const useCaseGroups = new Map<string, Rule[]>();
  for (const rule of rules) {
    if (rule.useCases) {
      for (const useCase of rule.useCases) {
        if (!useCaseGroups.has(useCase)) {
          useCaseGroups.set(useCase, []);
        }
        useCaseGroups.get(useCase)?.push(rule);
      }
    }
  }

  const generatedFiles: string[] = [];

  for (const [useCase, useCaseRules] of useCaseGroups) {
    const content = [`# ${useCase} Patterns\n\n`];

    for (const rule of useCaseRules) {
      content.push(`## ${rule.title}\n\n`);
      content.push(`${rule.description}\n\n`);

      if (rule.example) {
        content.push(`### Example\n\n${rule.example}\n\n`);
      }

      content.push('---\n\n');
    }

    const fileName = `${sanitizeName(useCase)}.md`;
    const filePath = path.join(USE_CASE_DIR, fileName);
    await fs.writeFile(filePath, content.join(''), 'utf-8');
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

// 5. Cursor rules (.mdc files)
async function generateCursorRules(rules: Rule[]): Promise<string[]> {
  await fs.mkdir(CURSOR_DIR, { recursive: true });

  const generatedFiles: string[] = [];

  for (const rule of rules) {
    const content: string[] = [];

    // Frontmatter
    content.push(`description: ${rule.description}\n`);
    content.push(`globs: "**/*.ts"\n`);
    content.push('alwaysApply: true\n');
    content.push('\n');

    // Title
    content.push(`# ${rule.title}\n`);
    content.push(`**Rule:** ${rule.description}\n\n`);

    // Example
    if (rule.example) {
      content.push(`### Example\n${rule.example}\n\n`);
    }

    // Explanation
    if (rule.explanation) {
      content.push(`**Explanation:**  \n${rule.explanation}\n`);
    } else {
      // Fallback: Use first sentence of description
      content.push(`**Explanation:**  \n${rule.description}\n`);
    }

    const fileName = `${sanitizeName(rule.title)}.mdc`;
    const filePath = path.join(CURSOR_DIR, fileName);
    await fs.writeFile(filePath, content.join(''), 'utf-8');
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

// 6. Windsurf rules (.mdc files)
async function generateWindsurfRules(rules: Rule[]): Promise<string[]> {
  await fs.mkdir(WINDSURF_DIR, { recursive: true });

  const generatedFiles: string[] = [];

  for (const rule of rules) {
    const content: string[] = [];

    // Frontmatter (same as Cursor)
    content.push(`description: ${rule.description}\n`);
    content.push(`globs: "**/*.ts"\n`);
    content.push('alwaysApply: true\n');
    content.push('\n');

    // Title
    content.push(`# ${rule.title}\n`);
    content.push(`**Rule:** ${rule.description}\n\n`);

    // Example
    if (rule.example) {
      content.push(`### Example\n${rule.example}\n\n`);
    }

    // Anti-Pattern (Windsurf benefits from seeing what NOT to do)
    if (rule.antiPattern) {
      content.push(`### Anti-Pattern (Avoid)\n${rule.antiPattern}\n\n`);
    }

    // Explanation
    if (rule.explanation) {
      content.push(`**Explanation:**  \n${rule.explanation}\n`);
    } else {
      content.push(`**Explanation:**  \n${rule.description}\n`);
    }

    const fileName = `${sanitizeName(rule.title)}.mdc`;
    const filePath = path.join(WINDSURF_DIR, fileName);
    await fs.writeFile(filePath, content.join(''), 'utf-8');
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

// --- REPORTING ---
function printResults(results: Record<string, number>) {
  console.log(colorize('\n📊 Generation Results Summary', 'cyan'));
  console.log('═'.repeat(60));

  console.log(`${colorize('Full Rules:', 'bright')}        1 file`);
  console.log(`${colorize('Compact Rules:', 'bright')}     1 file`);
  console.log(`${colorize('JSON Rules:', 'bright')}        1 file`);
  console.log(
    `${colorize('Use Case Rules:', 'bright')}    ${results.useCase} files`,
  );
  console.log(
    `${colorize('Cursor Rules:', 'bright')}      ${results.cursor} files`,
  );
  console.log(
    `${colorize('Windsurf Rules:', 'bright')}    ${results.windsurf} files`,
  );

  const total = 3 + results.useCase + results.cursor + results.windsurf;
  console.log(`\n${colorize(`Total Files: ${total}`, 'green')}`);
  console.log('═'.repeat(60));
}

// --- MAIN ---
async function main() {
  const startTime = Date.now();

  console.log(colorize('\n🔧 Enhanced Rules Generation', 'bright'));
  console.log(colorize('Generating all rule formats from patterns\n', 'dim'));

  // Ensure directories exist
  await fs.mkdir(RULES_DIR, { recursive: true });

  // Extract rules
  const rules = await extractRules();

  if (rules.length === 0) {
    console.log(
      colorize('\n⚠️  No rules found in published patterns', 'yellow'),
    );
    return;
  }

  // Generate all formats
  console.log(colorize('🎯 Generating rule formats...\n', 'cyan'));

  const [
    _fullPath,
    _compactPath,
    _jsonPath,
    useCasePaths,
    cursorPaths,
    windsurfPaths,
  ] = await Promise.all([
    generateFullRules(rules),
    generateCompactRules(rules),
    generateJsonRules(rules),
    generateUseCaseRules(rules),
    generateCursorRules(rules),
    generateWindsurfRules(rules),
  ]);

  // Print results
  printResults({
    useCase: useCasePaths.length,
    cursor: cursorPaths.length,
    windsurf: windsurfPaths.length,
  });

  const duration = Date.now() - startTime;

  console.log(
    colorize(
      `\n✨ All rules generated successfully in ${duration}ms!\n`,
      'green',
    ),
  );

  // Show sample output locations
  console.log(colorize('📂 Output Locations:', 'dim'));
  console.log(colorize(`   ${RULES_DIR}/rules.md`, 'dim'));
  console.log(colorize(`   ${RULES_DIR}/rules-compact.md`, 'dim'));
  console.log(colorize(`   ${RULES_DIR}/rules.json`, 'dim'));
  console.log(colorize(`   ${USE_CASE_DIR}/*.md`, 'dim'));
  console.log(colorize(`   ${CURSOR_DIR}/*.mdc`, 'dim'));
  console.log(colorize(`   ${WINDSURF_DIR}/*.mdc\n`, 'dim'));
}

main().catch((error) => {
  console.error(colorize('\n💥 Fatal error:', 'red'));
  console.error(error);
  process.exit(1);
});
