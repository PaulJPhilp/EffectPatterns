/**
 * rules.ts
 * 
 * Part of the Effect Patterns documentation pipeline. This script generates all rule files
 * by combining functionality from:
 * - generate_rules.ts (full rules with content)
 * - generate-compact-rules.ts (compact rules without examples)
 * - generate-skill-level-rules.ts (rules grouped by skill level)
 * - generate-use-case-rules.ts (rules grouped by use case)
 * 
 * The script will:
 * 1. Read all MDX files from /content/published
 * 2. Extract rules, examples, and metadata
 * 3. Generate multiple rule formats:
 *    - rules.md (full rules with content)
 *    - rules-compact.md (just titles and rules)
 *    - rules.json (machine-readable format)
 *    - by-skill-level/*.md (grouped by beginner/intermediate/advanced)
 *    - by-use-case/*.md (grouped by use case)
 * 
 * Usage:
 * ```bash
 * npm run rules
 * ```
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const RULES_DIR = path.join(process.cwd(), "rules");
const USE_CASE_DIR = path.join(RULES_DIR, "by-use-case");

// --- TYPE DEFINITIONS ---
interface Rule {
  id: string;
  title: string;
  description: string;
  skillLevel?: string;
  useCases?: string[];
  example?: string;
  content?: string;
}

// --- HELPER FUNCTIONS ---
const sanitizeName = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

async function extractRules(): Promise<Rule[]> {
  const files = await fs.readdir(PUBLISHED_DIR);
  const mdxFiles = files.filter(file => file.endsWith(".mdx"));
  const rules: Rule[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(PUBLISHED_DIR, file);
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    if (data.rule?.description) {
      // Extract example from Good Example section
      const contentLines = content.split('\n');
      let inExampleSection = false;
      const exampleLines: string[] = [];

      for (const line of contentLines) {
        if (line.startsWith('## Good Example')) {
          inExampleSection = true;
          continue;
        }
        if (inExampleSection) {
          if (line.startsWith('## ')) {
            break;
          }
          exampleLines.push(line);
        }
      }

      rules.push({
        id: data.id,
        title: data.title,
        description: data.rule.description,
        skillLevel: data.skillLevel,
        useCases: data.useCase,
        example: exampleLines.length > 0 ? exampleLines.join('\n').trim() : undefined,
        content: content.trim()
      });
    }
  }

  return rules.sort((a, b) => a.title.localeCompare(b.title));
}

// --- GENERATION FUNCTIONS ---
function generateFullRules(rules: Rule[]): string {
  let markdown = `# Effect Coding Rules for AI\n\n`;
  markdown += `This document lists key architectural and style rules for our Effect-TS codebase. Use these as guidelines when generating or refactoring code.\n\n`;

  for (const rule of rules) {
    markdown += `## ${rule.title}\n`;
    markdown += `**Rule:** ${rule.description}\n`;
    markdown += `### Full Pattern Content:\n`;
    markdown += `${rule.content}\n\n`;
  }

  return markdown;
}

function generateCompactRules(rules: Rule[]): string {
  let markdown = `# Effect Coding Rules for AI (Compact)\n\n`;
  markdown += `This document lists key architectural and style rules for our Effect-TS codebase.\n\n`;

  for (const rule of rules) {
    markdown += `## ${rule.title}\n`;
    markdown += `**Rule:** ${rule.description}\n\n`;
  }

  return markdown;
}

function generateJsonRules(rules: Rule[]): string {
  return JSON.stringify(rules.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    skillLevel: r.skillLevel,
    useCases: r.useCases
  })), null, 2);
}

function generateSkillLevelRules(rules: Rule[]): Map<string, string> {
  const rulesBySkill = new Map<string, Rule[]>();

  for (const rule of rules) {
    if (rule.skillLevel) {
      if (!rulesBySkill.has(rule.skillLevel)) {
        rulesBySkill.set(rule.skillLevel, []);
      }
      rulesBySkill.get(rule.skillLevel)!.push(rule);
    }
  }

  const output = new Map<string, string>();
  for (const [skillLevel, skillRules] of rulesBySkill.entries()) {
    let content = `# ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Level Rules\n\n`;
    for (const rule of skillRules) {
      content += `## ${rule.title}\n`;
      content += `**Rule:** ${rule.description}\n`;
      if (rule.example) {
        content += `\n### Example\n${rule.example}\n`;
      }
      content += '\n';
    }
    output.set(skillLevel, content);
  }

  return output;
}

function generateUseCaseRules(rules: Rule[]): Map<string, string> {
  const rulesByUseCase = new Map<string, Rule[]>();

  for (const rule of rules) {
    if (rule.useCases) {
      for (const useCase of rule.useCases) {
        if (!rulesByUseCase.has(useCase)) {
          rulesByUseCase.set(useCase, []);
        }
        rulesByUseCase.get(useCase)!.push(rule);
      }
    }
  }

  const output = new Map<string, string>();
  for (const [useCase, useCaseRules] of rulesByUseCase.entries()) {
    let content = `# ${useCase} Rules\n\n`;
    for (const rule of useCaseRules) {
      content += `## ${rule.title}\n`;
      content += `**Rule:** ${rule.description}\n`;
      if (rule.example) {
        content += `\n### Example\n${rule.example}\n`;
      }
      content += '\n';
    }
    output.set(sanitizeName(useCase), content);
  }

  return output;
}

// --- MAIN EXECUTION ---
async function main() {
  console.log("Starting rule generation...");

  // Create output directories
  await fs.mkdir(RULES_DIR, { recursive: true });
  await fs.mkdir(USE_CASE_DIR, { recursive: true });

  // Extract rules from MDX files
  const rules = await extractRules();

  if (rules.length === 0) {
    console.warn("No patterns with rules found. Output will be empty.");
    return;
  }

  // Generate and write all rule files
  await Promise.all([
    // Main rules files
    fs.writeFile(path.join(RULES_DIR, "rules.md"), generateFullRules(rules)),
    fs.writeFile(path.join(RULES_DIR, "rules-compact.md"), generateCompactRules(rules)),
    fs.writeFile(path.join(RULES_DIR, "rules.json"), generateJsonRules(rules)),

    // Skill level rules
    ...Array.from(generateSkillLevelRules(rules).entries()).map(([level, content]) =>
      fs.writeFile(path.join(RULES_DIR, `${level}.md`), content)
    ),

    // Use case rules
    ...Array.from(generateUseCaseRules(rules).entries()).map(([useCase, content]) =>
      fs.writeFile(path.join(USE_CASE_DIR, `${useCase}.md`), content)
    )
  ]);

  console.log(`✅ ${rules.length} rules successfully generated in ${RULES_DIR}`);
}

main().catch(error => {
  console.error("❌ Failed to generate rules:", error);
  process.exit(1);
});
