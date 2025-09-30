/**
 * migrate-to-new-structure.ts
 *
 * Migrates existing content to the new simplified structure:
 * - Reads MDX from content/raw/ with <Example /> tags
 * - Reads corresponding TS from content/src/
 * - Re-embeds TypeScript code into MDX
 * - Writes self-contained MDX to content/published/
 * - Moves content/qa/results/ to content/qa/
 * - Deletes old content/raw/ and content/src/ directories
 *
 * Usage:
 *   bun scripts/migrate-to-new-structure.ts
 */

import * as fs from "fs/promises"
import * as path from "path"

const PROJECT_ROOT = process.cwd()
const OLD_RAW_DIR = path.join(PROJECT_ROOT, "content/raw")
const OLD_SRC_DIR = path.join(PROJECT_ROOT, "content/src")
const OLD_QA_RESULTS_DIR = path.join(PROJECT_ROOT, "content/qa/results")
const PUBLISHED_DIR = path.join(PROJECT_ROOT, "content/published")
const QA_DIR = path.join(PROJECT_ROOT, "content/qa")

interface MigrationResult {
  file: string
  success: boolean
  error?: string
}

interface MigrationReport {
  mdxFiles: MigrationResult[]
  qaFilesMoved: number
  oldDirsDeleted: string[]
  errors: string[]
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8")
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8")
}

function extractIdFromMdx(mdxContent: string): string | null {
  const idMatch = mdxContent.match(/^---\n[\s\S]*?id:\s*["']?([^"'\n]+)["']?/m)
  return idMatch ? idMatch[1] : null
}

function findExampleTags(mdxContent: string): RegExpMatchArray[] {
  const regex = /<Example\s+path="\.\/src\/([^"]+)"\s*\/>/g
  const matches: RegExpMatchArray[] = []
  let match: RegExpMatchArray | null
  
  while ((match = regex.exec(mdxContent)) !== null) {
    matches.push(match)
  }
  
  return matches
}

async function embedTypeScriptCode(
  mdxContent: string,
  srcDir: string
): Promise<string> {
  let result = mdxContent
  const matches = findExampleTags(mdxContent)

  for (const match of matches) {
    const [fullMatch, tsFileName] = match
    const tsFilePath = path.join(srcDir, tsFileName)

    if (!(await fileExists(tsFilePath))) {
      throw new Error(`TypeScript file not found: ${tsFilePath}`)
    }

    const tsCode = await readFile(tsFilePath)
    const codeBlock = `\`\`\`typescript\n${tsCode}\n\`\`\``
    
    result = result.replace(fullMatch, codeBlock)
  }

  return result
}

async function migrateQaResults(): Promise<number> {
  if (!(await fileExists(OLD_QA_RESULTS_DIR))) {
    console.log("  ℹ No content/qa/results/ directory found, skipping QA migration")
    return 0
  }

  const resultsFiles = await fs.readdir(OLD_QA_RESULTS_DIR)
  const jsonFiles = resultsFiles.filter((f) => f.endsWith(".json"))

  if (jsonFiles.length === 0) {
    console.log("  ℹ No QA result files to migrate")
    return 0
  }

  await fs.mkdir(QA_DIR, { recursive: true })

  for (const file of jsonFiles) {
    const oldPath = path.join(OLD_QA_RESULTS_DIR, file)
    const newPath = path.join(QA_DIR, file)
    await fs.copyFile(oldPath, newPath)
  }

  await fs.rm(OLD_QA_RESULTS_DIR, { recursive: true })

  return jsonFiles.length
}

