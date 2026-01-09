/**
 * Linter service API
 */

import { Effect } from "effect";

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "error" | "warning" | "info" | "off";
  message: string;
  suggestion?: string;
}

export interface LintResult {
  file: string;
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface LinterService {
  readonly lintFiles: (files: string[]) => Effect.Effect<LintResult[], Error>;
  readonly applyFixes: (filePath: string, issues: LintIssue[]) => Effect.Effect<{ fixed: number; content: string }, Error>;
  readonly printResults: (results: LintResult[]) => Effect.Effect<number, never>;
}
