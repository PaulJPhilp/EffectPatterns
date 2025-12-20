/**
 * migrate-state.ts
 *
 * One-time migration script to initialize pipeline state for existing patterns.
 *
 * This script:
 * 1. Reads all published patterns from content/published/
 * 2. Extracts metadata from each pattern
 * 3. Creates initial state with all steps marked as completed
 * 4. Saves to .pipeline-state.json at project root
 *
 * Run once after updating to the state machine version:
 * ```bash
 * bun scripts/migrate-state.ts
 * ```
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const PUBLISHED_DIR = path.join(PROJECT_ROOT, 'content/published');
const STATE_FILE_PATH = path.join(PROJECT_ROOT, '.pipeline-state.json');

// --- TYPES ---
interface StepState {
  status: 'completed' | 'running' | 'failed' | 'pending' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  attempts: number;
  checkpoints: Array<{
    operation: string;
    timestamp: string;
    data?: unknown;
  }>;
  errors?: string[];
}

interface PatternMetadata {
  title: string;
  id: string;
  rawPath: string;
  srcPath: string;
  summary?: string;
}

interface PatternState {
  id: string;
  status:
    | 'draft'
    | 'in-progress'
    | 'ready'
    | 'blocked'
    | 'completed'
    | 'failed';
  currentStep: string;
  steps: Record<string, StepState>;
  metadata: PatternMetadata;
  errors: Array<{
    step: string;
    code: string;
    message: string;
    timestamp: string;
    details?: unknown;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStateFile {
  version: string;
  lastUpdated: string;
  patterns: Record<string, PatternState>;
  global: {
    currentStep: string | null;
    stepHistory: string[];
  };
}

const WORKFLOW_STEPS = [
  'ingested',
  'tested',
  'validated',
  'published',
  'finalized',
] as const;

// --- HELPER FUNCTIONS ---

/**
 * Create initial step state
 */
function createInitialStepState(
  status: StepState['status'] = 'pending',
): StepState {
  return {
    status,
    attempts: 0,
    checkpoints: [],
    errors: [],
  };
}

/**
 * Create pattern state with all steps completed
 */
function createCompletedPatternState(
  patternId: string,
  metadata: PatternMetadata,
): PatternState {
  const now = new Date().toISOString();

  // All steps completed for migrated patterns
  const steps: Record<string, StepState> = {};
  for (const step of WORKFLOW_STEPS) {
    if (step === 'finalized') {
      // Final step
      steps[step] = {
        status: 'completed',
        startedAt: now,
        completedAt: now,
        duration: 0,
        attempts: 1,
        checkpoints: [
          {
            operation: 'migrated',
            timestamp: now,
            data: { source: 'migration-script' },
          },
        ],
      };
    } else {
      // Previous steps
      steps[step] = {
        status: 'completed',
        startedAt: now,
        completedAt: now,
        duration: 0,
        attempts: 1,
        checkpoints: [
          {
            operation: 'migrated',
            timestamp: now,
            data: { source: 'migration-script' },
          },
        ],
      };
    }
  }

  return {
    id: patternId,
    status: 'completed',
    currentStep: 'finalized',
    steps,
    metadata,
    errors: [],
    createdAt: now,
    updatedAt: now,
  };
}

// --- MAIN LOGIC ---

async function migrateExistingPatterns(): Promise<void> {
  console.log('🚀 Starting pattern state migration...\n');
  console.log(`Reading patterns from: ${PUBLISHED_DIR}`);
  console.log(`Writing state to: ${STATE_FILE_PATH}\n`);

  try {
    // Check if state file already exists
    try {
      await fs.access(STATE_FILE_PATH);
      console.log('⚠️  State file already exists!');
      console.log('This migration script should only run once.');
      console.log(
        '\nIf you want to reset the state, delete .pipeline-state.json and run again.',
      );
      console.log('Or backup your current state first:');
      console.log(`  cp ${STATE_FILE_PATH} ${STATE_FILE_PATH}.backup`);
      process.exit(1);
    } catch {
      // File doesn't exist, continue
    }

    // Read all published patterns
    const files = await fs.readdir(PUBLISHED_DIR);
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

    console.log(`Found ${mdxFiles.length} published patterns\n`);

    const patterns: Record<string, PatternState> = {};
    let successCount = 0;
    let errorCount = 0;

    // Process each pattern
    for (const file of mdxFiles) {
      const patternId = file.replace('.mdx', '');

      try {
        const filePath = path.join(PUBLISHED_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse frontmatter
        const { data: frontmatter } = matter(content);

        // Create metadata
        const metadata: PatternMetadata = {
          id: patternId,
          title: frontmatter.title || patternId,
          rawPath: `content/published/${file}`,
          srcPath: `content/src/${patternId}.ts`,
          summary: frontmatter.summary,
        };

        // Create completed pattern state
        const patternState = createCompletedPatternState(patternId, metadata);
        patterns[patternId] = patternState;
        successCount++;

        console.log(`✅ Migrated ${patternId}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to migrate ${patternId}: ${errorMessage}`);
        errorCount++;
      }
    }

    // Create pipeline state file
    const pipelineState: PipelineStateFile = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      patterns,
      global: {
        currentStep: null,
        stepHistory: [],
      },
    };

    // Write state file
    await fs.writeFile(
      STATE_FILE_PATH,
      JSON.stringify(pipelineState, null, 2),
      'utf-8',
    );

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('✨ Migration completed!\n');
    console.log(`Total patterns:     ${mdxFiles.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`Failed:              ${errorCount}`);
    }
    console.log(`\nState file: ${STATE_FILE_PATH}`);
    console.log('\nNext steps:');
    console.log('  1. Verify .pipeline-state.json looks correct');
    console.log(
      '  2. Review using: bun packages/cli/dist/index.js ep-admin pipeline-state status',
    );
    console.log('  3. Commit the state file: git add .pipeline-state.json');
    console.log('  4. Continue adding new patterns normally\n');
  } catch (error) {
    console.error('\n💥 Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

migrateExistingPatterns();
