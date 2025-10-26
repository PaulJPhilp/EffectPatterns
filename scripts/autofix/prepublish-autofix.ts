#!/usr/bin/env tsx

/**
 * Prepublish Autofix (scaffold)
 *
 * Reads a prepublish JSON report produced by
 * scripts/publish/prepublish-check.ts --report <file>
 * Aggregates TypeScript errors by frequency and prints a summary.
 *
 * Flags:
 *   --report <path>       Input JSON report (default: prepublish-report.json)
 *   --only <codes>        Comma-separated TS codes to include (e.g. TS2339,TS2551)
 *   --limit <n>           Max files to consider (by report order)
 *   --dry-run             Default. Show summary only; do not apply changes
 *   --write               (Planned) Apply deterministic fixes (future codemods)
 *   --out <path>          Write a JSON summary of frequencies and failing files
 *   --ai                  Generate AI prompt packs for failing files (no API calls)
 *   --ai-limit <n>        Limit number of AI prompt packs to generate
 *   --ai-call             Call AI provider to generate fixes (report-driven)
 *   --provider <name>     AI provider (default: google)
 *   --model <name>        Model name (default: gemini-2.5-flash)
 *   --attempts <n>        Max attempts per file (default: 1)
 *   --style-gate          Enforce style (80 cols, Biome format+lint) on suggestions
 *   --idiom <path>        Path to idiomatic style guide (default: IdiomaticEffect.mdx)
 *
 * Note: This is a scaffold. No file mutations are performed yet.
 */

