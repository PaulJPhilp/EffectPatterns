/**
 * Service to load the TUI module dynamically
 */
import { Context, Effect, Layer } from "effect";

// Define the shape of the TUI module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TUIModule = any;

export class TUILoader extends Context.Tag("TUILoader")<
	TUILoader,
	{
		readonly load: () => Effect.Effect<TUIModule | null>;
	}
>() {}

// Internal cache for the loader
let tuiModuleCache: TUIModule | false | null = null;

// Live implementation that does the actual dynamic import
export const LiveTUILoader = Layer.succeed(
	TUILoader,
	TUILoader.of({
		load: () =>
			Effect.suspend(() => {
				// Already attempted
				if (tuiModuleCache !== null) {
					return Effect.succeed(tuiModuleCache === false ? null : tuiModuleCache);
				}

				// First attempt - try to load TUI
				return Effect.tryPromise({
					try: async () => {
						const mod = await import("effect-cli-tui");
						tuiModuleCache = mod;
						return mod;
					},
					catch: () => {
						tuiModuleCache = false;
						return null;
					},
				}).pipe(
					Effect.catchAll(() => {
						tuiModuleCache = false;
						return Effect.succeed(null);
					})
				);
			}),
	})
);
