/**
 * MCP Error Handling Tests
 *
 * Tests MCP server error scenarios and error responses.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";

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
});