import { exec as _exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

// Style gate uses Biome via bunx

const exec = promisify(_exec);

const CWD = process.cwd();
// Load environment variables from .env at repo root
dotenv.config({ path: path.resolve(CWD, '.env') });

type Result = {
  file: string;
  ok: boolean;
  output: string;
};

type PrepublishReport = {
  indir: string;
  srcdir: string;
  total: number;
  passed: number;
  failed: number;
  results: Result[];
  timestamp: string;
};

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseOnly(): Set<string> | undefined {
  const raw = argValue('--only');
  if (!raw) return;
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return set;
}

function normMsg(line: string): { code?: string; message?: string } {
  // Matches: ... error TSXXXX: <message>
  const m = line.match(/error\s+(TS\d+):\s*(.*)$/);
  if (!m) return {};
  return { code: m[1], message: m[2] };
}

async function readReport(file: string): Promise<PrepublishReport> {
  const p = path.resolve(CWD, file);
  const txt = await fs.readFile(p, 'utf8');
  return JSON.parse(txt);
}

function summarize(
  report: PrepublishReport,
  opts: {
    only?: Set<string>;
    limit?: number;
  },
) {
  const { results } = report;
  const limited =
    typeof opts.limit === 'number' && opts.limit > 0
      ? results.slice(0, opts.limit)
      : results;

  const fails = limited.filter((r) => !r.ok);
  const freq = new Map<string, number>();
  const byCode = new Map<
    string,
    { count: number; files: Set<string>; samples: string[] }
  >();

  for (const r of fails) {
    const lines = r.output.split(/\r?\n/).filter(Boolean);
    for (const ln of lines) {
      const { code, message } = normMsg(ln);
      if (!(code && message)) continue;
      if (opts.only && !opts.only.has(code)) continue;

      const key = `${code}: ${message}`;
      freq.set(key, (freq.get(key) || 0) + 1);

      if (!byCode.has(code)) {
        byCode.set(code, { count: 0, files: new Set(), samples: [] });
      }
      const bucket = byCode.get(code)!;
      bucket.count += 1;
      bucket.files.add(r.file);
      if (bucket.samples.length < 5) bucket.samples.push(ln);
    }
  }

  const freqArr = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const byCodeArr = [...byCode.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  return { freqArr, byCodeArr, failsCount: fails.length };
}

async function maybeWriteSummary(outPath: string | undefined, data: unknown) {
  if (!outPath) return;
  const abs = path.resolve(CWD, outPath);
  await fs.writeFile(abs, JSON.stringify(data, null, 2), 'utf8');
  console.log('Summary written:', abs);
}

async function main() {
  const inReport = argValue('--report') ?? 'prepublish-report.json';
  const only = parseOnly();
  const limitArg = argValue('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const dryRun = !hasFlag('--write');
  const out = argValue('--out');
  const ai = hasFlag('--ai');
  const aiLimitArg = argValue('--ai-limit');
  const aiLimit = aiLimitArg ? Number(aiLimitArg) : undefined;
  const aiCall = hasFlag('--ai-call');
  const provider = argValue('--provider') ?? 'google';
  const model = argValue('--model') ?? 'gemini-2.5-flash';
  const attemptsArg = argValue('--attempts');
  const attempts = attemptsArg ? Math.max(1, Number(attemptsArg)) : 1;
  const styleGate = hasFlag('--style-gate');

  // Idiom guide (optional)
  const idiomArg = argValue('--idiom');
  const idiomPath = idiomArg ?? path.join(CWD, 'IdiomaticEffect.mdx');
  let idiomText: string | undefined;
  try {
    const text = await fs.readFile(idiomPath, 'utf8');
    if (text && text.trim().length > 0) {
      idiomText = text;
      console.log('Idiom guide loaded:', path.relative(CWD, idiomPath));
    }
  } catch {
    // If default is missing and no explicit --idiom was provided, ignore silently
    if (idiomArg) {
      console.warn('Could not read idiom guide at:', idiomPath);
    }
    idiomText = undefined;
  }

  const report = await readReport(inReport);
  const { freqArr, byCodeArr, failsCount } = summarize(report, {
    only,
    limit,
  });

  console.log('Prepublish Autofix Summary (scaffold)');
  console.log('Report:', path.resolve(CWD, inReport));
  console.log('Files failing:', failsCount);
  if (only) console.log('Only codes:', [...only].join(','));
  if (limit) console.log('Limit:', limit);
  if (aiCall) {
    console.log(`AI: provider=${provider} model=${model} attempts=${attempts}`);
    if (styleGate) console.log('Style gate: enabled (Biome + 80 cols)');
    if (idiomText) console.log('AI will use idiomatic guide content in prompt');
  }

  console.log('\nTop error messages by frequency:');
  for (const [msg, count] of freqArr.slice(0, 50)) {
    console.log(String(count).padStart(3), 'x', msg);
  }

  console.log('\nTotals by TS code:');
  for (const [code, info] of byCodeArr) {
    console.log(`${code} -> ${info.count} issues, ${info.files.size} files`);
  }

  await maybeWriteSummary(out, {
    inputReport: path.resolve(CWD, inReport),
    only: only ? [...only] : undefined,
    limit,
    byMessage: freqArr.map(([message, count]) => ({ message, count })),
    byCode: byCodeArr.map(([code, info]) => ({
      code,
      count: info.count,
      files: [...info.files],
      samples: info.samples,
    })),
    timestamp: new Date().toISOString(),
  });

  if (!dryRun) {
    console.log(
      '\n--write provided, but no codemods implemented yet. ' +
        'This scaffold only summarizes errors.',
    );
  }

  if (ai) {
    // Produce AI prompt packs for failing files
    const aiDir = path.resolve(CWD, 'scripts/autofix/ai');
    await fs.mkdir(aiDir, { recursive: true });

    const fails = report.results.filter((r) => !r.ok);
    const selected =
      typeof aiLimit === 'number' && aiLimit > 0
        ? fails.slice(0, aiLimit)
        : fails;

    const packs: Array<{ file: string; promptPath: string }> = [];
    for (const r of selected) {
      // infer TS file from output by reading the first ts path in errors
      const m = r.output.match(/(content\/new\/src\/[^\s:]+\.ts)/);
      const tsPath = m ? m[1] : undefined;
      let tsContent = '';
      if (tsPath) {
        try {
          tsContent = await fs.readFile(path.resolve(CWD, tsPath), 'utf8');
        } catch {
          // ignore
        }
      }
      const data = {
        instruction:
          'You are fixing TypeScript examples for Effect Patterns. ' +
          'Make minimal changes to pass tsc while keeping semantics and ' +
          'teaching intent. Keep lines <= 80 chars. Explain changes briefly.',
        mdx: path.relative(
          CWD,
          r.file.replace(/src\//, 'processed/').replace(/\.ts$/, '.mdx'),
        ),
        tsFile: tsPath,
        errorOutput: r.output,
        tsContent,
      };
      const base = path
        .basename(tsPath || path.basename(r.file).replace(/\.mdx$/, '.ts'))
        .replace(/\.ts$/, '');
      const promptFile = path.join(aiDir, `${base}.prompt.json`);
      await fs.writeFile(promptFile, JSON.stringify(data, null, 2), 'utf8');
      packs.push({ file: r.file, promptPath: promptFile });
    }

    const consolidated = path.join(aiDir, 'batch.prompts.json');
    await fs.writeFile(
      consolidated,
      JSON.stringify(
        {
          report: path.resolve(CWD, inReport),
          packs,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log('\nAI prompt packs written to:', aiDir);
    console.log('Consolidated:', consolidated);
  }

  if (aiCall) {
    if (provider !== 'google') {
      throw new Error(
        `Only provider=google supported in this scaffold (got ${provider})`,
      );
    }

    const report = await readReport(inReport);
    const srcdir = path.resolve(CWD, report.srcdir);

    const fails = report.results.filter((r) => !r.ok);
    const selected =
      typeof limit === 'number' && limit > 0 ? fails.slice(0, limit) : fails;

    const aiDir = path.resolve(CWD, 'scripts/autofix/ai');
    const suggDir = path.join(aiDir, 'suggestions');
    await fs.mkdir(suggDir, { recursive: true });

    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_API_KEY env var is required for --ai-call provider=google',
      );
    }
    const usedKeyName = process.env.GOOGLE_API_KEY
      ? 'GOOGLE_API_KEY'
      : process.env.GOOGLE_AI_API_KEY
        ? 'GOOGLE_AI_API_KEY'
        : process.env.GEMINI_API_KEY
          ? 'GEMINI_API_KEY'
          : '(none)';
    console.log(`Using API key from ${usedKeyName}`);

    for (const r of selected) {
      const mdxPath = path.resolve(CWD, r.file);
      const tsMatch = r.output.match(/(content\/new\/src\/[^\s:]+\.ts)/);
      const tsPath = tsMatch ? path.resolve(CWD, tsMatch[1]) : undefined;
      if (!tsPath) {
        console.log('Skipping (no TS path found):', r.file);
        continue;
      }

      let tsContent = '';
      try {
        tsContent = await fs.readFile(tsPath, 'utf8');
      } catch {
        console.log('Skipping (TS file missing):', tsPath);
        continue;
      }

      console.log('\n▶ AI fixing:', path.relative(CWD, tsPath));
      let attempt = 0;
      let fixed = false;
      let _lastProposal = '';
      while (attempt < attempts && !fixed) {
        attempt++;
        const proposal = await callGeminiFix({
          apiKey,
          model,
          tsPath,
          tsContent,
          errorOutput: r.output,
          guidance: undefined,
          idiom: idiomText,
        });
        _lastProposal = proposal;

        let extracted = extractCodeBlock(proposal) ?? proposal;
        const banned = findBanned(extracted);
        if (
          banned.length > 0 ||
          !extractCodeBlock(proposal) ||
          (styleGate && !(await passesStyleGate(extracted)))
        ) {
          console.log(
            'Suggestion failed gate (banned/missing/format/lint).' +
              (banned.length ? ` Banned: ${banned.join(', ')}.` : '') +
              ' Retrying with stricter guidance...',
          );
          const retry = await callGeminiFix({
            apiKey,
            model,
            tsPath,
            tsContent,
            errorOutput: r.output,
            guidance: buildCorrectiveGuidance(banned, styleGate),
            idiom: idiomText,
          });
          extracted = extractCodeBlock(retry) ?? retry;
          // One more local format attempt after retry
          if (styleGate) {
            extracted = await formatWithBiome(extracted);
          }
        }
        if (styleGate && !(await passesStyleGate(extracted))) {
          console.log(
            'Suggestion still fails style gate; saving anyway for review.',
          );
        }
        const outFile = path.join(
          suggDir,
          path.basename(tsPath).replace(/\.ts$/, `.attempt${attempt}.ts`),
        );
        // Save formatted when style gate enabled
        const toSave = styleGate ? await formatWithBiome(extracted) : extracted;
        await fs.writeFile(outFile, toSave, 'utf8');
        console.log('AI suggestion saved:', path.relative(CWD, outFile));

        if (!dryRun) {
          await fs.writeFile(
            tsPath,
            styleGate ? await formatWithBiome(extracted) : extracted,
            'utf8',
          );
          // Re-check the single file
          const ok = await prepublishCheckOne({ mdxPath, srcdir });
          console.log(ok ? '✅ Re-check passed' : '❌ Re-check failed');
          if (ok) fixed = true;
        }
      }

      if (!(fixed || dryRun)) {
        console.log('Still failing after attempts:', attempts);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// --- Helpers for AI flow ---

function extractCodeBlock(text: string): string | undefined {
  // Extract first triple-backtick block; prefer ts/tsx code fence
  const fence =
    text.match(/```(?:ts|tsx)?\n([\s\S]*?)```/m) ||
    text.match(/```\n([\s\S]*?)```/m);
  return fence ? fence[1] : undefined;
}

async function callGeminiFix(args: {
  apiKey: string;
  model: string;
  tsPath: string;
  tsContent: string;
  errorOutput: string;
  guidance?: string | undefined;
  idiom?: string | undefined;
}): Promise<string> {
  const system = [
    // Optional idiomatic guide content placed first to set tone/style
    args.idiom
      ? `Idiomatic Effect-TS Guide (verbatim):\n\n${args.idiom}`
      : undefined,
    "You are an expert Effect v3 engineer. Produce a single TypeScript code block fenced with ```ts that fully replaces the user's file to fix the reported errors.",
    'Follow these strict rules:',
    "- Use ONLY Effect v3 canonical APIs from 'effect'.",
    '- Preserve teaching intent; make MINIMAL edits.',
    '- Lines must be <= 80 chars.',
    '- Return ONLY the corrected file as a fenced ```ts block.',
    'Banlist (do NOT use):',
    '- Option.cond, Either.cond, Stream.if, Effect.matchTag',
    '- Schema.string (use Schema.String), Brand.schema',
    '- Chunk.fromArray, Chunk.concat (static)',
    '- DateTime.fromISOString, DateTime.toISOString, DateTime.plus/minus/before',
    '- Duration.add, Duration.toISOString',
  ].join('\n');

  const rules = [
    'Rules:',
    '- For optional values: Option.some/none, Option.isSome narrowing.',
    '- For Either: use Either.right/left constructors, and isRight/isLeft',
    '  for narrowing before accessing .right/.left.',
    '- For Stream: use map/flatMap/filter; do not invent methods.',
    '- For collections: Effect.all([...]) to combine effects.',
    '- For Chunk: use Chunk.make(...) or fromIterable(...).',
    '- No namespace types (e.g., Option as a type) — use concrete types.',
    "- Import only from 'effect' barrel; no deep imports.",
    '- Output should be Biome-format clean and pass lint.',
  ].join('\n');

  const user = [
    'File:',
    args.tsPath,
    `\nErrors:\n${args.errorOutput}`,
    `\nCurrent content:\n\`\`\`ts\n${args.tsContent}\n\`\`\``,
    args.guidance ? `\nGuidance:\n${args.guidance}` : '',
    '\nOutput: corrected file as ```ts fenced block only.',
  ].join('\n');

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    `${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(
      args.apiKey,
    )}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${system}\n\n${rules}\n\n${user}` }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${txt}`);
  }
  const _json: any = await res.json();
  const text = await extractGeminiText(
    args.apiKey,
    args.model,
    system,
    user,
    args.guidance,
  );
  if (!text?.trim()) {
    console.warn(
      'Gemini response missing text; returning empty string to allow retry.',
    );
    return '';
  }
  return text;
}

async function extractGeminiText(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  _guidance?: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    },
  );
  const json: any = await response.json();
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? '';
}

// --- Banlist & style helpers ---
function buildCorrectiveGuidance(banned: string[], styleGate: boolean): string {
  const items = banned.length ? `Banned used: ${banned.join(', ')}. ` : '';
  const style = styleGate
    ? 'Also ensure <= 80 cols, idiomatic Effect v3, and Biome-clean output. '
    : '';
  return (
    items +
    style +
    'Rewrite using ONLY allowed Effect v3 APIs per the constraints.'
  );
}

function getBanlist(): RegExp[] {
  return [
    /\bOption\.cond\b/,
    /\bEither\.cond\b/,
    /\bStream\.if\b/,
    /\bEffect\.matchTag\b/,
    /\bSchema\.string\b/,
    /\bBrand\.schema\b/,
    /\bChunk\.fromArray\b/,
    /\bChunk\.concat\s*\(/,
    /\bDateTime\.(fromISOString|toISOString|plus|minus|before)\b/,
    /\bDuration\.(add|toISOString)\b/,
  ];
}

function findBanned(text: string): string[] {
  const matches: string[] = [];
  for (const rx of getBanlist()) {
    if (rx.test(text)) {
      matches.push(rx.source);
    }
  }
  return matches;
}

async function formatWithBiome(code: string): Promise<string> {
  const tmpDir = path.join(CWD, 'scripts/autofix/ai/tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `fmt-${Date.now()}-${Math.random()}.ts`);
  await fs.writeFile(tmpFile, code, 'utf8');
  try {
    await exec(`bunx biome format --write ${JSON.stringify(tmpFile)}`, {
      cwd: CWD,
    });
    const formatted = await fs.readFile(tmpFile, 'utf8');
    return formatted;
  } catch {
    return code;
  } finally {
    try {
      await fs.unlink(tmpFile);
    } catch {}
  }
}

async function passesStyleGate(code: string): Promise<boolean> {
  // 1) Line length gate
  const lines = code.split('\n');
  const tooLong = lines.find((l) => l.length > 80);
  if (tooLong) return false;

  // 2) Biome lint gate (best-effort).
  const tmpDir = path.join(CWD, 'scripts/autofix/ai/tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `lint-${Date.now()}-${Math.random()}.ts`);
  await fs.writeFile(tmpFile, code, 'utf8');
  try {
    const { stdout } = await exec(
      `bunx biome lint --reporter json ${JSON.stringify(tmpFile)}`,
      { cwd: CWD },
    );
    // Parse Biome JSON and check for errors
    try {
      const report = JSON.parse(stdout);
      const hasErrors = Array.isArray(report?.files)
        ? report.files.some(
            (f: any) =>
              Array.isArray(f.diagnostics) &&
              f.diagnostics.some((d: any) => d.severity === 'error'),
          )
        : false;
      if (hasErrors) return false;
    } catch {}
    return true;
  } catch {
    // If Biome missing or fails, don't block
    return true;
  } finally {
    try {
      await fs.unlink(tmpFile);
    } catch {}
  }
}

async function prepublishCheckOne(args: {
  mdxPath: string;
  srcdir: string;
}): Promise<boolean> {
  try {
    const cmd =
      'bunx tsx scripts/publish/prepublish-check-one.ts ' +
      `--mdx ${JSON.stringify(path.relative(CWD, args.mdxPath))} ` +
      `--srcdir ${JSON.stringify(path.relative(CWD, args.srcdir))}`;
    const { stdout, stderr } = await exec(cmd, { cwd: CWD });
    const ok = /Pre-publish checks passed/.test(stdout) && !stderr;
    return ok;
  } catch (_e: any) {
    return false;
  }
}
