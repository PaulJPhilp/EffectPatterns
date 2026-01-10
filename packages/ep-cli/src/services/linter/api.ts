import { Effect } from "effect";
import type { LintIssue, LintResult } from "./types.js";

export interface LinterService {
  readonly lintFiles: (files: string[]) => Effect.Effect<LintResult[], Error>;
  readonly applyFixes: (filePath: string, issues: LintIssue[]) => Effect.Effect<{ fixed: number; content: string }, Error>;
  readonly printResults: (results: LintResult[]) => Effect.Effect<number, never>;
}
