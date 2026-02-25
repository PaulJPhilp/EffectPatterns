/**
 * Local MCP Server Tests
 *
 * Tests the MCP server stdio interface against a local development server.
 * These tests verify that the MCP server correctly communicates with the local API.
 *
 * Architecture: MCP server is a pure transport layer - all authentication
 * and authorization happens at the HTTP API level.
 *
 * Prerequisites:
 * - Local API server running on http://localhost:3000
 * - PATTERN_API_KEY or LOCAL_API_KEY is optional (MCP doesn't validate auth)
 *
 * Usage:
 *   bun run test:mcp:local
 *   LOCAL_API_KEY=your-key bun run test:mcp:local
 */

import {
    MARKER_PATTERN_CARD_V1,
    MARKER_PATTERN_INDEX_V1,
} from "@/constants/markers";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getMCPEnvironmentConfig } from "../../src/config/mcp-environments";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client";

function extractContentText(
  content: Array<{ type: string; text?: string }> | { type: string; text?: string }
): string {
  if (Array.isArray(content)) {
    return content.map((block) => block.text || "").join("\n");
  }
  return content.text || "";
}

describe("Local MCP Server", () => {
  let client: MCPTestClient;
  const config = getMCPEnvironmentConfig("local");
  let isLocalAvailable = false;

  beforeAll(async () => {
    // Strict CI Check: Fail immediately if required secrets are missing
    if (process.env.CI === "true" && !config.apiKey) {
      throw new Error(
        "FATAL: PATTERN_API_KEY is missing in CI environment. " +
        "This key is required for MCP protocol integration tests. " +
        "Ensure the secret is correctly passed to the GitHub Action job."
      );
    }

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

    const PRODUCTION_TOOLS = [
      "get_pattern",
      "get_skill",
      "list_analysis_rules",
      "list_skills",
      "search_patterns",
    ] as const;

    it("should expose exactly 5 tools when MCP_DEBUG=false and MCP_ENV=production", async () => {
      if (!isLocalAvailable) return;
      const productionClient = await createMCPTestClient({
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
        debug: false,
        mcpEnv: "production",
      });

      const tools = await productionClient.listTools();

      expect(tools).toHaveLength(5);
      expect([...tools].sort()).toEqual([...PRODUCTION_TOOLS].sort());
      expect(tools).not.toContain("get_mcp_config");
      await productionClient.close();
    });

    it("should list only the allowed MCP tool set", async () => {
      if (!isLocalAvailable) return;
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

    it("should render clean markdown without tool chatter", async () => {
      if (!isLocalAvailable) return;
      
      // Test 1: Search patterns
      const searchResult = await client.callTool("search_patterns", {
        q: "pattern",
        format: "markdown",
        limitCards: 1,
      });

      expect(searchResult.content).toBeDefined();
      const searchText = extractContentText(searchResult.content);

      // Check for auth error
      if (searchText.includes('"error":') && searchText.includes("authentication_required")) {
        if (process.env.CI === "true") {
           throw new Error(
             "FATAL: Authentication failed in CI environment. " +
             "PATTERN_API_KEY must be set in CI secrets for 'test:mcp:local' to run. " +
             "Check .github/workflows/ci.yml and ensure the secret is passed to the job."
           );
        }
        console.warn("Skipping 'clean markdown' assertion due to missing API key");
        return;
      }
      
      // Positive assertion: Check for contractual structural markers (stable IDs and markers)
      expect(searchText).toContain(MARKER_PATTERN_INDEX_V1); // Index contract marker
      expect(searchText).toContain(MARKER_PATTERN_CARD_V1); // Card contract marker
      
      // Ensure cards are rendered (K=1 requested in args)
      const cardMatches = searchText.match(new RegExp(MARKER_PATTERN_CARD_V1, "g"));
      expect(cardMatches?.length).toBe(1);

      // Test 2: Get pattern
      const getResult = await client.callTool("get_pattern", {
        id: "transform-effect-values",
      });
      const getText = extractContentText(getResult.content);
      
      // Structural markers for single pattern card
      expect(getText).toMatch(/^# /m); // Markdown H1 title
      expect(getText).toContain(MARKER_PATTERN_CARD_V1); // Contract marker
      
      const getCardMatches = getText.match(new RegExp(MARKER_PATTERN_CARD_V1, "g"));
      expect(getCardMatches?.length).toBe(1);

      expect(getText).toContain("**API:**");

      const disallowed = [
        /\[.*tools called.*\]/i,
        /Tool called:/i,
        /Checking the MCP server tools directory/i,
      ];
      
      // legitimate content that uses the word "search" shouldn't trigger false positives
      expect(searchText.toLowerCase()).toContain("search"); 

      for (const pattern of disallowed) {
        expect(searchText).not.toMatch(pattern);
        expect(getText).not.toMatch(pattern);
      }
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
        id: "transform-effect-values",
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

  describe("Rule Catalog (Read-Only)", () => {
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
