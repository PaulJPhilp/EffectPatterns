/**
 * Helper to extract structured content from MCP tool results.
 * 
 * CANONICAL: Parses from JSON content block (MCP-supported surface).
 * Falls back to structuredContent field if present (best-effort/internal-only).
 */

import type { ToolResult } from "./mcp-test-client.js";
import { ToolStructuredContentSchema } from "../../../src/schemas/output-schemas.js";

/**
 * Extract and validate structured content from tool result.
 * 
 * CANONICAL: Structured content is delivered as the LAST content block that:
 * 1. Contains valid JSON
 * 2. Validates against ToolStructuredContentSchema (has a `kind` discriminator)
 * 
 * Note: MCP SDK may strip `mimeType` field, so we identify JSON blocks by content pattern.
 * 
 * Fallback: `structuredContent` field if present (best-effort/internal-only).
 * 
 * @returns Parsed structured content, or error if not found/invalid
 */
export function parseStructuredContent(result: ToolResult): {
  success: true;
  data: unknown;
} | {
  success: false;
  error: string;
} {
  // First, try structuredContent field (most reliable - direct from tool implementation)
  if (result.structuredContent) {
    const validation = ToolStructuredContentSchema.safeParse(result.structuredContent);
    if (validation.success) {
      return { success: true, data: validation.data };
    }
    // If structuredContent exists but doesn't validate, log for debugging but continue to content blocks
    if (process.env.DEBUG_TESTS === "true") {
      console.error("structuredContent validation failed:", validation.error.message);
    }
  }
  
  // Try to find JSON content block by parsing content blocks in reverse order
  // (structured content is typically the last block)
  if (result.content && result.content.length > 0) {
    // Try each content block (starting from the end) to find valid structured content
    for (let i = result.content.length - 1; i >= 0; i--) {
      const block = result.content[i];
      if (block.type === "text" && block.text) {
        try {
          const parsed = JSON.parse(block.text);
          // Check if it matches our structured content schema (has `kind` discriminator)
          const validation = ToolStructuredContentSchema.safeParse(parsed);
          if (validation.success) {
            return { success: true, data: validation.data };
          }
          // If it's valid JSON but doesn't match schema, continue searching
          // (might be a different JSON structure)
          if (process.env.DEBUG_TESTS === "true") {
            console.error(`Block ${i} is JSON but doesn't match schema:`, validation.error.message);
          }
        } catch {
          // Not valid JSON, continue searching
        }
      }
    }
    
    // Debug: If we get here, log what we found
    if (process.env.DEBUG_TESTS === "true") {
      console.error("No valid structured content found. Content blocks:", 
        result.content.map((b, i) => ({ 
          index: i, 
          type: b.type, 
          mimeType: (b as any).mimeType,
          textPreview: b.text?.substring(0, 200),
          isJSON: (() => {
            try { JSON.parse(b.text || ""); return true; } catch { return false; }
          })(),
          hasKind: (() => {
            try {
              const parsed = JSON.parse(b.text || "");
              return typeof parsed === "object" && parsed !== null && "kind" in parsed;
            } catch {
              return false;
            }
          })()
        }))
      );
    }
  }
  
  return {
    success: false,
    error: "No structured content found (no valid JSON block with kind discriminator or structuredContent field)",
  };
}

/**
 * Get the kind discriminator from structured content.
 * Returns null if content is not found or invalid.
 */
export function getStructuredContentKind(result: ToolResult): string | null {
  const parsed = parseStructuredContent(result);
  if (parsed.success && typeof parsed.data === "object" && parsed.data !== null) {
    const data = parsed.data as Record<string, unknown>;
    return typeof data.kind === "string" ? data.kind : null;
  }
  return null;
}
