#!/usr/bin/env node

import { SupermemoryStore } from "./lib/semantic-search/supermemory-store";

async function test() {
  console.log("🔍 Testing SupermemoryStore search...\n");

  try {
    const store = new SupermemoryStore();

    console.log("📋 Searching for patterns with query 'test'\n");

    const results = await store.search({
      userId: "system:patterns",
      query: "test",
      limit: 10,
      minSimilarity: 0, // Return all results
    });

    console.log(`✅ Found ${results.length} results\n`);

    if (results.length > 0) {
      console.log("📊 Results:");
      results.slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] ${r.title || r.id}`);
        console.log(
          `    ID: ${r.id}, Type: ${(r.metadata as any)?.type}`
        );
        console.log(`    Score: ${r.similarity || r.vectorSimilarity}`);
      });
    } else {
      console.log("⚠️  No results found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

test();
