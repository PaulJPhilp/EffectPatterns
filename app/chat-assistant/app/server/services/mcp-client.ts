import { Context, Effect, Layer, Data } from "effect";

/**
 * Code Review result from MCP Server
 */
export interface CodeReview {
  analysis: string;
  suggestion: string;
  diff: string; // Unified diff format
}

/**
 * MCP Error - tagged error for MCP server communication failures
 */
export class McpError extends Data.TaggedError("McpError")<{
  message: string;
  cause?: unknown;
}> {}

/**
 * McpClient Service Interface
 */
export class McpClient extends Context.Tag("McpClient")<
  McpClient,
  {
    readonly reviewCode: (code: string) => Effect.Effect<CodeReview, McpError>;
  }
>() {}

/**
 * Live implementation of McpClient
 * Communicates with the MCP server via HTTP
 */
export const McpClientLive = Layer.succeed(
  McpClient,
  McpClient.of({
    reviewCode: (code: string) =>
      Effect.gen(function* () {
        const mcpServerUrl = process.env.MCP_SERVER_URL || "http://localhost:3000";

        // Make HTTP request to MCP server
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(`${mcpServerUrl}/api/patterns/explain`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code,
                context: "Review this Effect-TS code and suggest improvements",
              }),
            }),
          catch: (error) =>
            new McpError({
              message: "Failed to connect to MCP server",
              cause: error,
            }),
        });

        // Check if response is ok
        if (!response.ok) {
          return yield* Effect.fail(
            new McpError({
              message: `MCP server returned ${response.status}: ${response.statusText}`,
            })
          );
        }

        // Parse response
        const data = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new McpError({
              message: "Failed to parse MCP server response",
              cause: error,
            }),
        });

        // Extract code review information
        const codeReview: CodeReview = {
          analysis: data.explanation || data.analysis || "No analysis provided",
          suggestion: data.suggestion || "Consider reviewing Effect best practices",
          diff: data.diff || "",
        };

        return codeReview;
      }),
  })
);
