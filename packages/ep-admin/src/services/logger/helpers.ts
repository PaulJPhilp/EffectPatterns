/**
 * Logger service helpers
 */

import { Console, Effect } from "effect";
import { ANSI_COLORS, LOG_LEVEL_COLORS } from "../../constants.js";
import type { LogLevel, LoggerConfig } from "./types.js";

/**
 * Icons for different log levels
 */
export const ICONS: Record<string, string> = {
	debug: "🔍",
	info: "ℹ",
	warn: "⚠",
	error: "✖",
	success: "✓",
	silent: "",
};

/**
 * Format log message for text output
 */
export const formatMessage = (
	level: LogLevel | "success",
	message: string,
	data?: unknown,
	config?: LoggerConfig
): string => {
	if (!config) return message;

	// JSON format
	if (config.outputFormat === "json") {
		return JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			message,
			...(data !== undefined ? { data } : {}),
		});
	}

	// Text format
	const icon = ICONS[level] ?? "";
	const color = config.useColors ? (LOG_LEVEL_COLORS[level] ?? "") : "";
	const reset = config.useColors ? ANSI_COLORS.RESET : "";

	let output = `${color}${icon}${reset} ${message}`;

	if (data !== undefined && config.verbose) {
		const dataStr =
			typeof data === "string" ? data : JSON.stringify(data, null, 2);
		output += `\n${ANSI_COLORS.DIM}${dataStr}${reset}`;
	}

	return output;
};

/**
 * Write to appropriate output stream
 */
export const writeOutput = (
	level: LogLevel | "success",
	message: string
): Effect.Effect<void> => {
	if (level === "error") {
		return Console.error(message);
	} else if (level === "warn") {
		return Console.warn(message);
	} else {
		return Console.log(message);
	}
};

