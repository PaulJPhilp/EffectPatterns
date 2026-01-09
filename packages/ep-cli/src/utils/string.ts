/**
 * String and Terminal Utilities
 */

/**
 * Basic color helper for terminal output
 */
export function colorize(text: string, color: string): string {
  const colors: Record<string, string> = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
  };
  return `${colors[color] || ""}${text}${colors.reset}`;
}

/**
 * Simple kebab-case converter
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
