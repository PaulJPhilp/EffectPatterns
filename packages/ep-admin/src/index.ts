#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 * Built with @effect/cli for type-safe, composable command-line interfaces.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import {
  createApplicationPatternRepository,
  createDatabase,
  createEffectPatternRepository,
  createJobRepository,
} from "@effect-patterns/toolkit";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { FileSystem, HttpClient } from "@effect/platform";
import { NodeContext, NodeFileSystem } from "@effect/platform-node";
import { Console, Effect, Layer, Option, Schema } from "effect";
import { glob } from "glob";
import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import ora from "ora";
import * as semver from "semver";
import {
  EP_ADMIN_COMMANDS,
  generateCompletion,
  getInstallInstructions,
  installCompletion,
  type Shell,
} from "./completions.js";
import { dbCommand } from "./db-commands.js";
import { discordCommand } from "./discord-commands.js";
import { ingestCommand } from "./ingest-commands.js";
import { migrateCommand } from "./migrate-commands.js";
import { opsCommand } from "./ops-commands.js";
import { pipelineManagementCommand } from "./pipeline-commands.js";
import { publishCommand } from "./publish-commands.js";
import { qaCommand } from "./qa-commands.js";
import { showError, showPanel, showSuccess } from "./services/display.js";
import { skillsCommand } from "./skills-commands.js";
import {
  generateCategorySkill,
  generateGeminiSkill,
  generateOpenAISkill,
  groupPatternsByCategory,
  patternFromDatabase,
  writeGeminiSkill,
  writeOpenAISkill,
  writeSkill,
  type PatternContent,
} from "./skills/skill-generator.js";
import { testUtilsCommand } from "./test-utils-commands.js";

// --- PROJECT ROOT RESOLUTION ---
// Find the project root by looking for package.json with "name": "effect-patterns-hub"
const getProjectRoot = (): string => {
  let current = process.cwd();
  while (current !== "/") {
    try {
      const pkgPath = path.join(current, "package.json");
      const content = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
      if (content.name === "effect-patterns-hub") {
        return current;
      }
    } catch {
      // Continue searching up
    }
    current = path.dirname(current);
  }
  // Fallback to current working directory
  return process.cwd();
};

const PROJECT_ROOT = getProjectRoot();

// --- HELPER FUNCTIONS ---

/**
 * Execute a script and stream its output to the console
 */
const _executeScript = (scriptPath: string) =>
  Effect.async<void, Error>((resume) => {
    const child = spawn("bun", ["run", scriptPath], {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      resume(Effect.fail(error));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed(void 0));
      } else {
        resume(Effect.fail(new Error(`Script exited with code ${code}`)));
      }
    });
  });

/**
 * Execute a script with progress indication and optional verbose output
 */
