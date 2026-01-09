/**
 * publish-one.ts
 *
 * Single-file publish: takes one processed MDX (with <Example />) and writes
 * published MDX with embedded TypeScript code.
 *
 * Usage:
 *   npx tsx scripts/publish/publish-one.ts \
 *     --file content/new/processed/<id>.mdx \
 *     [--srcdir content/new/src] \
 *     [--outdir content/published]
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

const PROJECT_ROOT = process.cwd();
const DEFAULT_SRC = path.join(PROJECT_ROOT, 'content/new/src');
const DEFAULT_OUT = path.join(PROJECT_ROOT, 'content/published');

async function main() {
  const fileOpt = argValue('--file');
  if (!fileOpt) {
    throw new Error('--file <processed.mdx> is required');
  }
  const filePath = path.resolve(fileOpt);
  const srcDir = path.resolve(argValue('--srcdir') ?? DEFAULT_SRC);
  const outDir = path.resolve(argValue('--outdir') ?? DEFAULT_OUT);

  await fs.mkdir(outDir, { recursive: true });

  const content = await fs.readFile(filePath, 'utf8');

  // parse frontmatter
  const parts = content.split('---', 3);
  if (parts.length < 3) {
    throw new Error('Missing or malformed frontmatter block');
  }
  const fm = parseYaml(parts[1]) as Record<string, any>;
  if (!fm.id) {
    throw new Error('Missing frontmatter id');
  }
  const id = String(fm.id);

  // Find TS file
  const tsFile = path.join(srcDir, `${id}.ts`);
  const tsContent = await fs.readFile(tsFile, 'utf8');

  // Replace Example tag(s) with code block
  const processed = content.replace(
    /<Example path="\.\/src\/.*?" \/>/g,
    `\`\`\`typescript\n${tsContent}\n\`\`\``,
  );

  const outFile = path.join(outDir, path.basename(filePath));
  await fs.writeFile(outFile, processed, 'utf8');

  console.log(
    `✅ Published one pattern -> ${path.relative(PROJECT_ROOT, outFile)}`,
  );
}

main().catch((err) => {
  console.error('❌ Publish failed:', err);
  process.exit(1);
});
