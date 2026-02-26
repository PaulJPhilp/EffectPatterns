/**
 * Config file path resolution and writing utilities.
 */

import { Effect } from "effect";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Resolve the path to the ep-cli config file.
 *
 * Priority:
 * 1. EP_CONFIG_FILE environment variable
 * 2. $XDG_CONFIG_HOME/ep-cli/config.json
 * 3. ~/.config/ep-cli/config.json
 */
export const resolveConfigPath = (): string => {
  const explicit = process.env.EP_CONFIG_FILE;
  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
  return path.join(configHome, "ep-cli", "config.json");
};

/**
 * Write credentials to the ep-cli config file.
 *
 * Creates the parent directory if it doesn't exist and sets
 * file permissions to 0o600 (owner read/write only).
 */
export const writeConfig = (data: {
  readonly apiKey: string;
  readonly email: string;
}): Effect.Effect<string, Error> =>
  Effect.try({
    try: () => {
      const configPath = resolveConfigPath();
      const dir = path.dirname(configPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify(
        {
          apiKey: data.apiKey,
          email: data.email,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      );

      writeFileSync(configPath, content, { mode: 0o600 });
      return configPath;
    },
    catch: (error) =>
      error instanceof Error
        ? error
        : new Error(`Failed to write config: ${String(error)}`),
  });
