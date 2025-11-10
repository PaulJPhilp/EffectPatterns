import { Effect } from "effect";
import type { SupermemoryConfig } from "../../types.js";
import type {
  ConfigError,
  ConfigLoadError,
  ConfigSaveError,
} from "./errors.js";

/**
 * ConfigService API
 * Service interface for configuration management
 */

export interface ConfigServiceAPI {
  /**
   * Load configuration from file
   */
  load(): Effect.Effect<SupermemoryConfig, ConfigLoadError | ConfigError>;

  /**
   * Save configuration to file
   */
  save(
    config: SupermemoryConfig
  ): Effect.Effect<void, ConfigSaveError | ConfigError>;

  /**
   * Get configuration file path
   */
  getConfigPath(): Effect.Effect<string, ConfigError>;
}