const executeScriptWithProgress = (
  scriptPath: string,
  taskName: string,
  options?: { verbose?: boolean }
) =>
  Effect.async<void, Error>((resume) => {
    // Only show spinner in TTY environments and when not verbose
    const shouldShowSpinner = process.stderr.isTTY && !options?.verbose;

    const spinner = shouldShowSpinner
      ? ora({
        text: taskName,
        stream: process.stderr, // Keep stdout clean for composability
      }).start()
      : null;

    const child = spawn("bun", ["run", scriptPath], {
      stdio: options?.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let output = "";

    // Capture output when not in verbose mode
    if (!options?.verbose) {
      child.stdout?.on("data", (data) => {
        output += data.toString();
      });
      child.stderr?.on("data", (data) => {
        output += data.toString();
      });
    }

    child.on("error", (error) => {
      if (spinner) {
        spinner.fail(`${taskName} failed`);
      } else {
        console.error(`❌ ${taskName} failed`);
      }

      // Show captured output on failure
      if (!options?.verbose && output) {
        console.error(`\n${output}`);
      }

      resume(Effect.fail(error));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        if (spinner) {
          spinner.succeed(`${taskName} completed`);
        } else {
          console.log(`✓ ${taskName} completed`);
        }
        resume(Effect.succeed(void 0));
      } else {
        if (spinner) {
          spinner.fail(`${taskName} failed (exit code ${code})`);
        } else {
          console.error(`❌ ${taskName} failed (exit code ${code})`);
        }

        // Show captured output on failure
        if (!options?.verbose && output) {
          console.error(`\n${output}`);
        }

        resume(Effect.fail(new Error(`Script exited with code ${code}`)));
      }
    });
  });

/**
 * Execute a git command
 */
const execGitCommand = (
  command: string,
  args: string[]
): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      execSync(`git ${command} ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: "inherit",
      });
    },
    catch: (error) =>
      new Error(
        `Git command failed: ${error instanceof Error ? error.message : String(error)
        }`
      ),
  });

/**
 * Get the latest git tag
 */
const getLatestTag = (): Effect.Effect<string, Error> =>
  Effect.try({
    try: () => {
      const tag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf-8",
      }).trim();
      return tag;
    },
    catch: (error) => {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("No names found")) {
        return new Error(
          "No git tags found in this repository.\n\n" +
          "This is likely the first release. Create an initial tag:\n" +
          "  git tag v0.1.0\n" +
          "  git push origin v0.1.0\n\n" +
          "Or use conventional commits and run:\n" +
          "  bun run ep release create"
        );
      }

      return new Error(
        `Failed to get latest tag: ${message}\n\n` +
        "Make sure you are in a git repository with at least one tag."
      );
    },
  });

/**
 * Get commits since a specific tag
 */
const getCommitsSinceTag = (tag: string): Effect.Effect<string[], Error> =>
  Effect.try({
    try: () => {
      const commits = execSync(`git log ${tag}..HEAD --format=%B%n==END==`, {
        encoding: "utf-8",
      })
        .split("==END==")
        .map((commit) => commit.trim())
        .filter((commit) => commit.length > 0);
      return commits;
    },
    catch: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      return new Error(
        `Failed to get commits since tag ${tag}: ${message}\n\n` +
        "Possible causes:\n" +
        `  • Tag "${tag}" does not exist\n` +
        "  • Not in a git repository\n" +
        "  • Repository history is corrupted\n\n" +
        "Try:\n" +
        "  git tag -l    # List all tags\n" +
        "  git log --oneline    # Verify git history"
      );
    },
  });

/**
 * Determine the recommended version bump based on conventional commits
 */
const getRecommendedBump = (
  _commits: string[]
): Effect.Effect<
  { releaseType: "major" | "minor" | "patch"; reason: string },
  Error
> =>
  Effect.succeed({
    releaseType: "patch" as const,
    reason: "Patch bump for bug fixes and improvements",
  });

/**
 * Parse commits and categorize them
 */
export const categorizeCommits = async (commits: string[]) => {
  // Handle both ESM and CommonJS exports; fall back to a simple parser
  let parseCommit: (message: string) => any;

  try {
    const module = await import("conventional-commits-parser");
    const maybeDefault = (module as any).default;

    if (typeof maybeDefault === "function") {
      parseCommit = maybeDefault as (message: string) => any;
    } else if (typeof (module as any) === "function") {
      parseCommit = module as unknown as (message: string) => any;
    } else {
      throw new Error(
        "No callable export found in conventional-commits-parser"
      );
    }
  } catch {
    // Very small, test-friendly parser that understands the
    // common "type: subject" / "type!: subject" forms. This is
    // only used if the real parser is unavailable or has an
    // unexpected shape.
    parseCommit = (message: string) => {
      const header = message.split("\n")[0] ?? message;
      const match = header.match(
        /^(?<type>\w+)(?:\([^)]*\))?(?<breaking>!)?:\s*(?<subject>.+)$/
      );

      const type = match?.groups?.type;
      const subject = match?.groups?.subject ?? header;
      const notes = match?.groups?.breaking
        ? [{ title: "BREAKING CHANGE" }]
        : [];

      return { type, subject, header, notes };
    };
  }

  const categories = {
    breaking: [] as string[],
    features: [] as string[],
    fixes: [] as string[],
    docs: [] as string[],
    chore: [] as string[],
    other: [] as string[],
  };

  for (const commitMsg of commits) {
    const parsed = parseCommit(commitMsg);

    if (parsed.notes?.some((note: any) => note.title === "BREAKING CHANGE")) {
      categories.breaking.push(parsed.header || commitMsg);
    } else if (parsed.type === "feat") {
      categories.features.push(parsed.subject || commitMsg);
    } else if (parsed.type === "fix") {
      categories.fixes.push(parsed.subject || commitMsg);
    } else if (parsed.type === "docs") {
      categories.docs.push(parsed.subject || commitMsg);
    } else if (
      parsed.type === "chore" ||
      parsed.type === "build" ||
      parsed.type === "ci"
    ) {
      categories.chore.push(parsed.subject || commitMsg);
    } else {
      categories.other.push(parsed.subject || commitMsg);
    }
  }

  return categories;
};

/**
 * Generate a draft changelog from categorized commits
 */
export const generateChangelog = (
  categories: Awaited<ReturnType<typeof categorizeCommits>>,
  currentVersion: string,
  nextVersion: string
) => {
  const lines: string[] = [];

  lines.push(`# Release ${nextVersion}\n`);
  lines.push(`**Previous version:** ${currentVersion}\n`);

  if (categories.breaking.length > 0) {
    lines.push("## 🚨 BREAKING CHANGES\n");
    for (const item of categories.breaking) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (categories.features.length > 0) {
    lines.push("## ✨ Features\n");
    for (const item of categories.features) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (categories.fixes.length > 0) {
    lines.push("## 🐛 Bug Fixes\n");
    for (const item of categories.fixes) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (categories.docs.length > 0) {
    lines.push("## 📚 Documentation\n");
    for (const item of categories.docs) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (categories.chore.length > 0) {
    lines.push("## 🔧 Chores & Maintenance\n");
    for (const item of categories.chore) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (categories.other.length > 0) {
    lines.push("## 📝 Other Changes\n");
    for (const item of categories.other) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

/**
 * Convert a title to a URL-safe kebab-case filename
 */
export const toKebabCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// --- LINTER TYPES & FUNCTIONS ---

interface LintIssue {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

interface LintResult {
  file: string;
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

interface LintRule {
  name: string;
  description: string;
  defaultSeverity: "error" | "warning" | "info" | "off";
  canFix: boolean;
}

// Rule Registry - Single source of truth for all linting rules
export const LINT_RULES: LintRule[] = [
  {
    name: "effect-use-taperror",
    description:
      "Use Effect.tapError for side-effect logging instead of Effect.catchAll + Effect.gen",
    defaultSeverity: "warning",
    canFix: false,
  },
  {
    name: "effect-explicit-concurrency",
    description:
      "Effect.all should explicitly specify concurrency option (runs sequentially by default)",
    defaultSeverity: "warning",
    canFix: true,
  },
  {
    name: "effect-deprecated-api",
    description:
      "Catches usage of deprecated Effect APIs (Effect.fromOption, Option.zip, etc.)",
    defaultSeverity: "error",
    canFix: true,
  },
  {
    name: "effect-prefer-pipe",
    description:
      "Consider using pipe() for better readability with long method chains",
    defaultSeverity: "info",
    canFix: false,
  },
  {
    name: "effect-stream-memory",
    description:
      "Detects non-streaming operations in stream patterns that load entire content into memory",
    defaultSeverity: "error",
    canFix: false,
  },
  {
    name: "effect-error-model",
    description:
      "Consider using typed errors (Data.TaggedError) instead of generic Error",
    defaultSeverity: "info",
    canFix: false,
  },
];

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Rule: effect-use-taperror
 */
function checkUseTapError(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.includes("catchAll") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("Effect.gen")
    ) {
      let nextLines = "";
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        nextLines += lines[j];
        if (lines[j].includes("))")) break;
      }

      if (
        (nextLines.includes("Effect.log") ||
          nextLines.includes("console.log")) &&
        !nextLines.includes("return") &&
        !nextLines.includes("Effect.fail") &&
        !nextLines.includes("Effect.succeed")
      ) {
        issues.push({
          rule: "effect-use-taperror",
          severity: "warning",
          message:
            "Use Effect.tapError for side-effect logging instead of Effect.catchAll + Effect.gen",
          line: i + 1,
          column: line.indexOf("catchAll") + 1,
          suggestion:
            "Replace with: .pipe(Effect.tapError((error) => Effect.log(...)), Effect.catchAll(...))",
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-explicit-concurrency
 */
function checkExplicitConcurrency(
  content: string,
  filePath: string
): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");
  const fileName = path.basename(filePath, ".ts");

  if (
    fileName.includes("sequential") ||
    fileName.includes("sequence") ||
    content.includes("// sequential by design")
  ) {
    return issues;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("Effect.all(") && !line.includes("concurrency")) {
      let hasConcurrency = false;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j].includes("concurrency")) {
          hasConcurrency = true;
          break;
        }
      }

      if (!hasConcurrency) {
        const isParallelPattern =
          fileName.includes("parallel") ||
          fileName.includes("concurrent") ||
          content.includes("// parallel") ||
          content.includes("// concurrently");

        issues.push({
          rule: "effect-explicit-concurrency",
          severity: isParallelPattern ? "error" : "warning",
          message: isParallelPattern
            ? "Effect.all runs sequentially by default. Add { concurrency: 'unbounded' } for parallel execution"
            : "Effect.all should explicitly specify concurrency option (default is sequential)",
          line: i + 1,
          column: line.indexOf("Effect.all") + 1,
          suggestion: isParallelPattern
            ? "Add: { concurrency: 'unbounded' }"
            : "Add: { concurrency: 'unbounded' } or { concurrency: N }",
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-deprecated-api
 */
function checkDeprecatedAPIs(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

  const deprecatedAPIs = [
    {
      pattern: /Effect\.fromOption\(/,
      replacement: "Option.match with Effect.succeed/Effect.fail",
      reason: "Effect.fromOption is deprecated",
    },
    {
      pattern: /Effect\.fromEither\(/,
      replacement: "Either.match with Effect.succeed/Effect.fail",
      reason: "Effect.fromEither is deprecated",
    },
    {
      pattern: /Option\.zip\(/,
      replacement: "Option.all",
      reason: "Option.zip is deprecated, use Option.all",
    },
    {
      pattern: /Either\.zip\(/,
      replacement: "Either.all",
      reason: "Either.zip is deprecated, use Either.all",
    },
    {
      pattern: /Option\.cond\(/,
      replacement: "ternary expression with Option.some/Option.none",
      reason: "Option.cond is deprecated",
    },
    {
      pattern: /Either\.cond\(/,
      replacement: "ternary expression with Either.right/Either.left",
      reason: "Either.cond is deprecated",
    },
    {
      pattern: /Effect\.matchTag\(/,
      replacement: "Effect.catchTags",
      reason: "Effect.matchTag is deprecated, use Effect.catchTags",
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const api of deprecatedAPIs) {
      if (api.pattern.test(line)) {
        issues.push({
          rule: "effect-deprecated-api",
          severity: "error",
          message: api.reason,
          line: i + 1,
          column: line.search(api.pattern) + 1,
          suggestion: `Use ${api.replacement} instead`,
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-prefer-pipe
 */
function checkPreferPipe(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chainCount = (line.match(/\)\./g) || []).length;

    if (chainCount > 3 && !line.includes("pipe(")) {
      issues.push({
        rule: "effect-prefer-pipe",
        severity: "info",
        message:
          "Consider using pipe() for better readability with long chains",
        line: i + 1,
        column: 1,
        suggestion: "Refactor to: pipe(value, fn1, fn2, fn3, ...)",
      });
    }
  }

  return issues;
}

/**
 * Rule: effect-stream-memory
 */
function checkStreamMemory(content: string, filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");
  const fileName = path.basename(filePath, ".ts");

  if (!fileName.includes("stream")) {
    return issues;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.includes("readFileString") ||
      (line.includes("readFile") &&
        !line.includes("Stream") &&
        !line.includes("pipe"))
    ) {
      issues.push({
        rule: "effect-stream-memory",
        severity: "error",
        message:
          "Streaming pattern loads entire content into memory. Use proper streaming.",
        line: i + 1,
        column: line.indexOf("readFile") + 1,
        suggestion:
          "Use: fs.readFile(path).pipe(Stream.decodeText('utf-8'), Stream.splitLines)",
      });
    }

    if (
      line.includes("Stream.runCollect") &&
      i > 0 &&
      !lines[i - 5]?.includes("// Intentionally collecting")
    ) {
      issues.push({
        rule: "effect-stream-memory",
        severity: "warning",
        message:
          "Stream.runCollect loads entire stream into memory. Consider using Stream.run instead.",
        line: i + 1,
        column: line.indexOf("Stream.runCollect") + 1,
        suggestion: "Use Stream.run or other streaming combinators",
      });
    }
  }

  return issues;
}

/**
 * Rule: effect-error-model
 */
function checkErrorModel(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      (line.includes("Effect<") && line.includes(", Error,")) ||
      (line.includes("Effect.fail") && line.includes("new Error("))
    ) {
      if (
        line.trim().startsWith("//") ||
        lines[i - 1]?.includes("Anti-Pattern") ||
        lines[i - 1]?.includes("Bad:")
      ) {
        continue;
      }

      issues.push({
        rule: "effect-error-model",
        severity: "info",
        message:
          "Consider using typed errors (Data.TaggedError) instead of generic Error",
        line: i + 1,
        column: line.indexOf("Error") + 1,
        suggestion:
          "Define: class MyError extends Data.TaggedError('MyError')<{...}>",
      });
    }
  }

  return issues;
}

/**
 * Lint a single file
 */
async function lintFile(filePath: string): Promise<LintResult> {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, "utf-8");

  const allIssues: LintIssue[] = [
    ...checkUseTapError(content, filePath),
    ...checkExplicitConcurrency(content, filePath),
    ...checkDeprecatedAPIs(content, filePath),
    ...checkPreferPipe(content, filePath),
    ...checkStreamMemory(content, filePath),
    ...checkErrorModel(content, filePath),
  ];

  allIssues.sort((a, b) => a.line - b.line);

  const errors = allIssues.filter((i) => i.severity === "error").length;
  const warnings = allIssues.filter((i) => i.severity === "warning").length;
  const info = allIssues.filter((i) => i.severity === "info").length;

  return {
    file: fileName,
    issues: allIssues,
    errors,
    warnings,
    info,
  };
}

/**
 * Lint multiple files in parallel
 */
async function lintInParallel(files: string[]): Promise<LintResult[]> {
  const CONCURRENCY = 10;
  const results: LintResult[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const result = await lintFile(file);
      results.push(result);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Fix explicit concurrency issue by adding { concurrency: "unbounded" }
 */
function fixExplicitConcurrency(content: string, issue: LintIssue): string {
  const lines = content.split("\n");
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return content;
  }

  const line = lines[lineIndex];
  const effectAllIndex = line.indexOf("Effect.all(");

  if (effectAllIndex === -1) {
    return content;
  }

  // Find the matching closing parenthesis
  let depth = 0;
  let closingIndex = -1;
  let currentLineIndex = lineIndex;
  let charIndex = effectAllIndex + "Effect.all(".length;

  // Search for closing paren, handling nested parens
  while (currentLineIndex < lines.length) {
    const currentLine = lines[currentLineIndex];
    for (let i = charIndex; i < currentLine.length; i++) {
      if (currentLine[i] === "(") depth++;
      else if (currentLine[i] === ")") {
        if (depth === 0) {
          closingIndex = i;
          break;
        }
        depth--;
      }
    }

    if (closingIndex !== -1) {
      // Found closing paren - insert concurrency option before it
      const before = lines[currentLineIndex].substring(0, closingIndex);
      const after = lines[currentLineIndex].substring(closingIndex);
      lines[
        currentLineIndex
      ] = `${before}, { concurrency: "unbounded" }${after}`;
      break;
    }

    currentLineIndex++;
    charIndex = 0;
  }

  return lines.join("\n");
}

/**
 * Fix deprecated API usage by replacing with modern equivalents
 */
function fixDeprecatedAPI(content: string, issue: LintIssue): string {
  const lines = content.split("\n");
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return content;
  }

  let line = lines[lineIndex];

  // Replace deprecated APIs with modern equivalents
  if (line.includes("Option.zip(")) {
    line = line.replace(/Option\.zip\(/g, "Option.all(");
  } else if (line.includes("Either.zip(")) {
    line = line.replace(/Either\.zip\(/g, "Either.all(");
  } else if (line.includes("Option.cond(")) {
    // For Option.cond, we can't safely auto-fix as it requires restructuring
    // Skip this one for now
    return content;
  } else if (line.includes("Either.cond(")) {
    // For Either.cond, we can't safely auto-fix as it requires restructuring
    // Skip this one for now
    return content;
  } else if (line.includes("Effect.matchTag(")) {
    line = line.replace(/Effect\.matchTag\(/g, "Effect.catchTags(");
  } else if (line.includes("Effect.fromOption(")) {
    // Can't safely auto-fix - requires restructuring
    return content;
  } else if (line.includes("Effect.fromEither(")) {
    // Can't safely auto-fix - requires restructuring
    return content;
  }

  lines[lineIndex] = line;
  return lines.join("\n");
}

/**
 * Apply fixes to file content
 */
async function applyFixes(
  filePath: string,
  issues: LintIssue[]
): Promise<{ fixed: number; content: string }> {
  let content = await fs.readFile(filePath, "utf-8");
  let fixedCount = 0;

  // Sort issues by line number in reverse order to preserve line numbers
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);

  for (const issue of sortedIssues) {
    // Check if this rule can be auto-fixed
    const rule = LINT_RULES.find((r) => r.name === issue.rule);
    if (!rule?.canFix) {
      continue;
    }

    let newContent = content;

    // Apply the appropriate fix based on the rule
    if (issue.rule === "effect-explicit-concurrency") {
      newContent = fixExplicitConcurrency(content, issue);
    } else if (issue.rule === "effect-deprecated-api") {
      newContent = fixDeprecatedAPI(content, issue);
    }

    // Only count as fixed if content actually changed
    if (newContent !== content) {
      content = newContent;
      fixedCount++;
    }
  }

  return { fixed: fixedCount, content };
}

/**
 * Print linting results
 */
function printLintResults(results: LintResult[]): number {
  console.log(colorize("\n📋 Effect Patterns Linter Results", "cyan"));
  console.log("═".repeat(60));

  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
  const totalInfo = results.reduce((sum, r) => sum + r.info, 0);
  const clean = results.filter(
    (r) => r.errors === 0 && r.warnings === 0
  ).length;

  console.log(`${colorize("Total:", "bright")}     ${results.length} files`);
  console.log(`${colorize("Clean:", "green")}     ${clean} files`);
  if (totalErrors > 0) {
    console.log(`${colorize("Errors:", "red")}    ${totalErrors} issues`);
  }
  if (totalWarnings > 0) {
    console.log(`${colorize("Warnings:", "yellow")}  ${totalWarnings} issues`);
  }
  if (totalInfo > 0) {
    console.log(`${colorize("Info:", "blue")}      ${totalInfo} suggestions`);
  }

  // Files with errors
  const filesWithErrors = results.filter((r) => r.errors > 0);
  if (filesWithErrors.length > 0) {
    console.log(`\n${colorize("❌ Files with Errors:", "red")}`);
    console.log("─".repeat(60));

    for (const result of filesWithErrors) {
      console.log(`\n${colorize(result.file, "bright")}`);

      for (const issue of result.issues) {
        if (issue.severity === "error") {
          console.log(
            colorize(
              `  ${issue.line}:${issue.column} - ${issue.rule}: ${issue.message}`,
              "red"
            )
          );
          if (issue.suggestion) {
            console.log(colorize(`    → ${issue.suggestion}`, "dim"));
          }
        }
      }
    }
  }

  // Files with warnings
  const filesWithWarnings = results.filter(
    (r) => r.warnings > 0 && r.errors === 0
  );
  if (filesWithWarnings.length > 0) {
    console.log(`\n${colorize("⚠️  Files with Warnings:", "yellow")}`);
    console.log("─".repeat(60));

    for (const result of filesWithWarnings) {
      console.log(`\n${colorize(result.file, "bright")}`);

      for (const issue of result.issues) {
        if (issue.severity === "warning") {
          console.log(
            colorize(
              `  ${issue.line}:${issue.column} - ${issue.rule}: ${issue.message}`,
              "yellow"
            )
          );
          if (issue.suggestion) {
            console.log(colorize(`    → ${issue.suggestion}`, "dim"));
          }
        }
      }
    }
  }

  // Info suggestions
  if (totalInfo > 0) {
    console.log(
      `\n${colorize(`ℹ️  ${totalInfo} style suggestions available`, "blue")}`
    );
    console.log(colorize("  Run with --verbose to see details", "dim"));
  }

  console.log(`\n${"═".repeat(60)}`);

  if (totalErrors > 0) {
    console.log(
      colorize(`\n❌ Linting failed with ${totalErrors} error(s)\n`, "red")
    );
    return 1;
  }
  if (totalWarnings > 0) {
    console.log(
      colorize(
        `\n⚠️  Linting completed with ${totalWarnings} warning(s)\n`,
        "yellow"
      )
    );
    return 0;
  }
  console.log(
    colorize("\n✨ All files passed Effect patterns linting!\n", "green")
  );
  return 0;
}

/**
 * Analyze release - shared logic for preview and create
 */
const analyzeRelease = () =>
  Effect.gen(function* () {
    // Get the latest tag
    const latestTag = yield* getLatestTag();
    const currentVersion = latestTag.replace(/^v/, "");

    // Get commits since the last tag
    const commits = yield* getCommitsSinceTag(latestTag);

    if (commits.length === 0) {
      return { hasChanges: false } as const;
    }

    // Get recommended bump
    const bump = yield* getRecommendedBump(commits);

    // Calculate next version
    const nextVersion = semver.inc(currentVersion, bump.releaseType);

    if (!nextVersion) {
      return yield* Effect.fail(
        new Error(`Failed to calculate next version from ${currentVersion}`)
      );
    }

    // Categorize commits
    const categories = yield* Effect.tryPromise({
      try: () => categorizeCommits(commits),
      catch: (error) =>
        new Error(
          `Failed to categorize commits: ${error instanceof Error ? error.message : String(error)
          }`
        ),
    });

    // Generate changelog
    const changelog = generateChangelog(
      categories,
      currentVersion,
      nextVersion
    );

    return {
      hasChanges: true,
      latestTag,
      currentVersion,
      nextVersion,
      bump,
      commits,
      categories,
      changelog,
    } as const;
  });

// --- SUBCOMMAND DEFINITIONS ---

/**
 * admin:validate - Validates all pattern files
 */
const validateCommand = Command.make("validate", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed validation output"),
      Options.withDefault(false)
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Validates all pattern files for correctness and consistency."
  ),
  Command.withHandler(
    ({ options }) =>
      Effect.gen(function* () {
        yield* executeScriptWithTUI(
          path.join(PROJECT_ROOT, "scripts/publish/validate-improved.ts"),
          "Validating pattern files",
          { verbose: options.verbose }
        );
        yield* showSuccess("All patterns are valid!");
      }) as any
  )
);

/**
 * admin:test - Runs all TypeScript example tests
 */
const testCommand = Command.make("test", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed test output"),
      Options.withDefault(false)
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Runs all TypeScript example tests to ensure patterns execute correctly."
  ),
  Command.withHandler(
    ({ options }) =>
      executeScriptWithProgress(
        path.join(PROJECT_ROOT, "scripts/publish/test-improved.ts"),
        "Running TypeScript example tests",
        { verbose: options.verbose }
      ) as any
  )
);

/**
 * admin:pipeline - Runs the full ingestion and publishing pipeline
 */
const pipelineCommand = Command.make("pipeline", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed output from each step"),
      Options.withDefault(false)
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Runs the complete pattern publishing pipeline from test to rules generation."
  ),
  Command.withHandler(
    ({ options }) =>
      executeScriptWithTUI(
        path.join(PROJECT_ROOT, "scripts/publish/pipeline.ts"),
        "Publishing pipeline",
        { verbose: options.verbose }
      ).pipe(
        Effect.andThen(() =>
          showSuccess("Publishing pipeline completed successfully!")
        )
      ) as any
  )
);

/**
 * admin:generate - Generates the main project README.md file
 */
const generateCommand = Command.make("generate", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed generation output"),
      Options.withDefault(false)
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Generates the main project README.md file from pattern metadata."
  ),
  Command.withHandler(
    ({ options }) =>
      executeScriptWithProgress(
        path.join(PROJECT_ROOT, "scripts/publish/generate.ts"),
        "Generating README.md",
        { verbose: options.verbose }
      ) as any
  )
);

// --- RULES SCHEMA ---

/**
 * Schema for a Rule object from the API
 */
const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

type Rule = typeof RuleSchema.Type;

/**
 * Check if Pattern Server is reachable
 */
const checkServerHealth = (serverUrl: string) =>
  Effect.tryPromise({
    try: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${serverUrl}/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },
    catch: () => false,
  });

/**
 * Fetch rules from the Pattern Server API with enhanced error handling
 */
const fetchRulesFromAPI = (serverUrl: string) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk
    );

    const response = yield* client.get(`${serverUrl}/api/v1/rules`).pipe(
      Effect.flatMap((response) => response.json),
      Effect.flatMap(Schema.decodeUnknown(Schema.Array(RuleSchema))),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Check if server is reachable
          const isServerUp = yield* checkServerHealth(serverUrl);

          if (!isServerUp) {
            yield* Console.error(
              colorize("\n❌ Cannot connect to Pattern Server\n", "red")
            );
            yield* Console.error(
              `The Pattern Server at ${serverUrl} is not running or not reachable.\n`
            );
            yield* Console.error(colorize("How to fix:\n", "bright"));
            yield* Console.error("  1. Start the Pattern Server:");
            yield* Console.error(colorize("     bun run server:dev\n", "cyan"));
            yield* Console.error("  2. Verify the server is running:");
            yield* Console.error(
              colorize(`     curl ${serverUrl}/health\n`, "cyan")
            );
            yield* Console.error("  3. If using a different port, specify it:");
            yield* Console.error(
              colorize(
                "     bun run ep rules add --tool cursor --server-url http://localhost:PORT\n",
                "cyan"
              )
            );
            yield* Console.error(colorize("Documentation:\n", "dim"));
            yield* Console.error(
              colorize(
                "  https://github.com/patrady/effect-patterns#pattern-server\n",
                "cyan"
              )
            );

            return yield* Effect.fail(
              new Error("Pattern Server not reachable")
            );
          }

          // Server is up but API failed
          if (error._tag === "ResponseError") {
            yield* Console.error(
              colorize(
                "\n❌ Failed to fetch rules from Pattern Server\n",
                "red"
              )
            );
            yield* Console.error(`HTTP ${error.response.status}\n`);
            yield* Console.error(colorize("Possible causes:\n", "bright"));
            yield* Console.error(
              "  • API endpoint has changed - try updating the CLI"
            );
            yield* Console.error(
              "  • Server version mismatch - ensure server and CLI are compatible\n"
            );
            yield* Console.error(colorize("How to fix:\n", "bright"));
            yield* Console.error("  1. Check server logs for errors");
            yield* Console.error("  2. Restart the Pattern Server:");
            yield* Console.error(
              colorize(
                '     pkill -f "bun.*server" && bun run server:dev\n',
                "cyan"
              )
            );
            yield* Console.error("  3. Verify API endpoint:");
            yield* Console.error(
              colorize(`     curl ${serverUrl}/api/v1/rules\n`, "cyan")
            );
          } else if (error._tag === "ParseError") {
            yield* Console.error(
              colorize(
                "\n❌ Failed to parse rules from Pattern Server\n",
                "red"
              )
            );
            yield* Console.error(
              "The server response format is invalid or incompatible.\n"
            );
            yield* Console.error(colorize("How to fix:\n", "bright"));
            yield* Console.error(
              "  1. Update both the Pattern Server and CLI:"
            );
            yield* Console.error(
              colorize("     git pull && bun install\n", "cyan")
            );
            yield* Console.error("  2. Restart the Pattern Server:");
            yield* Console.error(
              colorize(
                '     pkill -f "bun.*server" && bun run server:dev\n',
                "cyan"
              )
            );
          } else {
            yield* Console.error(
              colorize("\n❌ Unexpected error fetching rules\n", "red")
            );
            yield* Console.error(`Error: ${error}\n`);
            yield* Console.error(colorize("How to fix:\n", "bright"));
            yield* Console.error("  1. Check your network connection");
            yield* Console.error("  2. Verify firewall settings");
            yield* Console.error("  3. Try restarting the Pattern Server\n");
          }

          return yield* Effect.fail(new Error("Failed to fetch rules"));
        })
      )
    );

    return response;
  });

/**
 * Format a single rule for .cursor/rules.md
 */
const formatRule = (rule: Rule): string => {
  const lines: string[] = [];

  lines.push(`### ${rule.title}`);
  lines.push(`**ID:** ${rule.id}`);

  const useCase = rule.useCase?.join(", ") || "N/A";
  const skillLevel = rule.skillLevel || "N/A";
  lines.push(`**Use Case:** ${useCase} | **Skill Level:** ${skillLevel}`);
  lines.push("");
  lines.push(rule.content);
  lines.push("");

  return lines.join("\n");
};

/**
 * Inject rules into a target file with managed block markers
 */
const injectRulesIntoFile = (filePath: string, rules: readonly Rule[]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem as any;

    const startMarker = "# --- BEGIN EFFECTPATTERNS RULES ---";
    const endMarker = "# --- END EFFECTPATTERNS RULES ---";

    // Format all rules
    const formattedRules = rules.map(formatRule).join("\n---\n\n");
    const managedBlock = `${startMarker}\n\n${formattedRules}\n${endMarker}`;

    // Check if file exists
    const fileExists = yield* fs.exists(filePath);

    let content = "";
    if (fileExists) {
      content = yield* fs.readFileString(filePath);
    }

    // Check if managed block exists
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    let newContent: string;

    if (startIndex !== -1 && endIndex !== -1) {
      // Replace existing managed block
      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex + endMarker.length);
      newContent = before + managedBlock + after;
    } else {
      // Append managed block to end of file
      newContent = content
        ? `${content}\n\n${managedBlock}\n`
        : `${managedBlock}\n`;
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    yield* fs.makeDirectory(dir, { recursive: true });

    // Write updated content
    yield* fs.writeFileString(filePath, newContent);

    return rules.length;
  });

/**
 * install:add - Add rules to AI tool configuration
 */
const installAddCommand = Command.make("add", {
  options: {
    tool: Options.text("tool").pipe(
      Options.withDescription(
        "The AI tool to add rules for (cursor, agents, etc.)"
      )
    ),
    serverUrl: Options.text("server-url").pipe(
      Options.withDescription("Pattern Server URL"),
      Options.withDefault("http://localhost:3001")
    ),
    skillLevel: Options.text("skill-level").pipe(
      Options.withDescription(
        "Filter by skill level (beginner, intermediate, advanced)"
      ),
      Options.optional
    ),
    useCase: Options.text("use-case").pipe(
      Options.withDescription(
        "Filter by use case (error-management, core-concepts, etc.)"
      ),
      Options.optional
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Fetch rules from Pattern Server and inject them into AI tool configuration."
  ),
  Command.withHandler(
    ({ options }) =>
      Effect.gen(function* () {
        const tool = options.tool;
        const serverUrl = options.serverUrl;
        const skillLevelFilter = options.skillLevel;
        const useCaseFilter = options.useCase;

        // Validate supported tools
        const supportedTools = [
          "cursor",
          "agents",
          "windsurf",
          "gemini",
          "claude",
          "vscode",
          "kilo",
          "kira",
          "trae",
          "goose",
        ];
        if (!supportedTools.includes(tool)) {
          yield* Console.error(
            colorize(`\n❌ Error: Tool "${tool}" is not supported\n`, "red")
          );
          yield* Console.error(
            colorize("Currently supported tools:\n", "bright")
          );
          yield* Console.error("  • cursor - Cursor IDE (.cursor/rules.md)");
          yield* Console.error("  • agents - AGENTS.md standard (AGENTS.md)");
          yield* Console.error(
            "  • windsurf - Windsurf IDE (.windsurf/rules.md)"
          );
          yield* Console.error("  • gemini - Gemini AI (GEMINI.md)");
          yield* Console.error("  • claude - Claude AI (CLAUDE.md)");
          yield* Console.error(
            "  • vscode - VS Code / Continue.dev (.vscode/rules.md)"
          );
          yield* Console.error("  • kilo - Kilo IDE (.kilo/rules.md)");
          yield* Console.error("  • kira - Kira IDE (.kira/rules.md)");
          yield* Console.error("  • trae - Trae IDE (.trae/rules.md)");
          yield* Console.error("  • goose - Goose AI (.goosehints)\n");
          yield* Console.error(colorize("Coming soon:\n", "dim"));
          yield* Console.error("  • codeium - Codeium\n");
          yield* Console.error(colorize("Examples:\n", "bright"));
          yield* Console.error(
            colorize("  bun run ep install add --tool cursor\n", "cyan")
          );
          yield* Console.error(
            colorize(
              "  bun run ep install add --tool agents --skill-level beginner\n",
              "cyan"
            )
          );
          yield* Console.error(
            colorize(
              "  bun run ep install add --tool goose --use-case error-management\n",
              "cyan"
            )
          );
          return yield* Effect.fail(new Error(`Unsupported tool: ${tool}`));
        }

        // Fetch rules from API
        const allRules = yield* fetchRulesFromAPI(serverUrl);

        yield* Console.log(
          `✓ Fetched ${allRules.length} rules from Pattern Server`
        );

        // Filter rules based on options
        let rules = allRules;

        if (Option.isSome(skillLevelFilter as any)) {
          const level = (skillLevelFilter as any).value;
          rules = rules.filter(
            (rule) => rule.skillLevel?.toLowerCase() === level.toLowerCase()
          );
          yield* Console.log(
            colorize(
              `📊 Filtered to ${rules.length} rules with skill level: ${level}\n`,
              "cyan"
            )
          );
        }

        if (Option.isSome(useCaseFilter as any)) {
          const useCase = (useCaseFilter as any).value;
          rules = rules.filter((rule) =>
            rule.useCase?.some(
              (uc) => uc.toLowerCase() === useCase.toLowerCase()
            )
          );
          yield* Console.log(
            colorize(
              `📊 Filtered to ${rules.length} rules with use case: ${useCase}\n`,
              "cyan"
            )
          );
        }

        if (rules.length === 0) {
          yield* Console.log(
            colorize("⚠️  No rules match the specified filters\n", "yellow")
          );
          return;
        }

        // Determine target file based on tool
        let targetFile: string;
        if (tool === "agents") {
          targetFile = "AGENTS.md";
        } else if (tool === "windsurf") {
          targetFile = ".windsurf/rules.md";
        } else if (tool === "gemini") {
          targetFile = "GEMINI.md";
        } else if (tool === "claude") {
          targetFile = "CLAUDE.md";
        } else if (tool === "vscode") {
          targetFile = ".vscode/rules.md";
        } else if (tool === "kilo") {
          targetFile = ".kilo/rules.md";
        } else if (tool === "kira") {
          targetFile = ".kira/rules.md";
        } else if (tool === "trae") {
          targetFile = ".trae/rules.md";
        } else if (tool === "goose") {
          targetFile = ".goosehints";
        } else {
          targetFile = ".cursor/rules.md";
        }

        yield* Console.log(
          colorize(`📝 Injecting rules into ${targetFile}...\n`, "cyan")
        );

        // Inject rules into file
        const count = yield* injectRulesIntoFile(targetFile, rules).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Console.log(
                colorize("❌ Failed to inject rules\n", "red")
              );
              yield* Console.log(`Error: ${error}\n`);
              return yield* Effect.fail(new Error("Failed to inject rules"));
            })
          )
        );

        // Display success with TUI panel
        yield* showPanel(
          `Successfully added ${count} rules to ${targetFile}

Tool: ${tool}
File: ${targetFile}
Rules Added: ${count}

Your AI tool configuration has been updated with Effect patterns!`,
          "Installation Complete",
          { type: "success" }
        );
      }) as any
  )
);

/**
 * install:list - List all supported AI tools and their target files
 */
const installListCommand = Command.make("list", {
  options: {},
  args: {},
}).pipe(
  Command.withDescription(
    "List all supported AI tools and their configuration file paths."
  ),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log(colorize("\n📋 Supported AI Tools\n", "bright"));
      yield* Console.log("═".repeat(60));
      yield* Console.log("");

      const tools = [
        { name: "cursor", desc: "Cursor IDE", file: ".cursor/rules.md" },
        { name: "agents", desc: "AGENTS.md standard", file: "AGENTS.md" },
        { name: "windsurf", desc: "Windsurf IDE", file: ".windsurf/rules.md" },
        { name: "gemini", desc: "Gemini AI", file: "GEMINI.md" },
        { name: "claude", desc: "Claude AI", file: "CLAUDE.md" },
        {
          name: "vscode",
          desc: "VS Code / Continue.dev",
          file: ".vscode/rules.md",
        },
        { name: "kilo", desc: "Kilo IDE", file: ".kilo/rules.md" },
        { name: "kira", desc: "Kira IDE", file: ".kira/rules.md" },
        { name: "trae", desc: "Trae IDE", file: ".trae/rules.md" },
        { name: "goose", desc: "Goose AI", file: ".goosehints" },
      ];

      for (const tool of tools) {
        yield* Console.log(
          colorize(`  ${tool.name.padEnd(12)}`, "cyan") +
          `${tool.desc.padEnd(30)}` +
          colorize(tool.file, "dim")
        );
      }

      yield* Console.log("");
      yield* Console.log("═".repeat(60));
      yield* Console.log(colorize("\n💡 Usage:\n", "bright"));
      yield* Console.log(
        colorize("  bun run ep install add --tool <name>\n", "cyan")
      );
      yield* Console.log(colorize("Example:\n", "dim"));
      yield* Console.log(
        colorize("  bun run ep install add --tool cursor\n", "cyan")
      );
    })
  )
);

/**
 * rules:generate - Generates all AI coding rules from patterns (legacy)
 */
const rulesGenerateCommand = Command.make("generate", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed generation output"),
      Options.withDefault(false)
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Generates AI coding rules (.mdc files) from all pattern files."
  ),
  Command.withHandler(({ options }) =>
    executeScriptWithProgress(
      path.join(PROJECT_ROOT, "scripts/publish/rules-improved.ts"),
      "Generating AI coding rules",
      { verbose: options.verbose }
    )
  )
);

/**
 * install:skills - Generate Skills (Claude, Gemini, OpenAI) from published Effect patterns
 */
const installSkillsCommand = Command.make("skills", {
  options: {
    category: Options.text("category").pipe(
      Options.withDescription("Generate skill for specific category only"),
      Options.optional
    ),
    format: Options.text("format").pipe(
      Options.withDescription(
        "Output format: claude, gemini, openai, or both (default: both)"
      ),
      Options.optional
    ),
  },
  args: {},
}).pipe(
  Command.withDescription(
    "Generate Skills (Claude, Gemini, OpenAI) from published Effect patterns"
  ),
  Command.withHandler(({ options }) => {
    return Effect.gen(function* () {
      // Extract format option safely without type assertions
      const formatOption: string =
        options.format._tag === "Some" ? options.format.value : "both";
      const validOptions = ["claude", "gemini", "openai", "both"];

      // Parse format option: support individual formats, comma-separated, or "both"
      let generateClaude = false;
      let generateGemini = false;
      let generateOpenAI = false;

      const formatLower = formatOption.toLowerCase();

      if (formatLower === "both") {
        generateClaude = true;
        generateGemini = true;
        generateOpenAI = true;
      } else {
        // Support comma-separated values
        const formats = formatLower.split(",").map((f) => f.trim());

        for (const fmt of formats) {
          if (!validOptions.includes(fmt)) {
            yield* Console.error(
              colorize(
                `\n❌ Invalid format: ${fmt}\nValid options: ${validOptions.join(
                  ", "
                )}\n`,
                "red"
              )
            );
            return yield* Effect.fail(new Error("Invalid format option"));
          }

          if (fmt === "claude") generateClaude = true;
          if (fmt === "gemini") generateGemini = true;
          if (fmt === "openai") generateOpenAI = true;
        }
      }

      if (!generateClaude && !generateGemini && !generateOpenAI) {
        yield* Console.error(
          colorize(
            `\n❌ No formats specified. Valid options: ${validOptions.join(
              ", "
            )}\n`,
            "red"
          )
        );
        return yield* Effect.fail(new Error("No format option"));
      }

      yield* Console.log(
        colorize("\n🎓 Generating Skills from Effect Patterns\n", "bright")
      );

      // Connect to database
      const db = createDatabase().db;
      const apRepo = createApplicationPatternRepository(db);
      const epRepo = createEffectPatternRepository(db);

      // Load patterns from database
      yield* Console.log(
        colorize("📖 Loading patterns from database...", "cyan")
      );
      const dbPatterns = yield* Effect.tryPromise({
        try: () => epRepo.findAll(),
        catch: (error) =>
          new Error(`Failed to load patterns from database: ${error}`),
      });

      yield* Console.log(
        colorize(`✓ Found ${dbPatterns.length} patterns\n`, "green")
      );

      // Load application patterns to map IDs to slugs
      const applicationPatterns = yield* Effect.tryPromise({
        try: () => apRepo.findAll(),
        catch: (error) =>
          new Error(`Failed to load application patterns: ${error}`),
      });

      const apIdToSlug = new Map(
        applicationPatterns.map((ap) => [ap.id, ap.slug])
      );

      // Convert database patterns to PatternContent
      const patterns: PatternContent[] = [];
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

      yield* Console.log(
        colorize(
          `✓ Processed ${patterns.length} patterns with application patterns\n`,
          "green"
        )
      );

      // Group by category
      yield* Console.log(
        colorize("🗂️  Grouping patterns by category...", "cyan")
      );
      const categoryMap = groupPatternsByCategory(patterns);
      yield* Console.log(
        colorize(`✓ Found ${categoryMap.size} categories\n`, "green")
      );

      // Handle --category flag
      if (options.category._tag === "Some") {
        const category = options.category.value
          .toLowerCase()
          .replace(/\s+/g, "-");
        const categoryPatterns = categoryMap.get(category);

        if (!categoryPatterns) {
          yield* Console.error(
            colorize(`\n❌ Category not found: ${category}\n`, "red")
          );
          yield* Console.log(colorize("Available categories:\n", "bright"));
          const sortedCategories = Array.from(categoryMap.keys()).sort();
          for (const cat of sortedCategories) {
            yield* Console.log(`  • ${cat}`);
          }
          return yield* Effect.fail(new Error("Category not found"));
        }

        // Generate Claude skill for category if requested
        if (generateClaude) {
          const skillName = `effect-patterns-${category}`;
          const content = generateCategorySkill(category, categoryPatterns);

          yield* Effect.tryPromise({
            try: () => writeSkill(skillName, content, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write Claude skill: ${error}`),
          });

          yield* Console.log(
            colorize(`✓ Generated Claude skill: ${skillName}\n`, "green")
          );
        }

        // Generate Gemini skill for category if requested
        if (generateGemini) {
          const geminiSkill = generateGeminiSkill(category, categoryPatterns);

          yield* Effect.tryPromise({
            try: () => writeGeminiSkill(geminiSkill, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write Gemini skill: ${error}`),
          });

          yield* Console.log(
            colorize(
              `✓ Generated Gemini skill: ${geminiSkill.skillId}\n`,
              "green"
            )
          );
        }

        // Generate OpenAI skill for category if requested
        if (generateOpenAI) {
          const skillName = `effect-patterns-${category}`;
          const content = generateOpenAISkill(category, categoryPatterns);

          yield* Effect.tryPromise({
            try: () => writeOpenAISkill(skillName, content, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write OpenAI skill: ${error}`),
          });

          yield* Console.log(
            colorize(`✓ Generated OpenAI skill: ${skillName}\n`, "green")
          );
        }

        return;
      }

      // Generate all category skills
      yield* Console.log(
        colorize(
          `📝 Generating ${categoryMap.size} skills for ${formatOption}...\n`,
          "cyan"
        )
      );

      let claudeCount = 0;
      let geminiCount = 0;
      let openaiCount = 0;

      for (const [category, categoryPatterns] of categoryMap.entries()) {
        // Generate Claude skill
        if (generateClaude) {
          const skillName = `effect-patterns-${category}`;
          const content = generateCategorySkill(category, categoryPatterns);

          const writeResult = yield* Effect.tryPromise({
            try: () => writeSkill(skillName, content, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write ${skillName}: ${error}`),
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Console.log(colorize(`⚠️  ${error.message}`, "yellow"));
                return null;
              })
            )
          );

          if (writeResult !== null) {
            yield* Console.log(
              colorize(
                `  ✓ ${skillName} (${categoryPatterns.length} patterns)`,
                "green"
              )
            );
            claudeCount++;
          }
        }

        // Generate Gemini skill
        if (generateGemini) {
          const geminiSkill = generateGeminiSkill(category, categoryPatterns);

          const writeResult = yield* Effect.tryPromise({
            try: () => writeGeminiSkill(geminiSkill, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write Gemini skill: ${error}`),
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Console.log(colorize(`⚠️  ${error.message}`, "yellow"));
                return null;
              })
            )
          );

          if (writeResult !== null) {
            yield* Console.log(
              colorize(
                `  ✓ ${geminiSkill.skillId} (${categoryPatterns.length} patterns)`,
                "green"
              )
            );
            geminiCount++;
          }
        }

        // Generate OpenAI skill
        if (generateOpenAI) {
          const skillName = `effect-patterns-${category}`;
          const content = generateOpenAISkill(category, categoryPatterns);

          const writeResult = yield* Effect.tryPromise({
            try: () => writeOpenAISkill(skillName, content, PROJECT_ROOT),
            catch: (error) =>
              new Error(`Failed to write OpenAI skill: ${error}`),
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* Console.log(colorize(`⚠️  ${error.message}`, "yellow"));
                return null;
              })
            )
          );

          if (writeResult !== null) {
            yield* Console.log(
              colorize(
                `  ✓ ${skillName} (${categoryPatterns.length} patterns)`,
                "green"
              )
            );
            openaiCount++;
          }
        }
      }

      // Summary
      const summaryParts: string[] = [];

      if (generateClaude && claudeCount > 0) {
        summaryParts.push(
          `Generated ${claudeCount} Claude Skills from ${patterns.length} Effect patterns.`
        );
        summaryParts.push(
          `Claude Skills Location: content/published/skills/claude/`
        );
      }

      if (generateGemini && geminiCount > 0) {
        summaryParts.push(
          `Generated ${geminiCount} Gemini Skills from ${patterns.length} Effect patterns.`
        );
        summaryParts.push(
          `Gemini Skills Location: content/published/skills/gemini/`
        );
      }

      if (generateOpenAI && openaiCount > 0) {
        summaryParts.push(
          `Generated ${openaiCount} OpenAI Skills from ${patterns.length} Effect patterns.`
        );
        summaryParts.push(
          `OpenAI Skills Location: content/published/skills/openai/`
        );
      }

      summaryParts.push(
        `\nEach skill is organized by category and includes:
- Curated patterns from the published library
- Code examples (Good & Anti-patterns)
- Rationale and best practices
- Skill level guidance (Beginner → Intermediate → Advanced)`
      );

      yield* showPanel(
        summaryParts.join("\n"),
        "✨ Skills Generation Complete!",
        { type: "success" }
      );
    }) as any;
  })
);

/**
 * install - Install Effect patterns rules into AI tools
 */
export const installCommand = Command.make("install").pipe(
  Command.withDescription(
    "Install Effect patterns rules into AI tool configurations"
  ),
  Command.withSubcommands([
    installAddCommand,
    installListCommand,
    installSkillsCommand,
  ])
);

// --- TEMPORARILY DISABLED COMMANDS ---
// These commands are disabled for the initial release but will be re-enabled soon

if (false as any) {
  /**
   * init - Initialize ep.json configuration file
   */
  const _initCommand = Command.make("init", {
    options: {},
    args: {},
  }).pipe(
    Command.withDescription("Initialize ep.json configuration file."),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* Console.log(
          colorize("\n🔧 Initializing ep.json configuration\n", "bright")
        );

        const fs = yield* FileSystem.FileSystem;
        const configPath = "ep.json";

        // Check if ep.json already exists
        const exists = yield* Effect.try({
          try: () => {
            try {
              execSync("test -f ep.json", { stdio: "ignore" });
              return true;
            } catch {
              return false;
            }
          },
          catch: () => false,
        });

        if (exists) {
          yield* Console.log(
            colorize("⚠️  ep.json already exists\n", "yellow")
          );
          yield* Console.log(
            "Configuration file already present in this directory."
          );
          yield* Console.log("Delete it first if you want to regenerate.\n");
          return;
        }

        // Create default configuration
        const defaultConfig = {
          linter: {
            enabled: true,
            files: {
              include: ["src/**/*.ts"],
            },
          },
        };

        yield* fs.writeFileString(
          configPath,
          `${JSON.stringify(defaultConfig, null, 2)}\n`
        );

        yield* Console.log(colorize("✅ Created ep.json\n", "green"));
        yield* Console.log("Default configuration:");
        yield* Console.log(JSON.stringify(defaultConfig, null, 2));
        yield* Console.log("\nYou can now run:");
        yield* Console.log("  ep lint           # Use config file");
        yield* Console.log(
          "  ep lint <files>   # Override with specific files\n"
        );
      }).pipe(Effect.asVoid)
    )
  );

  /**
   * lint:rules - Display all available linting rules
   */
  const lintRulesCommand = Command.make("rules", {
    options: {},
    args: {},
  }).pipe(
    Command.withDescription(
      "Display all available linting rules and their configuration."
    ),
    Command.withHandler(() =>
      Effect.gen(function* () {
        yield* Console.log(colorize("\n📋 Effect Linter Rules\n", "cyan"));

        const fs = yield* FileSystem.FileSystem;
        const configPath = "ep.json";

        // Try to read ep.json for user overrides
        let userConfig: any = null;
        const configExists = yield* Effect.try({
          try: () => {
            try {
              execSync("test -f ep.json", { stdio: "ignore" });
              return true;
            } catch {
              return false;
            }
          },
          catch: () => false,
        });

        if (configExists) {
          const configContent = yield* fs.readFileString(configPath);
          userConfig = yield* Effect.try({
            try: () => JSON.parse(configContent),
            catch: () => null,
          });
        }

        // Display rules table
        yield* Console.log(colorize("Available Rules:", "bright"));
        yield* Console.log("─".repeat(100));
        yield* Console.log(
          `${colorize("Rule Name", "bright").padEnd(45)} ${colorize(
            "Severity",
            "bright"
          ).padEnd(20)} ${colorize("Description", "bright")}`
        );
        yield* Console.log("─".repeat(100));

        for (const rule of LINT_RULES) {
          // Check if user has overridden this rule
          const userSeverity = userConfig?.linter?.rules?.[rule.name];
          const finalSeverity = userSeverity || rule.defaultSeverity;

          // Color code the severity
          let severityDisplay = "";
          if (finalSeverity === "error") {
            severityDisplay = colorize("error", "red");
          } else if (finalSeverity === "warning") {
            severityDisplay = colorize("warning", "yellow");
          } else if (finalSeverity === "info") {
            severityDisplay = colorize("info", "blue");
          } else if (finalSeverity === "off") {
            severityDisplay = colorize("off", "dim");
          }

          // Add indicator if user overrode the default
          const overrideIndicator = userSeverity
            ? colorize(" (custom)", "dim")
            : "";

          yield* Console.log(
            `${rule.name.padEnd(35)} ${(
              severityDisplay + overrideIndicator
            ).padEnd(30)} ${rule.description}`
          );
        }

        yield* Console.log("─".repeat(100));

        if (configExists && userConfig?.linter?.rules) {
          yield* Console.log(
            colorize("\n✓ Using custom configuration from ep.json", "green")
          );
        } else {
          yield* Console.log(
            colorize(
              "\nℹ️  Using default severities (no ep.json found)",
              "blue"
            )
          );
          yield* Console.log(
            colorize(
              '  Run "ep init" to create a config file with custom rule settings',
              "dim"
            )
          );
        }

        yield* Console.log("\nSeverity levels:");
        yield* Console.log(
          `  ${colorize(
            "error",
            "red"
          )}    - Fails linting and exits with code 1`
        );
        yield* Console.log(
          `  ${colorize(
            "warning",
            "yellow"
          )}  - Shows warning but exits with code 0`
        );
        yield* Console.log(
          `  ${colorize("info", "blue")}     - Shows informational suggestion`
        );
        yield* Console.log(
          `  ${colorize("off", "dim")}      - Rule is disabled\n`
        );
      })
    )
  );

  /**
   * lint - Lint TypeScript files for Effect-TS patterns
   */
  const _lintCommand = Command.make("lint", {
    options: {
      apply: Options.boolean("apply").pipe(
        Options.withDescription("Automatically fix issues where possible"),
        Options.withDefault(false)
      ),
    },
    args: {
      files: Args.repeated(Args.text({ name: "files" })),
    },
  })
    .pipe(
      Command.withDescription(
        "Lint TypeScript files for Effect-TS idioms and best practices."
      ),
      Command.withHandler(({ args, options }) =>
        Effect.gen(function* () {
          let filePatterns = args.files;
          const shouldApplyFixes = options.apply;

          // If no arguments provided, try to read from ep.json
          if (filePatterns.length === 0) {
            const fs = yield* FileSystem.FileSystem;
            const configPath = "ep.json";

            // Check if ep.json exists
            const configExists = yield* Effect.try({
              try: () => {
                try {
                  execSync("test -f ep.json", { stdio: "ignore" });
                  return true;
                } catch {
                  return false;
                }
              },
              catch: () => false,
            });

            if (!configExists) {
              yield* Console.log(
                colorize(
                  "\n❌ Error: No files specified and no ep.json found\n",
                  "red"
                )
              );
              yield* Console.log("You can either:");
              yield* Console.log("  1. Run: ep init");
              yield* Console.log(
                "  2. Provide files directly: ep lint <file-or-glob-pattern>..."
              );
              yield* Console.log("\nExamples:");
              yield* Console.log("  ep lint src/index.ts");
              yield* Console.log('  ep lint "src/**/*.ts"');
              yield* Console.log('  ep lint file1.ts file2.ts "lib/**/*.ts"\n');
              return yield* Effect.fail(new Error("No files specified"));
            }

            // Read and parse ep.json
            const configContent = yield* fs.readFileString(configPath);
            const config = yield* Effect.try({
              try: () => JSON.parse(configContent),
              catch: (error) =>
                new Error(
                  `Failed to parse ep.json: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });

            // Extract file patterns from config
            if (config.linter?.files?.include) {
              filePatterns = config.linter.files.include;
              yield* Console.log(
                colorize("\n📋 Using configuration from ep.json\n", "cyan")
              );
            } else {
              yield* Console.log(
                colorize(
                  "\n❌ Error: No linter.files.include found in ep.json\n",
                  "red"
                )
              );
              yield* Console.log("Expected format:");
              yield* Console.log(
                JSON.stringify(
                  {
                    linter: {
                      enabled: true,
                      files: {
                        include: ["src/**/*.ts"],
                      },
                    },
                  },
                  null,
                  2
                )
              );
              yield* Console.log("");
              return yield* Effect.fail(
                new Error("Invalid ep.json configuration")
              );
            }
          }

          yield* Console.log(colorize("\n🔍 Effect Patterns Linter", "bright"));
          yield* Console.log(
            colorize("Checking Effect-TS idioms and best practices\n", "dim")
          );

          // Expand glob patterns
          const allFiles: string[] = [];
          for (const pattern of filePatterns) {
            const expandedFiles = yield* Effect.tryPromise({
              try: () => glob(pattern, { absolute: true }),
              catch: (error) =>
                new Error(
                  `Failed to expand pattern "${pattern}": ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });

            // Filter for TypeScript files only
            const tsFiles = expandedFiles.filter((file) =>
              file.endsWith(".ts")
            );
            allFiles.push(...tsFiles);
          }

          if (allFiles.length === 0) {
            yield* Console.log(
              colorize(
                "⚠️  No TypeScript files found matching the patterns\n",
                "yellow"
              )
            );
            return;
          }

          // Remove duplicates
          const uniqueFiles = Array.from(new Set(allFiles));

          yield* Console.log(
            colorize(
              `Found ${uniqueFiles.length} TypeScript file(s) to lint\n`,
              "bright"
            )
          );

          // Run linter
          const results = yield* Effect.tryPromise({
            try: () => lintInParallel(uniqueFiles),
            catch: (error) =>
              new Error(
                `Linting failed: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          // Print results and get exit code
          const exitCode = printLintResults(results);

          // Apply fixes if --apply flag is enabled
          if (shouldApplyFixes) {
            const fixableResults = results.filter((r) => r.issues.length > 0);

            if (fixableResults.length === 0) {
              yield* Console.log(
                colorize("\nℹ️  No fixable issues found\n", "blue")
              );
            } else {
              yield* Console.log(colorize("\n🔧 Applying fixes...\n", "cyan"));

              const fixSummary: Map<
                string,
                { file: string; count: number; rules: Set<string> }
              > = new Map();

              for (const result of fixableResults) {
                // Find the full path for this file
                const filePath = uniqueFiles.find((f) =>
                  f.endsWith(result.file)
                );
                if (!filePath) continue;

                // Apply fixes
                const { fixed, content } = yield* Effect.tryPromise({
                  try: () => applyFixes(filePath, result.issues),
                  catch: (error) =>
                    new Error(
                      `Failed to apply fixes to ${result.file}: ${error instanceof Error ? error.message : String(error)
                      }`
                    ),
                });

                if (fixed > 0) {
                  // Write the fixed content back to file
                  yield* Effect.tryPromise({
                    try: () => fs.writeFile(filePath, content, "utf-8"),
                    catch: (error) =>
                      new Error(
                        `Failed to write fixes to ${result.file}: ${error instanceof Error ? error.message : String(error)
                        }`
                      ),
                  });

                  // Track which rules were fixed
                  const rulesFixed = new Set<string>();
                  for (const issue of result.issues) {
                    const rule = LINT_RULES.find((r) => r.name === issue.rule);
                    if (rule?.canFix) {
                      rulesFixed.add(issue.rule);
                    }
                  }

                  fixSummary.set(filePath, {
                    file: result.file,
                    count: fixed,
                    rules: rulesFixed,
                  });
                }
              }

              // Print fix summary
              if (fixSummary.size > 0) {
                const totalFixes = Array.from(fixSummary.values()).reduce(
                  (sum, s) => sum + s.count,
                  0
                );

                yield* Console.log(
                  colorize(
                    `✓ Fixed ${totalFixes} issue(s) in ${fixSummary.size} file(s)\n`,
                    "green"
                  )
                );

                yield* Console.log(colorize("Files modified:", "bright"));
                for (const [_filePath, summary] of fixSummary) {
                  const rulesList = Array.from(summary.rules).join(", ");
                  yield* Console.log(
                    `  - ${summary.file} (${summary.count} fix${summary.count > 1 ? "es" : ""
                    }: ${rulesList})`
                  );
                }

                yield* Console.log(
                  colorize("\n✨ Auto-fix complete!\n", "green")
                );
              } else {
                yield* Console.log(
                  colorize(
                    "⚠️  No fixes could be applied automatically\n",
                    "yellow"
                  )
                );
              }
            }
          }

          if (exitCode !== 0 && !shouldApplyFixes) {
            return yield* Effect.fail(new Error("Linting failed"));
          }
        })
      )
    )
    .pipe(Command.withSubcommands([lintRulesCommand]));
} // End of disabled init/lint commands

/**
 * release:preview - Preview the next release without making changes
 */
const releasePreviewCommand = Command.make("preview", {
  options: {},
  args: {},
}).pipe(
  Command.withDescription(
    "Analyze commits and preview the next release version without making any changes."
  ),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n🔍 Analyzing commits for release preview...\n");

      const analysis = yield* analyzeRelease().pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Failed to analyze release\n", "red")
            );
            yield* Console.error(String(error).replace("Error: ", ""));
            yield* Console.error("");
            return yield* Effect.fail(error);
          })
        )
      );

      if (!analysis.hasChanges) {
        yield* Console.log(
          colorize("\n⚠️  No commits found since last release\n", "yellow")
        );
        yield* Console.log("There are no new commits to release.\n");
        yield* Console.log(colorize("To create a new release:\n", "bright"));
        yield* Console.log("  1. Make changes and commit them");
        yield* Console.log("  2. Use conventional commit messages:");
        yield* Console.log(
          colorize("     feat: add new feature     ", "dim") +
          "(minor version bump)"
        );
        yield* Console.log(
          colorize("     fix: fix bug              ", "dim") +
          "(patch version bump)"
        );
        yield* Console.log(
          colorize("     feat!: breaking change    ", "dim") +
          "(major version bump)"
        );
        yield* Console.log("  3. Run: bun run ep release preview\n");
        return;
      }

      const {
        latestTag,
        currentVersion,
        nextVersion,
        bump,
        commits,
        changelog,
      } = analysis;

      yield* Console.log(`📌 Current version: ${currentVersion}`);
      yield* Console.log(
        `📊 Found ${commits.length} commits since ${latestTag}\n`
      );

      // Display results
      yield* Console.log("━".repeat(60));
      yield* Console.log("📋 RELEASE PREVIEW");
      yield* Console.log("━".repeat(60));
      yield* Console.log(`\n📦 Version Bump: ${bump.releaseType}`);
      yield* Console.log(`   Reason: ${bump.reason}`);
      yield* Console.log(`\n🎯 Next Version: ${nextVersion}`);
      yield* Console.log(
        `   Current: ${currentVersion} → Next: ${nextVersion}\n`
      );
      yield* Console.log("━".repeat(60));
      yield* Console.log("📝 DRAFT CHANGELOG");
      yield* Console.log("━".repeat(60));
      yield* Console.log(`\n${changelog}`);
      yield* Console.log("━".repeat(60));
      yield* Console.log("\n✅ Preview complete. No changes made.\n");
    })
  )
);

/**
 * release:create - Create a new release
 */
const releaseCreateCommand = Command.make("create", {
  options: {},
  args: {},
}).pipe(
  Command.withDescription(
    "Create a new release with version bump, changelog, and git tag."
  ),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n🚀 Creating new release...\n");

      // Analyze release (reuse preview logic)
      const analysis = yield* analyzeRelease().pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Failed to analyze release\n", "red")
            );
            yield* Console.error(String(error).replace("Error: ", ""));
            yield* Console.error("");
            return yield* Effect.fail(error);
          })
        )
      );

      if (!analysis.hasChanges) {
        yield* Console.log(
          colorize("\n⚠️  No commits found since last release\n", "yellow")
        );
        yield* Console.log("There are no new commits to release.\n");
        return;
      }

      const {
        latestTag,
        currentVersion,
        nextVersion,
        bump,
        commits,
        changelog,
      } = analysis;

      yield* Console.log(`📌 Current version: ${currentVersion}`);
      yield* Console.log(
        `📊 Found ${commits.length} commits since ${latestTag}\n`
      );

      // Display preview
      yield* Console.log("━".repeat(60));
      yield* Console.log("📋 RELEASE PREVIEW");
      yield* Console.log("━".repeat(60));
      yield* Console.log(`\n📦 Version Bump: ${bump.releaseType}`);
      yield* Console.log(`   Reason: ${bump.reason}`);
      yield* Console.log(`\n🎯 Next Version: ${nextVersion}`);
      yield* Console.log(
        `   Current: ${currentVersion} → Next: ${nextVersion}\n`
      );
      yield* Console.log("━".repeat(60));
      yield* Console.log("📝 CHANGELOG");
      yield* Console.log("━".repeat(60));
      yield* Console.log(`\n${changelog}`);
      yield* Console.log("━".repeat(60));

      // Prompt for confirmation
      const confirmPrompt = Prompt.confirm({
        message:
          "\n⚠️  Proceed with release? This will modify files, commit, tag, and push.",
        initial: false,
      });

      const confirmed = yield* confirmPrompt;

      if (!confirmed) {
        yield* Console.log("\n❌ Release cancelled by user.\n");
        return;
      }

      yield* Console.log("\n✅ Confirmed. Proceeding with release...\n");

      // Get FileSystem service
      const fs = yield* FileSystem.FileSystem;

      // 1. Update package.json
      yield* Console.log("📝 Updating package.json...");
      const packageJsonPath = "package.json";

      const packageJsonContent = yield* fs.readFileString(packageJsonPath).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Failed to read package.json\n", "red")
            );
            yield* Console.error(
              "Make sure package.json exists in the current directory.\n"
            );
            yield* Console.error(`Error: ${error}\n`);
            return yield* Effect.fail(new Error("Cannot read package.json"));
          })
        )
      );

      const packageJson = yield* Effect.try({
        try: () => JSON.parse(packageJsonContent),
        catch: (error) =>
          new Error(
            "Failed to parse package.json.\n" +
            "The file may be corrupted or contain invalid JSON.\n\n" +
            `Error: ${error instanceof Error ? error.message : String(error)}`
          ),
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Invalid package.json\n", "red")
            );
            yield* Console.error(String(error).replace("Error: ", ""));
            yield* Console.error("");
            return yield* Effect.fail(error);
          })
        )
      );

      packageJson.version = nextVersion;
      yield* fs
        .writeFileString(
          packageJsonPath,
          `${JSON.stringify(packageJson, null, 2)}\n`
        )
        .pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Console.error(
                colorize("\n❌ Failed to write package.json\n", "red")
              );
              yield* Console.error("Check file permissions and disk space.\n");
              yield* Console.error(`Error: ${error}\n`);
              return yield* Effect.fail(new Error("Cannot write package.json"));
            })
          )
        );
      yield* Console.log(`   ✓ Version updated to ${nextVersion}`);

      // 2. Update CHANGELOG.md
      yield* Console.log("📝 Updating CHANGELOG.md...");
      const changelogPath = "docs/CHANGELOG.md";

      // Check if CHANGELOG.md exists
      const changelogExists = yield* Effect.try({
        try: () => execSync("test -f docs/CHANGELOG.md", { stdio: "ignore" }),
        catch: () => false,
      });

      let existingChangelog = "";
      if (changelogExists) {
        existingChangelog = yield* fs.readFileString(changelogPath);
      }

      const newChangelog = `${changelog}\n\n${existingChangelog}`;
      yield* fs.writeFileString(changelogPath, newChangelog);
      yield* Console.log("   ✓ Changelog updated");

      // 3. Git add
      yield* Console.log("📦 Staging changes...");
      yield* execGitCommand("add", ["package.json", "docs/CHANGELOG.md"]);
      yield* Console.log("   ✓ Files staged");

      // 4. Git commit
      yield* Console.log("💾 Creating commit...");
      yield* execGitCommand("commit", [
        "-m",
        `"chore(release): v${nextVersion}"`,
      ]);
      yield* Console.log(
        `   ✓ Commit created: chore(release): v${nextVersion}`
      );

      // 5. Git tag
      yield* Console.log("🏷️  Creating tag...");
      yield* execGitCommand("tag", [`v${nextVersion}`]);
      yield* Console.log(`   ✓ Tag created: v${nextVersion}`);

      // 6. Git push
      yield* Console.log("🚀 Pushing to remote...");
      yield* execGitCommand("push", ["--follow-tags"]);
      yield* Console.log("   ✓ Changes pushed to remote");

      yield* Console.log("\n━".repeat(60));
      yield* Console.log(`✨ Release v${nextVersion} completed successfully!`);
      yield* Console.log("━".repeat(60));
      yield* Console.log(`\n📌 Tag: v${nextVersion}`);
      yield* Console.log(`📝 Commit: chore(release): v${nextVersion}`);
      yield* Console.log("🚀 Pushed to remote with tags\n");
    })
  )
);

