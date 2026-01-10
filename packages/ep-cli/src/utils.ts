/**
 * Utility functions shared across commands
 */

import { ANSI_COLORS, LOG_LEVEL_COLORS, PATHS } from "./constants.js";

/**
 * Get project root by looking for package.json with "effect-patterns-hub"
 */
export const getProjectRoot = (): string => {
	// For ep-cli, we can use the constant from constants.ts or look it up
	return PATHS.PROJECT_ROOT;
};

/**
 * ANSI color codes
 */
export const colors = ANSI_COLORS;

/**
 * Colors for different log levels
 */
export const levelColors = LOG_LEVEL_COLORS;

/**
 * Colorize text with ANSI codes
 */
export function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
}
