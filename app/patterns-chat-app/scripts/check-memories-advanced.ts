#!/usr/bin/env node

import path from "path";
import dotenv from "dotenv";
import Supermemory from "supermemory";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const apiKey = process.env.SUPERMEMORY_API_KEY;
if (!apiKey) {
  console.error("❌ SUPERMEMORY_API_KEY not set");
  process.exit(1);
}

const client = new Supermemory({ apiKey });

async function checkMemories() {
  try {
    console.log("📊 Advanced Memory Checks...\n");

    // Test 1: List API (if available)
    console.log("Test 1: Direct pattern search with userId");
    const patternSearch = await client.search.memories({
      q: "pattern",
      limit: 5,
    });
    console.log(`Pattern search: ${patternSearch.results?.length || 0} results\n`);

    // Test 2: Try searching by exact pattern ID
    console.log("Test 2: Search by pattern ID");
    const idSearch = await client.search.memories({
      q: "handle-errors-with-catch",
      limit: 5,
    });
    console.log(`ID search: ${idSearch.results?.length || 0} results`);
    if (idSearch.results && idSearch.results.length > 0) {
      console.log("Found results!");
      idSearch.results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.memory.substring(0, 80)}...`);
      });
    }
    console.log();

    // Test 3: Try system user search
    console.log("Test 3: Search with system user context");
    const systemSearch = await client.search.memories({
      q: "*",
      limit: 5,
    });
    console.log(`System search (*): ${systemSearch.results?.length || 0} results`);
    console.log(`Total in response: ${systemSearch.total}\n`);

    // Test 4: Look for any Effect-related content
    console.log("Test 4: Search for 'Effect'");
    const effectSearch = await client.search.memories({
      q: "Effect",
      limit: 5,
    });
    console.log(`Effect search: ${effectSearch.results?.length || 0} results`);
    if (effectSearch.results && effectSearch.results.length > 0) {
      effectSearch.results.forEach((r, i) => {
        try {
          const data = JSON.parse(r.memory);
          console.log(`  ${i + 1}. Type: ${data.type}, Pattern: ${data.patternId || "N/A"}`);
        } catch (e) {
          console.log(`  ${i + 1}. [Unparseable]`);
        }
      });
    }
    console.log();

    // Test 5: Search for a specific skill level
    console.log("Test 5: Search by skill level keyword");
    const skillSearch = await client.search.memories({
      q: "intermediate",
      limit: 3,
    });
    console.log(`Skill search: ${skillSearch.results?.length || 0} results\n`);

    // Test 6: Check API stats if available
    console.log("Test 6: Check API response structure");
    const debugSearch = await client.search.memories({
      q: "test",
      limit: 1,
    });
    console.log("Response structure:");
    console.log(`  - Has 'results': ${!!debugSearch.results}`);
    console.log(`  - Results count: ${debugSearch.results?.length || 0}`);
    console.log(`  - Total: ${debugSearch.total}`);
    console.log(`  - Timing: ${debugSearch.timing}ms\n`);

    console.log("✅ All checks completed!");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkMemories();
