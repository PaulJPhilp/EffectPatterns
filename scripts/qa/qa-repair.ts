/**
 * qa-repair.ts
 *
 * QA repair script. Processes failed QA results and generates repair instructions
 * using LLM via CLI commands. Creates backups and applies fixes.
 *
 * Usage:
 *   bun run qa:repair [--dry-run]
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface QaResult {
  patternId?: string;
  fileName?: string;
  metadata?: { title?: string };
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  passed?: boolean;
  qaFile?: string;
}

interface RepairInstructions {
  repairedContent: string;
  changes: string[];
  explanation?: string;
}

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const QA_DIR = path.join(PROJECT_ROOT, 'content/qa');
const RESULTS_DIR = path.join(QA_DIR, 'results');
const BACKUPS_DIR = path.join(QA_DIR, 'backups');
const REPAIRS_DIR = path.join(QA_DIR, 'repairs');
const PATTERNS_DIR = path.join(PROJECT_ROOT, 'content/new/processed');
const _REPAIR_PROMPT = path.join(
  PROJECT_ROOT,
  'scripts/qa/prompts/repair-schema.mdx',
);

// --- SETUP ---
async function ensureDirectories() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  await fs.mkdir(REPAIRS_DIR, { recursive: true });
}

// --- MAIN PROCESSING ---
async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`QA Repair Process${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('=====================================');

  await ensureDirectories();

  try {
    // Check if results exist
    const files = await fs.readdir(RESULTS_DIR);
    const qaResults = files.filter((f) => f.endsWith('.json'));

    if (qaResults.length === 0) {
      console.log('No QA results found. Run "bun run qa:process" first.');
      return;
    }

    // Load failed results
    const failedResults: QaResult[] = [];
    for (const file of qaResults) {
      const filePath = path.join(RESULTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const result = JSON.parse(content) as QaResult;

      if (!result.passed) {
        failedResults.push({
          ...result,
          qaFile: file,
        });
      }
    }

    if (failedResults.length === 0) {
      console.log('No failed patterns found to repair.');
      return;
    }

    console.log(`Found ${failedResults.length} failed patterns to repair`);

    // Process each failed pattern
    let repaired = 0;
    let failed = 0;

    for (const result of failedResults) {
      try {
        await repairPattern(result, dryRun);
        repaired++;
      } catch (error) {
        console.error(`Failed to repair ${result.patternId}: ${error}`);
        failed++;
      }
    }

    console.log(`\nRepair Process Complete${dryRun ? ' (DRY RUN)' : ''}:`);
    console.log(`  Attempted: ${failedResults.length}`);
    console.log(`  Successfully Repaired: ${repaired}`);
    console.log(`  Failed: ${failed}`);

    if (!dryRun) {
      console.log(`Backups saved to: ${BACKUPS_DIR}`);
      console.log(`Repair instructions saved to: ${REPAIRS_DIR}`);
    }
  } catch (error) {
    console.error('Repair process failed:', error);
    process.exit(1);
  }
}

async function repairPattern(result: QaResult, dryRun: boolean): Promise<void> {
  const patternId = result.patternId || 'unknown';
  const fileName = result.fileName || `${patternId}.mdx`;
  const patternPath = path.join(PATTERNS_DIR, fileName);

  console.log(`Processing: ${fileName}`);

  try {
    // Check if pattern file exists
    await fs.access(patternPath);
  } catch {
    console.log(`  Skipping ${fileName}: file not found`);
    return;
  }

  // Create backup
  const backupFile = path.join(BACKUPS_DIR, `${patternId}-${Date.now()}.mdx`);
  const originalContent = await fs.readFile(patternPath, 'utf-8');

  if (!dryRun) {
    await fs.writeFile(backupFile, originalContent);
    console.log(`  Backup created: ${path.basename(backupFile)}`);
  }

  // Generate repair instructions using CLI
  const repairInstructions = await generateRepairInstructions(
    result,
    originalContent,
  );

  if (!repairInstructions) {
    console.log(`  Skipping ${fileName}: no repair instructions generated`);
    return;
  }

  // Save repair instructions
  const repairFile = path.join(REPAIRS_DIR, `${patternId}-repair.json`);
  await fs.writeFile(repairFile, JSON.stringify(repairInstructions, null, 2));

  if (dryRun) {
    console.log(
      `  DRY RUN: Would apply ${repairInstructions.changes.length} changes`,
    );
    console.log(`  Changes: ${repairInstructions.changes.join('; ')}`);
    return;
  }

  // Apply repairs
  await applyRepairs(patternPath, repairInstructions);
  console.log(
    `  ✓ Repaired: ${repairInstructions.changes.length} changes applied`,
  );
}

async function generateRepairInstructions(
  result: QaResult,
  originalContent: string,
): Promise<RepairInstructions | null> {
  const prompt = `Generate repair instructions for this failed Effect pattern:

Pattern: ${result.metadata?.title || 'Unknown'}
Errors: ${(result.errors || []).join(', ')}
Warnings: ${(result.warnings || []).join(', ')}
Suggestions: ${(result.suggestions || []).join(', ')}

Original Content:
${originalContent}

Provide JSON repair instructions with:
- repairedContent: the complete fixed content
- changes: array of specific changes made
- explanation: brief explanation of fixes

Return JSON only.`;

  try {
    const command = `bun run cli generate --prompt "${prompt}" --output-format json`;

    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
    });

    return JSON.parse(output) as RepairInstructions;
  } catch (error) {
    console.error(`  ✗ Failed to generate repair instructions: ${error}`);
    return null;
  }
}

async function applyRepairs(
  patternPath: string,
  repairInstructions: RepairInstructions,
): Promise<void> {
  const { repairedContent } = repairInstructions;

  if (!repairedContent) {
    throw new Error('No repaired content provided');
  }

  await fs.writeFile(patternPath, repairedContent);
}

// --- ERROR HANDLING ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Repair process failed:', error);
  process.exit(1);
});