/**
 * pattern:new - Scaffold a new pattern
 */
const patternNewCommand = Command.make("new", {
  options: {},
  args: {},
}).pipe(
  Command.withDescription(
    "Create a new pattern with interactive wizard and scaffolded files."
  ),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n✨ Creating a new pattern\n");

      // Prompt for title
      const titlePrompt = Prompt.text({
        message: "Pattern title:",
      });
      const title = yield* titlePrompt;

      // Prompt for skill level
      const skillLevelPrompt = Prompt.select({
        message: "Skill level:",
        choices: [
          { title: "Beginner", value: "Beginner" },
          { title: "Intermediate", value: "Intermediate" },
          { title: "Advanced", value: "Advanced" },
        ],
      });
      const skillLevel = yield* skillLevelPrompt;

      // Prompt for use case
      const useCasePrompt = Prompt.select({
        message: "Use case:",
        choices: [
          { title: "Concurrency", value: "Concurrency" },
          { title: "Error Handling", value: "Error Handling" },
          { title: "Resource Management", value: "Resource Management" },
          { title: "State Management", value: "State Management" },
          { title: "Data Structures", value: "Data Structures" },
        ],
      });
      const useCase = yield* useCasePrompt;

      // Prompt for summary
      const summaryPrompt = Prompt.text({
        message: "Brief summary (one line):",
      });
      const summary = yield* summaryPrompt;

      // Generate kebab-case filename
      const filename = toKebabCase(title);

      if (!filename || filename.length === 0) {
        yield* Console.error(colorize("\n❌ Invalid pattern title\n", "red"));
        yield* Console.error(
          "The title must contain at least one alphanumeric character.\n"
        );
        yield* Console.error(colorize("Examples of valid titles:\n", "bright"));
        yield* Console.error('  • "Retry with Exponential Backoff"');
        yield* Console.error('  • "Resource Pool Pattern"');
        yield* Console.error('  • "Circuit Breaker"\n');
        return yield* Effect.fail(new Error("Invalid title"));
      }

      yield* Console.log(`\n📝 Creating files for: ${filename}\n`);

      // Get FileSystem service
      const fs = yield* FileSystem.FileSystem;

      // Check if pattern already exists
      const mdxPath = path.join(
        PROJECT_ROOT,
        `content/new/raw/${filename}.mdx`
      );
      const tsPath = path.join(PROJECT_ROOT, `content/new/src/${filename}.ts`);

      const mdxExists = yield* fs.exists(mdxPath);
      const tsExists = yield* fs.exists(tsPath);

      if (mdxExists || tsExists) {
        yield* Console.error(colorize("\n❌ Pattern already exists\n", "red"));
        if (mdxExists) {
          yield* Console.error(`  File exists: ${mdxPath}`);
        }
        if (tsExists) {
          yield* Console.error(`  File exists: ${tsPath}`);
        }
        yield* Console.error("\n");
        yield* Console.error(colorize("Options:\n", "bright"));
        yield* Console.error("  1. Use a different pattern name");
        yield* Console.error("  2. Delete the existing files:");
        yield* Console.error(
          colorize(`     rm ${mdxPath} ${tsPath}\n`, "cyan")
        );
        yield* Console.error("  3. Edit the existing pattern files directly\n");
        return yield* Effect.fail(new Error("Pattern already exists"));
      }

      // Ensure directories exist
      yield* fs
        .makeDirectory(path.join(PROJECT_ROOT, "content/new/raw"), {
          recursive: true,
        })
        .pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Console.error(
                colorize(
                  "\n❌ Failed to create content/new/raw directory\n",
                  "red"
                )
              );
              yield* Console.error("Check directory permissions.\n");
              yield* Console.error(`Error: ${error}\n`);
              return yield* Effect.fail(new Error("Cannot create directory"));
            })
          )
        );

      yield* fs
        .makeDirectory(path.join(PROJECT_ROOT, "content/new/src"), {
          recursive: true,
        })
        .pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Console.error(
                colorize(
                  "\n❌ Failed to create content/new/src directory\n",
                  "red"
                )
              );
              yield* Console.error("Check directory permissions.\n");
              yield* Console.error(`Error: ${error}\n`);
              return yield* Effect.fail(new Error("Cannot create directory"));
            })
          )
        );

      // Create MDX file
      const mdxContent = `---
id: ${filename}
title: '${title}'
skillLevel: '${skillLevel}'
useCase: '${useCase}'
summary: '${summary}'
---

## Good Example

## Anti-Pattern

## Rationale
`;

      yield* fs.writeFileString(mdxPath, mdxContent).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Failed to create MDX file\n", "red")
            );
            yield* Console.error(`Path: ${mdxPath}\n`);
            yield* Console.error("Check file permissions and disk space.\n");
            yield* Console.error(`Error: ${error}\n`);
            return yield* Effect.fail(new Error("Cannot create MDX file"));
          })
        )
      );
      yield* Console.log(colorize(`✓ Created: ${mdxPath}`, "green"));

      // Create TypeScript file
      const tsContent = `import { Effect } from "effect";

// Add your TypeScript example code here
// This effect should successfully run
Effect.runSync(Effect.succeed("Hello, World!"));
`;

      yield* fs.writeFileString(tsPath, tsContent).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(
              colorize("\n❌ Failed to create TypeScript file\n", "red")
            );
            yield* Console.error(`Path: ${tsPath}\n`);
            yield* Console.error("Check file permissions and disk space.\n");
            yield* Console.error(`Error: ${error}\n`);
            return yield* Effect.fail(
              new Error("Cannot create TypeScript file")
            );
          })
        )
      );
      yield* Console.log(colorize(`✓ Created: ${tsPath}`, "green"));

      // Display success panel with pattern details
      yield* showPanel(
        `Files created successfully!

MDX File: ${mdxPath}
TypeScript File: ${tsPath}

Pattern Details:
  Title: ${title}
  Skill Level: ${skillLevel}
  Use Case: ${useCase}
  Summary: ${summary}

Next steps:
  1. Edit the MDX file to add pattern documentation
  2. Edit the TypeScript file to add working examples
  3. Run 'bun ep validate' to check your pattern
  4. Run 'bun ep publish' to add to the pattern library`,
        "Pattern Scaffolding Complete",
        { type: "success" }
      );
    })
  )
);

