#!/usr/bin/env node

import path from "path";
import dotenv from "dotenv";
import Supermemory from "supermemory";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const apiKey = process.env.SUPERMEMORY_API_KEY;
if (!apiKey) {
  console.error("❌ SUPERMEMORY_API_KEY not set. Set it in .env.local");
  process.exit(1);
}

const client = new Supermemory({ apiKey });

async function testPatternSearch() {
  try {
    console.log("🔍 Testing pattern search in Supermemory...\n");

    // Test 1: Search for "error handling"
    console.log("Test 1: Search for 'error handling'");
    const errorResults = await client.search.memories({
      q: "error handling",
      limit: 5,
    });

    if (errorResults.results && errorResults.results.length > 0) {
      console.log(`✅ Found ${errorResults.results.length} results\n`);
      errorResults.results.slice(0, 3).forEach((result, i) => {
        console.log(`Result ${i + 1}:`);
        try {
          const parsed = JSON.parse(result.memory);
          if (parsed.patternId) {
            console.log(`  Pattern ID: ${parsed.patternId}`);
            console.log(`  Title: ${parsed.title}`);
            console.log(`  Skill Level: ${parsed.skillLevel}`);
            console.log(`  Tags: ${parsed.tags?.join(", ")}`);
          } else {
            console.log(`  Type: ${parsed.type}`);
            console.log(`  Content: ${result.memory.substring(0, 80)}...`);
          }
        } catch (e) {
          console.log(`  Content: ${result.memory.substring(0, 80)}...`);
        }
        console.log();
      });
    } else {
      console.log("⚠️ No results found\n");
    }

    // Test 2: Search for "retry"
    console.log("Test 2: Search for 'retry'");
    const retryResults = await client.search.memories({
      q: "retry",
      limit: 3,
    });

    if (retryResults.results && retryResults.results.length > 0) {
      console.log(`✅ Found ${retryResults.results.length} results:`);
      retryResults.results.forEach((result, i) => {
        try {
          const parsed = JSON.parse(result.memory);
          if (parsed.patternId) {
            console.log(`  ${i + 1}. ${parsed.patternId}`);
          }
        } catch (e) {
          console.log(`  ${i + 1}. [Unparseable]`);
        }
      });
      console.log();
    } else {
      console.log("⚠️ No results found\n");
    }

    // Test 3: Search for "async"
    console.log("Test 3: Search for 'async'");
    const asyncResults = await client.search.memories({
      q: "async",
      limit: 3,
    });

    if (asyncResults.results && asyncResults.results.length > 0) {
      console.log(`✅ Found ${asyncResults.results.length} results:`);
      asyncResults.results.forEach((result, i) => {
        try {
          const parsed = JSON.parse(result.memory);
          if (parsed.patternId) {
            console.log(`  ${i + 1}. ${parsed.patternId}`);
          }
        } catch (e) {
          console.log(`  ${i + 1}. [Unparseable]`);
        }
      });
      console.log();
    } else {
      console.log("⚠️ No results found\n");
    }

    // Test 4: Search for "Layer"
    console.log("Test 4: Search for 'Layer'");
    const layerResults = await client.search.memories({
      q: "Layer",
      limit: 3,
    });

    if (layerResults.results && layerResults.results.length > 0) {
      console.log(`✅ Found ${layerResults.results.length} results:`);
      layerResults.results.forEach((result, i) => {
        try {
          const parsed = JSON.parse(result.memory);
          if (parsed.patternId) {
            console.log(`  ${i + 1}. ${parsed.patternId}`);
          }
        } catch (e) {
          console.log(`  ${i + 1}. [Unparseable]`);
        }
      });
      console.log();
    }

    console.log("✅ Pattern search test completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testPatternSearch();
