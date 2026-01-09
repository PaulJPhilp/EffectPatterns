/**
 * prepublish-check-one.ts
 *
 * Validates a single processed MDX and its example TS before publishing.
 * - MDX frontmatter must include id and title
 * - MDX must contain <Example path="./src/<id>.ts" /> in Good Example
 * - The TS file must exist
 * - Optionally runs `tsc --noEmit` on the TS file
 * - Optionally runs `eslint` on the TS file
 *
 * Usage:
 *   bunx tsx scripts/publish/prepublish-check-one.ts \
 *     --mdx content/new/processed/<id>.mdx \
 *     [--srcdir content/new/src] \
 *     [--tsconfig tsconfig.json] \
 *     [--eslint]
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function extractGoodExamplePath(mdx: string): string | null {
  const m = mdx.match(/<Example path="(\.\/src\/[^"\n]+)" \/>/);
  return m ? m[1] : null;
}

async function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

const PROJECT_ROOT = process.cwd();
const DEFAULT_SRC = path.join(PROJECT_ROOT, 'content/new/src');

async function main() {
  const mdxPathArg = argValue('--mdx');
  if (!mdxPathArg) {
    throw new Error('--mdx <processed.mdx> is required');
  }
  const mdxPath = path.resolve(mdxPathArg);
  const srcDir = path.resolve(argValue('--srcdir') ?? DEFAULT_SRC);
  // We intentionally avoid project-wide type-checks to prevent unrelated
  // repo types from failing this single-file check.
  // --tsconfig is accepted but ignored to keep this check isolated.
  const _tsconfig = argValue('--tsconfig');
  const runEslint = hasFlag('--eslint');

  const full = await fs.readFile(mdxPath, 'utf8');
  const parts = full.split('---', 3);
  if (parts.length < 3) {
    throw new Error('Missing or malformed frontmatter block');
  }
  const fm = parseYaml(parts[1]) as Record<string, any>;
  for (const key of ['id', 'title']) {
    if (!fm[key]) {
      throw new Error(`Missing required frontmatter field '${key}'`);
    }
  }
  const id = String(fm.id);

  const examplePath = extractGoodExamplePath(parts[2]);
  if (!examplePath) {
    throw new Error('Missing <Example path=... /> in Good Example section');
  }

  const expected = `./src/${id}.ts`;
  if (examplePath !== expected) {
    throw new Error(
      `Example path mismatch. Expected '${expected}', got '${examplePath}'`,
    );
  }

  const tsPath = path.join(srcDir, `${id}.ts`);
  try {
    await fs.access(tsPath);
  } catch {
    throw new Error(`Missing TS source file: ${tsPath}`);
  }

  // Always per-file compile with safe flags to avoid repo-wide type
  // interactions (Node vs Bun types, private identifiers in libs, etc.)
  const tsc = await runCmd('bunx', [
    'tsc',
    '--noEmit',
    '--target',
    'ES2020',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--skipLibCheck',
    tsPath,
  ]);
  if (tsc.code !== 0) {
    console.error('❌ TypeScript check failed:');
    process.stderr.write(tsc.stderr || tsc.stdout);
    process.exit(1);
  }

  // optional eslint
  if (runEslint) {
    const eslint = await runCmd('bunx', ['eslint', tsPath]);
    if (eslint.code !== 0) {
      console.error('❌ ESLint failed:');
      process.stderr.write(eslint.stderr || eslint.stdout);
      process.exit(1);
    }
  }

  console.log('✅ Pre-publish checks passed for:', path.basename(mdxPath));
  console.log('  MDX:', path.relative(PROJECT_ROOT, mdxPath));
  console.log('  TS:', path.relative(PROJECT_ROOT, tsPath));
}

main().catch((err) => {
  console.error('❌ Pre-publish check error:', err);
  process.exit(1);
});
