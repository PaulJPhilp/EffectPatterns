import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import ora from "ora";
import * as semver from "semver";

import { Effect } from "effect";

/**
 * Resolve the project root by walking up until we find package.json with the
 * effect-patterns-hub name. Falls back to cwd when not found.
 */
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
      // Keep walking up until we hit root.
    }
    current = path.dirname(current);
  }
  return process.cwd();
};

export const PROJECT_ROOT = getProjectRoot();

/**
 * Execute a Bun script and inherit stdio for streaming output.
 */
export const executeScript = (scriptPath: string) =>
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
 * Execute a script with spinner feedback (unless verbose) and capture output on
 * failure for easier debugging.
 */
export const executeScriptWithProgress = (
  scriptPath: string,
  taskName: string,
  options?: { verbose?: boolean }
) =>
  Effect.async<void, Error>((resume) => {
    const shouldShowSpinner = process.stderr.isTTY && !options?.verbose;

    const spinner = shouldShowSpinner
      ? ora({
          text: taskName,
          stream: process.stderr,
        }).start()
      : null;

    const child = spawn("bun", ["run", scriptPath], {
      stdio: options?.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let output = "";

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

        if (!options?.verbose && output) {
          console.error(`\n${output}`);
        }

        resume(Effect.fail(new Error(`Script exited with code ${code}`)));
      }
    });
  });

/**
 * Execute git commands synchronously with inherited stdio.
 */
export const execGitCommand = (
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
        `Git command failed: ${error instanceof Error ? error.message : String(error)}`
      ),
  });

export const getLatestTag = (): Effect.Effect<string, Error> =>
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

export const getCommitsSinceTag = (
  tag: string
): Effect.Effect<string[], Error> =>
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

export const getRecommendedBump = (
  _commits: string[]
): Effect.Effect<
  { releaseType: "major" | "minor" | "patch"; reason: string },
  Error
> =>
  Effect.async((resume) => {
    import("conventional-recommended-bump")
      .then((module) => {
        const conventionalRecommendedBump = (module as any).default || module;

        conventionalRecommendedBump(
          {
            preset: "angular",
          },
          (err: any, result: any) => {
            if (err) {
              resume(
                Effect.fail(
                  new Error(`Failed to determine bump: ${err.message}`)
                )
              );
            } else {
              resume(
                Effect.succeed({
                  releaseType: result.releaseType as
                    | "major"
                    | "minor"
                    | "patch",
                  reason: result.reason || "No specific reason provided",
                })
              );
            }
          }
        );
      })
      .catch((error) => {
        resume(
          Effect.fail(new Error(`Failed to load module: ${error.message}`))
        );
      });
  });

export const categorizeCommits = async (commits: string[]) => {
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

export const toKebabCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface LintIssue {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface LintResult {
  file: string;
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface LintRule {
  name: string;
  description: string;
  defaultSeverity: "error" | "warning" | "info" | "off";
  canFix: boolean;
}

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

const colorize = (text: string, color: keyof typeof colors): string =>
  `${colors[color]}${text}${colors.reset}`;

const checkUseTapError = (content: string): LintIssue[] => {
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
};

const checkExplicitConcurrency = (
  content: string,
  filePath: string
): LintIssue[] => {
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
};

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

const checkDeprecatedAPIs = (content: string): LintIssue[] => {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

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
};

const checkPreferPipe = (content: string): LintIssue[] => {
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
};

const checkStreamMemory = (content: string, filePath: string): LintIssue[] => {
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
};

const checkErrorModel = (content: string): LintIssue[] => {
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
};

export const lintFile = async (filePath: string): Promise<LintResult> => {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, "utf-8");

  const allIssues: LintIssue[] = [
    ...checkUseTapError(content),
    ...checkExplicitConcurrency(content, filePath),
    ...checkDeprecatedAPIs(content),
    ...checkPreferPipe(content),
    ...checkStreamMemory(content, filePath),
    ...checkErrorModel(content),
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
};

export const lintInParallel = async (
  files: string[]
): Promise<LintResult[]> => {
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
};

const fixExplicitConcurrency = (content: string, issue: LintIssue): string => {
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

  let depth = 0;
  let closingIndex = -1;
  let currentLineIndex = lineIndex;
  let charIndex = effectAllIndex + "Effect.all(".length;

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
      const before = lines[currentLineIndex].substring(0, closingIndex);
      const after = lines[currentLineIndex].substring(closingIndex);
      lines[currentLineIndex] =
        `${before}, { concurrency: "unbounded" }${after}`;
      break;
    }

    currentLineIndex++;
    charIndex = 0;
  }

  return lines.join("\n");
};

const fixDeprecatedAPI = (content: string, issue: LintIssue): string => {
  const lines = content.split("\n");
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return content;
  }

  let line = lines[lineIndex];

  if (line.includes("Option.zip(")) {
    line = line.replace(/Option\.zip\(/g, "Option.all(");
  } else if (line.includes("Either.zip(")) {
    line = line.replace(/Either\.zip\(/g, "Either.all(");
  } else if (line.includes("Option.cond(")) {
    return content;
  } else if (line.includes("Either.cond(")) {
    return content;
  } else if (line.includes("Effect.matchTag(")) {
    line = line.replace(/Effect\.matchTag\(/g, "Effect.catchTags(");
  } else if (line.includes("Effect.fromOption(")) {
    return content;
  } else if (line.includes("Effect.fromEither(")) {
    return content;
  }

  lines[lineIndex] = line;
  return lines.join("\n");
};

export const applyFixes = async (
  filePath: string,
  issues: LintIssue[]
): Promise<{ fixed: number; content: string }> => {
  let content = await fs.readFile(filePath, "utf-8");
  let fixedCount = 0;

  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);

  for (const issue of sortedIssues) {
    const rule = LINT_RULES.find((r) => r.name === issue.rule);
    if (!rule?.canFix) {
      continue;
    }

    let newContent = content;

    if (issue.rule === "effect-explicit-concurrency") {
      newContent = fixExplicitConcurrency(content, issue);
    } else if (issue.rule === "effect-deprecated-api") {
      newContent = fixDeprecatedAPI(content, issue);
    }

    if (newContent !== content) {
      content = newContent;
      fixedCount++;
    }
  }

  return { fixed: fixedCount, content };
};

export const printLintResults = (results: LintResult[]): number => {
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
};

export const analyzeRelease = () =>
  Effect.gen(function* () {
    const latestTag = yield* getLatestTag();
    const currentVersion = latestTag.replace(/^v/, "");

    const commits = yield* getCommitsSinceTag(latestTag);

    if (commits.length === 0) {
      return { hasChanges: false } as const;
    }

    const bump = yield* getRecommendedBump(commits);

    const nextVersion = semver.inc(currentVersion, bump.releaseType);

    if (!nextVersion) {
      return yield* Effect.fail(
        new Error(`Failed to calculate next version from ${currentVersion}`)
      );
    }

    const categories = yield* Effect.tryPromise({
      try: () => categorizeCommits(commits),
      catch: (error) =>
        new Error(
          `Failed to categorize commits: ${
            error instanceof Error ? error.message : String(error)
          }`
        ),
    });

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
