/**
 * move-to-published.ts
 *
 * Moves completed patterns from content/new/published/ to content/published/
 * and cleans up all working directories in content/new/.
 *
 * This is the final step in the pattern publishing workflow. Run this after:
 * 1. Processing patterns (extract → validate → test)
 * 2. Publishing patterns (embed code)
 * 3. QA validation passes
 *
 * Usage:
 *   bun scripts/publish/move-to-published.ts [--dry-run]
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const PROJECT_ROOT = process.cwd();
const NEW_PUBLISHED_DIR = path.join(PROJECT_ROOT, 'content/new/published');
const TARGET_PUBLISHED_DIR = path.join(PROJECT_ROOT, 'content/published');
const NEW_DIR = path.join(PROJECT_ROOT, 'content/new');

// Directories to clean up after successful move
const CLEANUP_DIRS = [
  path.join(NEW_DIR, 'raw'),
  path.join(NEW_DIR, 'src'),
  path.join(NEW_DIR, 'processed'),
  path.join(NEW_DIR, 'published'),
  path.join(NEW_DIR, 'qa'),
];

const isDryRun = process.argv.includes('--dry-run');

interface MoveResult {
  file: string;
  success: boolean;
  error?: string;
}

interface MoveReport {
  moved: MoveResult[];
  cleaned: string[];
  errors: string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith('.mdx'));
  } catch {
    return [];
  }
}

async function movePatternFiles(): Promise<MoveResult[]> {
  const results: MoveResult[] = [];

  // Check if source directory exists and has files
  if (!(await fileExists(NEW_PUBLISHED_DIR))) {
    console.log('⚠️  No content/new/published/ directory found');
    return results;
  }

  const files = await listFiles(NEW_PUBLISHED_DIR);

  if (files.length === 0) {
    console.log('⚠️  No MDX files found in content/new/published/');
    return results;
  }

  console.log(`\n📦 Moving ${files.length} pattern(s) to content/published/`);

  for (const file of files) {
    const sourcePath = path.join(NEW_PUBLISHED_DIR, file);
    const targetPath = path.join(TARGET_PUBLISHED_DIR, file);

    try {
      if (isDryRun) {
        console.log(`  [DRY RUN] Would move: ${file}`);
        results.push({ file, success: true });
      } else {
        // Check if target already exists
        if (await fileExists(targetPath)) {
          console.log(
            `  ⚠️  ${file} already exists in published/, overwriting...`,
          );
        }

        // Ensure target directory exists
        await fs.mkdir(TARGET_PUBLISHED_DIR, { recursive: true });

        // Copy file
        await fs.copyFile(sourcePath, targetPath);
        console.log(`  ✅ Moved: ${file}`);

        results.push({ file, success: true });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to move ${file}: ${errorMsg}`);
      results.push({ file, success: false, error: errorMsg });
    }
  }

  return results;
}

async function cleanupWorkingDirectories(): Promise<string[]> {
  const cleaned: string[] = [];

  console.log('\n🧹 Cleaning up working directories...');

  for (const dir of CLEANUP_DIRS) {
    try {
      if (!(await fileExists(dir))) {
        console.log(
          `  ℹ️  ${path.relative(PROJECT_ROOT, dir)} does not exist, skipping`,
        );
        continue;
      }

      const files = await fs.readdir(dir);

      if (files.length === 0) {
        console.log(
          `  ✅ ${path.relative(PROJECT_ROOT, dir)} is already empty`,
        );
        continue;
      }

      if (isDryRun) {
        console.log(
          `  [DRY RUN] Would clean: ${path.relative(PROJECT_ROOT, dir)} (${
            files.length
          } files)`,
        );
        cleaned.push(dir);
      } else {
        // Remove all files in directory
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);

          if (stats.isDirectory()) {
            await fs.rm(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
        }

        console.log(
          `  ✅ Cleaned: ${path.relative(PROJECT_ROOT, dir)} (${
            files.length
          } files removed)`,
        );
        cleaned.push(dir);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `  ❌ Failed to clean ${path.relative(PROJECT_ROOT, dir)}: ${errorMsg}`,
      );
    }
  }

  return cleaned;
}

async function verifyCleanup(): Promise<string[]> {
  const errors: string[] = [];

  console.log('\n🔍 Verifying cleanup...');

  for (const dir of CLEANUP_DIRS) {
    try {
      if (!(await fileExists(dir))) {
        continue;
      }

      const files = await fs.readdir(dir);

      if (files.length > 0) {
        const error = `${path.relative(PROJECT_ROOT, dir)} still contains ${
          files.length
        } file(s)`;
        console.error(`  ❌ ${error}`);
        errors.push(error);
      } else {
        console.log(`  ✅ ${path.relative(PROJECT_ROOT, dir)} is empty`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `  ⚠️  Could not verify ${path.relative(PROJECT_ROOT, dir)}: ${errorMsg}`,
      );
    }
  }

  return errors;
}

function generateReport(report: MoveReport): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Move Report');
  console.log('='.repeat(60));

  const successCount = report.moved.filter((r) => r.success).length;
  const failureCount = report.moved.filter((r) => !r.success).length;

  console.log('\nPatterns Moved:');
  console.log(`  ✅ Successfully moved: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.log('\nFailed patterns:');
    report.moved
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.file}: ${r.error}`);
      });
  }

  console.log('\nDirectories Cleaned:');
  console.log(
    `  🧹 ${report.cleaned.length} director${
      report.cleaned.length === 1 ? 'y' : 'ies'
    } cleaned`,
  );

  if (report.errors.length > 0) {
    console.log('\n⚠️  Verification Errors:');
    report.errors.forEach((err) => {
      console.log(`  - ${err}`);
    });
  }

  console.log(`\n${'='.repeat(60)}`);
}

async function main(): Promise<void> {
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be moved or deleted');
    console.log('='.repeat(60));
  }

  console.log('🚀 Moving patterns to published...');
  console.log('='.repeat(60));

  const report: MoveReport = {
    moved: [],
    cleaned: [],
    errors: [],
  };

  try {
    // Step 1: Move files
    report.moved = await movePatternFiles();

    // Step 2: Clean up working directories
    if (report.moved.length > 0) {
      report.cleaned = await cleanupWorkingDirectories();

      // Step 3: Verify cleanup (only in non-dry-run mode)
      if (!isDryRun) {
        report.errors = await verifyCleanup();
      }
    }

    // Generate report
    generateReport(report);

    const hasFailures =
      report.moved.some((r) => !r.success) || report.errors.length > 0;

    if (hasFailures) {
      console.log(
        '\n⚠️  Move completed with errors. Please review failed operations.',
      );
      process.exit(1);
    }

    if (isDryRun) {
      console.log(
        '\n✨ Dry run completed! Run without --dry-run to apply changes.',
      );
    } else {
      console.log('\n✨ Move completed successfully!');
      console.log('\nAll patterns are now in content/published/');
      console.log('All working directories in content/new/ are empty');
    }
  } catch (error) {
    console.error('\n💥 Move failed:', error);
    process.exit(1);
  }
}

main();
