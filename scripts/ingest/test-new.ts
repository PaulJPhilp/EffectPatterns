/**
 * test-new.ts
 *
 * Runs all TypeScript example files in content/new/src to ensure they execute correctly.
 * This script is adapted from scripts/publish/test.ts.
 * Now captures and prints output for each file. All outputs are currently considered valid.
 * To add output assertions, populate the EXPECTED_OUTPUT map and add validation logic.
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const SRC_DIR = path.join(process.cwd(), 'content/new/src');

// List of patterns that are expected to throw errors as part of their example
const EXPECTED_ERRORS = new Map<string, string[]>([]);

// Placeholder for future output assertions
// const EXPECTED_OUTPUT = new Map<string, (string | RegExp)[]>([]);

async function runTypeScriptFile(filePath: string): Promise<void> {
  const relativePath = path.relative(process.cwd(), filePath);
  const baseName = path.basename(filePath, '.ts');
  const expectedErrors = EXPECTED_ERRORS.get(baseName) || [];

  try {
    console.log(`🏃 Running ${relativePath}...`);
    const { stdout, stderr } = await execAsync(`bun run ${filePath}`);
    if (stdout) {
      console.log(`--- Output for ${relativePath} ---\n${stdout}`);
    }
    if (stderr) {
      console.error(`--- Error Output for ${relativePath} ---\n${stderr}`);
    }
    // All outputs are currently considered valid
    console.log(`✅ ${relativePath} executed successfully`);
  } catch (error: any) {
    // Check if this is an expected error
    const errorMessage = error.message || String(error);
    const isExpectedError = expectedErrors.some((expected) =>
      errorMessage.includes(expected),
    );

    if (isExpectedError) {
      console.log(
        `✅ ${relativePath} failed as expected with ${expectedErrors.join(
          ', ',
        )}`,
      );
    } else {
      console.error(`❌ Error running ${relativePath}:`);
      console.error(errorMessage);
      throw error;
    }
  }
}

async function main() {
  console.log('Running TypeScript example files...');
  console.log(`Looking in ${SRC_DIR}`);

  // Get all TypeScript files
  const files = await fs.readdir(SRC_DIR);
  const tsFiles = files.filter((file) => file.endsWith('.ts'));
  console.log(`Found ${tsFiles.length} TypeScript files`);

  let errorCount = 0;

  // Run each file
  for (const file of tsFiles) {
    const filePath = path.join(SRC_DIR, file);
    try {
      await runTypeScriptFile(filePath);
    } catch (_error) {
      errorCount++;
    }
  }

  // Report results
  if (errorCount > 0) {
    console.error(`\n❌ ${errorCount} files failed to run`);
    process.exit(1);
  } else {
    console.log('\n✨ All TypeScript files ran successfully!');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
