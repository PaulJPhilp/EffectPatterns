/**
 * Display service helpers
 */

import { Effect } from "effect";
import { ANSI_COLORS } from "../../constants.js";
import type { LoggerConfig } from "../logger/index.js";
import { Logger } from "../logger/index.js";

/**
 * Get logger config from Logger service
 */
export const getLoggerConfig = (): Effect.Effect<LoggerConfig, never, Logger> =>
	Effect.gen(function* () {
		const logger = yield* Logger;
		const config = yield* logger.getConfig();
		return config;
	});

/**
 * Apply color if enabled in config (respects Logger config)
 */
export const colorizeWithConfig = (
	text: string,
	color: keyof typeof ANSI_COLORS,
	config: LoggerConfig
): string => {
	if (!config.useColors) return text;
	return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.RESET}`;
};
