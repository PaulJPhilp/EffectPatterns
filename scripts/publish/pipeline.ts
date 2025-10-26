/**
 * pipeline.ts
 *
 * Main pipeline script that runs all publishing steps in sequence:
 * 1. test - Run all TypeScript examples
 * 2. publish - Convert raw MDX to published MDX
 * 3. validate - Validate published MDX files
 * 4. generate - Generate README.md
 * 5. rules - Generate AI coding rules
 *
 * The pipeline stops if any step fails.
 *
 * Usage:
 * ```bash
 * npm run pipeline
 * ```
 */

import { exec } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const SCRIPTS_DIR = path.join(process.cwd(), 'scripts', 'publish');

// --- PIPELINE STEPS ---
const STEPS = [
  {
    name: 'Test TypeScript Examples',
    script: 'test-improved.ts',
    description: 'Running and validating all TypeScript examples...',
  },
  {
    name: 'Publish MDX Files',
    script: 'publish.ts',
    description: 'Converting raw MDX to published MDX...',
  },
  {
    name: 'Validate Published Files',
    script: 'validate-improved.ts',
    description: 'Validating published MDX files...',
  },
  {
    name: 'Generate README',
    script: 'generate.ts',
    description: 'Generating README.md...',
  },
  {
    name: 'Generate Rules',
    script: 'rules-improved.ts',
    description: 'Generating AI coding rules...',
  },
];

// --- HELPER FUNCTIONS ---
async function runStep(step: (typeof STEPS)[0]) {
  console.log(`\n🚀 ${step.name}`);
  console.log(step.description);

  try {
    const scriptPath = path.join(SCRIPTS_DIR, step.script);
    const { stdout, stderr } = await execAsync(`bun run ${scriptPath}`);

    if (stderr) {
      console.error(stderr);
    }
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error(`❌ ${step.name} failed:`);
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error; // Re-throw to stop pipeline
  }
}

// --- MAIN EXECUTION ---
async function main() {
  console.log('Starting Effect Patterns publishing pipeline...\n');
  const startTime = Date.now();

  try {
    // Run each step in sequence
    for (const step of STEPS) {
      await runStep(step);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✨ Pipeline completed successfully in ${duration}s!`);
  } catch (_error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Pipeline failed after ${duration}s`);
    process.exit(1);
  }
}

main();
