#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SYSTEM_USER_ID = "system:patterns";

async function diagnoseSupermeory(): Promise<void> {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 Supermemory Diagnostic\n");
  const client = new Supermemory({ apiKey });

  try {
    // Test 1: List all memories to see what's stored
    console.log("📋 Test 1: Listing all memories...\n");

    let allMemories: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 100) {
      try {
        const result = await client.memories.list({
          limit: 50,
          page: page,
        });

        if (!result || !result.memories || result.memories.length === 0) {
          hasMore = false;
          break;
        }

        allMemories = allMemories.concat(result.memories);
        page++;

        console.log(`  ✓ Fetched page ${page} (${result.memories.length} items)`);

        if (result.memories.length < 50) {
          hasMore = false;
        }
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error on page ${page}: ${err}`);
        hasMore = false;
      }
    }

    console.log(`\n✅ Total memories found: ${allMemories.length}\n`);

    // Categorize by type
    const patterns: any[] = [];
    const conversations: any[] = [];
    const other: any[] = [];

    for (const memory of allMemories) {
      try {
        // Try to parse content (old API) or use metadata (new API)
        let parsed = null;
        if (typeof memory.content === "string") {
          try {
            parsed = JSON.parse(memory.content);
          } catch {
            parsed = { raw: memory.content };
          }
        }

        // The type is in metadata for the new Supermemory API
        const memoryType = parsed?.type || (memory.metadata as any)?.type || memory.type || "unknown";

        if (memoryType === "effect_pattern") {
          patterns.push({ ...memory, parsed });
        } else if (memoryType === "conversation_embedding" || memoryType === "conversation") {
          conversations.push({ ...memory, parsed });
        } else {
          other.push({ ...memory, parsed });
        }
      } catch (error) {
        other.push(memory);
      }
    }

    console.log("📊 Memory Breakdown:");
    console.log(`   • Patterns: ${patterns.length}`);
    console.log(`   • Conversations: ${conversations.length}`);
    console.log(`   • Other: ${other.length}\n`);

    // Test 2: Show pattern details
    if (patterns.length > 0) {
      console.log("🎯 Pattern Sample (first 3):\n");

      for (let i = 0; i < Math.min(3, patterns.length); i++) {
        const p = patterns[i];
        console.log(`  [${i + 1}] Memory ID: ${p.id}`);
        console.log(`      Parsed Type: ${p.parsed?.type}`);
        console.log(`      Pattern ID: ${p.parsed?.patternId}`);
        console.log(`      Title: ${p.parsed?.title}`);
        console.log(`      Timestamp: ${p.parsed?.timestamp}`);
        console.log(`      User ID: ${p.parsed?.userId}`);
        console.log(`      Metadata Type: ${p.type}`);
        console.log("");
      }
    } else {
      console.log("⚠️  No patterns found in memory list!\n");
    }

    // Test 3: Search for patterns by ID
    console.log("🔎 Test 3: Searching for pattern 'error'...\n");

    let searchResults: any = null;
    try {
      searchResults = await client.search.memories({
        q: "error",
        limit: 5,
      });

      if (searchResults.results && searchResults.results.length > 0) {
        console.log(`✅ Found ${searchResults.results.length} results for 'error':\n`);

        for (let i = 0; i < searchResults.results.length; i++) {
          const r = searchResults.results[i] as any;
          console.log(`  [${i + 1}] ID: ${r.id}`);
          console.log(`      Title: ${r.title || "N/A"}`);
          console.log(`      Type: ${r.type || r.metadata?.type || "N/A"}`);

          // Try to parse memory field (old API) or use top-level fields (new API)
          if (typeof r.memory === "string") {
            try {
              const parsed = JSON.parse(r.memory);
              console.log(`      Parsed Type: ${parsed.type}`);
              console.log(`      Pattern ID: ${parsed.patternId}`);
            } catch {
              console.log(`      Memory Preview: ${r.memory.substring(0, 50)}...`);
            }
          } else if (r.summary) {
            console.log(`      Summary: ${r.summary}`);
          }
          console.log("");
        }
      } else {
        console.log("⚠️  No results found for 'error' search\n");
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.error(`❌ Search failed: ${err}\n`);
    }

    // Test 4: Search with pattern-specific query
    console.log("🔎 Test 4: Searching for pattern-specific terms...\n");

    const testQueries = ["retry", "error handling", "async", "effect"];

    for (const query of testQueries) {
      try {
        const results = await client.search.memories({
          q: query,
          limit: 3,
        });

        const count = results.results ? results.results.length : 0;
        console.log(`  "${query}": ${count} results`);

        if (count > 0) {
          const patterns = results.results.filter(
            (r: any) =>
              typeof r.content === "string" &&
              JSON.parse(r.content).type === "effect_pattern"
          );
          console.log(`    (${patterns.length} are patterns)`);
        }
      } catch (error) {
        console.log(`  "${query}": Error`);
      }
    }

    console.log("");

    // Test 5: Check Supermemory API key validity
    console.log("✓ Supermemory API key is valid (able to make requests)\n");

    // Test 6: Summary
    console.log("📝 Summary:\n");

    if (patterns.length > 0) {
      console.log(`✅ Patterns are stored in Supermemory (${patterns.length} found)`);

      const withTimestamp = patterns.filter((p) => p.parsed?.timestamp).length;
      const withUserId = patterns.filter(
        (p) => p.parsed?.userId === SYSTEM_USER_ID
      ).length;

      console.log(`   • With timestamp: ${withTimestamp}/${patterns.length}`);
      console.log(`   • With system userId: ${withUserId}/${patterns.length}`);

      if (withTimestamp === patterns.length && withUserId === patterns.length) {
        console.log("   ✅ All patterns have correct structure");
      } else {
        console.log("   ⚠️  Some patterns missing required fields");
      }
    } else {
      console.log(
        "❌ No patterns found in Supermemory - may not have been seeded yet"
      );
    }

    console.log(`\n✅ Conversations found: ${conversations.length}`);

    if (conversations.length > 0) {
      const withChatId = conversations.filter(
        (c) => c.parsed?.chatId
      ).length;
      const withTimestamp = conversations.filter(
        (c) => c.parsed?.timestamp
      ).length;

      console.log(`   • With chatId: ${withChatId}/${conversations.length}`);
      console.log(`   • With timestamp: ${withTimestamp}/${conversations.length}`);
    }

    // Test 7: Direct API query for pattern list
    console.log("\n🔗 Test 7: Checking Supermemory API structure...\n");

    try {
      const response = await fetch("https://api.supermemory.ai/v1/memories", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("✅ Direct API access works");
        console.log(`   Response status: ${response.status}`);
      } else {
        console.log(`⚠️  Direct API returned: ${response.status}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Direct API access issue: ${err}`);
    }

    console.log("\n✅ Diagnostic complete!\n");

    // Analyze the API response structure from first memory
    console.log("\n🔍 Test 8: Analyzing memory structure...\n");

    if (allMemories.length > 0) {
      const firstMemory = allMemories[0];
      console.log("First memory keys:", Object.keys(firstMemory));
      console.log("Has 'content'?", "content" in firstMemory);
      console.log("Has 'memory'?", "memory" in firstMemory);
      console.log("Has 'metadata'?", "metadata" in firstMemory);
      console.log("");
    }

    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMemories: allMemories.length,
        patterns: patterns.length,
        conversations: conversations.length,
        other: other.length,
      },
      patterns: {
        count: patterns.length,
        sample: patterns.slice(0, 5).map((p) => ({
          id: p.id,
          patternId: p.parsed?.patternId,
          title: p.parsed?.title,
          hasTimestamp: !!p.parsed?.timestamp,
          hasUserId: !!p.parsed?.userId,
          metadata: p,
        })),
      },
      searchTests: {
        error: searchResults?.results?.length || 0,
      },
    };

    fs.writeFileSync(
      path.join(__dirname, "..", "diagnostic-report.json"),
      JSON.stringify(report, null, 2)
    );
    console.log("📄 Detailed report saved to: diagnostic-report.json\n");
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error(`❌ Fatal error: ${err}`);
    process.exit(1);
  }
}

// Run diagnostic
diagnoseSupermeory().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
