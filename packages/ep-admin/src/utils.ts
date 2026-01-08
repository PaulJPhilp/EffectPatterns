/**
 * Utility functions shared across commands
 */

import * as path from "node:path";

/**
 * Get project root by looking for package.json with "effect-patterns-hub"
 */
export const getProjectRoot = (): string => {
	let current = process.cwd();
	while (current !== "/") {
		try {
			const pkgPath = path.join(current, "package.json");
			const content = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
			if (content.name === "effect-patterns-hub") {
				return current;
			}
		} catch {
			// Continue searching up
		}
		current = path.dirname(current);
	}
	return process.cwd();
};

/**
 * ANSI color codes
 */
export const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",
} as const;

/**
 * Colors for different log levels
 */
export const levelColors = {
	debug: colors.gray,
	info: colors.blue,
	warn: colors.yellow,
	error: colors.red,
	success: colors.green,
	silent: "",
} as const;

/**
 * Colorize text with ANSI codes
 */
export function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}
