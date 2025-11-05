#!/usr/bin/env node

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Supermemory from "supermemory";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const apiKey = process.env.SUPERMEMORY_API_KEY;
if (!apiKey) {
  console.error("❌ SUPERMEMORY_API_KEY not set");
  process.exit(1);
}

const client = new Supermemory({ apiKey });
const PATTERNS_DIR = path.join(__dirname, "../../..", "content/published");
const SYSTEM_USER_ID = "system:patterns:test";

async function testSingleUpload() {
  try {
    console.log("📊 Single Pattern Upload Test\n");

    // Step 1: Load one pattern
    console.log("Step 1: Loading first pattern...");
    const files = fs
      .readdirSync(PATTERNS_DIR)
      .filter((f) => f.endsWith(".mdx"));

    const testFile = files[0];
    const filePath = path.join(PATTERNS_DIR, testFile);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    const frontmatter = data as any;
    console.log(`✅ Loaded: ${frontmatter.id}\n`);

    // Step 2: Check current state of Supermemory
    console.log("Step 2: Checking current Supermemory state...");
    const beforeSearch = await client.search.memories({
      q: "*",
      limit: 1,
    });
    console.log(`   Total memories before: ${beforeSearch.total}\n`);

    // Step 3: Upload the pattern
    console.log("Step 3: Uploading pattern...");
    const memoryData = {
      type: "effect_pattern_test",
      patternId: frontmatter.id,
      title: frontmatter.title,
      skillLevel: frontmatter.skillLevel,
      summary: frontmatter.summary,
      content: content.substring(0, 500),
    };

    const memoryContent = JSON.stringify(memoryData);

    const uploadResult = await client.memories.add({
      content: memoryContent,
      metadata: {
        type: "effect_pattern_test",
        patternId: frontmatter.id,
        title: frontmatter.title,
        userId: SYSTEM_USER_ID,
        source: "test_upload",
      },
    });

    console.log(`✅ Upload response:`);
    console.log(`   ID: ${uploadResult.id}`);
    console.log(`   Status: ${uploadResult.status}`);
    console.log(`   Full response: ${JSON.stringify(uploadResult, null, 2)}\n`);

    const memoryId = uploadResult.id;

    // Step 4: Wait a bit for processing
    console.log("Step 4: Waiting 5 seconds for processing...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 5: Search for all memories again
    console.log("\nStep 5: Checking Supermemory after upload...");
    const afterSearch = await client.search.memories({
      q: "*",
      limit: 100,
    });

    console.log(`   Total memories after: ${afterSearch.total}`);
    console.log(`   Results count: ${afterSearch.results?.length || 0}\n`);

    if (afterSearch.results && afterSearch.results.length > 0) {
      console.log("📝 All memories in Supermemory:");
      afterSearch.results.forEach((result, i) => {
        console.log(`\n   Memory ${i + 1}:`);
        console.log(`   ID: ${result.id}`);
        console.log(`   Similarity: ${result.similarity}`);
        try {
          const parsed = JSON.parse(result.memory);
          console.log(`   Type: ${parsed.type}`);
          console.log(`   PatternId: ${parsed.patternId}`);
          console.log(`   Content preview: ${result.memory.substring(0, 60)}...`);
        } catch (e) {
          console.log(`   Content: ${result.memory.substring(0, 80)}...`);
        }
      });
    } else {
      console.log("❌ No memories found after upload!\n");
    }

    // Step 6: Try specific search for the pattern we just uploaded
    console.log("\n\nStep 6: Searching for uploaded pattern by ID...");
    const specificSearch = await client.search.memories({
      q: frontmatter.id,
      limit: 5,
    });

    console.log(`   Results: ${specificSearch.results?.length || 0}`);
    if (specificSearch.results && specificSearch.results.length > 0) {
      console.log("✅ Found pattern in search!");
      specificSearch.results.forEach((r, i) => {
        console.log(`   ${i + 1}. ID: ${r.id}, Similarity: ${r.similarity}`);
      });
    } else {
      console.log("❌ Pattern not found in search!");
    }

    // Step 7: Try searching by memory ID
    console.log(`\nStep 7: Searching by Memory ID: ${memoryId}...`);
    const idSearch = await client.search.memories({
      q: memoryId,
      limit: 5,
    });

    console.log(`   Results: ${idSearch.results?.length || 0}`);
    if (idSearch.results && idSearch.results.length > 0) {
      console.log("✅ Found by ID!");
    } else {
      console.log("❌ Not found by ID!");
    }

    console.log("\n✅ Test completed!");

  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testSingleUpload();
