#!/usr/bin/env bun

/**
 * Test script for the MDX service
 * This script demonstrates how to use the MDX service to parse and manipulate MDX files
 */

import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService } from "../cli/src/services/mdx-service/service.js";
import { join } from "path";

// Use MdxService.Default with NodeContext.layer for platform services
const testLayer = Layer.provide(MdxService.Default, NodeContext.layer);

const program = Effect.gen(function* () {
  const mdxService = yield* MdxService;
  
  console.log("🧪 Testing MDX Service");
  
  // Test 1: Parse a simple MDX file
  console.log("\n📝 Test 1: Parsing MDX file");
  const testPromptPath = join(process.cwd(), "cli/src/commands/__tests__/test-data/test-prompt.mdx");
  
  try {
    const parsedFile = yield* mdxService.readMdxAndFrontmatter(testPromptPath);
    console.log("✅ Successfully parsed MDX file");
    console.log("📄 Frontmatter:", parsedFile.frontmatter);
    console.log("📄 Body preview:", parsedFile.mdxBody.substring(0, 50) + "...");
  } catch (error) {
    console.error("❌ Failed to parse MDX file:", error);
  }
  
  // Test 2: Parse MDX content directly
  console.log("\n📝 Test 2: Parsing MDX content directly");
  const mdxContent = `---
title: "Direct Test"
provider: "google"
model: "gemini-1.5-pro"
---

This is a test prompt for direct parsing.`;
  
  try {
    const parsedContent = yield* mdxService.parseMdxFile(mdxContent);
    console.log("✅ Successfully parsed MDX content");
    console.log("📄 Attributes:", parsedContent.attributes);
    console.log("📄 Body:", parsedContent.body.trim());
  } catch (error) {
    console.error("❌ Failed to parse MDX content:", error);
  }
  
  // Test 3: Validate MDX configuration
  console.log("\n📝 Test 3: Validating MDX configuration");
  const testAttributes = {
    provider: "openai",
    model: "gpt-4-turbo",
    parameters: {
      name: { type: "string", required: true },
      count: { type: "number", default: 5 }
    }
  };
  
  try {
    const validatedConfig = yield* mdxService.validateMdxConfig(testAttributes);
    console.log("✅ Successfully validated MDX configuration");
    console.log("📄 Validated config:", validatedConfig);
  } catch (error) {
    console.error("❌ Failed to validate MDX configuration:", error);
  }
  
  // Test 4: Extract parameters
  console.log("\n📝 Test 4: Extracting parameters");
  try {
    const extractedParams = mdxService.extractParameters(testAttributes);
    console.log("✅ Successfully extracted parameters");
    console.log("📄 Extracted parameters:", extractedParams);
  } catch (error) {
    console.error("❌ Failed to extract parameters:", error);
  }
  
  // Test 5: Update MDX content
  console.log("\n📝 Test 5: Updating MDX content");
  const originalContent = `---
title: "Original Title"
---

Original content here.`;
  
  const updatedFrontmatter = { 
    title: "Updated Title", 
    newField: "New Value",
    updated: true
  };
  
  try {
    const updatedContent = mdxService.updateMdxContent(originalContent, updatedFrontmatter);
    console.log("✅ Successfully updated MDX content");
    console.log("📄 Updated content:");
    console.log(updatedContent);
  } catch (error) {
    console.error("❌ Failed to update MDX content:", error);
  }
  
  console.log("\n🏁 MDX Service tests completed");
});

// Run the program
Effect.runPromise(Effect.provide(program, testLayer)).catch(console.error);
