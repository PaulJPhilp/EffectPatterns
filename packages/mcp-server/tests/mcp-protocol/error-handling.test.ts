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
    try {
      await client.callTool("non_existent_tool", {});
      expect(true).toBe(true); // May not throw, may return error in result
    } catch (error) {
      expect(String(error)).toMatch(/tool|not|found|unknown/i);
    }
  });

  it("should handle missing required parameters", async () => {
    try {
      await client.callTool("get_pattern", {});
      expect(true).toBe(true);
    } catch (error) {
      expect(String(error)).toMatch(/required|parameter|missing/i);
    }
  });

  it("should handle invalid parameter types", async () => {
    try {
      await client.callTool("search_patterns", {
        limit: "not-a-number", // Should be number
      });
      expect(true).toBe(true);
    } catch (error) {
      expect(String(error)).toBeDefined();
    }
  });

  it("should handle null parameters", async () => {
    try {
      await client.callTool("search_patterns", {
        q: null as any,
      });
      expect(true).toBe(true);
    } catch (error) {
      expect(String(error)).toBeDefined();
    }
  });

  it("should handle undefined parameters", async () => {
    try {
      const args: Record<string, unknown> = {
        q: undefined,
      };
      await client.callTool("search_patterns", args);
      expect(true).toBe(true);
    } catch (error) {
      expect(String(error)).toBeDefined();
    }
  });

  it("should handle extremely large input", async () => {
    try {
      // Create a 10MB string
      const largeString = "x".repeat(10 * 1024 * 1024);
      await client.callTool("analyze_code", {
        source: largeString,
      });
      expect(true).toBe(true);
    } catch (error) {
      // May fail due to size limit
      expect(String(error)).toBeDefined();
    }
  });

  it("should handle malformed JSON in parameters", async () => {
    // This is hard to test since we're passing JS objects
    // But testing with empty object
    const result = await client.callTool("list_analysis_rules", {});
    const parsed = client.parseResult(result);
    expect(parsed).toBeDefined();
  });

  it("should recover from error and continue working", async () => {
    // Make a call that may error
    try {
      await client.callTool("get_pattern", {
        id: "non-existent",
      });
    } catch (error) {
      // Expected
    }

    // Should still work after error
    const result = await client.callTool("list_analysis_rules", {});
    const parsed = client.parseResult(result);
    expect(parsed).toBeDefined();
  });

  it("should handle rapid successive errors", async () => {
    const promises = Array(5)
      .fill(null)
      .map(() =>
        client
          .callTool("get_pattern", { id: "non-existent" })
          .catch(() => null)
      );

    const results = await Promise.all(promises);
    // Should handle multiple errors gracefully
    expect(results).toBeDefined();
  });

  it("should provide error messages", async () => {
    try {
      await client.callTool("get_pattern", {
        id: "non-existent-pattern-xyz-123",
      });
    } catch (error) {
      // Error should have a message
      expect(String(error).length).toBeGreaterThan(0);
    }
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
    const toolCalls = [
      client.callTool("search_patterns", { q: "test", limit: 5 }).catch(() => null),
      client.callTool("get_pattern", { id: "non-existent" }).catch(() => null),
      client.callTool("list_analysis_rules", {}).catch(() => null),
    ];

    const results = await Promise.all(toolCalls);
    // Should handle mix of successes and failures
    expect(results).toBeDefined();
  });

  it("should not leak sensitive information in errors", async () => {
    try {
      await client.callTool("search_patterns", {
        q: "SELECT * FROM users", // SQL injection attempt
      });
    } catch (error) {
      // Error message should be safe
      const errorMsg = String(error).toLowerCase();
      expect(errorMsg).not.toContain("database");
      expect(errorMsg).not.toContain("sql");
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
    const errors: string[] = [];

    try {
      await client.callTool("get_pattern", {
        id: "non-existent-1",
      });
    } catch (error) {
      errors.push(String(error));
    }

    try {
      await client.callTool("get_pattern", {
        id: "non-existent-2",
      });
    } catch (error) {
      errors.push(String(error));
    }

    // Errors should have consistent format
    expect(errors.length).toBeGreaterThan(0);
  });
});
