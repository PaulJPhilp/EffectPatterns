#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env.local") });

async function test() {
  const client = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

  console.log("🔍 Testing pattern search and retrieval...\n");

  try {
    // Test 1: Direct list with projectId filter
    console.log("📋 Test 1: List all memories with effect_pattern type\n");
    let patternCount = 0;

    for (let page = 1; page <= 5; page++) {
      const response = await (client.memories as any).list({
        page,
        limit: 50,
      });

      if (!response?.memories || response.memories.length === 0) break;

      const patterns = response.memories.filter(
        (m: any) => (m.metadata as any)?.type === "effect_pattern"
      );

      patternCount += patterns.length;
      console.log(`   Page ${page}: ${patterns.length} patterns found`);

      if (patterns.length > 0 && page === 1) {
        console.log(`   Sample: ${(patterns[0].metadata as any).patternId}`);
      }
    }

    console.log(`\n✅ Total patterns found: ${patternCount}\n`);

    // Test 2: Search API
    console.log("🔎 Test 2: Search for 'retry' (should find patterns)\n");
    const searchResults = await client.search.memories({
      q: "retry",
      limit: 10,
    });

    const resultCount = searchResults.results?.length || 0;
    const patternResults = (searchResults.results || []).filter(
      (r: any) => (r.metadata as any)?.type === "effect_pattern"
    ).length;

    console.log(`   Total results: ${resultCount}`);
    console.log(`   Pattern results: ${patternResults}`);

    if (searchResults.results && searchResults.results.length > 0) {
      console.log("\n   Sample results:");
      searchResults.results.slice(0, 3).forEach((r: any, i: number) => {
        console.log(
          `   [${i + 1}] ${r.title} (type: ${(r.metadata as any)?.type})`
        );
      });
    }

    // Test 3: Check if patterns are accessible
    console.log("\n📦 Test 3: Verify patterns are accessible\n");
    const testQuery = await (client.memories as any).list({
      page: 1,
      limit: 100,
    });

    const patternMetadata = (testQuery.memories || [])
      .filter((m: any) => (m.metadata as any)?.type === "effect_pattern")
      .map((m: any) => ({
        patternId: (m.metadata as any).patternId,
        userId: (m.metadata as any).userId,
        source: (m.metadata as any).source,
        projectId: (m.metadata as any).projectId,
      }))
      .slice(0, 3);

    console.log("   Sample pattern metadata:");
    console.log(JSON.stringify(patternMetadata, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

test().catch(console.error);
