/**
 * Centralized Service Exports
 * All Effect.Service implementations are exported from this single entry point
 */

import { Effect } from "effect";
import type { SupermemoryConfig } from "../types.js";
import { ConfigService } from "./config-service/service.js";

// ConfigService
export type { ConfigServiceAPI } from "./config-service/api.js";
export {
  ConfigError,
  ConfigLoadError,
  ConfigParseError,
  ConfigSaveError,
} from "./config-service/errors.js";
export { ConfigService } from "./config-service/service.js";
export type { SupermemoryConfig } from "./config-service/types.js";

/**
 * Helper: Load configuration
 */
export const loadConfig: Effect.Effect<SupermemoryConfig> = Effect.gen(
  function* () {
    const service = yield* ConfigService;
    return yield* service.load();
  }
) as any;

/**
 * Helper: Save configuration
 */
export const saveConfig = (config: SupermemoryConfig) =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    yield* service.save(config);
  }) as any;

// SupermemoryService
export type { SupermemoryServiceAPI } from "./supermemory-service/api.js";
export {
  ApiKeyError,
  DocumentError,
  MemoryError,
  ProfileError,
  SearchError,
  SupermemoryError,
  TimeoutError,
} from "./supermemory-service/errors.js";
export {
  SupermemoryService,
  makeSupermemoryService,
} from "./supermemory-service/service.js";
export type {
  DocumentSearchOptions,
  DocumentSearchResult,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySearchResult,
  ProcessingDocument,
  ProcessingQueue,
  ProfileComparison,
  ProfileStats,
  SupermemoryClientConfig,
  UserProfile,
  UserProfileWithSearch,
} from "./supermemory-service/types.js";
