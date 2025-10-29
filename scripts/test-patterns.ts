#!/usr/bin/env tsx

import { config } from "dotenv";
import { searchPatterns, loadPatternsFromJson } from "@effect-patterns/toolkit";
import fs from "fs";
import path from "path";

// Load environment variables
config({ path: "../app/code-assistant/.env.local" });

async function testPatterns() {
  console.log("🧩 Testing Effect Patterns Integration");
  console.log("=".repeat(50));

  try {
    // Load patterns data
    const patternsPath = path.join(process.cwd(), "../data/patterns-index.json");
    console.log("📂 Loading patterns from:", patternsPath);

    const patternsData = loadPatternsFromJson(patternsPath);
    console.log(`✅ Loaded ${patternsData.patterns.length} patterns`);

    // Test basic search
    console.log("\n🔍 Testing pattern search...");

    const retryResults = searchPatterns({
      patterns: patternsData.patterns,
      query: "retry",
      limit: 3,
    });

    console.log(`✅ Found ${retryResults.length} patterns for "retry"`);
    if (retryResults.length > 0) {
      console.log("📝 Top result:", retryResults[0].title);
    }

    // Test category filter
    const errorHandlingResults = searchPatterns({
      patterns: patternsData.patterns,
      category: "error-handling",
      limit: 5,
    });

    console.log(`✅ Found ${errorHandlingResults.length} error-handling patterns`);

    // Test combined search
    const advancedResults = searchPatterns({
      patterns: patternsData.patterns,
      query: "concurrent",
      category: "concurrency",
      difficulty: "intermediate",
      limit: 2,
    });

    console.log(`✅ Found ${advancedResults.length} intermediate concurrency patterns`);
    if (advancedResults.length > 0) {
      console.log("📝 Results:", advancedResults.map(p => p.title));
    }

    // Test pattern categories
    const categories = ["error-handling", "concurrency", "data-access", "resource-management"];
    console.log("\n📂 Pattern categories available:");
    categories.forEach(category => {
      const count = patternsData.patterns.filter(p => p.category === category).length;
      console.log(`  • ${category}: ${count} patterns`);
    });

    console.log("\n🎉 Effect Patterns integration test completed successfully!");
    console.log("🚀 Chat assistant can now help users find Effect patterns!");

  } catch (error) {
    console.error("❌ Patterns test failed:");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the test
testPatterns().catch(console.error);
