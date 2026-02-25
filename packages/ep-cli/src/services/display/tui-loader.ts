/**
 * Service to load the TUI module dynamically
 */
import { Effect } from "effect";

export type TUIModule = Record<string, unknown>;

// Internal cache for the loader
let tuiModuleCache: TUIModule | false | null = null;

/** @internal */
export const _resetTuiModuleCache = () => {
  tuiModuleCache = null;
};

export class TUILoader extends Effect.Service<TUILoader>()("TUILoader", {
  accessors: true,
  succeed: {
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
  },
}) {}
