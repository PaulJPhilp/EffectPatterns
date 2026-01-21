import { Effect } from "effect";
import { MCPConfigService } from "./api";
import { loadConfig } from "./helpers";
import { MCPConfig } from "./types";

export * from "./api";
export * from "./types";
export * from "./helpers";
export * from "./errors";

/**
 * Default MCP configuration service layer
 */
export const MCPConfigServiceLive = MCPConfigService.Default;

/**
 * Legacy configuration access (for backward compatibility)
 */
export function getConfig(): Promise<MCPConfig> {
  return Effect.runPromise(loadConfig());
}
