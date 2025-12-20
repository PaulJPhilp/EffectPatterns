/**
 * validate-pipeline-integrity.ts
 *
 * Pre-pipeline validation to ensure no generation has bypassed the pipeline.
 *
 * This script runs at the START of the pipeline to detect unauthorized
 * generation outputs. It prevents the Schema Pattern Incident from recurring.
 *
 * Usage: Called automatically by pipeline.ts
 */

import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

interface ValidationResult {
  success: boolean;
  violations: string[];
  message: string;
}

/**
 * Check if any generation output exists outside content/published/
 */
function validatePipelineIntegrity(): ValidationResult {
  const forbiddenDirs = [
    'patterns/',
    'rules/',
    '.claude/skills/',
    '.gemini/skills/',
    '.openai/skills/',
  ];

  const violations: string[] = [];

  for (const dir of forbiddenDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      try {
        const files = readdirSync(fullPath);
        if (files.length > 0) {
          violations.push(`${dir} (${files.length} files)`);
        }
      } catch {
        // Directory exists but may not be readable, flag it anyway
        violations.push(dir);
      }
    }
  }

  if (violations.length > 0) {
    let message = `
❌ PIPELINE INTEGRITY VIOLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generation output detected OUTSIDE content/published/:

`;
    for (const v of violations) {
      message += `  ✗ ${v}\n`;
    }

    message += `
This means generation BYPASSED the pipeline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULE:

All generated outputs MUST flow through the pipeline:

  1. Create/edit source → content/new/
  2. Run: bun run pipeline
  3. Run: bun run scripts/publish/move-to-published.ts
  4. Output appears in: content/published/

FORBIDDEN DIRECTORIES (never create manually):
  ❌ patterns/
  ❌ rules/
  ❌ .claude/skills/
  ❌ .gemini/skills/
  ❌ .openai/skills/

The pre-commit hook will block any attempt to commit these files.

For more info: docs/ARCHITECTURE.md and CONTRIBUTING.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return {
      success: false,
      violations,
      message,
    };
  }

  return {
    success: true,
    violations: [],
    message: '✅ Pipeline integrity check passed',
  };
}

// Main execution
const result = validatePipelineIntegrity();
console.log(result.message);

if (!result.success) {
  console.error('');
  process.exit(1);
}
