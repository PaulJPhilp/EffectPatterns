/**
 * Centralized Service Exports
 * All services are exported from this single entry point
 */

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

// UIService (to be refactored)
export {
  displayError,
  displayJson,
  displayLines,
  displayOutput,
  displaySuccess,
} from "./ui.js";

// DialogService (to be refactored)
export {
  prompt,
  promptChoice,
  promptConfirm,
  promptMultiline,
} from "./dialog.js";

// TUIFormatterService (to be refactored)
export {
  createBadge,
  createError,
  createHeader,
  createInfo,
  createInfoCard,
  createMemoryTable,
  createStatPanel,
  createSuccess,
  wrapColumn,
} from "./tui-formatter.js";
