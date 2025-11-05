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

// System user ID for seeded patterns
const SYSTEM_USER_ID = "system:patterns";

// Project ID for organizing patterns in Supermemory
const PROJECT_ID = "effect-patterns";

// Configuration for queue processing
const QUEUE_POLL_INTERVAL = 500; // ms between polls
const QUEUE_POLL_TIMEOUT = 30000; // 30 second timeout per memory
const BATCH_DELAY = 100; // ms delay between batch adds

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

interface QueuedMemory {
  patternId: string;
  memoryId: string;
  addedAt: Date;
}

async function loadPatterns(): Promise<
  Array<{ file: string; frontmatter: PatternFrontmatter; content: string }>
> {
  console.log(`📚 Loading patterns from: ${PATTERNS_DIR}`);

  const files = fs
    .readdirSync(PATTERNS_DIR)
    .filter((f) => f.endsWith(".mdx"));

  console.log(`✅ Found ${files.length} pattern files`);

  const patterns = files.map((file) => {
    const filePath = path.join(PATTERNS_DIR, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
      file,
      frontmatter: data as PatternFrontmatter,
      content,
    };
  });

  return patterns;
}

async function waitForMemorySearchable(
  client: Supermemory,
  patternId: string,
  memoryId: string,
  timeout: number = QUEUE_POLL_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Try to search for the pattern
      const results = await client.search.memories({
        q: patternId,
        limit: 1,
      });

      if (results.results && results.results.length > 0) {
        // Verify it's the right memory by checking if ID matches
        const found = results.results.some((r) => r.id === memoryId);
        if (found) {
          return true;
        }
      }
    } catch (error) {
      // Ignore search errors during polling
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, QUEUE_POLL_INTERVAL));
  }

  return false;
}

async function seedPatterns(): Promise<void> {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ SUPERMEMORY_API_KEY not set. Set it in .env.local"
    );
    process.exit(1);
  }

  const client = new Supermemory({ apiKey });
  const patterns = await loadPatterns();

  console.log(`\n🌱 Seeding ${patterns.length} patterns into Supermemory...\n`);
  console.log(`⏱️  Waiting for Supermemory queue processing...\n`);

  let successCount = 0;
  let errorCount = 0;
  let queuedCount = 0;
  const errors: Array<{ patternId: string; error: string }> = [];
  const queuedMemories: QueuedMemory[] = [];

  // Phase 1: Add all patterns to queue
  console.log("📤 Phase 1: Adding patterns to queue...\n");

  for (let i = 0; i < patterns.length; i++) {
    const { frontmatter, content } = patterns[i];
    const patternId = frontmatter.id;

    try {
      // Create pattern memory entry as JSON
      const memoryData = {
        type: "effect_pattern",
        patternId,
        title: frontmatter.title,
        skillLevel: frontmatter.skillLevel,
        summary: frontmatter.summary,
        useCase: Array.isArray(frontmatter.useCase)
          ? frontmatter.useCase
          : [frontmatter.useCase],
        tags: frontmatter.tags,
        relatedPatterns: frontmatter.related || [],
        author: frontmatter.author || "effect_website",
        rule: frontmatter.rule?.description || null,
        content: content.substring(0, 10000), // Limit content size
        timestamp: new Date().toISOString(), // Add timestamp for proper date display
        userId: SYSTEM_USER_ID, // Ensure userId is in the JSON content
      };

      const memoryContent = JSON.stringify(memoryData);

      // Add to Supermemory
      // Note: projectId is not used for organizing in Supermemory API (API keys are account-level)
      // We use source: "pattern_seed" to identify seeded patterns
      const result = await client.memories.add({
        content: memoryContent,
        metadata: {
          type: "effect_pattern",
          patternId,
          title: frontmatter.title,
          skillLevel: frontmatter.skillLevel,
          tags: frontmatter.tags.join(","),
          userId: SYSTEM_USER_ID,
          source: "pattern_seed",
          accessible: "public",
        },
      });

      if (!result || !result.id) {
        throw new Error(`No ID returned from API`);
      }

      queuedMemories.push({
        patternId,
        memoryId: result.id,
        addedAt: new Date(),
      });

      queuedCount++;
      const progress = ((i + 1) / patterns.length * 100).toFixed(1);
      process.stdout.write(
        `\r✅ [${progress}%] Queued: ${patternId.substring(0, 40)}`
      );

      // Add delay between requests to avoid overwhelming the API
      if (i < patterns.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ patternId, error: errorMsg });

      if (errorCount <= 3) {
        console.error(`\n❌ Failed to queue pattern ${patternId}:`);
        console.error(`   ${errorMsg}`);
      }
    }
  }

  console.log(`\n\n✅ Queued ${queuedCount}/${patterns.length} patterns`);

  // Phase 2: Wait for queued memories to be processed
  console.log(`\n⏳ Phase 2: Waiting for queue processing (timeout: ${QUEUE_POLL_TIMEOUT / 1000}s per pattern)...\n`);

  let indexedCount = 0;
  const failedToIndex: string[] = [];

  for (let i = 0; i < queuedMemories.length; i++) {
    const { patternId, memoryId } = queuedMemories[i];

    process.stdout.write(
      `⏳ [${i + 1}/${queuedMemories.length}] Waiting for: ${patternId.substring(0, 40)}`
    );

    const isIndexed = await waitForMemorySearchable(
      client,
      patternId,
      memoryId,
      QUEUE_POLL_TIMEOUT
    );

    if (isIndexed) {
      indexedCount++;
      process.stdout.write("\r✅ Indexed:  " + patternId.substring(0, 40) + "                    \n");
    } else {
      failedToIndex.push(patternId);
      process.stdout.write("\r❌ Timeout:  " + patternId.substring(0, 40) + "                    \n");
    }
  }

  console.log(`\n📊 Seeding Complete!`);
  console.log(`   ✅ Successfully indexed: ${indexedCount}/${queuedMemories.length}`);

  if (errorCount > 0) {
    console.log(`   ❌ Failed to queue: ${errorCount}`);
  }

  if (failedToIndex.length > 0) {
    console.log(`   ⏱️  Timed out waiting: ${failedToIndex.length}`);
    if (failedToIndex.length <= 5) {
      failedToIndex.forEach((p) => console.log(`      - ${p}`));
    }
  }

  if (indexedCount === queuedMemories.length) {
    console.log(
      `\n🎉 All ${indexedCount} patterns successfully indexed in Supermemory!`
    );
    console.log(`   System userId: ${SYSTEM_USER_ID}`);
    console.log(`   Patterns are now searchable!`);
  } else if (indexedCount > 0) {
    console.log(
      `\n⚠️  ${indexedCount}/${queuedMemories.length} patterns indexed.`
    );
    console.log(`   Some patterns may still be processing...`);
  } else {
    console.log(`\n❌ No patterns were indexed. Check API key and try again.`);
  }
}

// Run the script
seedPatterns().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
