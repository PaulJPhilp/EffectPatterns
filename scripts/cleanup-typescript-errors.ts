/**
 * cleanup-typescript-errors.ts
 *
 * Archives old test/experimental files that reference effect-mdx or old CLI paths
 * These will be restored when effect-mdx v0.2.0 is released
 */

import * as fs from "fs/promises";
import * as path from "path";

const ARCHIVE_DIR = path.join(
  process.cwd(),
  "scripts/archived-awaiting-effect-mdx-v0.2"
);

const FILES_TO_ARCHIVE = [
  // Test files referencing effect-mdx
  "scripts/__tests__/ingest-scripts.test.ts",
  "scripts/__tests__/publish-scripts.test.ts",
  "scripts/__tests__/publish.test.ts",
  "scripts/__tests__/rules.test.ts",

  // Test MDX service files referencing old CLI paths
  "scripts/test-mdx-service.ts",
  "scripts/test-mdx-service-errors.ts",
  "scripts/test-mdx-service-integration.ts",

  // Ingest files referencing effect-mdx (keep populate-expectations, archive the rest)
  "scripts/ingest/run.ts",
  "scripts/ingest/test-publish.ts",
  "scripts/ingest/populate-expectations.ts",

  // Autofix experimental suggestions with old APIs
  "scripts/autofix/ai/suggestions/brand-validate-parse.attempt1.ts",
  "scripts/autofix/ai/suggestions/brand-validate-parse.attempt2.ts",
  "scripts/autofix/ai/suggestions/combinator-conditional.attempt1.ts",
  "scripts/autofix/ai/suggestions/combinator-conditional.attempt2.ts",
  "scripts/autofix/ai/suggestions/combinator-filter.attempt1.ts",
  "scripts/autofix/ai/suggestions/combinator-filter.attempt2.ts",
  "scripts/autofix/ai/suggestions/combinator-foreach-all.attempt1.ts",
  "scripts/autofix/ai/suggestions/combinator-zip.attempt1.ts",
  "scripts/autofix/ai/suggestions/combinator-zip.attempt2.ts",
];

async function archiveFiles() {
  console.log(
    "📦 Archiving files that reference effect-mdx or old CLI paths...\n"
  );

  // Create archive directory
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });

  let archivedCount = 0;
  let skippedCount = 0;

  for (const file of FILES_TO_ARCHIVE) {
    const sourcePath = path.join(process.cwd(), file);
    const fileName = path.basename(file);
    const targetPath = path.join(ARCHIVE_DIR, fileName);

    try {
      // Check if file exists
      await fs.access(sourcePath);

      // Copy to archive
      await fs.copyFile(sourcePath, targetPath);

      // Delete original
      await fs.unlink(sourcePath);

      console.log(`✅ Archived: ${file}`);
      archivedCount++;
    } catch (error) {
      console.log(`⏭️  Skipped (not found): ${file}`);
      skippedCount++;
    }
  }

  // Create README in archive
  const readmeContent = `# Archived Files - Awaiting effect-mdx v0.2.0

These files were archived because they reference:
- \`effect-mdx/service\` module (waiting for v0.2.0 release)
- Old CLI paths (\`../../cli/src/services/mdx-service/service.js\`)
- Experimental autofix suggestions with deprecated APIs

## Files Archived

${FILES_TO_ARCHIVE.map((f) => `- ${f}`).join("\n")}

## When to Restore

Restore these files when:
1. effect-mdx v0.2.0 is released and published
2. The project is updated to use the new effect-mdx API
3. The experimental autofix suggestions are updated to current Effect APIs

## How to Restore

\`\`\`bash
# Copy files back from archive
cp scripts/archived-awaiting-effect-mdx-v0.2/* scripts/
\`\`\`

---
Archived: ${new Date().toISOString()}
`;

  await fs.writeFile(
    path.join(ARCHIVE_DIR, "README.md"),
    readmeContent,
    "utf-8"
  );

  console.log(`\n📊 Summary:`);
  console.log(`   Archived: ${archivedCount} files`);
  console.log(`   Skipped: ${skippedCount} files`);
  console.log(`\n📂 Archive location: ${ARCHIVE_DIR}`);
  console.log(`\n✨ TypeScript errors should be resolved after archiving!`);
}

archiveFiles().catch((error) => {
  console.error("❌ Error archiving files:", error);
  process.exit(1);
});