// --- USER COMMANDS (ep CLI) ---

/**
 * search <query> - Search patterns by keyword
 */
export const searchCommand = Command.make("search", {
  options: {},
  args: {
    query: Args.text({ name: "query" }),
  },
})
  .pipe(Command.withDescription("Search patterns by keyword"))
  .pipe(
    Command.withHandler(({ args }) =>
      Effect.gen(function* () {
        yield* Console.log(
          `\n🔍 Searching for patterns matching "${args.query}"...\n`
        );

        // Load patterns from database
        let db: ReturnType<typeof createDatabase> | null = null;
        try {
          db = createDatabase();
          const repo = createEffectPatternRepository(db.db);
          const dbPatterns = yield* Effect.tryPromise({
            try: () =>
              repo.search({
                query: args.query,
                limit: 10,
              }),
            catch: (error) => {
              // Extract more detailed error information
              const errorMessage =
                error instanceof Error ? error.message : String(error);

              // Check for postgres-specific error properties
              const postgresError =
                error && typeof error === "object" ? (error as any) : null;
              const pgCode = postgresError?.code;
              const pgMessage = postgresError?.message;
              const pgDetail = postgresError?.detail;
              const pgHint = postgresError?.hint;

              // Build detailed error message
              let details = "";
              if (pgCode) {
                details += `\nPostgreSQL Error Code: ${pgCode}`;
              }
              if (pgMessage && pgMessage !== errorMessage) {
                details += `\nPostgreSQL Message: ${pgMessage}`;
              }
              if (pgDetail) {
                details += `\nDetail: ${pgDetail}`;
              }
              if (pgHint) {
                details += `\nHint: ${pgHint}`;
              }
              if (!details && error instanceof Error && "cause" in error) {
                details = `\nCause: ${String(error.cause)}`;
              }

              return new Error(
                `Failed to search patterns: ${errorMessage}${details}`
              );
            },
          });

          if (dbPatterns.length === 0) {
            yield* Console.log(
              `❌ No patterns found matching "${args.query}"\n`
            );
          } else {
            yield* Console.log(`✓ Found ${dbPatterns.length} pattern(s):\n`);
            for (const pattern of dbPatterns) {
              yield* Console.log(`  • ${pattern.title} (${pattern.slug})`);
            }
            yield* Console.log("");
          }
        } catch (error) {
          yield* showError(
            `Database error: ${error instanceof Error ? error.message : String(error)
            }`
          );
          yield* Console.log(
            "\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is set correctly.\n"
          );
          throw error;
        } finally {
          if (db) {
            yield* Effect.tryPromise({
              try: () => db!.close(),
              catch: (error) => {
                console.error("Failed to close database connection:", error);
                return undefined;
              },
            });
          }
        }
      })
    )
  );

