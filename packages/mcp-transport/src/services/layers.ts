/**
 * Layer Composition
 *
 * Composes all MCP services into a single application layer.
 */

import { Layer } from "effect";
import { MCPApiService, type MCPApiConfig, makeMCPApiLayer } from "./MCPApiService.js";
import { MCPCacheService } from "./MCPCacheService.js";
import { MCPLoggerService } from "./MCPLoggerService.js";
import { MCPTracingService, MCPTracingLayerLive } from "./MCPTracingService.js";

/**
 * The full application layer type.
 * Handlers that use Effect.fn can depend on this.
 */
export type MCPAppLayer =
  | MCPApiService
  | MCPCacheService
  | MCPLoggerService
  | MCPTracingService;

/**
 * Build the full application layer from API config.
 */
export function buildAppLayer(apiConfig: MCPApiConfig) {
  return Layer.mergeAll(
    makeMCPApiLayer(apiConfig),
    MCPCacheService.Default,
    MCPLoggerService.Default,
    MCPTracingLayerLive,
  );
}
