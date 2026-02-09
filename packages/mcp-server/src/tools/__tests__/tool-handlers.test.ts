/**
 * Tool Handler Tests
 *
 * Tests the actual tool handler callbacks by capturing them from registerTools
 * and invoking with mock callApi/log/cache. This exercises the handler code
 * paths that registration-only tests miss.
 */

import { describe, expect, it, afterEach } from "vitest";
import { registerTools, type CallApiFn, type LogFn, type CallToolResult, type ApiResult } from "../tool-implementations";

// ============================================================================
// Test Harness: Captures tool handlers from McpServer.tool()
// ============================================================================

type ToolHandler = (args: any) => Promise<CallToolResult>;

class ToolCapture {
  tools = new Map<string, ToolHandler>();

  /**
   * Mimics McpServer.tool() to capture handler functions
   */
  tool(name: string, _desc: string, _schema: any, handler: ToolHandler) {
    this.tools.set(name, handler);
  }

  get(name: string): ToolHandler {
    const handler = this.tools.get(name);
    if (!handler) throw new Error(`Tool '${name}' not registered`);
    return handler;
  }
}

// ============================================================================
// Mock Factories
// ============================================================================

function createMockLog(): LogFn {
  return () => {};
}

function createMockCache() {
  const store = new Map<string, { value: any; expires: number }>();
  return {
    get: (key: string) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expires) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: (key: string, value: any, ttl: number) => {
      store.set(key, { value, expires: Date.now() + ttl });
    },
    _store: store,
  };
}

/**
 * Create a mock callApi that routes to specific responses by endpoint
 */
function createRoutedCallApi(routes: Record<string, ApiResult<unknown>>): CallApiFn {
  return async (endpoint: string) => {
    // Find matching route (prefix match)
    for (const [pattern, result] of Object.entries(routes)) {
      if (endpoint.startsWith(pattern) || endpoint.includes(pattern)) {
        return result;
      }
    }
    return { ok: false, error: "Not found", status: 404 };
  };
}

// ============================================================================
// Test Data
// ============================================================================

const MOCK_PATTERN = {
  id: "effect-service",
  title: "Effect Service Pattern",
  category: "service",
  difficulty: "intermediate",
  description: "Create composable services with Effect.Service",
  examples: [{ code: 'const svc = Effect.Service("Svc")({});', language: "typescript", description: "Basic service" }],
  useCases: ["Dependency injection"],
  tags: ["service", "di"],
  relatedPatterns: ["layer-composition"],
};

const MOCK_SEARCH_RESULTS = {
  count: 2,
  patterns: [
    MOCK_PATTERN,
    { ...MOCK_PATTERN, id: "layer-composition", title: "Layer Composition" },
  ],
};

const MOCK_PATTERN_DETAIL = {
  pattern: {
    ...MOCK_PATTERN,
    summary: "Create composable services",
  },
};

const MOCK_SKILL = {
  slug: "error-handling-skill",
  name: "Error Handling Skill",
  description: "Master error handling in Effect",
  category: "error-handling",
  patternCount: 5,
  version: 1,
  content: "# Error Handling\n\nThis skill covers...",
};

const MOCK_SKILLS_RESULTS = {
  count: 1,
  skills: [MOCK_SKILL],
};

const MOCK_RULES = [
  { id: "no-promise-in-effect", name: "No Promise in Effect", severity: "error" },
];

// ============================================================================
// Tests
// ============================================================================

