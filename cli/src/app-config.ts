// --- Configuration Service (Idiomatic Effect.Service pattern) ---

import { Effect } from "effect";

// Define the AppConfig interface
export interface AppConfigService {
	readonly srcDir: string;
	readonly processedDir: string;
}

// Create the AppConfig service using Effect.Service pattern
export class AppConfig extends Effect.Service<AppConfigService>()(
	"AppConfig",
	{
		// Provide a sync implementation that loads config values
		sync: () => ({
			srcDir: process.env.SRC_DIR || process.cwd() + "/content/new/src",
			processedDir: process.env.PROCESSED_DIR || process.cwd() + "/content/new/processed"
		})
	}
) {}