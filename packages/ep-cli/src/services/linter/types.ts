/**
 * Linter service types
 */

export interface LintIssue {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly severity: "error" | "warning" | "info" | "off";
  readonly message: string;
  readonly suggestion?: string;
}

export interface LintResult {
  readonly file: string;
  readonly issues: LintIssue[];
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}
