import type { SupermemoryConfig } from '../../types.js';

/**
 * ConfigService Types
 * Core type definitions for configuration operations
 */

export type { SupermemoryConfig };

export interface ConfigServiceAPI {
  /**
   * Load configuration from file
   */
  readonly load: SupermemoryConfig;

  /**
   * Save configuration to file
   */
  readonly save: (config: SupermemoryConfig) => void;

  /**
   * Get configuration file path
   */
  readonly getConfigPath: () => string;
}

