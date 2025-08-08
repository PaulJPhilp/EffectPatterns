#!/usr/bin/env bun

/**
 * Integration test script for the MDX service
 * This script tests the MDX service in a more realistic scenario
 * including file system operations and integration with other services
 */

import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService } from "../cli/src/services/mdx-service/service.js";
import { join } from "path";
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from "fs";

// Use MdxService.Default with NodeContext.layer for platform services
const testLayer = Layer.provide(MdxService.Default, NodeContext.layer);

// Create a temporary directory for our tests
const tempDir = join(process.cwd(), "test-tmp");

const program = Effect.gen(function* () {
  const mdxService = yield* MdxService;
  
  console.log("🧪 Testing MDX Service Integration");
  
  // Ensure temp directory exists
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  
  // Test 1: Read and parse a real MDX file
  console.log("\n📝 Test 1: Reading and parsing a real MDX file");
  const testPromptPath = join(process.cwd(), "cli/src/commands/__tests__/test-data/test-prompt.mdx");
  
  try {
    const parsedFile = yield* mdxService.readMdxAndFrontmatter(testPromptPath);
    console.log("✅ Successfully read and parsed MDX file");
    console.log("📄 Title:", parsedFile.frontmatter.title);
    console.log("📄 Model:", parsedFile.frontmatter.model);
    console.log("📄 Body length:", parsedFile.mdxBody.length);
  } catch (error) {
    console.error("❌ Failed to read MDX file:", error);
  }
  
  // Test 2: Create a new MDX file, modify it, and verify changes
  console.log("\n📝 Test 2: Creating, modifying, and verifying an MDX file");
  const tempMdxPath = join(tempDir, "test-modify.mdx");
  
  // Create initial content
  const initialContent = `---
title: "Initial Test"
version: 1
status: "draft"
---

This is the initial content of our test file.

## Section 1

Some content here.
`;
  
  try {
    // Write the initial file
    writeFileSync(tempMdxPath, initialContent);
    console.log("📄 Created initial MDX file");
    
    // Read and parse it
    const parsedFile = yield* mdxService.readMdxAndFrontmatter(tempMdxPath);
    console.log("✅ Successfully read created file");
    
    // Update the frontmatter
    const updatedFrontmatter = {
      ...parsedFile.frontmatter,
      version: 2,
      status: "published",
      lastModified: new Date().toISOString(),
      author: "Test User"
    };
    
    // Update the content
    const updatedContent = mdxService.updateMdxContent(parsedFile.content, updatedFrontmatter);
    writeFileSync(tempMdxPath, updatedContent);
    console.log("✅ Successfully updated MDX file");
    
    // Read it back and verify
    const updatedFile = yield* mdxService.readMdxAndFrontmatter(tempMdxPath);
    if (updatedFile.frontmatter.version === 2 && 
        updatedFile.frontmatter.status === "published" &&
        updatedFile.frontmatter.author === "Test User") {
      console.log("✅ Verified frontmatter updates");
    } else {
      console.error("❌ Frontmatter updates not as expected");
      console.log("📄 Actual frontmatter:", updatedFile.frontmatter);
    }
    
    // Verify body is preserved
    if (updatedFile.mdxBody.includes("This is the initial content") &&
        updatedFile.mdxBody.includes("Section 1")) {
      console.log("✅ Verified body preservation");
    } else {
      console.error("❌ Body content not preserved correctly");
    }
  } catch (error) {
    console.error("❌ Failed in create/modify/verify test:", error);
  }
  
  // Test 3: Test with schema MDX file
  console.log("\n📝 Test 3: Testing with schema MDX file");
  const testSchemaPath = join(process.cwd(), "cli/src/commands/__tests__/test-data/test-schema.mdx");
  
  try {
    const parsedSchema = yield* mdxService.readMdxAndFrontmatter(testSchemaPath);
    console.log("✅ Successfully read schema MDX file");
    console.log("📄 Schema title:", parsedSchema.frontmatter.title);
    
    // Parse the body as JSON schema
    const schemaBody = parsedSchema.mdxBody.trim();
    if (schemaBody.startsWith("```json") || schemaBody.startsWith("```")) {
      console.log("✅ Identified JSON schema in body");
      // Extract JSON content
      const jsonStart = schemaBody.indexOf('{');
      const jsonEnd = schemaBody.lastIndexOf('}') + 1;
      if (jsonStart > 0 && jsonEnd > jsonStart) {
        const jsonContent = schemaBody.substring(jsonStart, jsonEnd);
        try {
          const schemaObj = JSON.parse(jsonContent);
          console.log("✅ Successfully parsed JSON schema");
          console.log("📄 Schema type:", schemaObj.type);
          console.log("📄 Schema properties:", Object.keys(schemaObj.properties || {}));
        } catch (parseError) {
          console.error("❌ Failed to parse JSON schema:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("❌ Failed to process schema MDX file:", error);
  }
  
  // Test 4: Complex parameter extraction
  console.log("\n📝 Test 4: Complex parameter extraction");
  const complexMdxContent = `---
title: "Complex Parameters Test"
parameters:
  name:
    type: "string"
    description: "The user's name"
    required: true
  age:
    type: "number"
    description: "The user's age"
    required: false
    default: 18
  hobbies:
    type: "array"
    description: "List of hobbies"
  isActive:
    type: "boolean"
    description: "Whether the user is active"
    default: true
  profile:
    type: "object"
    description: "User profile object"
---

Please generate a profile for {{name}}.`;
  
  try {
    const parsedContent = yield* mdxService.parseMdxFile(complexMdxContent);
    const extractedParams = mdxService.extractParameters(parsedContent.attributes);
    console.log("✅ Successfully extracted complex parameters");
    console.log("📄 Extracted parameter count:", Object.keys(extractedParams).length);
    
    // Verify each parameter
    const expectedParams = ['name', 'age', 'hobbies', 'isActive', 'profile'];
    for (const paramName of expectedParams) {
      if (extractedParams[paramName]) {
        console.log(`✅ Found parameter: ${paramName} (${extractedParams[paramName].type})`);
      } else {
        console.error(`❌ Missing parameter: ${paramName}`);
      }
    }
    
    // Verify specific properties
    if (extractedParams.name?.required === true &&
        extractedParams.age?.default === 18 &&
        extractedParams.isActive?.default === true) {
      console.log("✅ Verified parameter properties");
    } else {
      console.error("❌ Parameter properties not as expected");
    }
  } catch (error) {
    console.error("❌ Failed in complex parameter extraction test:", error);
  }
  
  // Clean up temporary files
  try {
    if (existsSync(tempMdxPath)) {
      unlinkSync(tempMdxPath);
    }
    console.log("\n🧹 Cleaned up temporary files");
  } catch (error) {
    console.error("❌ Failed to clean up temporary files:", error);
  }
  
  console.log("\n🏁 MDX Service integration tests completed");
});

// Run the program
Effect.runPromise(Effect.provide(program, testLayer))
  .catch(error => {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  })
  .finally(() => {
    // Ensure cleanup even if tests fail
    try {
      if (existsSync(tempDir)) {
        // Remove temp directory if empty
        const files = require('fs').readdirSync(tempDir);
        if (files.length === 0) {
          require('fs').rmdirSync(tempDir);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
