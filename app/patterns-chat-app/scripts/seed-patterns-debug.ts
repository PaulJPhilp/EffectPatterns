#!/usr/bin/env node

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Supermemory from "supermemory";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const PATTERNS_DIR = path.join(
  __dirname,
  "../../..",
  "content/published"
);

const SYSTEM_USER_ID = "system:patterns";

interface PatternFrontmatter {
  id: string;
  title: string;
  summary: string;
  skillLevel: string;
  useCase: string | string[];
  tags: string[];
  related?: string[];
  author?: string;
  rule?: {
    description: string;
  };
}

async function testSinglePattern() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not set");
    process.exit(1);
  }

  const client = new Supermemory({ apiKey });

  console.log("🧪 Testing single pattern seed...\n");

  // Load first pattern
  const files = fs
    .readdirSync(PATTERNS_DIR)
    .filter((f) => f.endsWith(".mdx"));

  if (files.length === 0) {
    console.error("❌ No pattern files found");
    process.exit(1);
  }

  const testFile = files[0];
  const filePath = path.join(PATTERNS_DIR, testFile);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const frontmatter = data as PatternFrontmatter;

  console.log(`Testing with: ${frontmatter.id}\n`);

  const memoryData = {
    type: "effect_pattern",
    patternId: frontmatter.id,
    title: frontmatter.title,
    skillLevel: frontmatter.skillLevel,
    summary: frontmatter.summary,
    useCase: Array.isArray(frontmatter.useCase)
      ? frontmatter.useCase
      : [frontmatter.useCase],
    tags: frontmatter.tags,
    content: content.substring(0, 500),
  };

  const memoryContent = JSON.stringify(memoryData);

  console.log("Payload:");
  console.log(`  Content length: ${memoryContent.length} bytes`);
  console.log(`  Content preview: ${memoryContent.substring(0, 100)}...\n`);

  try {
    console.log("Calling client.memories.add()...");
    const result = await client.memories.add({
      content: memoryContent,
      metadata: {
        type: "effect_pattern",
        patternId: frontmatter.id,
        title: frontmatter.title,
        skillLevel: frontmatter.skillLevel,
        tags: frontmatter.tags.join(","),
        userId: SYSTEM_USER_ID,
        source: "pattern_seed",
      },
    });

    console.log("\n✅ API Call succeeded!");
    console.log(`Response type: ${typeof result}`);
    console.log(`Response: ${JSON.stringify(result, null, 2)}`);

    // Now try to search for it
    console.log("\n🔍 Searching for the pattern we just added...");
    const search = await client.search.memories({
      q: frontmatter.id,
      limit: 5,
    });

    console.log(`Search results: ${search.results?.length || 0}`);
    console.log(`Total: ${search.total}`);

    if (search.results && search.results.length > 0) {
      console.log("\n✅ Pattern found in search!");
      search.results.forEach((r, i) => {
        console.log(`  Result ${i + 1}:`);
        console.log(`    ID: ${r.id}`);
        console.log(`    Similarity: ${r.similarity}`);
        console.log(`    Content: ${r.memory.substring(0, 80)}...`);
      });
    } else {
      console.log("\n❌ Pattern NOT found in search!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testSinglePattern();
