/**
 * Linter service types
 */

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
