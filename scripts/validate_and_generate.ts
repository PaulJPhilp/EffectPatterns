import { execSync } from "child_process";
import * as path from "path";

/**
 * A script that validates all patterns and then generates the README.md
 * This ensures that all TypeScript code blocks in MDX files match their
 * corresponding source files before generating the README.
 */

// Define paths
const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const SRC_DIR = path.join(process.cwd(), "content/src");

console.log("Starting validation and README generation process...");

try {
  // Step 1: Validate frontmatter ids match filenames
  console.log("\n🔍 Validating frontmatter in MDX files...");
  execSync(`npx tsx ${path.join(SCRIPTS_DIR, "frontmatter-validator.ts")} --indir ${PUBLISHED_DIR}`, {
    stdio: "inherit",
  });

  // Step 2: Run the pattern validator to ensure all TypeScript code blocks match source files
  console.log("\n🔍 Validating that all TypeScript code blocks match source files...");
  execSync(`npx tsx ${path.join(SCRIPTS_DIR, "pattern-validator.ts")} --indir ${PUBLISHED_DIR} --srcdir ${SRC_DIR}`, {
    stdio: "inherit",
  });
  
  // Step 3: Generate the README.md
  console.log("\n📝 Generating README.md...");
  execSync(`npx tsx ${path.join(SCRIPTS_DIR, "generate_readme.ts")}`, {
    stdio: "inherit",
  });
  
  console.log("\n✅ Validation and README generation completed successfully!");
  console.log("All MDX files have valid frontmatter and TypeScript code blocks match source files.");
  console.log("README.md has been generated with links to all validated patterns.");
  
} catch (error) {
  console.error("\n❌ Error during validation or README generation:");
  console.error(error);
  process.exit(1);
}
