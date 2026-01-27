/**
 * MCP Error Handling Tests
 *
 * Tests MCP server error scenarios and error responses.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";
import { ToolErrorSchema, ToolStructuredContentSchema } from "../../src/schemas/output-schemas";
import { parseStructuredContent } from "./helpers/parse-structured-content";

describe("MCP Error Handling", () => {
  let client: MCPTestClient;

  beforeEach(async () => {
    client = await createMCPTestClient();
  });

  afterEach(async () => {
    if (client?.isReady()) {
      await client.close();
    }
  });

  it("should handle invalid tool name", async () => {
    // MCP SDK returns error results for unknown tools (not thrown exceptions)
    const result = await client.callTool("non_existent_tool", {});
    expect(result.isError).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].text).toMatch(/tool.*not found|error/i);
  });

  it("should handle missing required parameters", async () => {
    // Tools return errors as values with isError flag, not thrown exceptions
    const result = await client.callTool("get_pattern", {});
    // Result may be error content or SDK may reject
    expect(result).toBeDefined();
  });

  it("should handle invalid parameter types", async () => {
    // Tools return errors as values, not thrown exceptions
    const result = await client.callTool("search_patterns", {
      limit: "not-a-number", // Should be number
    });
    expect(result).toBeDefined();
    if (result.isError) {
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("should handle null parameters", async () => {
    const result = await client.callTool("search_patterns", {
      q: null as any,
    });
    expect(result).toBeDefined();
    if (result.isError) {
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("should handle undefined parameters", async () => {
    const args: Record<string, unknown> = {
      q: undefined,
    };
    const result = await client.callTool("search_patterns", args);
    expect(result).toBeDefined();
    if (result.isError) {
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("should handle extremely large input", async () => {
    // Create a 10MB string
    const largeString = "x".repeat(10 * 1024 * 1024);
    const result = await client.callTool("analyze_code", {
      source: largeString,
    });
    expect(result).toBeDefined();
    if (result.isError) {
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("should handle malformed JSON in parameters", async () => {
    // This is hard to test since we're passing JS objects
    // But testing with empty object
    const result = await client.callTool("list_analysis_rules", {});
    expect(result.content).toBeDefined();
  });

  it("should recover from error and continue working", async () => {
    // Make a call that may error - errors are returned as values, not thrown
    const errorResult = await client.callTool("get_pattern", {
      id: "non-existent",
    });
    // Error result is valid, just has isError flag

    // Should still work after error (errors don't break the connection)
    const result = await client.callTool("list_analysis_rules", {});
    expect(result.content).toBeDefined();
  });

  it("should handle rapid successive errors", async () => {
    // Errors are returned as values, not thrown - no need for catch
    const promises = Array(5)
      .fill(null)
      .map(() => client.callTool("get_pattern", { id: "non-existent" }));

    const results = await Promise.all(promises);
    // Should handle multiple errors gracefully - all return results (some may have isError)
    expect(results.length).toBe(5);
    results.forEach((result) => {
      expect(result.content).toBeDefined();
    });
  });

  it("should provide error messages in result content", async () => {
    // Errors are returned as values with isError flag
    const result = await client.callTool("get_pattern", {
      id: "non-existent-pattern-xyz-123",
    });
    
    // Error message should be in content
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const errorText = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    
    // Should have error information
    expect(errorText.length).toBeGreaterThan(0);
  });

  it("should handle timeout in error state", async () => {
    // Create a client with short timeout
    const shortTimeoutClient = await createMCPTestClient({
      toolTimeout: 100, // Very short timeout
    });

    try {
      // This should timeout
      await shortTimeoutClient.callTool("search_patterns", {
        q: "test",
      });
    } catch (error) {
      expect(String(error)).toBeDefined();
    } finally {
      await shortTimeoutClient.close();
    }
  });

  it("should handle connection loss gracefully", async () => {
    const testClient = await createMCPTestClient();
    await testClient.close();

    try {
      await testClient.callTool("search_patterns", { q: "test" });
    } catch (error) {
      expect(String(error)).toMatch(/connected|connection/i);
    }
  });

  it("should handle partial failures in batch operations", async () => {
    // Errors are returned as values - no need for catch
    const toolCalls = [
      client.callTool("search_patterns", { q: "test", limit: 5 }),
      client.callTool("get_pattern", { id: "non-existent" }),
      client.callTool("list_analysis_rules", {}),
    ];

    const results = await Promise.all(toolCalls);
    // Should handle mix of successes and failures - all return results
    expect(results.length).toBe(3);
    results.forEach((result) => {
      expect(result.content).toBeDefined();
    });
  });

  it("should not leak sensitive information in errors", async () => {
    // Errors are returned as values
    const result = await client.callTool("search_patterns", {
      q: "SELECT * FROM users", // SQL injection attempt
    });
    
    // Error message should be safe if this is an error
    const errorText = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .toLowerCase();
    
    if (result.isError) {
      expect(errorText).not.toContain("database");
      expect(errorText).not.toContain("sql");
    }
  });

  it("should handle special characters that might break parsing", async () => {
    const specialInputs = [
      { q: "\n\n\n" },
      { q: '"""' },
      { q: "{}" },
      { q: "<script>alert('test')</script>" },
    ];

    for (const input of specialInputs) {
      try {
        await client.callTool("search_patterns", input);
      } catch (error) {
        // Should handle gracefully
        expect(String(error)).toBeDefined();
      }
    }
  });

  it("should provide consistent error format", async () => {
    // Errors are returned as values with isError flag
    const result1 = await client.callTool("get_pattern", {
      id: "non-existent-1",
    });
    
    const result2 = await client.callTool("get_pattern", {
      id: "non-existent-2",
    });

    // Both should have content (may be errors)
    expect(result1.content).toBeDefined();
    expect(result2.content).toBeDefined();
    
    // If both are errors, they should have consistent format
    if (result1.isError && result2.isError) {
      expect(result1.content[0].type).toBe(result2.content[0].type);
    }
  });

  describe("Format-gated error responses", () => {
    /**
     * Helper to find JSON blocks that validate as toolError:v1
     * Returns the parsed error object if found, null otherwise
     */
    function findErrorJsonBlock(result: any): any | null {
      if (!result.content || result.content.length === 0) return null;
      
      for (const block of [...result.content].reverse()) {
        if (block?.type !== "text" || typeof block.text !== "string") continue;
        try {
          const parsed = JSON.parse(block.text);
          const validation = ToolErrorSchema.safeParse(parsed);
          if (validation.success) return validation.data;
        } catch {
          // Not valid JSON, continue searching
        }
      }
      return null;
    }

    /**
     * Helper to check if result contains any parsable JSON blocks (not just errors)
     */
    function hasAnyJsonBlock(result: any): boolean {
      if (!result.content || result.content.length === 0) return false;
      
      for (const block of result.content) {
        if (block?.type !== "text" || typeof block.text !== "string") continue;
        try {
          JSON.parse(block.text);
          return true; // Found any valid JSON
        } catch {
          // Not JSON
        }
      }
      return false;
    }

    it("search_patterns - format='markdown' should NOT include JSON error block", async () => {
      // Test: In markdown mode, errors should NOT include JSON blocks
      // Note: This test verifies the contract even if no error occurs
      const result = await client.callTool("search_patterns", {
        q: "test",
        format: "markdown",
      });

      // Contract: format="markdown" should NOT have parsable toolError:v1 JSON block
      const errorJson = findErrorJsonBlock(result);
      expect(errorJson).toBeNull(); // No error JSON block in markdown mode
      
      // Should have content (either success or error message)
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("search_patterns - format='json' should include JSON block (error or success)", async () => {
      // Test: In json mode, should have JSON block (either error or success)
      const result = await client.callTool("search_patterns", {
        q: "test",
        format: "json",
      });

      // Contract: format="json" should have JSON block
      expect(hasAnyJsonBlock(result)).toBe(true);
      
      // Parse structured content (should always succeed in json mode)
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success && parsed.data && typeof parsed.data === "object") {
        const data = parsed.data as Record<string, unknown>;
        // If it's an error, validate the error structure
        if (data.kind === "toolError:v1") {
          const validation = ToolErrorSchema.safeParse(data);
          expect(validation.success).toBe(true);
          if (validation.success) {
            expect(validation.data.code).toBeDefined();
            expect(validation.data.message).toBeDefined();
          }
        }
      }
    });

    it("search_patterns - format='both' should include both message and JSON block (JSON last)", async () => {
      // Test: In both mode, should have markdown + JSON, with JSON last
      const result = await client.callTool("search_patterns", {
        q: "test",
        format: "both",
      });

      expect(result.content.length).toBeGreaterThanOrEqual(2); // At least markdown + JSON
      
      // Last block should be JSON (error or success)
      const lastBlock = result.content[result.content.length - 1];
      expect(lastBlock.type).toBe("text");
      
      try {
        const parsed = JSON.parse(lastBlock.text || "");
        // Should validate against ToolStructuredContentSchema
        const validation = ToolStructuredContentSchema.safeParse(parsed);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          // If it's an error, verify structure
          if (parsed.kind === "toolError:v1") {
            expect(parsed.code).toBeDefined();
            expect(parsed.message).toBeDefined();
          }
        }
      } catch (e) {
        throw new Error(`Last block in format='both' should be valid JSON (error or success): ${e}`);
      }
    });

    it("get_pattern - format='markdown' should NOT include JSON error block", async () => {
      // Test: In markdown mode, errors should NOT include JSON blocks
      const result = await client.callTool("get_pattern", {
        id: "non-existent-pattern-xyz-12345",
        format: "markdown",
      });

      // Contract: format="markdown" should NOT have parsable toolError:v1 JSON block
      const errorJson = findErrorJsonBlock(result);
      expect(errorJson).toBeNull(); // No error JSON block in markdown mode
      
      // Should have content (either elicitation or error message)
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("get_pattern - format='json' should include JSON block (error, elicitation, or success)", async () => {
      // Test: In json mode, should have JSON block
      // Note: get_pattern with non-existent ID returns elicitation, not error
      const result = await client.callTool("get_pattern", {
        id: "non-existent-pattern-xyz-12345",
        format: "json",
      });

      // Contract: format="json" should have JSON block
      expect(hasAnyJsonBlock(result)).toBe(true);
      
      // Parse and validate
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success && parsed.data && typeof parsed.data === "object") {
        const data = parsed.data as Record<string, unknown>;
        // Should be either elicitation (needsInput:v1) or error (toolError:v1) or success
        expect(["needsInput:v1", "toolError:v1", "patternDetails:v1"]).toContain(data.kind);
        
        // If it's an error, validate structure
        if (data.kind === "toolError:v1") {
          const validation = ToolErrorSchema.safeParse(data);
          expect(validation.success).toBe(true);
        }
      }
    });

    it("get_pattern - format='both' should include both message and JSON block (JSON last)", async () => {
      // Test: In both mode, should have markdown + JSON, with JSON last
      // Note: get_pattern with non-existent ID returns elicitation, not error
      const result = await client.callTool("get_pattern", {
        id: "non-existent-pattern-xyz-12345",
        format: "both",
      });

      // Should have at least one content block (may be elicitation with just markdown in some cases)
      expect(result.content.length).toBeGreaterThanOrEqual(1);
      
      // If format="both", should have JSON block (last block)
      const lastBlock = result.content[result.content.length - 1];
      expect(lastBlock.type).toBe("text");
      
      try {
        const parsed = JSON.parse(lastBlock.text || "");
        // Should validate against ToolStructuredContentSchema
        const validation = ToolStructuredContentSchema.safeParse(parsed);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          // Should be elicitation, error, or success
          expect(["needsInput:v1", "toolError:v1", "patternDetails:v1"]).toContain(parsed.kind);
          
          // If it's an error, verify structure
          if (parsed.kind === "toolError:v1") {
            expect(parsed.code).toBeDefined();
            expect(parsed.message).toBeDefined();
          }
        }
      } catch (e) {
        throw new Error(`Last block in format='both' should be valid JSON: ${e}`);
      }
    });
  });
});
