import { Effect } from "effect";
import * as fs from "fs";
import * as path from "path";

/**
 * ConfigService Helpers
 * Utility functions for configuration file operations
 */

/**
 * Get the home directory path
 */
export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

/**
 * Get the configuration file path
 */
export function getConfigFilePath(): string {
  const homeDir = getHomeDir();
  return path.join(homeDir, ".supermemoryrc");
}

/**
 * Check if config file exists
 */
export function configFileExists(): Effect.Effect<boolean> {
  return Effect.sync(() => fs.existsSync(getConfigFilePath()));
}

/**
 * Load environment variables from .env.local if available
 */
export function loadEnvLocal(): Effect.Effect<void> {
  return Effect.sync(() => {
    const cwdEnvPath = path.join(process.cwd(), ".env.local");

    if (fs.existsSync(cwdEnvPath)) {
      try {
        const content = fs.readFileSync(cwdEnvPath, "utf-8");
        content.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key) {
              process.env[key.trim()] = valueParts.join("=").trim();
            }
          }
        });
      } catch {
        // Silently ignore if .env.local can't be read
      }
    }
  });
}

/**
 * Get API key from environment
 */
export function getApiKeyFromEnv(): string {
  return process.env.SUPERMEMORY_API_KEY || "";
}