/**
 * list - List all patterns with optional filtering and grouping
 */
export const listCommand = Command.make("list", {
  options: {
    difficulty: Options.optional(
      Options.text("difficulty").pipe(
        Options.withAlias("d"),
        Options.withDescription(
          "Filter by difficulty (beginner|intermediate|advanced)"
        )
      )
    ),
    category: Options.optional(
      Options.text("category").pipe(
        Options.withAlias("c"),
        Options.withDescription("Filter by category")
      )
    ),
    groupBy: Options.text("group-by").pipe(
      Options.withDefault("none"),
      Options.withDescription("Group results (category|difficulty|none)")
    ),
  },
})
  .pipe(Command.withDescription("List all patterns with optional filters"))
  .pipe(
    Command.withHandler(({ options }) =>
      Effect.gen(function* () {
        // Load patterns from database
        const { db, close } = createDatabase();
        try {
          const repo = createEffectPatternRepository(db);

          // Build search params
          const searchParams: {
            skillLevel?: "beginner" | "intermediate" | "advanced";
            category?: string;
          } = {};

          if (options.difficulty._tag === "Some") {
            const difficultyValue = options.difficulty.value.toLowerCase();
            if (
              difficultyValue === "beginner" ||
              difficultyValue === "intermediate" ||
              difficultyValue === "advanced"
            ) {
              searchParams.skillLevel = difficultyValue;
            }
          }

          if (options.category._tag === "Some") {
            searchParams.category = options.category.value;
          }

          const dbPatterns = yield* Effect.tryPromise({
            try: () => repo.search(searchParams),
            catch: (error) =>
              new Error(
                `Failed to load patterns: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          // Convert to legacy format for compatibility
          const patterns = dbPatterns.map((p) => ({
            id: p.slug,
            title: p.title,
            description: p.summary,
            difficulty: p.skillLevel,
            category: p.category || "other",
            tags: p.tags || [],
          }));

          if (patterns.length === 0) {
            yield* Console.log("\n❌ No patterns match the filter criteria\n");
            return;
          }

          // Group or display flat
          if (options.groupBy === "category") {
            // Group by category
            const groups: Record<string, any[]> = {};
            patterns.forEach((p: any) => {
              const cat = p.category || "Other";
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(p);
            });

            yield* Console.log("\n📂 Patterns by Category:\n");
            for (const [category, items] of Object.entries(groups)) {
              yield* Console.log(`\n${category.toUpperCase()}`);
              yield* Console.log("─".repeat(40));
              for (const p of items) {
                yield* Console.log(`  • ${p.title} (${p.id})`);
              }
            }
          } else if (options.groupBy === "difficulty") {
            // Group by difficulty
            const groups: Record<string, any[]> = {
              beginner: [],
              intermediate: [],
              advanced: [],
            };
            patterns.forEach((p: any) => {
              const diff = p.difficulty.toLowerCase() || "intermediate";
              if (groups[diff]) groups[diff].push(p);
            });

            yield* Console.log("\n📊 Patterns by Difficulty Level:\n");
            for (const [level, items] of Object.entries(groups)) {
              if (items.length > 0) {
                const emoji =
                  level === "beginner"
                    ? "🟢"
                    : level === "intermediate"
                      ? "🟡"
                      : "🔴";
                yield* Console.log(
                  `\n${emoji} ${level.toUpperCase()} (${items.length})`
                );
                yield* Console.log("─".repeat(40));
                for (const p of items) {
                  yield* Console.log(`  • ${p.title} (${p.id})`);
                }
              }
            }
          } else {
            // Flat list
            yield* Console.log("\n📋 All Patterns:\n");
            for (const p of patterns) {
              const emoji =
                p.difficulty === "beginner"
                  ? "🟢"
                  : p.difficulty === "intermediate"
                    ? "🟡"
                    : "🔴";
              yield* Console.log(
                `  ${emoji} ${p.title} (${p.id}) - ${p.category}`
              );
            }
          }

          yield* Console.log(`\n\n📈 Total: ${patterns.length} pattern(s)\n`);
        } catch (error) {
          yield* showError(
            `Database error: ${error instanceof Error ? error.message : String(error)
            }`
          );
          yield* Console.log(
            "\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is set correctly.\n"
          );
          throw error;
        } finally {
          if (db) {
            yield* Effect.tryPromise({
              try: () => (db as any).close(),
              catch: (error) => {
                console.error("Failed to close database connection:", error);
                return undefined;
              },
            });
          }
        }
      })
    )
  );

/**
 * show <pattern-id> - Show detailed pattern information
 */
export const showCommand = Command.make("show", {
  options: {
    format: Options.text("format").pipe(
      Options.withDefault("full"),
      Options.withDescription("Display format (full|summary)")
    ),
  },
  args: {
    patternId: Args.text({ name: "pattern-id" }),
  },
})
  .pipe(Command.withDescription("Show detailed pattern information"))
  .pipe(
    Command.withHandler(({ args, options }) =>
      Effect.gen(function* () {
        // Load pattern from database
        let db: ReturnType<typeof createDatabase> | null = null;
        try {
          db = createDatabase();
          const repo = createEffectPatternRepository(db.db);
          const dbPattern = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.patternId),
            catch: (error) =>
              new Error(
                `Failed to load pattern: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!dbPattern) {
            yield* Console.log(`\n❌ Pattern "${args.patternId}" not found\n`);

            // Suggest similar patterns
            const similarPatterns = yield* Effect.tryPromise({
              try: () =>
                repo.search({
                  query: args.patternId,
                  limit: 3,
                }),
              catch: () => [],
            });

            if (similarPatterns.length > 0) {
              yield* Console.log("Did you mean one of these?\n");
              for (const p of similarPatterns) {
                yield* Console.log(`  • ${p.slug}`);
              }
              yield* Console.log("");
            }
            return;
          }

          // Convert to legacy format
          const pattern = {
            id: dbPattern.slug,
            title: dbPattern.title,
            description: dbPattern.summary,
            difficulty: dbPattern.skillLevel,
            category: dbPattern.category || "other",
            tags: dbPattern.tags || [],
            examples: dbPattern.examples || [],
            useCases: dbPattern.useCases || [],
            relatedPatterns: undefined, // Would need to query patternRelations
          };

          // Display metadata panel
          const metadata = `
ID: ${pattern.id}
Title: ${pattern.title}
Skill Level: ${pattern.difficulty}
Category: ${pattern.category}
Tags: ${pattern.tags.length > 0 ? pattern.tags.join(", ") : "None"}`.trim();

          yield* Console.log("\n" + "═".repeat(60));
          yield* Console.log("📋 PATTERN METADATA");
          yield* Console.log("═".repeat(60));
          yield* Console.log(metadata);

          // Display summary
          if (pattern.description) {
            yield* Console.log("\n" + "─".repeat(60));
            yield* Console.log("📝 DESCRIPTION");
            yield* Console.log("─".repeat(60));
            yield* Console.log(pattern.description);
          }

          // Full format shows more
          if (options.format === "full") {
            // Display examples
            if (pattern.examples && pattern.examples.length > 0) {
              yield* Console.log("\n" + "─".repeat(60));
              yield* Console.log("💡 EXAMPLES");
              yield* Console.log("─".repeat(60));
              for (let i = 0; i < pattern.examples.length; i++) {
                const ex = pattern.examples[i];
                yield* Console.log(
                  `\nExample ${i + 1}: ${ex.description || "Code example"}`
                );
                yield* Console.log("─".repeat(40));
                yield* Console.log(ex.code);
              }
            }

            // Display use cases
            if (pattern.useCases && pattern.useCases.length > 0) {
              yield* Console.log("\n" + "─".repeat(60));
              yield* Console.log("🎯 USE CASES");
              yield* Console.log("─".repeat(60));
              for (const useCase of pattern.useCases) {
                yield* Console.log(`  • ${useCase}`);
              }
            }

            // Get and display related patterns
            const relatedPatterns = yield* Effect.tryPromise({
              try: () => repo.getRelatedPatterns(dbPattern.id),
              catch: () => [],
            });
            if (relatedPatterns.length > 0) {
              yield* Console.log("\n" + "─".repeat(60));
              yield* Console.log("🔗 RELATED PATTERNS");
              yield* Console.log("─".repeat(60));
              for (const related of relatedPatterns) {
                yield* Console.log(`  • ${related.slug} - ${related.title}`);
              }
            }
          }

          yield* Console.log("\n" + "═".repeat(60) + "\n");
        } catch (error) {
          yield* showError(
            `Database error: ${error instanceof Error ? error.message : String(error)
            }`
          );
          yield* Console.log(
            "\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is set correctly.\n"
          );
          throw error;
        } finally {
          if (db) {
            yield* Effect.tryPromise({
              try: () => db!.close(),
              catch: (error) => {
                console.error("Failed to close database connection:", error);
                return undefined;
              },
            });
          }
        }
      })
    )
  );

/**
 * pattern - Create and manage Effect-TS patterns
 */
export const patternCommand = Command.make("pattern").pipe(
  Command.withDescription("Create new Effect-TS patterns with scaffolding"),
  Command.withSubcommands([patternNewCommand])
);

/**
 * admin:release - Manage releases
 */
export const releaseCommand = Command.make("release").pipe(
  Command.withDescription(
    "Create and preview project releases using conventional commits"
  ),
  Command.withSubcommands([releasePreviewCommand, releaseCreateCommand])
);

// --- ADMIN COMMAND ---

/**
 * admin:rules - Generate AI coding rules
 */
export const rulesCommand = Command.make("rules").pipe(
  Command.withDescription("Generate AI coding rules from patterns"),
  Command.withSubcommands([rulesGenerateCommand])
);

/**
 * admin:lock - Lock (validate) an entity to make it readonly
 */
const lockCommand = Command.make("lock", {
  options: {
    type: Options.text("type").pipe(
      Options.withDescription(
        "Entity type: pattern, application-pattern, or job"
      ),
      Options.withDefault("pattern")
    ),
  },
  args: {
    identifier: Args.text({ name: "identifier" }),
  },
}).pipe(
  Command.withDescription(
    "Lock (validate) an entity to prevent modifications. Once locked, entities become readonly."
  ),
  Command.withHandler(({ args, options }) =>
    Effect.gen(function* () {
      let db: ReturnType<typeof createDatabase> | null = null;
      try {
        db = createDatabase();
        const entityType = options.type.toLowerCase();
        let result;
        let entityName: string;

        if (entityType === "pattern" || entityType === "effect-pattern") {
          const repo = createEffectPatternRepository(db.db);
          // Try to find by slug first, then by id
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for pattern: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            // Try as ID
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for pattern by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Pattern "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.lock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to lock pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Pattern "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.lock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to lock pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Pattern "${existing.slug}"`;
          }
        } else if (
          entityType === "application-pattern" ||
          entityType === "ap"
        ) {
          const repo = createApplicationPatternRepository(db.db);
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for application pattern: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for application pattern by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Application pattern "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.lock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to lock application pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Application pattern "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.lock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to lock application pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Application pattern "${existing.slug}"`;
          }
        } else if (entityType === "job") {
          const repo = createJobRepository(db.db);
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for job: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for job by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Job "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.lock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to lock job: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Job "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.lock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to lock job: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Job "${existing.slug}"`;
          }
        } else {
          yield* showError(
            `Invalid entity type: ${options.type}. Must be one of: pattern, application-pattern, job`
          );
          return;
        }

        if (!result) {
          yield* showError(`Failed to lock ${entityName}`);
          return;
        }

        yield* showSuccess(`${entityName} has been locked (validated)`);
        yield* Console.log(`  • Validated: ${result.validated ? "Yes" : "No"}`);
        if (result.validatedAt) {
          yield* Console.log(
            `  • Validated at: ${result.validatedAt.toISOString()}`
          );
        }
      } catch (error) {
        yield* showError(
          `Database error: ${error instanceof Error ? error.message : String(error)
          }`
        );
        yield* Console.log(
          "\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is set correctly.\n"
        );
        throw error;
      } finally {
        if (db) {
          yield* Effect.tryPromise({
            try: () => db!.close(),
            catch: (error) => {
              console.error("Failed to close database connection:", error);
              return undefined;
            },
          });
        }
      }
    })
  )
);

/**
 * admin:unlock - Unlock (unvalidate) an entity to allow modifications
 */
const unlockCommand = Command.make("unlock", {
  options: {
    type: Options.text("type").pipe(
      Options.withDescription(
        "Entity type: pattern, application-pattern, or job"
      ),
      Options.withDefault("pattern")
    ),
  },
  args: {
    identifier: Args.text({ name: "identifier" }),
  },
}).pipe(
  Command.withDescription(
    "Unlock (unvalidate) an entity to allow modifications again."
  ),
  Command.withHandler(({ args, options }) =>
    Effect.gen(function* () {
      let db: ReturnType<typeof createDatabase> | null = null;
      try {
        db = createDatabase();
        const entityType = options.type.toLowerCase();
        let result;
        let entityName: string;

        if (entityType === "pattern" || entityType === "effect-pattern") {
          const repo = createEffectPatternRepository(db.db);
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for pattern: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for pattern by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Pattern "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Pattern "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Pattern "${existing.slug}"`;
          }
        } else if (
          entityType === "application-pattern" ||
          entityType === "ap"
        ) {
          const repo = createApplicationPatternRepository(db.db);
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for application pattern: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for application pattern by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Application pattern "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock application pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Application pattern "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock application pattern: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Application pattern "${existing.slug}"`;
          }
        } else if (entityType === "job") {
          const repo = createJobRepository(db.db);
          const existing = yield* Effect.tryPromise({
            try: () => repo.findBySlug(args.identifier),
            catch: (error) =>
              new Error(
                `Failed to search for job: ${error instanceof Error ? error.message : String(error)
                }`
              ),
          });

          if (!existing) {
            const byId = yield* Effect.tryPromise({
              try: () => repo.findById(args.identifier),
              catch: (error) =>
                new Error(
                  `Failed to search for job by ID: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            if (!byId) {
              yield* showError(
                `Job "${args.identifier}" not found (tried as slug and ID)`
              );
              return;
            }
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(byId.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock job: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Job "${byId.slug}"`;
          } else {
            result = yield* Effect.tryPromise({
              try: () => repo.unlock(existing.id),
              catch: (error) =>
                new Error(
                  `Failed to unlock job: ${error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            entityName = `Job "${existing.slug}"`;
          }
        } else {
          yield* showError(
            `Invalid entity type: ${options.type}. Must be one of: pattern, application-pattern, job`
          );
          return;
        }

        if (!result) {
          yield* showError(`Failed to unlock ${entityName}`);
          return;
        }

        yield* showSuccess(`${entityName} has been unlocked`);
        yield* Console.log(`  • Validated: ${result.validated ? "Yes" : "No"}`);
      } catch (error) {
        yield* showError(
          `Database error: ${error instanceof Error ? error.message : String(error)
          }`
        );
        yield* Console.log(
          "\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is set correctly.\n"
        );
        throw error;
      } finally {
        if (db) {
          yield* Effect.tryPromise({
            try: () => db!.close(),
            catch: (error) => {
              console.error("Failed to close database connection:", error);
              return undefined;
            },
          });
        }
      }
    })
  )
);

/**
 * admin - Administrative commands for repository management
 */
// --- COMPLETIONS COMMAND ---

const completionsGenerateCommand = Command.make(
  "generate",
  {
    shell: Args.text({ name: "shell" }).pipe(
      Args.withDescription("Shell type: bash, zsh, or fish")
    ),
  },
  ({ shell }) =>
    Effect.gen(function* () {
      const shellType = shell.toLowerCase() as Shell;
      if (!["bash", "zsh", "fish"].includes(shellType)) {
        yield* Console.error(
          `Invalid shell: ${shell}. Must be one of: bash, zsh, fish`
        );
        return;
      }

      const script = generateCompletion(shellType, EP_ADMIN_COMMANDS);
      yield* Console.log(script);
    })
).pipe(
  Command.withDescription(
    "Generate shell completion script (outputs to stdout)"
  )
);

const completionsInstallCommand = Command.make(
  "install",
  {
    shell: Args.text({ name: "shell" }).pipe(
      Args.withDescription("Shell type: bash, zsh, or fish")
    ),
  },
  ({ shell }) =>
    Effect.gen(function* () {
      const shellType = shell.toLowerCase() as Shell;
      if (!["bash", "zsh", "fish"].includes(shellType)) {
        yield* Console.error(
          `Invalid shell: ${shell}. Must be one of: bash, zsh, fish`
        );
        return;
      }

      yield* Console.log(`Installing ${shellType} completions...`);

      const result = yield* installCompletion(shellType, EP_ADMIN_COMMANDS).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Console.error(`Failed to install completions: ${error.message}`);
            return null;
          })
        )
      );

      if (result) {
        yield* showSuccess(`Completions installed to: ${result}`);
        yield* Console.log(getInstallInstructions(shellType, result));
      }
    })
).pipe(Command.withDescription("Install shell completions to default location"));

