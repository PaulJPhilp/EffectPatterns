/**
 * Utility functions shared across commands
 */

import { ANSI_COLORS } from "./constants.js";

/**
 * ANSI color codes
 */
export const colors = ANSI_COLORS;

/**
 * Colorize text with ANSI codes.
 * Respects the NO_COLOR environment variable convention.
 */
export function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
  if (process.env.NO_COLOR) return text;
  if (process.env.CI) return text;
  if (process.env.TERM === "dumb") return text;
  if (!process.stdout.isTTY) return text;
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
}
