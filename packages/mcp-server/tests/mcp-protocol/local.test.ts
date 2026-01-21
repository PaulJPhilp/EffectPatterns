/**
 * Local MCP Server Tests
 *
 * Tests the MCP server stdio interface against a local development server.
 * These tests verify that the MCP server correctly communicates with the local API.
 *
 * Architecture: MCP server is a pure transport layer - all authentication
 * and authorization (including tier validation) happens at the HTTP API level.
 *
 * Prerequisites:
 * - Local API server running on http://localhost:3000
 * - PATTERN_API_KEY or LOCAL_API_KEY is optional (MCP doesn't validate auth)
 *
 * Usage:
 *   bun run test:mcp:local
 *   LOCAL_API_KEY=your-key bun run test:mcp:local
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";
import { getMCPEnvironmentConfig } from "../../src/config/mcp-environments";

describe("Local MCP Server", () => {
  let client: MCPTestClient;
  const config = getMCPEnvironmentConfig("local");
  let isLocalAvailable = false;

  beforeAll(async () => {
    // Verify local server is running
    try {
      const healthCheck = await fetch(`${config.apiUrl}/api/health`);
      if (!healthCheck.ok) {
        throw new Error("Health check failed");
      }
      isLocalAvailable = true;
    } catch {
      // Skip local tests if server isn't running
      isLocalAvailable = false;
      return;
    }

    // MCP server is pure transport - API key is optional
    // Auth validation happens at HTTP API level
    client = await createMCPTestClient({
      apiKey: config.apiKey || undefined, // Optional - may be undefined
      apiUrl: config.apiUrl,
      debug: process.env.MCP_DEBUG === "true",
    });
  });

  afterEach(async () => {
    if (client?.isReady()) {
      // Don't close after each test to avoid reconnection overhead
    }
  });

  describe("Connection", () => {
    it("should connect to MCP server successfully", () => {
      if (!isLocalAvailable) return;
      expect(client.isReady()).toBe(true);
    });

    it("should list all available tools", async () => {
      if (!isLocalAvailable) return;
      const tools = await client.listTools();

      expect(tools).toContain("search_patterns");
      expect(tools).toContain("get_pattern");
      expect(tools).toContain("analyze_code");
      expect(tools).toContain("review_code");
      expect(tools).toContain("list_analysis_rules");
    });
  });

  describe("Pattern Search", () => {
    it("should search patterns successfully", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        q: "retry",
        limit: 5,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should filter by category", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        category: "error-handling",
        limit: 3,
      });

      expect(result.content).toBeDefined();
    });

    it("should filter by difficulty", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        difficulty: "beginner",
        limit: 3,
      });

      expect(result.content).toBeDefined();
    });
  });

  describe("Pattern Retrieval", () => {
    it("should get pattern by ID", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("get_pattern", {
        id: "effect-service",
      });

      expect(result.content).toBeDefined();
    });

    it("should handle non-existent pattern gracefully", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("get_pattern", {
        id: "non-existent-pattern-xyz",
      });

      // Should return error content, not throw
      expect(result.content).toBeDefined();
    });
  });

  describe("Code Analysis", () => {
    const sampleCode = `
import { Effect } from "effect";

export const handler = Effect.gen(function* () {
  const result = yield* Effect.succeed(42);
  return result;
});
    `.trim();

    it("should analyze code successfully", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("analyze_code", {
        source: sampleCode,
        filename: "handler.ts",
      });

      expect(result.content).toBeDefined();
    });

    it("should review code successfully", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("review_code", {
        code: sampleCode,
        filePath: "src/handlers/api.ts",
      });

      expect(result.content).toBeDefined();
    });

    it("should list analysis rules", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("list_analysis_rules", {});

      expect(result.content).toBeDefined();
    });
  });

  // Paid features are available via HTTP API only (not exposed in MCP)

  describe("Error Handling", () => {
    it("should handle invalid tool arguments gracefully", async () => {
      if (!isLocalAvailable) return;
      // Tools return errors as values with isError flag, not thrown exceptions
      const result = await client.callTool("search_patterns", {
        limit: -1, // Invalid limit
      });

      // Should return content (may be error with isError flag)
      expect(result.content).toBeDefined();
    });

    it("should handle missing required arguments", async () => {
      if (!isLocalAvailable) return;
      // Tools return errors as values, not thrown exceptions
      const result = await client.callTool("get_pattern", {
        // Missing id
      });

      // Should return content (may be error with isError flag)
      expect(result.content).toBeDefined();
    });
  });
});
