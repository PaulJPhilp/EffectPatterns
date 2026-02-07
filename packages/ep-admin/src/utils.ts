/**
 * Utility functions shared across commands
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import { ANSI_COLORS, PATHS } from "./constants.js";

/**
 * Get project root by looking for package.json with "effect-patterns-hub"
 */
export const getProjectRoot = (): string => {
	let current = process.cwd();
	while (current !== "/") {
		try {
			const pkgPath = path.join(current, PATHS.PACKAGE_JSON);
			const content = JSON.parse(readFileSync(pkgPath, "utf-8"));
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
 * Colorize text with ANSI codes
 */
export function colorize(text: string, color: keyof typeof ANSI_COLORS): string {
	if (process.env.NO_COLOR) return text;
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
}
