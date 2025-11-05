#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(__dirname, ".env.local") });

async function examineRawMemory() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not found");
    process.exit(1);
  }

  console.log("🔍 Examining Raw Memory Data\n");

  const client = new Supermemory({ apiKey });

  try {
    const response = await client.memories.list({
      page: 1,
      limit: 5,
    });

    if (!response || !response.memories || response.memories.length === 0) {
      console.log("⚠️  No memories found");
      return;
    }

    console.log(`✅ Examining ${response.memories.length} memories\n`);

    for (let i = 0; i < response.memories.length; i++) {
      const memory = response.memories[i];

      console.log(`\n${"=".repeat(80)}`);
      console.log(`MEMORY ${i + 1} / ${response.memories.length}`);
      console.log("=".repeat(80));

      console.log("\n📋 Top-level keys:");
      console.log(Object.keys(memory).join(", "));

      console.log("\n🆔 Memory ID:");
      console.log(memory.id);

      console.log("\n📝 memory field (raw):");
      const memoryField = (memory as any).memory;
      console.log(typeof memoryField);

      if (!memoryField) {
        console.log("(undefined or null)");
      } else if (typeof memoryField === "string") {
        console.log(`Length: ${memoryField.length} chars`);
        console.log(`Preview: ${memoryField.substring(0, 200)}...`);

        try {
          const parsed = JSON.parse(memoryField);
          console.log("\n✅ Parsed JSON:");
          console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
        } catch {
          console.log("\n❌ Not valid JSON");
        }
      } else {
        const str = JSON.stringify(memoryField, null, 2);
        console.log(str.substring(0, Math.min(500, str.length)));
      }

      console.log("\n📦 metadata field:");
      if (memory.metadata) {
        console.log(JSON.stringify(memory.metadata, null, 2));
      } else {
        console.log("(none)");
      }

      console.log("\n🏷️  Other fields:");
      const otherKeys = Object.keys(memory).filter(
        (k) => !["id", "memory", "metadata"].includes(k)
      );
      for (const key of otherKeys) {
        console.log(`   ${key}: ${JSON.stringify((memory as any)[key])}`);
      }
    }

    console.log(`\n${"=".repeat(80)}\n`);

    // Now look for a pattern-specific memory
    console.log("🔎 Looking for effect_pattern type memories...\n");

    let foundPattern = false;
    for (let page = 1; page <= 3; page++) {
      const resp = await client.memories.list({ page, limit: 50 });

      if (!resp || !resp.memories) break;

      for (const mem of resp.memories) {
        try {
          let parsed = null;
          const memField = (mem as any).memory;
          if (typeof memField === "string") {
            parsed = JSON.parse(memField);
          } else if (memField && typeof memField === "object") {
            parsed = memField;
          }

          const type = parsed?.type || (mem.metadata as any)?.type;

          if (type === "effect_pattern") {
            console.log("\n🎯 Found an Effect Pattern!\n");
            console.log("Memory ID:", mem.id);
            console.log("\nFull memory field:");
            console.log(JSON.stringify(parsed, null, 2));
            console.log("\nMetadata:");
            console.log(JSON.stringify(mem.metadata, null, 2));

            foundPattern = true;
            break;
          }
        } catch {
          // Skip
        }
      }

      if (foundPattern) break;
    }

    if (!foundPattern) {
      console.log("⚠️  No effect_pattern type found in first 150 memories");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

examineRawMemory().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
