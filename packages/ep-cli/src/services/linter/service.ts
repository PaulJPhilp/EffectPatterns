import { Effect } from "effect";
import fs from "node:fs/promises";
import path from "node:path";
import { LINT_RULES } from "../../constants.js";
import { colorize } from "../../utils.js";
import { Logger } from "../logger/index.js";
import type { LinterService } from "./api.js";
import type { LintIssue, LintResult } from "./types.js";

/**
 * Linter service using Effect.Service pattern
 */
export class Linter extends Effect.Service<Linter>()("Linter", {
  accessors: true,
  effect: Effect.gen(function* () {
    const logger = yield* Logger;

    const checkUseTapError = (content: string, filePath: string): LintIssue[] => {
      const issues: LintIssue[] = [];
      const lines = content.split("\n");
      const fileName = path.basename(filePath);

      lines.forEach((line, index) => {
        if (line.includes("Effect.catchAll") && line.toLowerCase().includes("log")) {
          issues.push({
            file: fileName,
            line: index + 1,
            column: line.indexOf("Effect.catchAll") + 1,
            rule: "effect-use-tap-error",
            severity: "warning",
            message: "Side-effecting error handler detected. Prefer tapError for logging or side effects.",
            suggestion: "Use Effect.tapError(...) instead of Effect.catchAll if you're not recovering from the error.",
          });
        }
      });
      return issues;
    };

    const checkExplicitConcurrency = (content: string, filePath: string): LintIssue[] => {
      const issues: LintIssue[] = [];
      const lines = content.split("\n");
      const fileName = path.basename(filePath);

      lines.forEach((line, index) => {
        if (line.includes("Effect.all(") && !line.includes("concurrency:")) {
          issues.push({
            file: fileName,
            line: index + 1,
            column: line.indexOf("Effect.all") + 1,
            rule: "effect-explicit-concurrency",
            severity: "error",
            message: "Effect.all used without explicit concurrency.",
            suggestion: 'Add { concurrency: "unbounded" } or a specific number as the second argument.',
          });
        }
      });
      return issues;
    };

    const checkDeprecatedAPIs = (content: string, filePath: string): LintIssue[] => {
      const issues: LintIssue[] = [];
      const lines = content.split("\n");
      const fileName = path.basename(filePath);

      const DEPRECATED = [
        { old: "Option.zip", new: "Option.all" },
        { old: "Either.zip", new: "Either.all" },
        { old: "Option.cond", new: "Option.fromNullable or Option.filter" },
        { old: "Effect.matchTag", new: "Effect.catchTags" },
      ];

      lines.forEach((line, index) => {
        DEPRECATED.forEach((api) => {
          if (line.includes(api.old)) {
            issues.push({
              file: fileName,
              line: index + 1,
              column: line.indexOf(api.old) + 1,
              rule: "effect-deprecated-api",
              severity: "error",
              message: `Deprecated API ${api.old} used.`,
              suggestion: `Use ${api.new} instead.`,
            });
          }
        });
      });
      return issues;
    };

    const lintFile = (filePath: string): Effect.Effect<LintResult, Error> =>
      Effect.gen(function* () {
        const content = yield* Effect.tryPromise({
          try: () => fs.readFile(filePath, "utf-8"),
          catch: (error) => new Error(`Failed to read file ${filePath}: ${error}`),
        });

        const allIssues: LintIssue[] = [
          ...checkUseTapError(content, filePath),
          ...checkExplicitConcurrency(content, filePath),
          ...checkDeprecatedAPIs(content, filePath),
        ];

        allIssues.sort((a, b) => a.line - b.line);

        return {
          file: path.basename(filePath),
          issues: allIssues,
          errors: allIssues.filter((i) => i.severity === "error").length,
          warnings: allIssues.filter((i) => i.severity === "warning").length,
          info: allIssues.filter((i) => i.severity === "info").length,
        };
      });

    const lintFiles: LinterService["lintFiles"] = (files: string[]) =>
      Effect.all(files.map(lintFile), { concurrency: "unbounded" });

    const applyFixes: LinterService["applyFixes"] = (filePath: string, issues: LintIssue[]) =>
      Effect.gen(function* () {
        const content = yield* Effect.tryPromise({
          try: () => fs.readFile(filePath, "utf-8"),
          catch: (error) => new Error(`Failed to read file ${filePath}: ${error}`),
        });

        let fixedCount = 0;
        const sortedIssues = [...issues].sort((a, b) => b.line - a.line);

        for (const issue of sortedIssues) {
          const rule = LINT_RULES.find((r) => r.name === issue.rule);
          if (!rule?.canFix) continue;

          // Placeholder for actual fix logic
          fixedCount++;
        }

        return { fixed: fixedCount, content };
      });

    const printResults: LinterService["printResults"] = (results: LintResult[]) =>
      Effect.gen(function* () {
        yield* logger.info(colorize("\n📋 Effect Patterns Linter Results", "CYAN"));
        
        const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
        yield* logger.info(`Total: ${results.length} files`);
        yield* logger.info(`Errors: ${totalErrors}`);

        return totalErrors > 0 ? 1 : 0;
      });

    return {
      lintFiles,
      applyFixes,
      printResults,
    };
  }),
}) {}
