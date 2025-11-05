#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const apiKey = process.env.SUPERMEMORY_API_KEY;

async function checkProjects() {
  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 Checking Supermemory SDK capabilities\n");

  const client = new Supermemory({ apiKey });

  // Check what's available on the client
  console.log("📋 Client methods and properties:");
  console.log(Object.keys(client).sort());
  console.log("");

  // Check memories methods
  console.log("📋 Client.memories methods:");
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.memories)).sort());
  console.log("");

  // Check search methods
  console.log("📋 Client.search methods:");
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.search)).sort());
  console.log("");

  // Try to list projects (if available)
  try {
    console.log("🔎 Attempting to list projects...\n");

    // Try different possible ways to access projects
    const methods = [
      { name: "client.projects", fn: () => (client as any).projects },
      { name: "client.projects.list()", fn: async () => (client as any).projects?.list() },
      { name: "client.listProjects()", fn: async () => (client as any).listProjects?.() },
      { name: "client.memories.listProjects()", fn: async () => (client as any).memories.listProjects?.() },
    ];

    for (const method of methods) {
      try {
        if (typeof method.fn === 'function') {
          const result = await method.fn();
          if (result) {
            console.log(`✅ ${method.name}:`);
            console.log(JSON.stringify(result, null, 2));
            console.log("");
          }
        }
      } catch (error) {
        // Silently continue
      }
    }

    // Try to access memories with project parameter
    console.log("🔎 Attempting to add memory with project...\n");

    try {
      const testMemory = await (client.memories as any).add({
        content: JSON.stringify({ test: "with-project" }),
        metadata: {
          type: "test",
          projectId: "effect-patterns",
        },
      });

      console.log("✅ Added test memory with projectId metadata:");
      console.log(JSON.stringify(testMemory, null, 2));
      console.log("");
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Adding with projectId metadata failed: ${err}\n`);
    }

    // Check Supermemory API documentation hints
    console.log("📚 Supermemory SDK Version: 3.4.0");
    console.log("\n🔗 Check Supermemory docs at: https://github.com/supermemory-ai/supermemory");
    console.log("🔗 Or API docs: https://docs.supermemory.ai\n");

    // Try to get current workspace/project info
    console.log("🔎 Checking for workspace/project info...\n");

    // Look at client constructor options
    console.log("Client is initialized with apiKey");
    console.log("Checking if there's a workspaceId or projectId parameter...\n");

  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${err}`);
  }
}

checkProjects().catch(console.error);
