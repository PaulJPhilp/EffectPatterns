/**
 * pattern-validator.ts
 *
 * Validates that a published MDX file's Good Example code block exactly matches
 * the corresponding TypeScript file in src.
 *
 * Usage:
 *   npx tsx scripts/publish/pattern-validator.ts \
 *     --file content/published/<id>.mdx \
 *     [--srcdir content/new/src]
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

function extractPublishedTs(mdxContent: string): string | null {
  const m = mdxContent.match(
    /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
  );
  return m ? m[1].trim() : null;
}

const PROJECT_ROOT = process.cwd();
const DEFAULT_SRC = path.join(PROJECT_ROOT, 'content/new/src');

async function main() {
  const fileOpt = argValue('--file');
  if (!fileOpt) {
    throw new Error('--file <published.mdx> is required');
  }
  const filePath = path.resolve(fileOpt);
  const srcDir = path.resolve(argValue('--srcdir') ?? DEFAULT_SRC);

  const full = await fs.readFile(filePath, 'utf8');
  const parts = full.split('---', 3);
  if (parts.length < 3) {
    throw new Error('Missing or malformed frontmatter block');
  }
  const fm = parseYaml(parts[1]) as Record<string, any>;
  if (!fm.id) {
    throw new Error('Missing frontmatter id');
  }
  const id = String(fm.id);

  const body = parts[2];
  const embedded = extractPublishedTs(body);
  if (!embedded) {
    throw new Error('No TypeScript block found in Good Example section');
  }

  const tsPath = path.join(srcDir, `${id}.ts`);
  const tsContent = (await fs.readFile(tsPath, 'utf8')).trim();

  if (embedded.trim() !== tsContent.trim()) {
    console.error(`❌ Validation failed for ${path.basename(filePath)}`);
    console.error(
      `   Embedded code does not match ${path.relative(PROJECT_ROOT, tsPath)}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`✅ Validation passed for ${path.basename(filePath)}`);
}

main().catch((err) => {
  console.error('❌ Validator error:', err);
  process.exit(1);
});
