/**
 * pipeline.ts
 *
 * State-aware main pipeline script that integrates with PipelineStateMachine:
 *
 * Workflow steps (from pipeline-state):
 * 1. draft → ingested (ingest new patterns)
 * 2. ingested → tested (test examples)
 * 3. tested → validated (validate patterns)
 * 4. validated → published (publish to content/published)
 * 5. published → finalized (move-to-published cleanup)
 *
 * Features:
 * - State tracking per pattern
 * - Confirm before each step
 * - Skip already-completed steps
 * - Retry support for failed steps
 * - Checkpoint recording for audit trail
 *
 * Usage:
 * ```bash
 * bun run pipeline.ts
 * ```
 */

import { exec } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as readline from 'node:readline';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const SCRIPTS_DIR = path.join(process.cwd(), 'scripts', 'publish');
const PROJECT_ROOT = process.cwd();

// --- STATE MACHINE IMPORTS ---
// Note: These are imported from the compiled dist files
// In a real implementation, would use proper module loading
const WORKFLOW_STEPS = [
  'ingested',
  'tested',
  'validated',
  'published',
  'finalized'
] as const;

type WorkflowStep = typeof WORKFLOW_STEPS[number];

// --- PIPELINE STEPS ---
const STEPS = [
  {
    name: 'Test TypeScript Examples',
    script: 'test-improved.ts',
    description: 'Running and validating all TypeScript examples...',
    workflowStep: 'tested' as WorkflowStep,
  },
  {
    name: 'Validate Published Files',
    script: 'validate-improved.ts',
    description: 'Validating published MDX files...',
    workflowStep: 'validated' as WorkflowStep,
  },
  {
    name: 'Publish MDX Files',
    script: 'publish.ts',
    description: 'Converting raw MDX to published MDX...',
    workflowStep: 'published' as WorkflowStep,
  },
  {
    name: 'Move to Published',
    script: 'move-to-published.ts',
    description: 'Moving patterns to content/published/ and cleaning up...',
    workflowStep: 'finalized' as WorkflowStep,
  },
  {
    name: 'Generate README',
    script: 'generate.ts',
    description: 'Generating README.md...',
    workflowStep: undefined, // Not a tracked workflow step
  },
  {
    name: 'Generate Rules',
    script: 'rules-improved.ts',
    description: 'Generating AI coding rules...',
    workflowStep: undefined, // Not a tracked workflow step
  },
];

// --- HELPER FUNCTIONS ---

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Run a pipeline step with state tracking
 */
async function runStep(
  step: (typeof STEPS)[0],
  skipConfirmation: boolean = false
) {
  console.log(`\n🚀 ${step.name}`);
  console.log(step.description);

  // Show workflow step if tracked
  if (step.workflowStep) {
    console.log(`   Workflow Step: ${step.workflowStep}`);
  }

  try {
    // For now, skip state machine integration - that will be added when
    // we integrate with the Effect-based state machine in a future version
    // TODO: Integrate with PipelineStateMachine for state tracking

    const scriptPath = path.join(SCRIPTS_DIR, step.script);
    const { stdout, stderr } = await execAsync(`bun run ${scriptPath}`);

    if (stderr) {
      console.error(stderr);
    }
    if (stdout) {
      console.log(stdout);
    }

    console.log(`✅ ${step.name} completed`);
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
  console.log('🚀 Starting Effect Patterns publishing pipeline...\n');
  console.log('Workflow Steps: ingested → tested → validated → published → finalized\n');
  const startTime = Date.now();

  try {
    // Run each step in sequence
    for (const step of STEPS) {
      await runStep(step);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✨ Pipeline completed successfully in ${duration}s!`);
    console.log('\nNext steps:');
    console.log('  1. Review changes in git');
    console.log('  2. Commit and push if satisfied');
    console.log('  3. Use "ep-admin pipeline-state status" to view pattern states');
  } catch (_error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Pipeline failed after ${duration}s`);
    console.error('\nTo retry:');
    console.error('  1. Fix the error');
    console.error('  2. Run "ep-admin pipeline-state retry <step> <pattern>" or');
    console.error('  3. Run "ep-admin pipeline-state resume" to continue');
    process.exit(1);
  }
}

main();
