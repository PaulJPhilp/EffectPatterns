/**
 * Integration tests for structured outputs, MIME types, and elicitation
 *
 * Verifies that tools return:
 * 1. Structured content matching outputSchema
 * 2. MIME-typed content blocks
 * 3. Elicitation responses for missing/ambiguous input
 */

import { beforeAll, describe, expect, it } from "vitest";
import { getMCPEnvironmentConfig } from "../../src/config/mcp-environments.js";
import {
    ElicitationSchema,
    PatternDetailsOutputSchema,
    SearchResultsOutputSchema
} from "../../src/schemas/output-schemas.js";
import { MCPTestClient, createMCPTestClient } from "./helpers/mcp-test-client.js";
import { getStructuredContentKind, parseStructuredContent } from "./helpers/parse-structured-content.js";

describe("Structured Outputs and MIME Types", () => {
  let client: MCPTestClient;
  const config = getMCPEnvironmentConfig("local");
  let isLocalAvailable = false;

  beforeAll(async () => {
    if (process.env.CI === "true" && !config.apiKey) {
      throw new Error(
        "FATAL: PATTERN_API_KEY is missing in CI environment."
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
      // Skip tests if server isn't running
      isLocalAvailable = false;
      return;
    }

    client = await createMCPTestClient({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
    });
  });

  describe("search_patterns - Structured Output", () => {
    it("should return markdown-only content by default (no JSON block)", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        q: "error",
        limit: 5,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      // Default format="markdown" should NOT include JSON blocks
      const jsonBlocks = result.content.filter((block: any) => {
        if (block.mimeType === "application/json") return true;
        // Also check by content pattern (MCP SDK may strip mimeType)
        try {
          JSON.parse(block.text || "");
          // Check if it's structured content (has kind discriminator)
          const parsed = JSON.parse(block.text);
          return parsed && typeof parsed === "object" && "kind" in parsed;
        } catch {
          return false;
        }
      });
      
      expect(jsonBlocks.length).toBe(0); // No JSON blocks in markdown-only mode
      
      // Should have markdown content
      const markdownBlocks = result.content.filter((block: any) => 
        block.mimeType === "text/markdown" || !block.mimeType
      );
      expect(markdownBlocks.length).toBeGreaterThan(0);
    });

    it("should return structured content with search results (format='json')", async () => {
      if (!isLocalAvailable) return;
      // Skip if no API key (test requires API access)
      if (!config.apiKey) {
        console.log("Skipping test due to missing API key");
        return;
      }

      const result = await client.callTool("search_patterns", {
        q: "error",
        limit: 5,
        format: "json",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      // CANONICAL: Parse structured content from JSON content block (MCP-supported surface)
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      expect(parsed.success ? parsed.data : null).toBeDefined();
      
      if (parsed.success) {
         // Validate against schema
         const validation = SearchResultsOutputSchema.safeParse(parsed.data);
         if (!validation.success) {
           console.log("Validation error details:", JSON.stringify(validation.error.format(), null, 2));
           console.log("Data that failed validation:", JSON.stringify(parsed.data, null, 2));
         }
         expect(validation.success).toBe(true);
        
        if (validation.success) {
          const structured = validation.data;
          expect(structured.kind).toBe("patternSearchResults:v1");
          expect(structured.query).toBeDefined();
          expect(structured.metadata).toBeDefined();
          expect(structured.metadata.totalCount).toBeGreaterThanOrEqual(0);
          expect(structured.metadata.contractMarkers).toBeDefined();
          expect(structured.patterns).toBeInstanceOf(Array);
          
          // Contract validation: renderedCardIds must match renderedCards count
          expect(structured.metadata.renderedCardIds.length).toBe(structured.metadata.renderedCards);
          // Contract validation: contractMarkers.cards must match renderedCards
          expect(structured.metadata.contractMarkers.cards).toBe(structured.metadata.renderedCards);
        }
      }
    });

    it("should include MIME types in content blocks", async () => {
      if (!isLocalAvailable) return;
      // Skip if no API key (test requires API access)
      if (!config.apiKey) {
        console.log("Skipping test due to missing API key");
        return;
      }

      const result = await client.callTool("search_patterns", {
        q: "service",
        format: "both",
      });

      expect(result.content.length).toBeGreaterThan(0);
      
      // CANONICAL: Parse structured content from JSON content block
      // Note: MCP SDK may strip mimeType, so we identify JSON blocks by content pattern
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      // Verify we can find JSON content (even if mimeType is stripped)
      // The parser finds it by content pattern, not mimeType
      if (parsed.success) {
        expect(parsed.data).toBeDefined();
        const data = parsed.data as Record<string, unknown>;
        expect(data.kind).toBeDefined();
      }
    });

    it("should return elicitation for empty query (format='both' for structured validation)", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        q: "",
        format: "both", // Use "both" to get JSON block for validation
      });

      // CANONICAL: Parse structured content from JSON content block
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success) {
        const validation = ElicitationSchema.safeParse(parsed.data);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          const elicitation = validation.data;
          expect(elicitation.kind).toBe("needsInput:v1");
          expect(elicitation.type).toBe("elicitation");
          expect(elicitation.needsInput?.fields).toContain("q");
        }
      }
    });
    
    it("should return elicitation without JSON block in markdown mode", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("search_patterns", {
        q: "",
        format: "markdown",
      });

      // In markdown mode, elicitation should NOT include JSON block
      const jsonBlocks = result.content.filter((block: any) => {
        if (block.mimeType === "application/json") return true;
        try {
          const parsed = JSON.parse(block.text || "");
          return parsed && typeof parsed === "object" && "kind" in parsed;
        } catch {
          return false;
        }
      });
      
      expect(jsonBlocks.length).toBe(0); // No JSON blocks in markdown mode
      
      // Should have markdown content with elicitation message
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should return elicitation for too-broad results", async () => {
      if (!isLocalAvailable) return;
      // Search without filters that returns many results
      const result = await client.callTool("search_patterns", {
        q: "effect",
        limit: 100,
      });

      // If results are too broad, should get elicitation
      // Otherwise, should get structured results
      if (result.structuredContent && typeof result.structuredContent === "object" && "type" in result.structuredContent) {
        const elicitation = result.structuredContent as any;
        if (elicitation.type === "elicitation") {
          const validation = ElicitationSchema.safeParse(elicitation);
          expect(validation.success).toBe(true);
        }
      }
    });
  });

  describe("get_pattern - Structured Output", () => {
    it("should return structured content for valid pattern", async () => {
      if (!isLocalAvailable) return;
      // Use a known pattern ID (adjust based on your data)
      const result = await client.callTool("get_pattern", {
        id: "transform-effect-values",
      });

      // May return error if pattern doesn't exist, or structured content if it does
      if (result.isError) {
        // If error, check if it's an elicitation
        if (result.structuredContent && typeof result.structuredContent === "object" && "type" in result.structuredContent) {
          const elicitation = result.structuredContent as any;
          if (elicitation.type === "elicitation") {
            expect(elicitation.needsInput?.field).toBe("id");
          }
        }
      } else {
        expect(result.structuredContent).toBeDefined();
        
        const validation = PatternDetailsOutputSchema.safeParse(result.structuredContent);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          const structured = validation.data;
          expect(structured.id).toBeDefined();
          expect(structured.title).toBeDefined();
          expect(structured.category).toBeDefined();
          expect(structured.difficulty).toBeDefined();
        }
      }
    });

    it("should include MIME types in content blocks", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("get_pattern", {
        id: "transform-effect-values",
      });

      if (!result.isError && result.content.length > 0) {
        const markdownBlocks = result.content.filter(
          (block: any) => block.mimeType === "text/markdown"
        );
        expect(markdownBlocks.length).toBeGreaterThan(0);
      }
    });

    it("should return elicitation for invalid pattern ID (404)", async () => {
      if (!isLocalAvailable) return;
      // Skip if no API key (test requires API access to get 404)
      if (!config.apiKey) {
        console.log("Skipping test due to missing API key");
        return;
      }

      const result = await client.callTool("get_pattern", {
        id: "definitely-does-not-exist-12345",
      });

      // CANONICAL: Parse structured content from JSON content block
      // get_pattern 404 should return elicitation, not toolError
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success) {
        // Verify it's elicitation, not toolError
        const kind = getStructuredContentKind(result);
        expect(kind).toBe("needsInput:v1");
        expect(kind).not.toBe("toolError:v1");
        
        const validation = ElicitationSchema.safeParse(parsed.data);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          const elicitation = validation.data;
          expect(elicitation.kind).toBe("needsInput:v1");
          expect(elicitation.type).toBe("elicitation");
          expect(elicitation.needsInput?.fields).toContain("id");
        }
      }
    });

    it("should return elicitation for empty pattern ID", async () => {
      if (!isLocalAvailable) return;
      const result = await client.callTool("get_pattern", {
        id: "",
      });

      // CANONICAL: Parse structured content from JSON content block
      // Empty ID should return elicitation, not toolError
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success) {
        const validation = ElicitationSchema.safeParse(parsed.data);
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          const elicitation = validation.data;
          expect(elicitation.kind).toBe("needsInput:v1");
          expect(elicitation.type).toBe("elicitation");
          expect(elicitation.needsInput?.fields).toContain("id");
        }
      }
    });
  });

  describe("Contract Markers", () => {
    it("should include contract markers in structured output (format='both')", async () => {
      if (!isLocalAvailable) return;
      // Skip if no API key (test requires API access)
      if (!config.apiKey) {
        console.log("Skipping test due to missing API key");
        return;
      }

      const result = await client.callTool("search_patterns", {
        q: "error",
        limitCards: 3,
        format: "both", // Use "both" to get JSON block for validation
      });

      // CANONICAL: Parse structured content from JSON content block
      const parsed = parseStructuredContent(result);
      expect(parsed.success).toBe(true);
      
      if (parsed.success) {
        const validation = SearchResultsOutputSchema.safeParse(parsed.data);
        if (!validation.success) {
          console.log("Contract Markers validation error:", JSON.stringify(validation.error.format(), null, 2));
          console.log("Contract Markers data:", JSON.stringify(parsed.data, null, 2));
        }
        expect(validation.success).toBe(true);
        
        if (validation.success) {
          const structured = validation.data;
          expect(structured.metadata.contractMarkers).toBeDefined();
          expect(structured.metadata.contractMarkers.version).toBe("v1");
          expect(typeof structured.metadata.contractMarkers.index).toBe("number");
          expect(typeof structured.metadata.contractMarkers.cards).toBe("number");
          
          // Contract validation: renderedCardIds must match renderedCards count
          expect(structured.metadata.renderedCardIds.length).toBe(structured.metadata.renderedCards);
          // Contract validation: contractMarkers.cards must match renderedCards
          expect(structured.metadata.contractMarkers.cards).toBe(structured.metadata.renderedCards);
        }
      }
    });
  });
});
