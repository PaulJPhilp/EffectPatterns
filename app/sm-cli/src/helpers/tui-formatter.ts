/**
 * TUI Formatting Helpers
 * Pure utility functions for formatting terminal output using cli-table3 and chalk
 */

import chalk from "chalk";
import Table from "cli-table3";
import stripAnsi from "strip-ansi";

/**
 * Create a styled header section
 */
export const createHeader = (title: string, subtitle?: string): string => {
  const contentWidth = Math.max(title.length, subtitle?.length || 0);
  const interiorWidth = contentWidth + 2;

  const topBorder = "╔" + "═".repeat(interiorWidth) + "╗";
  const bottomBorder = "╚" + "═".repeat(interiorWidth) + "╝";

  let output = "";
  output += chalk.cyan(topBorder) + "\n";

  const titlePadding = Math.max(0, interiorWidth - title.length);
  output +=
    chalk.cyan("║ ") +
    chalk.bold.white(title) +
    " ".repeat(titlePadding - 2) +
    chalk.cyan(" ║") +
    "\n";

  if (subtitle) {
    const subtitleLength = stripAnsi(subtitle).length;
    const subtitlePadding = Math.max(0, interiorWidth - subtitleLength);
    output +=
      chalk.cyan("║ ") +
      chalk.gray(subtitle) +
      " ".repeat(subtitlePadding - 2) +
      chalk.cyan(" ║") +
      "\n";
  }

  output += chalk.cyan(bottomBorder) + "\n";
  return output;
};

/**
 * Create a key-value information card
 */
export const createInfoCard = (
  data: Record<string, string | boolean | number>
): string => {
  const entries = Object.entries(data);
  const maxKeyLength = Math.max(...entries.map(([key]) => key.length));

  let maxInteriorWidth = 0;
  entries.forEach(([key, value]) => {
    const valueStr =
      typeof value === "boolean" ? (value ? "✓ Yes" : "✗ No") : String(value);
    const visibleValueLength = stripAnsi(valueStr).length;
    const width = 1 + maxKeyLength + 3 + visibleValueLength + 1;
    maxInteriorWidth = Math.max(maxInteriorWidth, width);
  });

  let output =
    chalk.cyan("┌") +
    "─".repeat(maxInteriorWidth) +
    chalk.cyan("┐\n");

  entries.forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    const valueStr =
      typeof value === "boolean"
        ? value
          ? chalk.green("✓ Yes")
          : chalk.red("✗ No")
        : String(value);
    const visibleValueLength = stripAnsi(valueStr).length;

    const contentWidth = 1 + maxKeyLength + 3 + visibleValueLength;
    const paddingNeeded = maxInteriorWidth - contentWidth - 1;

    output += chalk.cyan("│");
    output +=
      " " + chalk.bold.blue(paddedKey) + " → " + chalk.white(valueStr);
    output += " ".repeat(paddingNeeded);
    output += chalk.cyan(" │\n");
  });

  output +=
    chalk.cyan("└") +
    "─".repeat(maxInteriorWidth) +
    chalk.cyan("┘\n");
  return output;
};

/**
 * Create a memory table with colors and styling
 */
export const createMemoryTable = (memories: any[]): string => {
  const table = new Table({
    head: [
      chalk.bold.cyan("ID"),
      chalk.bold.cyan("Title"),
      chalk.bold.cyan("Type"),
      chalk.bold.cyan("Status"),
      chalk.bold.cyan("Created"),
    ],
    style: {
      head: [],
      border: ["cyan"],
      compact: false,
    },
    colWidths: [12, 50, 20, 10, 12],
    wordWrap: true,
  });

  memories.forEach((memory: any) => {
    const statusColor =
      memory.status === "done"
        ? chalk.green
        : memory.status === "queued"
          ? chalk.yellow
          : chalk.gray;
    const typeColor =
      memory.type === "effect_pattern" ? chalk.magenta : chalk.white;
    const created = new Date(
      memory.createdAt || memory.created
    ).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });

    const title =
      memory.title || memory.summary?.substring(0, 47) || "(untitled)";

    table.push([
      chalk.cyan(memory.id.substring(0, 10)),
      chalk.white(title.substring(0, 47)),
      typeColor(memory.type || "unknown"),
      statusColor(memory.status),
      chalk.gray(created),
    ]);
  });

  return table.toString();
};

/**
 * Create a statistics panel
 */
export const createStatPanel = (
  label: string,
  value: string | number,
  color: string = "cyan"
): string => {
  const colorFn = (chalk as any)[color] || chalk.cyan;
  return (
    colorFn("┌─ " + label + " ") +
    colorFn("─".repeat(Math.max(0, 30 - label.length))) +
    colorFn("┐\n") +
    colorFn("│ ") +
    chalk.bold.white(String(value).padEnd(28)) +
    colorFn("│\n") +
    colorFn("└") +
    colorFn("─".repeat(32)) +
    colorFn("┘\n")
  );
};

/**
 * Create a success message
 */
export const createSuccess = (message: string): string => {
  return chalk.green("✓ ") + chalk.bold.green(message) + "\n";
};

/**
 * Create an error message
 */
export const createError = (message: string): string => {
  return chalk.red("✗ ") + chalk.bold.red(message) + "\n";
};

/**
 * Create a warning message
 */
export const createWarning = (message: string): string => {
  return chalk.yellow("⚠ ") + chalk.bold.yellow(message) + "\n";
};

/**
 * Create an info message
 */
export const createInfo = (message: string): string => {
  return chalk.blue("ℹ ") + chalk.bold.blue(message) + "\n";
};

/**
 * Create a divider line
 */
export const createDivider = (char: string = "─", width: number = 40): string => {
  return chalk.cyan(char.repeat(width) + "\n");
};

/**
 * Create a progress indicator
 */
export const createProgress = (label: string, percentage: number): string => {
  const barWidth = 20;
  const filled = Math.round((percentage / 100) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    label.padEnd(20) +
    " " +
    chalk.cyan(bar) +
    " " +
    chalk.bold.white(percentage.toString().padStart(3) + "%") +
    "\n"
  );
};

/**
 * Create a badge/tag
 */
export const createBadge = (
  text: string,
  type: "primary" | "success" | "warning" | "danger" = "primary"
): string => {
  const colors: Record<string, any> = {
    primary: { bg: chalk.bgCyan, text: chalk.black },
    success: { bg: chalk.bgGreen, text: chalk.black },
    warning: { bg: chalk.bgYellow, text: chalk.black },
    danger: { bg: chalk.bgRed, text: chalk.black },
  };

  const color = colors[type] || colors.primary;
  return color.bg(` ${text} `);
};

/**
 * Wrap text to a specific column width
 */
export const wrapColumn = (text: string, width: number): string => {
  if (stripAnsi(text).length <= width) {
    return text;
  }
  const lines: string[] = [];
  let currentLine = "";

  for (const char of text) {
    if (stripAnsi(currentLine).length >= width) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
};

