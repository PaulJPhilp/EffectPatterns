#!/usr/bin/env node

import Supermemory from "supermemory";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(__dirname, ".env.local") });

async function checkStatus() {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (!apiKey) {
    console.error("❌ SUPERMEMORY_API_KEY not found");
    process.exit(1);
  }

  console.log("🔍 Checking Supermemory Status\n");

  const client = new Supermemory({ apiKey });

  try {
    // Try to list memories
    console.log("📋 Fetching memories (page 1)...\n");

    const response = await client.memories.list({
      page: 1,
      limit: 10,
    });

    if (!response || !response.memories) {
      console.log("⚠️  No memories found or empty response");
      console.log("Response:", JSON.stringify(response, null, 2));
      return;
    }

    const memories = response.memories;
    console.log(`✅ Found ${memories.length} memories on page 1\n`);

    // Categorize memories
    const patterns: any[] = [];
    const conversations: any[] = [];
    const other: any[] = [];

    for (const memory of memories) {
      try {
        let parsed = null;
        // Try parsing the memory field first (old API)
        if (typeof (memory as any).memory === "string") {
          parsed = JSON.parse((memory as any).memory);
        } else if ((memory as any).memory && typeof (memory as any).memory === "object") {
          parsed = (memory as any).memory;
        } else {
          // New API: use top-level fields and metadata
          const metadata = memory.metadata as any || {};
          parsed = {
            type: typeof metadata.type === "string" ? metadata.type : (memory as any).type,
            title: (memory as any).title,
            summary: (memory as any).summary,
            patternId: metadata.patternId,
            chatId: metadata.chatId,
            skillLevel: metadata.skillLevel,
          };
        }

        const type = parsed?.type || (memory.metadata as any)?.type || "unknown";

        if (type === "effect_pattern") {
          patterns.push({ id: memory.id, ...parsed });
        } else if (type === "conversation_embedding" || type === "conversation") {
          conversations.push({ id: memory.id, ...parsed });
        } else {
          other.push({ id: memory.id, type, parsed });
        }
      } catch (error) {
        other.push({ id: memory.id, error: "parse_failed" });
      }
    }

    console.log("📊 Memory Breakdown:");
    console.log(`   • Effect Patterns: ${patterns.length}`);
    console.log(`   • Conversations: ${conversations.length}`);
    console.log(`   • Other: ${other.length}\n`);

    // Show sample patterns
    if (patterns.length > 0) {
      console.log("🎯 Sample Patterns:");
      patterns.slice(0, 3).forEach((p, i) => {
        console.log(`   [${i + 1}] ${p.patternId || p.id}`);
        console.log(`       Title: ${p.title || "N/A"}`);
        console.log(`       Level: ${p.skillLevel || "N/A"}`);
      });
      console.log("");
    }

    // Check pagination
    const pagination = response.pagination as any;
    if (pagination) {
      console.log("📄 Pagination Info:");
      console.log(`   Total Pages: ${pagination.totalPages || "Unknown"}`);
      console.log(`   Total Items: ${pagination.total || "Unknown"}`);
      console.log(`   Current Page: ${pagination.currentPage || 1}`);
      console.log("");
    }

    // Try a simple search
    console.log("🔎 Testing search for 'error'...\n");
    const searchResults = await client.search.memories({
      q: "error",
      limit: 5,
    });

    if (searchResults.results && searchResults.results.length > 0) {
      console.log(`✅ Search works! Found ${searchResults.results.length} results\n`);

      const patternResults = searchResults.results.filter((r: any) => {
        try {
          const parsed = typeof r.memory === "string" ? JSON.parse(r.memory) : r.memory;
          return parsed?.type === "effect_pattern";
        } catch {
          return false;
        }
      });

      console.log(`   • ${patternResults.length} are Effect Patterns`);
    } else {
      console.log("⚠️  Search returned no results\n");
    }

    // Summary
    console.log("\n✨ Summary:");

    if (patterns.length > 0) {
      console.log(`✅ Effect Patterns project EXISTS`);
      console.log(`   Found ${patterns.length} patterns in first page`);
      console.log(`   System userId: system:patterns`);
      console.log(`   Project ID: effect-patterns`);
    } else {
      console.log("❌ No Effect Patterns found");
      console.log("   You may need to run: npm run seed-patterns");
    }

    if (conversations.length > 0) {
      console.log(`\n💬 Found ${conversations.length} conversation embeddings`);
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

checkStatus().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
