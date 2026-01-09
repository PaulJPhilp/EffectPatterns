/**
 * Display service helpers
 */

import { Effect } from "effect";
import { colors } from "../../utils.js";
import type { LoggerConfig } from "../logger/index.js";
import { Logger } from "../logger/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TUIModule = any;

// TUI module state - loaded lazily on first use
// TUI module state - loaded lazily on first use
// Stores: null (not attempted), false (attempted but failed), or the module
// let tuiModuleCache: TUIModule | false | null = null;


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
	color: keyof typeof colors,
	config: LoggerConfig
): string => {
	if (!config.useColors) return text;
	return `${colors[color]}${text}${colors.RESET}`;
};
