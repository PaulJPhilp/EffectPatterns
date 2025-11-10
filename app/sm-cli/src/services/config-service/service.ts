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

const makeConfigService = (): Effect.Effect<ConfigServiceAPI, never> =>
  Effect.gen(function* () {
    yield* loadEnvLocal();

    const getConfigPath = (): Effect.Effect<string> =>
      Effect.sync(() => getConfigFilePath());

    const load = (): Effect.Effect<
      SupermemoryConfig,
      ConfigLoadError | ConfigParseError
    > =>
      Effect.sync(() => {
        const configPath = getConfigFilePath();
        const apiKey = getApiKeyFromEnv();

        if (!fs.existsSync(configPath)) {
          return {
            activeProject: "",
            apiKey,
            supermemoryUrl: "https://api.supermemory.ai",
            uploadedPatterns: [],
          } as SupermemoryConfig;
        }

        const content = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(content) as SupermemoryConfig;

        if (!config.apiKey && apiKey) {
          config.apiKey = apiKey;
        }

        return config;
      }).pipe(
        Effect.catchAll((error) => {
          if (error instanceof SyntaxError) {
            return Effect.fail(
              new ConfigParseError({
                message: `Failed to parse config file at ${getConfigFilePath()}`,
                cause: error,
              })
            );
          }
          return Effect.fail(
            new ConfigLoadError({
              path: getConfigFilePath(),
              cause: error,
            })
          );
        })
      );

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

    return {
      load,
      save,
      getConfigPath,
    } satisfies ConfigServiceAPI;
  });

/**
 * ConfigService Effect.Service implementation
 */
export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    scoped: makeConfigService,
  }
) {}