async function migrateMdxFiles(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []

  if (!(await fileExists(OLD_RAW_DIR))) {
    console.log("  ℹ No content/raw/ directory found, skipping MDX migration")
    return results
  }

  const files = await fs.readdir(OLD_RAW_DIR)
  const mdxFiles = files.filter((f) => f.toLowerCase().endsWith(".mdx"))

  if (mdxFiles.length === 0) {
    console.log("  ℹ No MDX files to migrate")
    return results
  }

  await fs.mkdir(PUBLISHED_DIR, { recursive: true })

  for (const file of mdxFiles) {
    try {
      const rawPath = path.join(OLD_RAW_DIR, file)
      const mdxContent = await readFile(rawPath)

      const id = extractIdFromMdx(mdxContent)
      if (!id) {
        throw new Error("Could not extract ID from frontmatter")
      }

      const processedContent = await embedTypeScriptCode(mdxContent, OLD_SRC_DIR)

      const publishedPath = path.join(PUBLISHED_DIR, file)
      await writeFile(publishedPath, processedContent)

      results.push({
        file,
        success: true,
      })

      console.log(`  ✅ Migrated ${file}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      results.push({
        file,
        success: false,
        error: errorMsg,
      })

      console.error(`  ❌ Failed to migrate ${file}: ${errorMsg}`)
    }
  }

  return results
}

async function deleteOldDirectories(): Promise<string[]> {
  const deleted: string[] = []

  for (const dir of [OLD_RAW_DIR, OLD_SRC_DIR]) {
    if (await fileExists(dir)) {
      await fs.rm(dir, { recursive: true })
      deleted.push(dir)
      console.log(`  🗑️  Deleted ${path.relative(PROJECT_ROOT, dir)}`)
    }
  }

  return deleted
}

function generateReport(report: MigrationReport): void {
  console.log("\n" + "=".repeat(60))
  console.log("📊 Migration Report")
  console.log("=".repeat(60))

  const successCount = report.mdxFiles.filter((r) => r.success).length
  const failureCount = report.mdxFiles.filter((r) => !r.success).length

  console.log(`\nMDX Files:`)
  console.log(`  ✅ Successfully migrated: ${successCount}`)
  console.log(`  ❌ Failed: ${failureCount}`)

  if (failureCount > 0) {
    console.log(`\nFailed files:`)
    report.mdxFiles
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.file}: ${r.error}`)
      })
  }

  console.log(`\nQA Results:`)
  console.log(`  📦 Files moved: ${report.qaFilesMoved}`)

  console.log(`\nDirectories Deleted:`)
  if (report.oldDirsDeleted.length > 0) {
    report.oldDirsDeleted.forEach((dir) => {
      console.log(`  🗑️  ${path.relative(PROJECT_ROOT, dir)}`)
    })
  } else {
    console.log(`  ℹ No directories deleted`)
  }

  if (report.errors.length > 0) {
    console.log(`\n⚠️  Warnings/Errors:`)
    report.errors.forEach((err) => {
      console.log(`  - ${err}`)
    })
  }

  console.log("\n" + "=".repeat(60))
}

async function main(): Promise<void> {
  console.log("🔄 Starting migration to new structure...")
  console.log("=".repeat(60))

  const report: MigrationReport = {
    mdxFiles: [],
    qaFilesMoved: 0,
    oldDirsDeleted: [],
    errors: [],
  }

  try {
    console.log("\n📝 Step 1: Migrating MDX files from content/raw/ to content/published/")
    report.mdxFiles = await migrateMdxFiles()

    console.log("\n📦 Step 2: Moving QA results to content/qa/")
    report.qaFilesMoved = await migrateQaResults()

    console.log("\n🗑️  Step 3: Deleting old directories")
    report.oldDirsDeleted = await deleteOldDirectories()

    generateReport(report)

    const hasFailures = report.mdxFiles.some((r) => !r.success)
    if (hasFailures) {
      console.log("\n⚠️  Migration completed with errors. Please review failed files.")
      process.exit(1)
    }

    console.log("\n✨ Migration completed successfully!")
    console.log("\nNew structure:")
    console.log("  content/published/  - Self-contained MDX with embedded TS")
    console.log("  content/qa/         - QA results for published patterns")
    console.log("  content/new/        - Work-in-progress patterns")
  } catch (error) {
    console.error("\n💥 Migration failed:", error)
    process.exit(1)
  }
}

main()
