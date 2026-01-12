/**
 * Logger service implementation
 */

import { Effect, Layer, Ref } from "effect";
import type { LoggerService } from "./api.js";
import { formatMessage, writeOutput } from "./helpers.js";
import type { LogLevel, LoggerConfig } from "./types.js";
import { LogLevelPriority, defaultLoggerConfig } from "./types.js";

/**
 * Logger service using Effect.Service pattern
 */
export class Logger extends Effect.Service<Logger>()("Logger", {
	effect: Effect.gen(function* () {
		const configRef = yield* Ref.make(defaultLoggerConfig);

		const shouldLogCheck = (level: LogLevel): Effect.Effect<boolean> =>
			Effect.gen(function* () {
				const currentConfig = yield* Ref.get(configRef);
				return LogLevelPriority[level] >= LogLevelPriority[currentConfig.logLevel];
			});

		const log = (
			level: LogLevel | "success",
			message: string,
			data?: unknown
		): Effect.Effect<void> =>
			Effect.gen(function* () {
				const config = yield* Ref.get(configRef);
				const effectiveLevel = level === "success" ? "info" : level;

				if (
					LogLevelPriority[effectiveLevel] < LogLevelPriority[config.logLevel]
				) {
					return;
				}

				const formatted = formatMessage(level, message, data, config);
				yield* writeOutput(level, formatted);
			});

		return {
			config: defaultLoggerConfig,

			debug: (message: string, data?: unknown) =>
				log("debug", message, data),
			info: (message: string, data?: unknown) =>
				log("info", message, data),
			warn: (message: string, data?: unknown) =>
				log("warn", message, data),
			error: (message: string, data?: unknown) =>
				log("error", message, data),
			success: (message: string, data?: unknown) =>
				log("success", message, data),

			shouldLog: (level: LogLevel) =>
				Effect.runSync(shouldLogCheck(level)),

			updateConfig: (update: Partial<LoggerConfig>) =>
				Ref.update(configRef, (current) => ({ ...current, ...update })),

			getConfig: () => Ref.get(configRef),
		};
	}),
}) { }

/**
 * Default logger layer
 */
export const LoggerDefault = Logger.Default;

/**
 * Factory function for creating logger with custom config
 */
export const makeLogger = (
	initialConfig: LoggerConfig = defaultLoggerConfig
): Effect.Effect<LoggerService> =>
	Effect.gen(function* () {
		const configRef = yield* Ref.make(initialConfig);

		const shouldLogCheck = (level: LogLevel): Effect.Effect<boolean> =>
			Effect.gen(function* () {
				const currentConfig = yield* Ref.get(configRef);
				return LogLevelPriority[level] >= LogLevelPriority[currentConfig.logLevel];
			});

		const log = (
			level: LogLevel | "success",
			message: string,
			data?: unknown
		): Effect.Effect<void> =>
			Effect.gen(function* () {
				const config = yield* Ref.get(configRef);
				const effectiveLevel = level === "success" ? "info" : level;

				if (
					LogLevelPriority[effectiveLevel] < LogLevelPriority[config.logLevel]
				) {
					return;
				}

				const formatted = formatMessage(level, message, data, config);
				yield* writeOutput(level, formatted);
			});

		return {
			config: initialConfig,

			debug: (message: string, data?: unknown) =>
				log("debug", message, data),
			info: (message: string, data?: unknown) =>
				log("info", message, data),
			warn: (message: string, data?: unknown) =>
				log("warn", message, data),
			error: (message: string, data?: unknown) =>
				log("error", message, data),
			success: (message: string, data?: unknown) =>
				log("success", message, data),

			shouldLog: (level: LogLevel) =>
				Effect.runSync(shouldLogCheck(level)),

			updateConfig: (update: Partial<LoggerConfig>) =>
				Ref.update(configRef, (current) => ({ ...current, ...update })),

			getConfig: () => Ref.get(configRef),
		};
	});

/**
 * Logger layer with custom configuration
 */
export const LoggerLive = (config?: Partial<LoggerConfig>): Layer.Layer<Logger> =>
	Layer.effect(
		Logger,
		Effect.gen(function* () {
			const mergedConfig = { ...defaultLoggerConfig, ...config };
			const configRef = yield* Ref.make(mergedConfig);

			const shouldLogCheck = (level: LogLevel): Effect.Effect<boolean> =>
				Effect.gen(function* () {
					const currentConfig = yield* Ref.get(configRef);
					return LogLevelPriority[level] >= LogLevelPriority[currentConfig.logLevel];
				});

			const log = (
				level: LogLevel | "success",
				message: string,
				data?: unknown
			): Effect.Effect<void> =>
				Effect.gen(function* () {
					const cfg = yield* Ref.get(configRef);
					const effectiveLevel = level === "success" ? "info" : level;

					if (
						LogLevelPriority[effectiveLevel] < LogLevelPriority[cfg.logLevel]
					) {
						return;
					}

					const formatted = formatMessage(level, message, data, cfg);
					yield* writeOutput(level, formatted);
				});

			return {
				config: mergedConfig,

				debug: (message: string, data?: unknown) =>
					log("debug", message, data),
				info: (message: string, data?: unknown) =>
					log("info", message, data),
				warn: (message: string, data?: unknown) =>
					log("warn", message, data),
				error: (message: string, data?: unknown) =>
					log("error", message, data),
				success: (message: string, data?: unknown) =>
					log("success", message, data),

				shouldLog: (level: LogLevel) =>
					Effect.runSync(shouldLogCheck(level)),

				updateConfig: (update: Partial<LoggerConfig>) =>
					Ref.update(configRef, (cur) => ({ ...cur, ...update })),

				getConfig: () => Ref.get(configRef),
			} as Logger;
		})
	);

// =============================================================================
// Convenience logging functions (for backward compatibility)
// =============================================================================

/**
 * Log a debug message
 */
export const logDebug = (message: string, data?: unknown) =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		yield* logger.debug(message, data);
	});

/**
 * Log an info message
 */
export const logInfo = (message: string, data?: unknown) =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		yield* logger.info(message, data);
	});

/**
 * Log a warning message
 */
export const logWarn = (message: string, data?: unknown) =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		yield* logger.warn(message, data);
	});

/**
 * Log an error message
 */
export const logError = (message: string, data?: unknown) =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		yield* logger.error(message, data);
	});

/**
 * Log a success message
 */
export const logSuccess = (message: string, data?: unknown) =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		yield* logger.success(message, data);
	});
