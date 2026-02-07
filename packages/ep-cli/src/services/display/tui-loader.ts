/**
 * Service to load the TUI module dynamically
 */
import { Context, Effect, Layer } from "effect";

export type TUIModule = Record<string, unknown>;

export class TUILoader extends Context.Tag("TUILoader")<
  TUILoader,
  {
    readonly load: () => Effect.Effect<TUIModule | null>;
  }
>() {}

// Internal cache for the loader
let tuiModuleCache: TUIModule | false | null = null;

/** @internal */
export const _resetTuiModuleCache = () => {
  tuiModuleCache = null;
};

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
        // Note: Using dynamic import() which works in ESM
        return Effect.tryPromise({
          try: async () => {
            const mod = await import("effect-cli-tui");
            tuiModuleCache = mod as TUIModule;
            return mod as TUIModule;
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
