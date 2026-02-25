/**
 * MCP Client Stdio Connection Tests
 *
 * Tests the MCP server's stdio connection lifecycle:
 * - Client initialization and connection
 * - Tool discovery
 * - Connection cleanup
 */

import { afterEach, describe, expect, it } from "vitest";
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

  const PRODUCTION_TOOLS = [
    "get_pattern",
    "get_skill",
    "list_analysis_rules",
    "list_skills",
    "search_patterns",
  ] as const;

  it("should expose exactly 5 tools in default/production env (no get_mcp_config)", async () => {
    client = await createMCPTestClient({
      apiKey: "test-api-key",
      apiUrl: "http://localhost:3000",
      debug: false,
      mcpEnv: "production",
    });

    const tools = await client.listTools();

    expect(tools).toHaveLength(5);
    expect([...tools].sort()).toEqual([...PRODUCTION_TOOLS].sort());
    expect(tools).not.toContain("get_mcp_config");
  });

  it("should list only the allowed MCP tool set", async () => {
    client = await createMCPTestClient();

    const tools = await client.listTools();

    const allowed = [
      "search_patterns",
      "get_pattern",
      "list_analysis_rules",
      "list_skills",
      "get_skill",
    ];
    const forbidden = [
      "analyze_code",
      "review_code",
      "apply_refactoring",
      "analyze_consistency",
      "generate_pattern",
    ];

    for (const name of allowed) {
      expect(tools).toContain(name);
    }
    for (const name of forbidden) {
      expect(tools).not.toContain(name);
    }

    const allowedOptional = new Set([...allowed, "get_mcp_config"]);
    for (const name of tools) {
      expect(allowedOptional.has(name)).toBe(true);
    }
    expect(tools.length).toBeGreaterThanOrEqual(5);
    expect(tools.length).toBeLessThanOrEqual(6);
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

  it("should start without API key (pure transport)", async () => {
    // MCP server is pure transport - API key is optional
    // Auth validation happens at HTTP API level, not MCP level
    const testClient = await createMCPTestClient({
      apiKey: undefined, // No API key - should still connect
      apiUrl: "http://localhost:3000",
    });
    
    expect(testClient.isReady()).toBe(true);
    await testClient.close();
  });

  it("should start with API key", async () => {
    // Should also work with API key provided
    const testClient = await createMCPTestClient({
      apiKey: "test-key",
      apiUrl: "http://localhost:3000",
    });
    
    expect(testClient.isReady()).toBe(true);
    await testClient.close();
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
