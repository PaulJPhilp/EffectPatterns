import { Effect } from "effect";
import * as fs from "fs";
import type { SupermemoryConfig } from "../../types.js";
import type { ConfigServiceAPI } from "./api.js";
import {
  ConfigLoadError,
  ConfigParseError,
  ConfigSaveError,
} from "./errors.js";
import {
  getApiKeyFromEnv,
  getConfigFilePath,
  loadEnvLocal,
} from "./helpers.js";

/**
 * ConfigService Implementation
 * Manages .supermemoryrc configuration file operations
 */

const makeConfigService = (): Effect.Effect<ConfigServiceAPI> =>
  loadEnvLocal().pipe(
    Effect.andThen(() => {
      const getConfigPath = (): Effect.Effect<string> =>
        Effect.sync(() => getConfigFilePath());

      const load = (): Effect.Effect<
        SupermemoryConfig,
        ConfigLoadError | ConfigParseError
      > => {
        const configPath = getConfigFilePath();
        const apiKey = getApiKeyFromEnv();

        if (!fs.existsSync(configPath)) {
          return Effect.succeed({
            activeProject: "",
            apiKey,
            supermemoryUrl: "https://api.supermemory.ai",
            uploadedPatterns: [],
          } as SupermemoryConfig);
        }

        return Effect.tryPromise({
          try: () => fs.promises.readFile(configPath, "utf-8"),
          catch: (error) =>
            new ConfigLoadError({
              path: configPath,
              cause: error,
            }),
        }).pipe(
          Effect.flatMap((content) => {
            try {
              const config = JSON.parse(content) as SupermemoryConfig;
              if (!config.apiKey && apiKey) {
                config.apiKey = apiKey;
              }
              return Effect.succeed(config);
            } catch (error) {
              return Effect.fail(
                new ConfigParseError({
                  message: `Failed to parse config file at ${configPath}`,
                  cause: error,
                })
              );
            }
          })
        );
      };

      const save = (
        config: SupermemoryConfig
      ): Effect.Effect<void, ConfigSaveError> =>
        Effect.tryPromise({
          try: () => {
            const configPath = getConfigFilePath();
            const content = JSON.stringify(config, null, 2);
            return fs.promises.writeFile(configPath, content, "utf-8");
          },
          catch: (error) =>
            new ConfigSaveError({
              path: getConfigFilePath(),
              cause: error,
            }),
        });

      return Effect.succeed({
        load,
        save,
        getConfigPath,
      } satisfies ConfigServiceAPI);
    })
  );

/**
 * ConfigService Effect.Service implementation
 */
export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    scoped: makeConfigService,
  }
) {}
