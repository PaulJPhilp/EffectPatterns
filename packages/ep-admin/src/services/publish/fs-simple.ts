/**
 * Simple FileSystem wrapper using Node's fs/promises
 * Avoids @effect/platform dependency issues
 */

import { Effect } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface SimpleFileSystem {
	readFileString: (path: string) => Effect.Effect<string, Error, never>;
	writeFileString: (
		path: string,
		content: string,
	) => Effect.Effect<void, Error, never>;
	exists: (path: string) => Effect.Effect<boolean, never, never>;
	readDirectory: (path: string) => Effect.Effect<string[], Error, never>;
	makeDirectory: (
		path: string,
		options?: { recursive?: boolean },
	) => Effect.Effect<void, Error, never>;
}

export const SimpleFS: SimpleFileSystem = {
	readFileString: (filePath: string) =>
		Effect.tryPromise({
			try: () => fs.readFile(filePath, "utf-8"),
			catch: (error) => new Error(`Failed to read file ${filePath}: ${error}`),
		}),

	writeFileString: (filePath: string, content: string) =>
		Effect.tryPromise({
			try: () => fs.writeFile(filePath, content, "utf-8"),
			catch: (error) =>
				new Error(`Failed to write file ${filePath}: ${error}`),
		}),

	exists: (filePath: string) =>
		Effect.tryPromise({
			try: async () => {
				try {
					await fs.access(filePath);
					return true;
				} catch {
					return false;
				}
			},
			catch: () => false,
		}).pipe(Effect.catchAll(() => Effect.succeed(false))),

	readDirectory: (dirPath: string) =>
		Effect.tryPromise({
			try: () => fs.readdir(dirPath),
			catch: (error) =>
				new Error(`Failed to read directory ${dirPath}: ${error}`),
		}),

	makeDirectory: (dirPath: string, options?: { recursive?: boolean }) =>
		Effect.tryPromise({
			try: () => fs.mkdir(dirPath, options),
			catch: (error) =>
				new Error(`Failed to create directory ${dirPath}: ${error}`),
		}),
};

export const basename = (filePath: string): string => path.basename(filePath);
export const join = (...paths: string[]): string => path.join(...paths);
