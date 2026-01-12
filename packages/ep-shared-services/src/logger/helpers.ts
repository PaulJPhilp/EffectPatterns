/**
 * Logger service helpers
 */

import { Console, Effect } from "effect";
import type { LogLevel, LoggerConfig } from "./types.js";

/**
 * ANSI color codes
 */
export const ANSI_COLORS = {
	RESET: "\x1b[0m",
	BRIGHT: "\x1b[1m",
	DIM: "\x1b[2m",
	RED: "\x1b[31m",
	GREEN: "\x1b[32m",
	YELLOW: "\x1b[33m",
	BLUE: "\x1b[34m",
	MAGENTA: "\x1b[35m",
	CYAN: "\x1b[36m",
	WHITE: "\x1b[37m",
	GRAY: "\x1b[90m",
} as const;

/**
 * Colors for different log levels
 */
export const LOG_LEVEL_COLORS = {
	debug: ANSI_COLORS.GRAY,
	info: ANSI_COLORS.BLUE,
	warn: ANSI_COLORS.YELLOW,
	error: ANSI_COLORS.RED,
	success: ANSI_COLORS.GREEN,
	silent: "",
} as const;

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
