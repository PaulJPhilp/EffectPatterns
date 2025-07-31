import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { AppConfig } from "./app-config.js";

export const processFile = Effect.gen(function* () {

	const config = yield* AppConfig;
	const fs = yield* FileSystem.FileSystem;
	const path_ = yield* Path.Path;

	// Read all MDX files from the processed directory
	const processedDirPath = path_.join(config.processedDir); // Convert string to Path
	const files = yield* fs.readDirectory(processedDirPath);
	const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

	yield* Effect.log(
		`Found ${mdxFiles.length} MDX pattern files in ${config.processedDir}`
	);

	yield* Effect.forEach(
		mdxFiles,
		(file) => Effect.gen(function* () {
			const path = yield* Path.Path;
			const filePath = path.join(config.processedDir, file);
			return []
		}),
		{
			concurrency: "unbounded",
			discard: true,
		}
	);

	yield* Effect.log(`Expectation population complete.`);
});