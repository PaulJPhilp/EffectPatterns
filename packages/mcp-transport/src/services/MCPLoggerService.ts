/**
 * MCP Logger Service - Effect-based stderr logging
 *
 * Wraps the existing log() pattern as an Effect.Service.
 * Outputs to stderr only (stdout reserved for MCP protocol).
 */

import { Effect } from "effect";

export class MCPLoggerService extends Effect.Service<MCPLoggerService>()(
  "MCPLoggerService",
  {
    effect: Effect.sync(() => {
      const debug = process.env.MCP_DEBUG === "true";

      return {
        log(message: string, data?: unknown): void {
          if (debug) {
            console.error(
              `[MCP] ${message}`,
              data ? JSON.stringify(data, null, 2) : ""
            );
          }
        },

        isDebug(): boolean {
          return debug;
        },
      };
    }),
  }
) {}
