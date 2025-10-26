/**
 * process-one.ts
 *
 * Single-file ingest: processes one MDX from content/new/raw into
 * - content/new/src/<id>.ts (extracted Good Example)
 * - content/new/processed/<id>.mdx (Example tag inserted)
 *
 * Usage:
 *   npx tsx scripts/ingest/process-one.ts \
 *     --file content/new/raw/<name>.mdx
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

const PROJECT_ROOT = process.cwd();
const NEW_DIR = path.join(PROJECT_ROOT, 'content/new');
const NEW_RAW_DIR = path.join(NEW_DIR, 'raw');
const NEW_SRC_DIR = path.join(NEW_DIR, 'src');
const NEW_PROCESSED_DIR = path.join(NEW_DIR, 'processed');

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

function extractGoodExampleTS(mdx: string): string | null {
  const m = mdx.match(/## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

function replaceGoodExampleWithTag(mdx: string, id: string): string {
  return mdx.replace(
    /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
    `## Good Example\n\n<Example path="./src/${id}.ts" />`,
  );
}

async function main() {
  await fs.mkdir(NEW_RAW_DIR, { recursive: true });
  await fs.mkdir(NEW_SRC_DIR, { recursive: true });
  await fs.mkdir(NEW_PROCESSED_DIR, { recursive: true });

  const fileOpt = argValue('--file');
  if (!fileOpt) {
    throw new Error('--file <path-to-raw-mdx> is required');
  }
  const filePath = path.resolve(fileOpt);
  if (!filePath.endsWith('.mdx')) {
    throw new Error('Provided --file must be an .mdx file');
  }

  const raw = await fs.readFile(filePath, 'utf8');

  // parse frontmatter
  const parts = raw.split('---', 3);
  if (parts.length < 3) {
    throw new Error('Missing or malformed frontmatter block');
  }
  const frontmatter = parseYaml(parts[1]) as Record<string, any>;
  for (const key of ['id', 'title']) {
    if (!frontmatter[key]) {
      throw new Error(`Missing required frontmatter field '${key}'`);
    }
  }

  const tsCode = extractGoodExampleTS(raw);
  if (!tsCode) {
    throw new Error(
      `No TypeScript code block found in Good Example section of ${path.basename(
        filePath,
      )}`,
    );
  }

  const id = String(frontmatter.id);
  const tsOut = path.join(NEW_SRC_DIR, `${id}.ts`);
  const mdxOut = path.join(NEW_PROCESSED_DIR, `${id}.mdx`);

  await fs.writeFile(tsOut, tsCode, 'utf8');
  const processed = replaceGoodExampleWithTag(raw, id);
  await fs.writeFile(mdxOut, processed, 'utf8');

  console.log(`✅ Ingested one pattern: ${path.basename(filePath)}`);
  console.log(`  TS -> ${path.relative(PROJECT_ROOT, tsOut)}`);
  console.log(`  MDX -> ${path.relative(PROJECT_ROOT, mdxOut)}`);
}

main().catch((err) => {
  console.error('❌ Ingest failed:', err);
  process.exit(1);
});
