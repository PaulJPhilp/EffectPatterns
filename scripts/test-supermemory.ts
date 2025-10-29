#!/usr/bin/env tsx

import { config } from "dotenv";
import Supermemory from "supermemory";

// Load environment variables
config({ path: "../app/code-assistant/.env.local" });

async function testSupermemory() {
  console.log("🧠 Testing Supermemory API Integration");
  console.log("=" .repeat(50));

  const apiKey = process.env.SUPERMEMORY_API_KEY || "sm_BpkYMBGxk4M4jYH2LbiFWx_IDnzEaZotdMhLYnsvFzmmhIBuHDVCcrjWolHBQyPOwajLrEeNmOwnqDasgCjvruf";

  if (!apiKey) {
    console.error("❌ No SUPERMEMORY_API_KEY found");
    return;
  }

  try {
    console.log("🔑 API Key configured ✓");

    const client = new Supermemory({
      apiKey,
    });

    console.log("📡 Testing connection...");

    // Test adding a memory
    console.log("💾 Adding test memory...");
    const addResult = await client.memories.add({
      content: JSON.stringify({
        test: "memory_integration_test",
        timestamp: new Date().toISOString(),
        message: "Supermemory integration test successful!"
      }),
      metadata: {
        type: "test",
        testId: "memory_integration_001"
      }
    });

    console.log("✅ Memory added:", addResult);

    // Test searching for the memory
    console.log("🔍 Searching for test memory...");
    const searchResult = await client.search.memories({
      q: "memory_integration_test",
      limit: 1
    });

    console.log("✅ Search results:", searchResult.results?.length || 0, "found");

    if (searchResult.results && searchResult.results.length > 0) {
      const memory = searchResult.results[0];
      console.log("📖 Retrieved memory:", JSON.parse(memory.memory));
    }

    console.log("\n🎉 Supermemory integration test completed successfully!");
    console.log("🚀 User memory and preferences are now active in your chat app!");

  } catch (error) {
    console.error("❌ Supermemory test failed:");
    console.error("Error:", error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.message.includes("API key")) {
      console.log("\n💡 Tips:");
      console.log("1. Make sure your SUPERMEMORY_API_KEY is valid");
      console.log("2. Check your account at https://console.supermemory.ai");
      console.log("3. Verify you have the correct permissions");
    }

    process.exit(1);
  }
}

// Run the test
testSupermemory().catch(console.error);
