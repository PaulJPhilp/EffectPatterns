/**
 * Shared types for MCP tool handlers.
 *
 * Extracted from tool-implementations.ts so handlers can be tested
 * independently of McpServer registration.
 */

import type {
  Elicitation,
  PatternDetailsOutput,
  SearchResultsOutput,
  ToolError,
} from "@/schemas/output-schemas.js";
import type { TextContent } from "@/schemas/structured-output.js";

/**
 * Result of a tool execution - supports MCP 2.0 rich content arrays
 * with structured outputs and MIME-typed content blocks.
 *
 * Note: `isError` is a best-effort metadata field (not officially part of MCP SDK).
 * Clients should rely on `structuredContent.kind === "toolError:v1"` as the canonical
 * error signal. The `isError` flag is included for convenience but may not be
 * preserved by all MCP clients.
 */
export type CallToolResult = {
  content: (TextContent | { type: "text"; text: string; mimeType?: string })[];
  structuredContent?:
    | SearchResultsOutput
    | PatternDetailsOutput
    | Elicitation
    | ToolError
    | Record<string, unknown>;
  isError?: boolean; // Best-effort metadata - prefer structuredContent.kind for error detection
};

/**
 * API call result - errors as values, not exceptions.
 * Includes optional details for network error diagnostics.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      status?: number;
      details?: {
        errorName?: string;
        errorType?: string;
        errorMessage?: string;
        cause?: string;
        retryable?: boolean;
        apiHost?: string;
        hasApiKey?: boolean;
      };
    };

/**
 * Function type for calling the internal API.
 * Returns Result type - no exceptions thrown.
 */
export type CallApiFn = (
  endpoint: string,
  method?: "GET" | "POST",
  data?: unknown,
) => Promise<ApiResult<unknown>>;

/**
 * Function type for logging.
 */
export type LogFn = (message: string, data?: unknown) => void;

export interface SearchPatternSummary {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly difficulty: string;
  readonly description: string;
  readonly examples?: Array<{
    readonly code: string;
    readonly language?: string;
    readonly description?: string;
  }>;
  readonly useCases?: string[];
  readonly tags?: string[];
  readonly relatedPatterns?: string[];
}

export interface SearchResultsPayload {
  readonly count: number;
  readonly patterns: readonly SearchPatternSummary[];
}

/**
 * Dependencies injected into each tool handler.
 * Keeps handlers as pure functions testable without McpServer.
 */
export interface ToolContext {
  readonly callApi: CallApiFn;
  readonly log: LogFn;
  readonly cache?: {
    get: (key: string) => any;
    set: (key: string, value: any, ttl: number) => void;
  };
}
