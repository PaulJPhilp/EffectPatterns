#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env.local") });

async function test() {
  const client = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

  console.log("🔍 Finding effect_pattern memory...\n");

  try {
    let patternFound = false;

    for (let page = 1; page <= 10; page++) {
      const response = await (client.memories as any).list({
        page,
        limit: 50,
      });

      if (!response?.memories || response.memories.length === 0) break;

      for (const memory of response.memories) {
        if ((memory.metadata as any)?.type === "effect_pattern") {
          console.log("✅ Found effect_pattern!\n");
          console.log(JSON.stringify(memory, null, 2));

          console.log("\n🔍 Key Fields:");
          console.log(`   - metadata.type: ${(memory.metadata as any)?.type}`);
          console.log(`   - metadata.projectId: ${(memory.metadata as any)?.projectId}`);
          console.log(`   - metadata.userId: ${(memory.metadata as any)?.userId}`);
          console.log(`   - metadata.source: ${(memory.metadata as any)?.source}`);
          console.log(`   - metadata.patternId: ${(memory.metadata as any)?.patternId}`);
          console.log(`   - metadata.title: ${(memory.metadata as any)?.title}`);

          patternFound = true;
          break;
        }
      }

      if (patternFound) break;
    }

    if (!patternFound) {
      console.log("⚠️  No effect_pattern found in first 500 memories");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

test().catch(console.error);
