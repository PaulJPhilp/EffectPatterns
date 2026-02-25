#!/usr/bin/env bun
import matter from "gray-matter";
import { globSync } from "glob";
import postgres from "postgres";
import path from "node:path";
import { readFileSync } from "node:fs";

const ROOT = "/Users/paul/Projects/Public/Effect-Patterns";
const CONTENT_DIR = path.join(ROOT, "content/published/patterns");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error("DATABASE_URL is required");
}

const DRY_RUN = process.env.DRY_RUN === "true";

const sql = postgres(DB_URL, { max: 5 });

type Example = {
  code: string;
  language?: string;
  description?: string;
};

function extractSectionByPattern(body: string, headingPattern: RegExp): string | null {
  const match = headingPattern.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractFirstMatchingSection(body: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const section = extractSectionByPattern(body, pattern);
    if (section) return section;
  }
  return null;
}

function extractFirstCodeFence(section: string | null): { code: string; language?: string } | null {
  if (!section) return null;
  const fence = /```(\w+)?\n([\s\S]*?)\n```/m.exec(section);
  if (!fence) return null;
  return { language: fence[1], code: fence[2].trim() };
}

function extractFirstCodeFenceFromBody(body: string): { code: string; language?: string } | null {
  const fence = /```(\w+)?\n([\s\S]*?)\n```/m.exec(body);
  if (!fence) return null;
  return { language: fence[1], code: fence[2].trim() };
}

const files = globSync(`${CONTENT_DIR}/**/*.mdx`);

let updated = 0;
let missing = 0;
let errors = 0;

for (const file of files) {
  try {
    const raw = readFileSync(file, "utf8");
    const { data, content } = matter(raw);

    const id = typeof data.id === "string" && data.id.trim().length > 0
      ? data.id.trim()
      : path.basename(file, ".mdx");

    const goodExampleSection = extractFirstMatchingSection(content, [
      /^##\s+Good Example.*$/m,
      /^##\s+Example.*$/m,
      /^##\s+Practical Example.*$/m,
      /^##\s+Walkthrough.*$/m,
      /^##\s+Creating.*$/m,
      /^##\s+Recovering.*$/m,
    ]);
    let codeBlock = extractFirstCodeFence(goodExampleSection);
    if (!codeBlock) {
      codeBlock = extractFirstCodeFenceFromBody(content);
    }

    if (!codeBlock) {
      missing++;
      continue;
    }

    const examples: Example[] = [
      {
        code: codeBlock.code,
        language: codeBlock.language || "typescript",
        description: "Good Example",
      },
    ];

    if (DRY_RUN) {
      updated++;
      continue;
    }

    const result = await sql`
      UPDATE effect_patterns
      SET examples = ${sql.json(examples)},
          updated_at = now()
      WHERE slug = ${id}
      RETURNING slug
    `;

    if (result.length > 0) {
      updated++;
    } else {
      missing++;
    }
  } catch (err) {
    errors++;
    console.error(`[error] ${file}:`, err);
  }
}

await sql.end();

console.log(JSON.stringify({
  files: files.length,
  updated,
  missing,
  errors,
  dryRun: DRY_RUN,
}, null, 2));
