/**
 * Utility functions shared across commands
 */

import { ANSI_COLORS, LOG_LEVEL_COLORS, PATHS } from "./constants.js";

/**
 * Get project root by looking for package.json with "effect-patterns-hub"
 */
export const getProjectRoot = (): string => {
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
 * Colorize text with ANSI codes.
 * Respects the NO_COLOR environment variable convention.
 */
export function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
  if (process.env.NO_COLOR) return text;
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
}
