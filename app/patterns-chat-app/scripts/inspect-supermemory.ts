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

async function inspectSupermemory() {
  try {
    console.log("🔍 Inspecting Supermemory Account\n");

    // Try various search queries to see what comes back
    const queries = [
      { q: "*", label: "Wildcard search (*)" },
      { q: "a", label: "Single character (a)" },
      { q: "the", label: "Common word (the)" },
      { q: "effect", label: "Effect" },
      { q: " ", label: "Space" },
      { q: "", label: "Empty string" },
    ];

    for (const { q, label } of queries) {
      try {
        console.log(`Searching: "${label}"`);
        const result = await client.search.memories({
          q,
          limit: 10,
        });

        console.log(`  Total: ${result.total}`);
        console.log(`  Results: ${result.results?.length || 0}`);

        if (result.results && result.results.length > 0) {
          console.log(`  First result: ${result.results[0].memory.substring(0, 60)}...`);
        }
        console.log();
      } catch (e) {
        console.log(`  Error: ${e instanceof Error ? e.message : String(e)}\n`);
      }
    }

    // Try to understand the API structure better
    console.log("\n📋 Trying different API approaches...\n");

    // Check if there's a list or count method
    console.log("Checking for API methods:");
    console.log(`  client.search: ${typeof (client as any).search}`);
    console.log(`  client.memories: ${typeof (client as any).memories}`);

    // Try to list memories if the method exists
    if ((client as any).memories && typeof (client as any).memories.list === "function") {
      console.log("\n  Trying memories.list()...");
      try {
        const list = await (client as any).memories.list();
        console.log(`  Result: ${JSON.stringify(list, null, 2)}`);
      } catch (e) {
        console.log(`  Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log("\n✅ Inspection completed!");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

inspectSupermemory();
