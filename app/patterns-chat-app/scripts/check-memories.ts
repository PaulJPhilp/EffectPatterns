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
    console.log("📊 Checking Supermemory storage...\n");

    // Try to list/search all memories
    console.log("Searching for '*' (all memories)...");
    const allResults = await client.search.memories({
      q: "*",
      limit: 10,
    });

    console.log(`Raw API response:`);
    console.log(JSON.stringify(allResults, null, 2));

    if (allResults.results) {
      console.log(`\n✅ Found ${allResults.results.length} memories\n`);

      allResults.results.forEach((result, i) => {
        console.log(`Memory ${i + 1}:`);
        console.log(`  ID: ${result.id}`);
        console.log(`  Similarity: ${result.similarity}`);
        console.log(`  Memory content type: ${typeof result.memory}`);
        console.log(`  Memory length: ${result.memory?.length || 0}`);

        try {
          const parsed = JSON.parse(result.memory);
          console.log(`  Parsed type: ${parsed.type}`);
          if (parsed.patternId) {
            console.log(`  Pattern ID: ${parsed.patternId}`);
          }
        } catch (e) {
          console.log(`  Failed to parse as JSON`);
        }
        console.log();
      });
    } else {
      console.log("❌ No results field in response\n");
    }

    // Try different search terms
    console.log("\nTrying specific searches...");
    const searches = ["effect", "pattern", "error"];

    for (const term of searches) {
      const results = await client.search.memories({
        q: term,
        limit: 1,
      });
      console.log(`Search "${term}": ${results.results?.length || 0} results`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkMemories();
