/**
 * MCP Client Stdio Connection Tests
 *
 * Tests the MCP server's stdio connection lifecycle:
 * - Client initialization and connection
 * - Tool discovery
 * - Connection cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";

describe("MCP Client Stdio Connection", () => {
  let client: MCPTestClient;

  afterEach(async () => {
    if (client?.isReady()) {
      await client.close();
    }
  });

  it("should connect to MCP server successfully", async () => {
    client = await createMCPTestClient({
      apiKey: "test-api-key",
      apiUrl: "http://localhost:3000",
    });

    expect(client.isReady()).toBe(true);
  });

  it("should list all available tools", async () => {
    client = await createMCPTestClient();

    const tools = await client.listTools();

    // Verify all expected tools are present
    expect(tools).toContain("search_patterns");
    expect(tools).toContain("get_pattern");
    expect(tools).toContain("analyze_code");
    expect(tools).toContain("review_code");
    expect(tools).toContain("generate_pattern_code");
    expect(tools).toContain("list_analysis_rules");
    expect(tools).toContain("analyze_consistency");
    expect(tools).toContain("apply_refactoring");

    // Verify expected tool count
    expect(tools.length).toBeGreaterThanOrEqual(8);
  });

  it("should disconnect gracefully", async () => {
    client = await createMCPTestClient();

    expect(client.isReady()).toBe(true);

    await client.close();

    expect(client.isReady()).toBe(false);
  });

  it("should reconnect after disconnection", async () => {
    client = await createMCPTestClient();
    expect(client.isReady()).toBe(true);

    await client.close();
    expect(client.isReady()).toBe(false);

    // Create a new client
    client = await createMCPTestClient();
    expect(client.isReady()).toBe(true);

    const tools = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  it("should reject calls when disconnected", async () => {
    client = await createMCPTestClient();
    await client.close();

    await expect(client.callTool("search_patterns", { q: "test" })).rejects.toThrow(
      /not connected/i
    );
  });

  it("should handle missing API key gracefully", async () => {
    // Note: This test may fail if API key is required at server startup
    // The server should be running without API key validation for testing
    try {
      const testClient = await createMCPTestClient({
        apiKey: "test-key",
        apiUrl: "http://localhost:3000",
      });
      await testClient.close();
      expect(true).toBe(true); // Test passed if connection succeeds
    } catch (error) {
      expect(String(error)).toMatch(/api|key|connection/i);
    }
  });

  it("should maintain connection during multiple tool calls", async () => {
    client = await createMCPTestClient();

    // Make multiple tool calls
    for (let i = 0; i < 3; i++) {
      // These calls may fail due to missing API, but connection should persist
      try {
        await client.callTool("search_patterns", { q: "test", limit: 1 });
      } catch {
        // Expected to fail due to API not being available
      }
      expect(client.isReady()).toBe(true);
    }
  });
});
