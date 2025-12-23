#!/usr/bin/env tsx

import {
  loadPatternsFromDatabase,
  searchPatternsFromDatabase,
} from "@effect-patterns/toolkit";
import { config } from "dotenv";

// Load environment variables
config();

async function testPatterns() {
  console.log("🧩 Testing Effect Patterns Integration");
  console.log("=".repeat(50));

  try {
    // Load patterns data from database
    console.log("📂 Loading patterns from database...");

    const patternsData = await loadPatternsFromDatabase();
    console.log(`✅ Loaded ${patternsData.patterns.length} patterns`);

    // Test basic search
    console.log("\n🔍 Testing pattern search...");

    const retryResults = await searchPatternsFromDatabase({
      query: "retry",
      limit: 3,
    });

    console.log(`✅ Found ${retryResults.length} patterns for "retry"`);
    if (retryResults.length > 0) {
      console.log("📝 Top result:", retryResults[0].title);
    }

    // Test category filter
    const errorHandlingResults = await searchPatternsFromDatabase({
      category: "error-handling",
      limit: 5,
    });

    console.log(
      `✅ Found ${errorHandlingResults.length} error-handling patterns`
    );

    // Test combined search
    const advancedResults = await searchPatternsFromDatabase({
      query: "concurrent",
      category: "concurrency",
      skillLevel: "intermediate",
      limit: 2,
    });

    console.log(
      `✅ Found ${advancedResults.length} intermediate concurrency patterns`
    );
    if (advancedResults.length > 0) {
      console.log(
        "📝 Results:",
        advancedResults.map((p) => p.title)
      );
    }

    // Test pattern categories
    const categories = [
      "error-handling",
      "concurrency",
      "data-access",
      "resource-management",
    ];
    console.log("\n📂 Pattern categories available:");
    for (const category of categories) {
      const categoryResults = await searchPatternsFromDatabase({
        category,
        limit: 1000,
      });
      console.log(`  • ${category}: ${categoryResults.length} patterns`);
    }

    console.log(
      "\n🎉 Effect Patterns integration test completed successfully!"
    );
    console.log("🚀 Chat assistant can now help users find Effect patterns!");
  } catch (error) {
    console.error("❌ Patterns test failed:");
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the test
testPatterns().catch(console.error);
