/**
 * Configuration Service for .supermemoryrc
 */

import { Effect, Context, Data, Layer } from 'effect';
import * as fs from 'fs';
import * as path from 'path';
import type { SupermemoryConfig } from '../types.js';

export class ConfigError extends Data.TaggedError('ConfigError')<{
  message: string;
}> {}

export interface ConfigService {
  readonly load: Effect.Effect<SupermemoryConfig, ConfigError>;
  readonly save: (config: SupermemoryConfig) => Effect.Effect<void, ConfigError>;
  readonly getConfigPath: Effect.Effect<string, ConfigError>;
}

export const ConfigService = Context.GenericTag<ConfigService>('ConfigService');

export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    // Load environment variables (including from .env.local if available)
    yield* Effect.sync(() => {
      // Try to load .env.local if it exists
      const cwdEnvPath = path.join(process.cwd(), '.env.local');

      if (fs.existsSync(cwdEnvPath)) {
        try {
          const content = fs.readFileSync(cwdEnvPath, 'utf-8');
          content.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const [key, ...valueParts] = trimmed.split('=');
              if (key) {
                process.env[key.trim()] = valueParts.join('=').trim();
              }
            }
          });
        } catch (error) {
          // Silently ignore if .env.local can't be read
        }
      }
    });

    // Get SUPERMEMORY_API_KEY from environment
    const apiKey = process.env.SUPERMEMORY_API_KEY || '';

    const getConfigPath = Effect.sync(() => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      return path.join(homeDir, '.supermemoryrc');
    });

    const load = Effect.gen(function* () {
      const configPath = yield* getConfigPath;

      const exists = yield* Effect.sync(() => fs.existsSync(configPath));

      if (!exists) {
        // Return default config with API key from effect-env
        return {
          activeProject: '',
          apiKey,
          supermemoryUrl: 'https://api.supermemory.ai',
          uploadedPatterns: [],
        } as SupermemoryConfig;
      }

      const content = yield* Effect.tryPromise({
        try: () => fs.promises.readFile(configPath, 'utf-8'),
        catch: (error) =>
          new ConfigError({
            message: `Failed to read config file: ${error}`,
          }),
      });

      const config = yield* Effect.try({
        try: () => JSON.parse(content) as SupermemoryConfig,
        catch: (error) =>
          new ConfigError({
            message: `Failed to parse config file: ${error}`,
          }),
      });

      // Merge with environment apiKey if the saved config's apiKey is empty
      if (!config.apiKey && apiKey) {
        config.apiKey = apiKey;
      }

      return config;
    });

    const save = (config: SupermemoryConfig) =>
      Effect.gen(function* () {
        const configPath = yield* getConfigPath;
        const content = JSON.stringify(config, null, 2);

        yield* Effect.tryPromise({
          try: () => fs.promises.writeFile(configPath, content, 'utf-8'),
          catch: (error) =>
            new ConfigError({
              message: `Failed to write config file: ${error}`,
            }),
        });
      });

    return {
      load,
      save,
      getConfigPath,
    } as ConfigService;
  }),
);

export const loadConfig = Effect.gen(function* () {
  const service = yield* ConfigService;
  return yield* service.load;
});

export const saveConfig = (config: SupermemoryConfig) =>
  Effect.gen(function* () {
    const service = yield* ConfigService;
    return yield* service.save(config);
  });
