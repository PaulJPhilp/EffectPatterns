/**
 * Linter service barrel exports
 */

export type { LinterService, LintIssue, LintResult } from "./api.js";
export { Linter } from "./service.js";

import { Linter } from "./service.js";

export const lintFiles = Linter.lintFiles;
export const applyFixes = Linter.applyFixes;
export const printResults = Linter.printResults;
