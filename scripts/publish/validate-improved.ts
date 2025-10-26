/**
 * validate-improved.ts
 *
 * Enhanced validation with:
 * - Parallel execution for speed
 * - Broken link detection
 * - Code block validation
 * - Better error categorization
 * - Detailed reporting
 * - Progress tracking
 *
 * Validates content/new/published/ (output of publish step)
 * Checks for corresponding TypeScript files in content/new/src/
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import matter from 'gray-matter';

const _execAsync = promisify(exec);

// --- CONFIGURATION ---
const NEW_PUBLISHED_DIR = path.join(process.cwd(), 'content/new/published');
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');
const CONCURRENCY = 10;
const SHOW_PROGRESS = true;

// --- TYPES ---
interface ValidationIssue {
  type: 'error' | 'warning';
  category:
    | 'frontmatter'
    | 'structure'
    | 'links'
    | 'code'
    | 'content'
    | 'files';
  message: string;
}

interface ValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  warnings: number;
  errors: number;
}

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

// --- PROGRESS ---
let completedValidations = 0;
let totalValidations = 0;

function updateProgress() {
  if (!SHOW_PROGRESS) return;
  const percent = Math.round((completedValidations / totalValidations) * 100);
  const bar =
    '█'.repeat(Math.floor(percent / 2)) +
    '░'.repeat(50 - Math.floor(percent / 2));
  process.stdout.write(
    `\r${bar} ${percent}% (${completedValidations}/${totalValidations})`,
  );
}

// --- VALIDATORS ---

// Required frontmatter fields
const REQUIRED_FIELDS = ['id', 'title', 'skillLevel', 'useCase', 'summary'];

// Valid skill levels
const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];

// Valid use cases
const VALID_USE_CASES = [
  'core-concepts',
  'error-management',
  'concurrency',
  'resource-management',
  'dependency-injection',
  'testing',
  'observability',
  'domain-modeling',
  'application-architecture',
  'building-apis',
  'network-requests',
  'file-handling',
  'database-connections',
  'modeling-data',
  'modeling-time',
  'building-data-pipelines',
  'tooling-and-debugging',
  'project-setup--execution',
  'making-http-requests',
  'custom-layers',
  'advanced-dependency-injection',
];

const USE_CASE_ALIASES: Record<string, string | readonly string[]> = {
  combinators: 'core-concepts',
  sequencing: 'core-concepts',
  composition: 'core-concepts',
  pairing: 'core-concepts',
  'side-effects': 'core-concepts',
  constructors: 'core-concepts',
  lifting: 'core-concepts',
  'effect-results': 'core-concepts',
  'data-types': 'modeling-data',
  collections: 'modeling-data',
  'set-operations': 'modeling-data',
  'optional-values': 'modeling-data',
  time: 'modeling-time',
  duration: 'modeling-time',
  logging: 'observability',
  instrumentation: 'observability',
  metrics: 'observability',
  monitoring: 'observability',
  'function-calls': 'observability',
  debugging: 'tooling-and-debugging',
  performance: 'resource-management',
  security: 'application-architecture',
  'sensitive-data': 'application-architecture',
  interop: 'application-architecture',
  async: 'concurrency',
  callback: 'concurrency',
  'error-handling': 'error-management',
};

const normalizeUseCaseValue = (value: string): readonly string[] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const lower = trimmed.toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  for (const candidate of [lower, slug]) {
    if (VALID_USE_CASES.includes(candidate)) {
      return [candidate];
    }
  }

  const aliasKey = [lower, slug].find(
    (candidate): candidate is keyof typeof USE_CASE_ALIASES =>
      candidate in USE_CASE_ALIASES,
  );

  if (!aliasKey) {
    return [];
  }

  const mapped = USE_CASE_ALIASES[aliasKey];
  if (typeof mapped === 'string') {
    return [mapped];
  }

  return mapped;
};

// Required sections
const REQUIRED_SECTIONS = [
  { pattern: /##\s+Good Example/i, name: 'Good Example' },
  { pattern: /##\s+Anti-Pattern/i, name: 'Anti-Pattern' },
  { pattern: /##\s+(Explanation|Rationale)/i, name: 'Explanation/Rationale' },
];

function validateFrontmatter(
  frontmatter: any,
  filename: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      issues.push({
        type: 'error',
        category: 'frontmatter',
        message: `Missing required field: '${field}'`,
      });
    }
  }

  // Validate id matches filename
  if (frontmatter.id && frontmatter.id !== filename) {
    issues.push({
      type: 'error',
      category: 'frontmatter',
      message: `Frontmatter 'id' (${frontmatter.id}) does not match filename (${filename})`,
    });
  }

  // Validate skill level
  if (
    frontmatter.skillLevel &&
    !VALID_SKILL_LEVELS.includes(frontmatter.skillLevel)
  ) {
    issues.push({
      type: 'warning',
      category: 'frontmatter',
      message: `Invalid skillLevel '${
        frontmatter.skillLevel
      }'. Valid values: ${VALID_SKILL_LEVELS.join(', ')}`,
    });
  }

  // Validate use case (can be array or string)
  if (frontmatter.useCase) {
    const useCases = Array.isArray(frontmatter.useCase)
      ? frontmatter.useCase
      : [frontmatter.useCase];

    const normalizedUseCases = new Set<string>();
    const unmapped: string[] = [];

    for (const raw of useCases) {
      if (typeof raw !== 'string') {
        unmapped.push(String(raw));
        continue;
      }

      const normalized = normalizeUseCaseValue(raw);
      if (normalized.length === 0) {
        unmapped.push(raw);
        continue;
      }

      for (const entry of normalized) {
        normalizedUseCases.add(entry);
      }
    }

    if (normalizedUseCases.size === 0) {
      issues.push({
        type: 'warning',
        category: 'frontmatter',
        message: `Invalid useCase '${
          Array.isArray(frontmatter.useCase)
            ? frontmatter.useCase.join(', ')
            : frontmatter.useCase
        }'. Valid values: ${VALID_USE_CASES.join(', ')}`,
      });
    } else if (unmapped.length > 0) {
      issues.push({
        type: 'warning',
        category: 'frontmatter',
        message: `Some useCase values could not be normalized (${unmapped.join(', ')}). Valid values: ${VALID_USE_CASES.join(', ')}`,
      });
    }
  }

  // Check summary length
  if (frontmatter.summary && frontmatter.summary.length > 200) {
    issues.push({
      type: 'warning',
      category: 'frontmatter',
      message: `Summary is too long (${frontmatter.summary.length} chars). Keep it under 200 characters.`,
    });
  }

  return issues;
}

function validateStructure(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(content)) {
      issues.push({
        type: 'error',
        category: 'structure',
        message: `Missing required section: '${section.name}'`,
      });
    }
  }

  // Check for empty code blocks
  const emptyCodeBlocks = content.match(/```[\w]*\n\n```/g);
  if (emptyCodeBlocks) {
    issues.push({
      type: 'warning',
      category: 'code',
      message: `Found ${emptyCodeBlocks.length} empty code block(s)`,
    });
  }

  // Check for malformed code blocks
  const codeBlockStarts = (content.match(/```/g) || []).length;
  if (codeBlockStarts % 2 !== 0) {
    issues.push({
      type: 'error',
      category: 'code',
      message: 'Unmatched code block delimiters (```)',
    });
  }

  return issues;
}

function validateLinks(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find all markdown links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = Array.from(content.matchAll(linkRegex));

  for (const link of links) {
    const linkText = link[1];
    const linkUrl = link[2];

    // Check for empty links
    if (!linkText.trim()) {
      issues.push({
        type: 'warning',
        category: 'links',
        message: `Empty link text for URL: ${linkUrl}`,
      });
    }

    // Check for placeholder links
    if (
      linkUrl.includes('example.com') ||
      linkUrl === '#' ||
      linkUrl === 'TODO'
    ) {
      issues.push({
        type: 'warning',
        category: 'links',
        message: `Placeholder link detected: [${linkText}](${linkUrl})`,
      });
    }

    // Check for broken relative links
    if (
      (linkUrl.startsWith('./') ||
        linkUrl.startsWith('../') ||
        linkUrl.startsWith('/')) &&
      !linkUrl.startsWith('http')
    ) {
      issues.push({
        type: 'warning',
        category: 'links',
        message: `Relative link may be broken: ${linkUrl}`,
      });
    }
  }

  return issues;
}

function validateContent(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check minimum content length
  if (content.length < 500) {
    issues.push({
      type: 'warning',
      category: 'content',
      message: `Content is very short (${content.length} chars). Consider adding more detail.`,
    });
  }

  // Check for common typos or issues
  if (content.includes('TODO') || content.includes('FIXME')) {
    issues.push({
      type: 'warning',
      category: 'content',
      message: 'Contains TODO or FIXME comments',
    });
  }

  // Check for very long lines (might be formatting issues)
  const lines = content.split('\n');
  const longLines = lines.filter((line) => line.length > 200);
  if (longLines.length > 0) {
    issues.push({
      type: 'warning',
      category: 'content',
      message: `Found ${longLines.length} very long line(s) (>200 chars). Consider breaking them up.`,
    });
  }

  return issues;
}

async function validatePattern(filePath: string): Promise<ValidationResult> {
  const fileName = path.basename(filePath, '.mdx');
  const issues: ValidationIssue[] = [];

  try {
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');

    let frontmatter: any;
    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'frontmatter',
        message: `Failed to parse frontmatter: ${error}`,
      });
      return {
        file: fileName,
        valid: false,
        issues,
        warnings: 0,
        errors: 1,
      };
    }

    // Run all validators
    issues.push(...validateFrontmatter(frontmatter, fileName));
    issues.push(...validateStructure(content));
    issues.push(...validateLinks(content));
    issues.push(...validateContent(content));

    // Check TypeScript file exists
    const tsFile = path.join(NEW_SRC_DIR, `${fileName}.ts`);
    try {
      await fs.access(tsFile);
    } catch (_error) {
      issues.push({
        type: 'error',
        category: 'files',
        message: `TypeScript file not found: ${fileName}.ts`,
      });
    }

    // Count errors and warnings
    const errors = issues.filter((i) => i.type === 'error').length;
    const warnings = issues.filter((i) => i.type === 'warning').length;

    return {
      file: fileName,
      valid: errors === 0,
      issues,
      warnings,
      errors,
    };
  } catch (error) {
    return {
      file: fileName,
      valid: false,
      issues: [
        {
          type: 'error',
          category: 'files',
          message: `Failed to read file: ${error}`,
        },
      ],
      warnings: 0,
      errors: 1,
    };
  }
}

// --- PARALLEL EXECUTION ---
async function validateInParallel(
  files: string[],
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const result = await validatePattern(file);
      results.push(result);

      completedValidations++;
      updateProgress();
    }
  }

  // Create worker pool
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

// --- REPORTING ---
function printResults(results: ValidationResult[]) {
  console.log(colorize('\n\n📊 Validation Results Summary', 'cyan'));
  console.log('═'.repeat(60));

  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

  // Summary stats
  console.log(`${colorize('Total:', 'bright')}     ${results.length} patterns`);
  console.log(`${colorize('Valid:', 'green')}     ${valid.length} patterns`);
  if (invalid.length > 0) {
    console.log(`${colorize('Invalid:', 'red')}   ${invalid.length} patterns`);
  }
  if (totalErrors > 0) {
    console.log(`${colorize('Errors:', 'red')}    ${totalErrors} total`);
  }
  if (totalWarnings > 0) {
    console.log(`${colorize('Warnings:', 'yellow')}  ${totalWarnings} total`);
  }

  // Issue breakdown by category
  const issuesByCategory = new Map<string, number>();
  for (const result of results) {
    for (const issue of result.issues) {
      const count = issuesByCategory.get(issue.category) || 0;
      issuesByCategory.set(issue.category, count + 1);
    }
  }

  if (issuesByCategory.size > 0) {
    console.log(`\n${colorize('Issues by Category:', 'bright')}`);
    console.log('─'.repeat(60));
    for (const [category, count] of issuesByCategory.entries()) {
      console.log(`  ${category.padEnd(20)} ${count} issue(s)`);
    }
  }

  // Invalid patterns details
  if (invalid.length > 0) {
    console.log(`\n${colorize('Patterns with Errors:', 'red')}`);
    console.log('─'.repeat(60));

    for (const result of invalid) {
      console.log(
        `\n${colorize(`${result.file}.mdx`, 'bright')} (${
          result.errors
        } error(s), ${result.warnings} warning(s))`,
      );

      // Group issues by category
      const errorsByCategory = new Map<string, ValidationIssue[]>();
      for (const issue of result.issues) {
        if (issue.type === 'error') {
          const issues = errorsByCategory.get(issue.category) || [];
          issues.push(issue);
          errorsByCategory.set(issue.category, issues);
        }
      }

      for (const [category, issues] of errorsByCategory.entries()) {
        console.log(colorize(`  ${category}:`, 'dim'));
        for (const issue of issues) {
          console.log(colorize(`    - ${issue.message}`, 'red'));
        }
      }
    }
  }

  // Patterns with warnings
  const patternsWithWarnings = results.filter((r) => r.valid && r.warnings > 0);
  if (patternsWithWarnings.length > 0) {
    console.log(`\n${colorize('Patterns with Warnings:', 'yellow')}`);
    console.log('─'.repeat(60));

    for (const result of patternsWithWarnings) {
      console.log(
        `\n${colorize(`${result.file}.mdx`, 'bright')} (${
          result.warnings
        } warning(s))`,
      );

      for (const issue of result.issues) {
        if (issue.type === 'warning') {
          console.log(
            colorize(`  [${issue.category}] ${issue.message}`, 'yellow'),
          );
        }
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
}

// --- MAIN ---
async function main() {
  const startTime = Date.now();

  console.log(colorize('\n🔍 Enhanced Pattern Validation', 'bright'));
  console.log(colorize('Validating Effect patterns documentation\n', 'dim'));

  // Get all MDX files
  const files = await fs.readdir(NEW_PUBLISHED_DIR);
  const mdxFiles = files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => path.join(NEW_PUBLISHED_DIR, file));

  totalValidations = mdxFiles.length;
  completedValidations = 0;

  console.log(
    colorize(`Found ${mdxFiles.length} patterns to validate\n`, 'bright'),
  );
  console.log(colorize(`Using concurrency: ${CONCURRENCY}\n`, 'dim'));

  // Validate patterns in parallel
  const results = await validateInParallel(mdxFiles);

  // Print results
  printResults(results);

  const duration = Date.now() - startTime;
  const invalid = results.filter((r) => !r.valid).length;

  if (invalid > 0) {
    console.log(
      colorize(
        `\n❌ Validation completed in ${duration}ms with ${invalid} invalid pattern(s)\n`,
        'red',
      ),
    );
    process.exit(1);
  } else {
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
    if (totalWarnings > 0) {
      console.log(
        colorize(
          `\n✅ All patterns valid in ${duration}ms (${totalWarnings} warnings)\n`,
          'yellow',
        ),
      );
    } else {
      console.log(
        colorize(
          `\n✨ All patterns valid in ${duration}ms with no issues!\n`,
          'green',
        ),
      );
    }
  }
}

main().catch((error) => {
  console.error(colorize('\n💥 Fatal error:', 'red'));
  console.error(error);
  process.exit(1);
});
