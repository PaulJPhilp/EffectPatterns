#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env.local") });

async function test() {
  const client = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

  console.log("🔍 Checking memory storage context...\n");

  try {
    // Get first memory with all details
    const response = await (client.memories as any).list({
      page: 1,
      limit: 1,
    });

    if (response?.memories?.length > 0) {
      const memory = response.memories[0];

      console.log("📋 First Memory Full Details:\n");
      console.log(JSON.stringify(memory, null, 2));

      console.log("\n🔍 Key Fields to Check:");
      console.log(`   - connectionId: ${memory.connectionId}`);
      console.log(`   - metadata.type: ${(memory.metadata as any)?.type}`);
      console.log(`   - metadata.projectId: ${(memory.metadata as any)?.projectId}`);
      console.log(`   - metadata.userId: ${(memory.metadata as any)?.userId}`);
      console.log(`   - metadata.source: ${(memory.metadata as any)?.source}`);
      console.log(`   - title: ${memory.title}`);
      console.log(`   - type: ${memory.type}`);

      // Check if this is an effect_pattern
      const isPattern = (memory.metadata as any)?.type === "effect_pattern";
      console.log(`\n   Is Effect Pattern: ${isPattern ? "YES ✅" : "NO ❌"}`);
    } else {
      console.log("⚠️  No memories found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

test().catch(console.error);
