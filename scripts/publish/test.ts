/**
 * test.ts
 *
 * Part of the Effect Patterns documentation pipeline. This script runs all TypeScript
 * example files to ensure they execute correctly. Despite the name, these are not unit
 * tests - they are example files that demonstrate Effect patterns.
 *
 * The script will:
 * 1. Find all TypeScript files in /content/new/src
 * 2. Execute each file using bun
 * 3. Report any execution errors
 * 4. Exit with code 1 if any file fails to run
 *
 * Usage:
 * ```bash
 * npm run test
 * ```
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');

// List of patterns that are expected to throw errors as part of their example
const EXPECTED_ERRORS = new Map<string, string[]>([
  ['write-tests-that-adapt-to-application-code', ['NotFoundError']],
  ['control-repetition-with-schedule', ['Transient error']],
  // Add more patterns here as needed
]);

async function runTypeScriptFile(filePath: string): Promise<void> {
  const relativePath = path.relative(process.cwd(), filePath);
  const baseName = path.basename(filePath, '.ts');
  const expectedErrors = EXPECTED_ERRORS.get(baseName) || [];

  try {
    console.log(`🏃 Running ${relativePath}...`);
    await execAsync(`bun run ${filePath}`);
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
  console.log(`Looking in ${NEW_SRC_DIR}`);

  // Get all TypeScript files
  const files = await fs.readdir(NEW_SRC_DIR);
  const tsFiles = files.filter((file) => file.endsWith('.ts'));
  console.log(`Found ${tsFiles.length} TypeScript files`);

  let errorCount = 0;

  // Run each file
  for (const file of tsFiles) {
    const filePath = path.join(NEW_SRC_DIR, file);
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
