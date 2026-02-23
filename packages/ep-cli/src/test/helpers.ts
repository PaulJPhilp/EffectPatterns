/**
 * Shared test helpers for ep-cli — no behavioral mocks.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

/**
 * Run a callback with a temporary directory that is cleaned up automatically.
 */
export const withTempDir = async <T>(
	prefix: string,
	fn: (dir: string) => Promise<T>
): Promise<T> => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
};

/**
 * Captures console output by temporarily replacing console methods
 * with writers that collect output into arrays.
 *
 * Returns collected logs/errors/warns and a restore function.
 * Call `restore()` in afterEach to reset console.
 */
export const captureConsole = () => {
	const logs: string[] = [];
	const errors: string[] = [];
	const warns: string[] = [];

	const originalLog = console.log;
	const originalError = console.error;
	const originalWarn = console.warn;
	const originalTable = console.table;

	console.log = (...args: unknown[]) => {
		logs.push(args.map(String).join(" "));
	};
	console.error = (...args: unknown[]) => {
		errors.push(args.map(String).join(" "));
	};
	console.warn = (...args: unknown[]) => {
		warns.push(args.map(String).join(" "));
	};
	console.table = () => undefined;

	const restore = () => {
		console.log = originalLog;
		console.error = originalError;
		console.warn = originalWarn;
		console.table = originalTable;
	};

	return { logs, errors, warns, restore };
};
