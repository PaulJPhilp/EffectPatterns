import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---

const CONTENT_DIR = path.join(process.cwd(), "content");
const OUTPUT_DIR = path.join(process.cwd(), "rules"); // Changed from 'dist/rules'

// --- TYPE DEFINITIONS ---

interface Rule {
  description: string;
}

interface PatternWithRule {
  id: string;
  title: string;
  rule: Rule;
  content: string; // Added to hold the file's body content
}

// --- HELPER FUNCTIONS ---

/**
 * Reads all .mdx files and filters for those containing a 'rule'.
 * Now also includes the file's main content.
 */
async function getRulePatterns(): Promise<PatternWithRule[]> {
  const files = await fs.readdir(CONTENT_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  const patterns: PatternWithRule[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const fileContent = await fs.readFile(filePath, "utf-8");
    // Destructure both `data` (frontmatter) and `content` (body)
    const { data, content } = matter(fileContent);

    if (data.rule && data.rule.description) {
      patterns.push({
        id: data.id,
        title: data.title,
        rule: data.rule,
        content: content.trim(), // Store the trimmed body content
      });
    }
  }
  // Sort patterns alphabetically for consistent output every time
  return patterns.sort((a, b) => a.title.localeCompare(b.title));
}

// --- GENERATION LOGIC ---

/**
 * Generates the rules.md file with full content embedded.
 */
function generateCursorRules(patterns: PatternWithRule[]): string {
  let markdown = `# Effect Coding Rules for AI (Cursor)\n\n`;
  markdown += `This document lists key architectural and style rules for our Effect-TS codebase. Use these as guidelines when generating or refactoring code.\n\n`;

  for (const pattern of patterns) {
    markdown += `--- (Pattern Start: ${pattern.id}) ---\n\n`;
    markdown += `## ${pattern.title}\n\n`;
    markdown += `**Rule:** ${pattern.rule.description}\n\n`;
    markdown += `### Full Pattern Content:\n\n`;
    // Embed the full content of the .mdx file
    markdown += `${pattern.content}\n\n`;
  }

  return markdown;
}

function generateJsonRules(patterns: PatternWithRule[]): string {
  const rules = patterns.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.rule.description,
  }));
  return JSON.stringify(rules, null, 2);
}

// --- MAIN EXECUTION ---

async function main() {
  console.log("Starting rule generation...");
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const patterns = await getRulePatterns();

  if (patterns.length === 0) {
    console.warn(
      "No patterns with a 'rule' field found in frontmatter. Output will be empty.",
    );
    return;
  }

  // Generate and write all rule files
  await Promise.all([
    fs.writeFile(
      path.join(OUTPUT_DIR, "rules.md"),
      generateCursorRules(patterns),
    ),
    fs.writeFile(
      path.join(OUTPUT_DIR, "rules.json"),
      generateJsonRules(patterns),
    ),
  ]);

  console.log(`✅ ${patterns.length} rules successfully generated in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error("❌ Failed to generate rules:", error);
  process.exit(1);
});