const completionsCommand = Command.make("completions").pipe(
  Command.withDescription(
    "Generate or install shell completions for bash, zsh, or fish"
  ),
  Command.withSubcommands([completionsGenerateCommand, completionsInstallCommand])
);

const adminSubcommands = [
  validateCommand,
  testCommand,
  pipelineCommand,
  generateCommand,
  publishCommand,
  ingestCommand,
  qaCommand,
  dbCommand,
  discordCommand,
  skillsCommand,
  migrateCommand,
  opsCommand,
  testUtilsCommand,
  rulesCommand,
  releaseCommand,
  pipelineManagementCommand,
  lockCommand,
  unlockCommand,
  completionsCommand,
] as const;

export const adminRootCommand = Command.make("ep-admin").pipe(
  Command.withDescription("Administrative CLI for Effect Patterns maintainers"),
  Command.withSubcommands(adminSubcommands)
);

import { FetchHttpClient } from "@effect/platform";
import { LoggerDefault } from "./services/logger.js";

// Import TUI layer for ep-admin (optional - lazy loaded)
let EffectCLITUILayer: any = null;
try {
  const tuiModule = require("effect-cli-tui");
  EffectCLITUILayer = tuiModule.EffectCLITUILayer;
} catch {
  // TUI not available, will use standard runtime
}

export const fileSystemLayer = NodeFileSystem.layer.pipe(
  Layer.provide(NodeContext.layer)
);

// Standard runtime for ep-admin (includes Logger service)
export const runtimeLayer = Layer.mergeAll(
  fileSystemLayer,
  FetchHttpClient.layer,
  LoggerDefault,
  (StateStore as any).Default
) as any;

// TUI-enabled runtime for ep-admin
export const runtimeLayerWithTUI: any = EffectCLITUILayer
  ? Layer.mergeAll(
    fileSystemLayer,
    FetchHttpClient.layer,
    LoggerDefault,
    (StateStore as any).Default,
    EffectCLITUILayer
  )
  : runtimeLayer; // Fallback to standard runtime if TUI not available

const adminCliRunner = Command.run(adminRootCommand, {
  name: "EffectPatterns Admin CLI",
  version: "0.4.1",
});

export const createAdminProgram = (
  argv: ReadonlyArray<string> = process.argv
) => adminCliRunner(argv);

// Run CLI when executed directly
import { NodeRuntime } from "@effect/platform-node";

createAdminProgram(process.argv).pipe(
  Effect.provide(runtimeLayer),
  NodeRuntime.runMain
);
