#!/usr/bin/env bun

/**
 * Test script for the MDX service error handling
 * This script tests error cases and edge conditions for the MDX service
 */

import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService } from "../cli/src/services/mdx-service/service.js";
import { InvalidMdxFormatError } from "../cli/src/services/mdx-service/types.js";

// Use MdxService.Default with NodeContext.layer for platform services
const testLayer = Layer.provide(MdxService.Default, NodeContext.layer);

const program = Effect.gen(function* () {
  const mdxService = yield* MdxService;
  
  console.log("🧪 Testing MDX Service Error Handling");
  
  // Test 1: Parse invalid MDX content (no frontmatter)
  console.log("\n📝 Test 1: Parsing invalid MDX content (no frontmatter)");
  const invalidContent = "This is invalid content without frontmatter";
  
  try {
    const result = yield* mdxService.parseMdxFile(invalidContent).pipe(Effect.flip);
    if (result instanceof InvalidMdxFormatError) {
      console.log("✅ Correctly identified invalid MDX format");
      console.log("📄 Error reason:", result.reason);
    } else {
      console.error("❌ Unexpected error type:", result);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
  
  // Test 2: Parse MDX content with invalid YAML
  console.log("\n📝 Test 2: Parsing MDX content with invalid YAML");
  const invalidYamlContent = `---
title: Invalid YAML
  invalid: [unclosed array
---

Content here.`;
  
  try {
    const result = yield* mdxService.parseMdxFile(invalidYamlContent).pipe(Effect.flip);
    if (result instanceof InvalidMdxFormatError) {
      console.log("✅ Correctly identified invalid YAML");
      console.log("📄 Error reason:", result.reason);
    } else {
      console.error("❌ Unexpected error type:", result);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
  
  // Test 3: Test parameter extraction with invalid data
  console.log("\n📝 Test 3: Parameter extraction with invalid data");
  const invalidParams = {
    parameters: {
      validParam: { type: "string", required: true },
      invalidParam: { invalid: "structure" },
      anotherValid: { type: "number", default: 5 }
    }
  };
  
  try {
    const extractedParams = mdxService.extractParameters(invalidParams);
    console.log("✅ Successfully extracted parameters (invalid ones ignored)");
    console.log("📄 Valid parameters extracted:", Object.keys(extractedParams));
    // Should only contain validParam and anotherValid
    if (Object.keys(extractedParams).length === 2 && extractedParams.validParam && extractedParams.anotherValid) {
      console.log("✅ Correctly filtered out invalid parameter definitions");
    } else {
      console.error("❌ Unexpected parameter extraction result");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
  
  // Test 4: Test parameter extraction with no parameters
  console.log("\n📝 Test 4: Parameter extraction with no parameters");
  try {
    const extractedParams = mdxService.extractParameters({});
    console.log("✅ Successfully handled empty parameters");
    console.log("📄 Extracted parameters count:", Object.keys(extractedParams).length);
    if (Object.keys(extractedParams).length === 0) {
      console.log("✅ Correctly returned empty parameters object");
    } else {
      console.error("❌ Unexpected parameter extraction result");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
  
  // Test 5: Test updateMdxContent with malformed original content
  console.log("\n📝 Test 5: Updating MDX content with malformed original");
  const malformedContent = "No delimiters here";
  const updatedFrontmatter = { title: "Updated" };
  
  try {
    const updatedContent = mdxService.updateMdxContent(malformedContent, updatedFrontmatter);
    console.log("✅ Successfully handled malformed content");
    console.log("📄 Resulting content:");
    console.log(updatedContent);
    // Should create proper MDX format
    if (updatedContent.startsWith("---\n") && updatedContent.includes("title: Updated")) {
      console.log("✅ Correctly formatted the output");
    } else {
      console.error("❌ Unexpected formatting result");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
  
  console.log("\n🏁 MDX Service error handling tests completed");
});

// Run the program
Effect.runPromise(Effect.provide(program, testLayer)).catch(console.error);
