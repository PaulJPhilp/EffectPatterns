/**
 * Logger service API
 */

import { Effect } from "effect";
import type { LogLevel, LoggerConfig } from "./types.js";

/**
 * Logger service interface
 */
export interface LoggerService {
	readonly config: LoggerConfig;

	// Log methods
	readonly debug: (message: string, data?: unknown) => Effect.Effect<void>;
	readonly info: (message: string, data?: unknown) => Effect.Effect<void>;
	readonly warn: (message: string, data?: unknown) => Effect.Effect<void>;
	readonly error: (message: string, data?: unknown) => Effect.Effect<void>;
	readonly success: (message: string, data?: unknown) => Effect.Effect<void>;

	// Configuration methods
	readonly shouldLog: (level: LogLevel) => boolean;
	readonly updateConfig: (update: Partial<LoggerConfig>) => Effect.Effect<void>;
	readonly getConfig: () => Effect.Effect<LoggerConfig>;
}
