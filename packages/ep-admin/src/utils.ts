/**
 * Utility functions shared across commands
 */

import * as path from "node:path";
import { ANSI_COLORS, LOG_LEVEL_COLORS, PATHS } from "./constants.js";

/**
 * Get project root by looking for package.json with "effect-patterns-hub"
 */
export const getProjectRoot = (): string => {
	let current = process.cwd();
	while (current !== "/") {
		try {
			const pkgPath = path.join(current, PATHS.PACKAGE_JSON);
			const content = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
			if (content.name === PATHS.PROJECT_PACKAGE_NAME) {
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
 * @deprecated Use ANSI_COLORS from constants.ts instead
 */
export const colors = ANSI_COLORS;

/**
 * Colors for different log levels
 * @deprecated Use LOG_LEVEL_COLORS from constants.ts instead
 */
export const levelColors = LOG_LEVEL_COLORS;

/**
 * Colorize text with ANSI codes
 */
export function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
}
