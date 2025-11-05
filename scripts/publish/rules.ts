/**
 * rules-simple.ts
 *
 * Simplified rules generation that doesn't use effect-mdx
 */


import * as fs from "node:fs/promises";
import * as path from "node:path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const RULES_DIR = path.join(process.cwd(), "rules");
const USE_CASE_DIR = path.join(RULES_DIR, "by-use-case");

// --- TYPE DEFINITIONS ---
interface PatternFrontmatter {
  id: string;
  title: string;
  skillLevel?: string;
  useCase?: string[];
  rule?: {
    description: string;
  };
}

interface Rule {
  id: string;
  title: string;
  description: string;
  skillLevel?: string;
  useCases?: string[];
  example?: string;
  content?: string;
}

const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

async function extractRules(): Promise<Rule[]> {
  const files = await fs.readdir(PUBLISHED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  const rules: Rule[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(PUBLISHED_DIR, file);
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    const frontmatter = data as PatternFrontmatter;

    if (frontmatter.rule?.description) {
      // Extract example from Good Example section
      const contentLines = content.split("\n");
      let inExampleSection = false;
      const exampleLines: string[] = [];

      for (const line of contentLines) {
        if (line.startsWith("## Good Example")) {
          inExampleSection = true;
          continue;
        }
        if (inExampleSection) {
          if (line.startsWith("## ")) {
            break;
          }
          exampleLines.push(line);
        }
      }

      rules.push({
        id: frontmatter.id,
        title: frontmatter.title,
        description: frontmatter.rule.description,
        skillLevel: frontmatter.skillLevel,
        useCases: frontmatter.useCase,
        example:
          exampleLines.length > 0 ? exampleLines.join("\n").trim() : undefined,
        content: content.trim(),
      });
    }
  }

  return rules.sort((a, b) => a.title.localeCompare(b.title));
}

export async function generateFullRules(rules: Rule[]) {
  const content = ["# Effect-TS Patterns - Complete Rules\n"];
  for (const rule of rules) {
    content.push(`## ${rule.title}\n`);
    content.push(`**Rule:** ${rule.description}\n`);
    if (rule.skillLevel) {
      content.push(`**Skill Level:** ${rule.skillLevel}\n`);
    }
    if (rule.useCases && rule.useCases.length > 0) {
      content.push(`**Use Cases:** ${rule.useCases.join(", ")}\n`);
    }
    if (rule.example) {
      content.push(`\n### Example\n\n${rule.example}\n`);
    }
    content.push("\n---\n\n");
  }

  const contentString = content.join("");
  const filePath = path.join(RULES_DIR, "rules.md");
  await fs.writeFile(filePath, contentString, "utf-8");
  console.log(`✅ Generated ${filePath}`);
  return contentString;
}

export async function generateCompactRules(rules: Rule[]) {
  const content = ["# Effect-TS Patterns - Compact Rules\n\n"];
  for (const rule of rules) {
    content.push(`- **${rule.title}**: ${rule.description}\n`);
  }

  const contentString = content.join("");
  const filePath = path.join(RULES_DIR, "rules-compact.md");
  await fs.writeFile(filePath, contentString, "utf-8");
  console.log(`✅ Generated ${filePath}`);
  return contentString;
}

export async function generateJsonRules(rules: Rule[]) {
  const contentString = JSON.stringify(rules, null, 2);
  const filePath = path.join(RULES_DIR, "rules.json");
  await fs.writeFile(filePath, contentString, "utf-8");
  console.log(`✅ Generated ${filePath}`);
  return contentString;
}

export async function generateUseCaseRules(rules: Rule[]) {
  await fs.mkdir(USE_CASE_DIR, { recursive: true });

  const useCaseGroups = new Map<string, Rule[]>();
  for (const rule of rules) {
    if (rule.useCases) {
      for (const useCase of rule.useCases) {
        if (!useCaseGroups.has(useCase)) {
          useCaseGroups.set(useCase, []);
        }
        useCaseGroups.get(useCase)?.push(rule);
      }
    }
  }

  for (const [useCase, useCaseRules] of useCaseGroups) {
    const content = [`# ${useCase} Patterns\n\n`];
    for (const rule of useCaseRules) {
      content.push(`## ${rule.title}\n\n`);
      content.push(`${rule.description}\n\n`);
      if (rule.example) {
        content.push(`### Example\n\n${rule.example}\n\n`);
      }
      content.push("---\n\n");
    }

    const fileName = `${sanitizeName(useCase)}.md`;
    const filePath = path.join(USE_CASE_DIR, fileName);
    await fs.writeFile(filePath, content.join(""), "utf-8");
    console.log(`✅ Generated ${filePath}`);
  }
}

async function generateRules() {
  console.log("Generating rules from published patterns...");

  // Ensure rules directory exists
  await fs.mkdir(RULES_DIR, { recursive: true });

  // Extract all rules from published MDX files
  const rules = await extractRules();
  console.log(`Extracted ${rules.length} rules from published patterns`);

  // Generate all rule formats
  await generateFullRules(rules);
  await generateCompactRules(rules);
  await generateJsonRules(rules);
  await generateUseCaseRules(rules);

  console.log("\n✅ All rule files generated successfully!");
}

generateRules().catch((error) => {
  console.error("Failed to generate rules:", error);
  process.exit(1);
});
