/**
 * prepublish-check.ts
 *
 * Batch prepublish checker for processed MDX files.
 * - Scans an input directory for .mdx (default: content/new/processed)
 * - For each <id>.mdx, ensures corresponding TS at content/new/src/<id>.ts
 * - Invokes prepublish-check-one.ts per file and aggregates results
 *
 * Usage:
 *   bunx tsx scripts/publish/prepublish-check.ts \
 *     [--indir content/new/processed] \
 *     [--srcdir content/new/src] \
 *     [--eslint] \
 *     [--concurrency 4]
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
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
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

const PROJECT_ROOT = process.cwd();
const DEFAULT_IN = path.join(PROJECT_ROOT, 'content/new/processed');
const DEFAULT_SRC = path.join(PROJECT_ROOT, 'content/new/src');

async function listMdx(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.mdx'))
    .map((e) => path.join(dir, e.name));
}

async function worker(
  queue: string[],
  results: Array<{ file: string; ok: boolean; output: string }>,
  opts: { srcDir: string; eslint: boolean },
) {
  for (;;) {
    const file = queue.pop();
    if (!file) return;

    const rel = path.relative(PROJECT_ROOT, file);
    console.log(`▶ Prepublish: ${rel}`);

    const args = [
      'tsx',
      path.join('scripts', 'publish', 'prepublish-check-one.ts'),
      '--mdx',
      file,
      '--srcdir',
      opts.srcDir,
    ];
    if (opts.eslint) args.push('--eslint');

    const res = await runCmd('bunx', args, { cwd: PROJECT_ROOT });
    const ok = res.code === 0;
    console.log(`${ok ? '✅' : '❌'} ${rel}`);
    results.push({ file, ok, output: res.stderr || res.stdout });
  }
}

async function main() {
  const inDir = path.resolve(argValue('--indir') ?? DEFAULT_IN);
  const srcDir = path.resolve(argValue('--srcdir') ?? DEFAULT_SRC);
  const eslint = hasFlag('--eslint');
  const conc = Math.max(1, Number(argValue('--concurrency') ?? 4));
  const countArg = argValue('--count');
  const reportPath = argValue('--report');

  try {
    await fs.access(inDir);
  } catch {
    throw new Error(`Input directory not found: ${inDir}`);
  }
  try {
    await fs.access(srcDir);
  } catch {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  let files = await listMdx(inDir);
  if (countArg) {
    const n = Math.max(0, Number(countArg));
    if (Number.isFinite(n) && n > 0) files = files.slice(0, n);
  }
  if (files.length === 0) {
    console.log('No .mdx files found in', path.relative(PROJECT_ROOT, inDir));
    return;
  }

  const queue = files.slice().reverse();
  const results: Array<{ file: string; ok: boolean; output: string }> = [];

  const workers = Array.from({ length: conc }, () =>
    worker(queue, results, { srcDir, eslint }),
  );
  await Promise.all(workers);

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log('\nPrepublish summary:');
  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: ${passed.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log('-', path.relative(PROJECT_ROOT, f.file));
      process.stderr.write(`${f.output}\n`);
    }
  }

  // Optional JSON report
  if (reportPath) {
    const report = {
      indir: path.relative(PROJECT_ROOT, inDir),
      srcdir: path.relative(PROJECT_ROOT, srcDir),
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      results: results.map((r) => ({
        file: path.relative(PROJECT_ROOT, r.file),
        ok: r.ok,
        output: r.output,
      })),
      timestamp: new Date().toISOString(),
    };
    await fs.writeFile(
      path.resolve(reportPath),
      JSON.stringify(report, null, 2),
      'utf8',
    );
    console.log('\nReport written:', path.resolve(reportPath));
  }

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Batch prepublish error:', err);
  process.exit(1);
});