describe("Tool Handlers", () => {
  const originalMcpDebug = process.env.MCP_DEBUG;
  const originalMcpEnv = process.env.MCP_ENV;

  afterEach(() => {
    if (originalMcpDebug !== undefined) process.env.MCP_DEBUG = originalMcpDebug;
    else delete process.env.MCP_DEBUG;
    if (originalMcpEnv !== undefined) process.env.MCP_ENV = originalMcpEnv;
    else delete process.env.MCP_ENV;
  });

  function registerAndCapture(callApi: CallApiFn, cache?: any) {
    const capture = new ToolCapture();
    process.env.MCP_ENV = "local"; // Enable get_mcp_config
    process.env.MCP_DEBUG = "true";
    registerTools(capture as any, callApi, createMockLog(), cache ?? createMockCache());
    return capture;
  }

  // ============================================================================
  // search_patterns
  // ============================================================================

  describe("search_patterns", () => {
    it("should return markdown search results", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).not.toBe(true);
    });

    it("should return JSON search results", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "json" });

      expect(result.content.length).toBeGreaterThan(0);
      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should return both formats", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "both" });

      const mdBlocks = result.content.filter((c: any) => c.mimeType === "text/markdown");
      const jsonBlocks = result.content.filter((c: any) => c.mimeType === "application/json");
      expect(mdBlocks.length).toBeGreaterThan(0);
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    it("should handle empty query (elicitation)", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "", format: "markdown" });

      // Should return elicitation content
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle missing query (elicitation)", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle API error gracefully", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: false, error: "Database unavailable", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "markdown" });

      expect(result.isError).toBe(true);
    });

    it("should handle zero results with discovery card", async () => {
      const callApi: CallApiFn = async (endpoint: string) => {
        if (endpoint.includes("limit=1000")) {
          return { ok: true, data: MOCK_SEARCH_RESULTS };
        }
        return { ok: true, data: { count: 0, patterns: [] } };
      };
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "nonexistent-xyz", format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain("No Patterns Found");
    });

    it("should use cache on second call", async () => {
      let callCount = 0;
      const callApi: CallApiFn = async () => {
        callCount++;
        return { ok: true, data: MOCK_SEARCH_RESULTS };
      };
      const cache = createMockCache();
      const capture = registerAndCapture(callApi, cache);
      const handler = capture.get("search_patterns");

      await handler({ q: "service", format: "markdown" });
      const callsAfterFirst = callCount;

      await handler({ q: "service", format: "markdown" });

      // Second call should use cache (no additional API call)
      expect(callCount).toBe(callsAfterFirst);
    });

    it("should handle category and difficulty filters", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({
        q: "service",
        category: "service",
        difficulty: "intermediate",
        format: "markdown",
      });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle limit parameter", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", limit: 1, format: "json" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle includeStructuredPatterns flag", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({
        q: "service",
        format: "json",
        includeStructuredPatterns: true,
      });

      expect(result.structuredContent).toBeDefined();
    });

    it("should handle API response without expected structure", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: null },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle network error in API result", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": {
          ok: false,
          error: "fetch failed",
          details: { errorType: "connection_refused", retryable: true },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "markdown" });

      expect(result.isError).toBe(true);
    });

    it("should handle 404 API error", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: false, error: "Not found", status: 404 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({ q: "service", format: "json" });

      expect(result.isError).toBe(true);
    });

    it("should handle limitCards parameter", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({
        q: "service",
        format: "markdown",
        limitCards: 1,
      });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should include provenance panel when requested", async () => {
      const callApi = createRoutedCallApi({
        "/patterns": { ok: true, data: MOCK_SEARCH_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("search_patterns");

      const result = await handler({
        q: "service",
        format: "json",
        includeProvenancePanel: true,
        includeStructuredPatterns: true,
      });

      if (result.structuredContent) {
        const sc = result.structuredContent as any;
        expect(sc.provenance).toBeDefined();
      }
    });
  });

  // ============================================================================
  // get_pattern
  // ============================================================================

  describe("get_pattern", () => {
    it("should return markdown pattern details", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": { ok: true, data: MOCK_PATTERN_DETAIL },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "effect-service", format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).not.toBe(true);
    });

    it("should return JSON pattern details", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": { ok: true, data: MOCK_PATTERN_DETAIL },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "effect-service", format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should return both formats", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": { ok: true, data: MOCK_PATTERN_DETAIL },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({
        id: "effect-service",
        format: "both",
        includeStructuredDetails: true,
      });

      const mdBlocks = result.content.filter((c: any) => c.mimeType === "text/markdown");
      const jsonBlocks = result.content.filter((c: any) => c.mimeType === "application/json");
      expect(mdBlocks.length).toBeGreaterThan(0);
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    it("should handle empty ID (elicitation)", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "", format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle 404 with suggestions", async () => {
      const callApi: CallApiFn = async (endpoint: string) => {
        if (endpoint.includes("/patterns/nonexistent")) {
          return { ok: false, error: "Not found", status: 404 };
        }
        if (endpoint.includes("/patterns?q=")) {
          return { ok: true, data: MOCK_SEARCH_RESULTS };
        }
        return { ok: false, error: "Not found", status: 404 };
      };
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "nonexistent", format: "markdown" });

      // Should return elicitation with suggestions
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should use cache for repeated calls", async () => {
      let callCount = 0;
      const callApi: CallApiFn = async () => {
        callCount++;
        return { ok: true, data: MOCK_PATTERN_DETAIL };
      };
      const cache = createMockCache();
      const capture = registerAndCapture(callApi, cache);
      const handler = capture.get("get_pattern");

      await handler({ id: "effect-service", format: "markdown" });
      const callsAfterFirst = callCount;

      await handler({ id: "effect-service", format: "markdown" });

      expect(callCount).toBe(callsAfterFirst);
    });

    it("should handle API error", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": { ok: false, error: "Server error", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "effect-service", format: "markdown" });

      expect(result.isError).toBe(true);
    });

    it("should handle includeStructuredDetails=true with json format", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": { ok: true, data: MOCK_PATTERN_DETAIL },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({
        id: "effect-service",
        format: "json",
        includeStructuredDetails: true,
      });

      expect(result.structuredContent).toBeDefined();
    });

    it("should handle pattern without examples", async () => {
      const callApi = createRoutedCallApi({
        "/patterns/": {
          ok: true,
          data: {
            pattern: {
              ...MOCK_PATTERN,
              examples: [],
              useCases: [],
              relatedPatterns: [],
            },
          },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "effect-service", format: "markdown" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle 404 without suggestions", async () => {
      const callApi: CallApiFn = async (endpoint: string) => {
        if (endpoint.includes("/patterns?q=")) {
          return { ok: true, data: { count: 0, patterns: [] } };
        }
        return { ok: false, error: "Not found", status: 404 };
      };
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "nonexistent", format: "json" });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle elicitation with json format", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "", format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should handle elicitation with both format", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_pattern");

      const result = await handler({ id: "", format: "both" });

      expect(result.content.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // list_analysis_rules
  // ============================================================================

  describe("list_analysis_rules", () => {
    it("should return rules list", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: true, data: MOCK_RULES },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle API error", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: false, error: "Failed", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // get_mcp_config (debug/local only)
  // ============================================================================

  describe("get_mcp_config", () => {
    it("should return config in markdown format", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_mcp_config");

      const result = await handler({ format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain("MCP Config");
    });

    it("should return config in json format", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_mcp_config");

      const result = await handler({ format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should return config in both formats", async () => {
      const callApi = createRoutedCallApi({});
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_mcp_config");

      const result = await handler({ format: "both" });

      expect(result.content.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // list_skills
  // ============================================================================

  describe("list_skills", () => {
    it("should return skills in markdown format", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: true, data: MOCK_SKILLS_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({ format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain("Effect Skills");
      expect(text).toContain("Error Handling Skill");
    });

    it("should return skills in json format", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: true, data: MOCK_SKILLS_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({ format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should return skills in both formats", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: true, data: MOCK_SKILLS_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({ format: "both" });

      const mdBlocks = result.content.filter((c: any) => c.mimeType === "text/markdown");
      const jsonBlocks = result.content.filter((c: any) => c.mimeType === "application/json");
      expect(mdBlocks.length).toBeGreaterThan(0);
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    it("should handle query parameter", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: true, data: MOCK_SKILLS_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({ q: "error", format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain('"error"');
    });

    it("should handle API error", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: false, error: "DB unavailable", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({ format: "markdown" });

      expect(result.isError).toBe(true);
    });

    it("should handle category and limit params", async () => {
      const callApi = createRoutedCallApi({
        "/skills": { ok: true, data: MOCK_SKILLS_RESULTS },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_skills");

      const result = await handler({
        category: "error-handling",
        limit: 5,
        format: "markdown",
      });

      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // get_skill
  // ============================================================================

  describe("get_skill", () => {
    it("should return skill detail in markdown", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: true, data: { skill: MOCK_SKILL } },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "error-handling-skill", format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain("Error Handling Skill");
      expect(text).toContain("This skill covers");
    });

    it("should return skill detail in json", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: true, data: { skill: MOCK_SKILL } },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "error-handling-skill", format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should return skill detail in both formats", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: true, data: { skill: MOCK_SKILL } },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "error-handling-skill", format: "both" });

      const mdBlocks = result.content.filter((c: any) => c.mimeType === "text/markdown");
      const jsonBlocks = result.content.filter((c: any) => c.mimeType === "application/json");
      expect(mdBlocks.length).toBeGreaterThan(0);
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    it("should handle skill without content field", async () => {
      const skillNoContent = { ...MOCK_SKILL, content: undefined };
      const callApi = createRoutedCallApi({
        "/skills/": { ok: true, data: { skill: skillNoContent } },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "error-handling-skill", format: "markdown" });

      const text = result.content.map((c: any) => c.text).join("");
      expect(text).toContain("Master error handling");
    });

    it("should handle API error (404)", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: false, error: "Skill not found", status: 404 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "nonexistent", format: "markdown" });

      expect(result.isError).toBe(true);
    });

    it("should handle API error (500)", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: false, error: "Server error", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "any-skill", format: "json" });

      expect(result.isError).toBe(true);
    });
  });

  // ============================================================================
  // toToolResult error classification
  // ============================================================================

  describe("Error classification via toToolResult", () => {
    it("should classify 401 as AUTHENTICATION_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: false, error: "Unauthorized", status: 401 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      expect(result.isError).toBe(true);
      const sc = result.structuredContent as any;
      expect(sc.code).toBe("AUTHENTICATION_ERROR");
      expect(sc.retryable).toBe(false);
    });

    it("should classify 403 as AUTHENTICATION_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: false, error: "Forbidden", status: 403 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("AUTHENTICATION_ERROR");
    });

    it("should classify 404 as NOT_FOUND", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: false, error: "Not found", status: 404 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "nope", format: "markdown" });

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("NOT_FOUND");
      expect(sc.retryable).toBe(false);
    });

    it("should classify 500 as SERVER_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: false, error: "Internal error", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("SERVER_ERROR");
      expect(sc.retryable).toBe(true);
    });

    it("should classify network error as NETWORK_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": {
          ok: false,
          error: "fetch failed",
          details: { errorType: "connection_refused", retryable: true },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("NETWORK_ERROR");
      expect(sc.retryable).toBe(true);
    });

    it("should classify timeout error as NETWORK_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": {
          ok: false,
          error: "timeout",
          details: { errorType: "timeout" },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("NETWORK_ERROR");
    });

    it("should classify TLS error as non-retryable NETWORK_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": {
          ok: false,
          error: "TLS handshake failed",
          details: { errorType: "tls_error" },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("NETWORK_ERROR");
      expect(sc.retryable).toBe(false);
    });

    it("should classify 400 as CLIENT_ERROR", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": { ok: false, error: "Bad request", status: 400 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.code).toBe("CLIENT_ERROR");
    });

    it("should parse JSON error messages", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": {
          ok: false,
          error: JSON.stringify({ message: "Parsed error message" }),
          status: 400,
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.message).toBe("Parsed error message");
    });

    it("should handle error with json format", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: false, error: "Not found", status: 404 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "nope", format: "json" });

      const jsonBlock = result.content.find((c: any) => c.mimeType === "application/json");
      expect(jsonBlock).toBeDefined();
    });

    it("should handle error with both format", async () => {
      const callApi = createRoutedCallApi({
        "/skills/": { ok: false, error: "Error", status: 500 },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("get_skill");

      const result = await handler({ slug: "nope", format: "both" });

      const mdBlocks = result.content.filter((c: any) => c.mimeType === "text/markdown");
      const jsonBlocks = result.content.filter((c: any) => c.mimeType === "application/json");
      expect(mdBlocks.length).toBeGreaterThan(0);
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    it("should include API host in error details when available", async () => {
      const callApi = createRoutedCallApi({
        "/list-rules": {
          ok: false,
          error: "Server error",
          status: 500,
          details: { apiHost: "localhost:3000", hasApiKey: true },
        },
      });
      const capture = registerAndCapture(callApi);
      const handler = capture.get("list_analysis_rules");

      const result = await handler({});

      const sc = result.structuredContent as any;
      expect(sc.details.apiHost).toBe("localhost:3000");
      expect(sc.details.hasApiKey).toBe(true);
    });
  });
});
