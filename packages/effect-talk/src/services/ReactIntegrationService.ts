import { Effect } from "effect";
import { EffectTalkLayer } from "./index";

/**
 * Helper to run an Effect in a React callback context
 * This bridges the async Effect world with React's callback pattern
 */
export function createEffectRunner() {
    return {
        /**
         * Run an Effect and return a Promise
         */
        runEffect: <A>(effect: Effect.Effect<A>) =>
            Effect.runPromise(effect.pipe(Effect.provide(EffectTalkLayer))),

        /**
         * Run an Effect and ignore result (fire and forget with error logging)
         */
        runEffectIgnore: (effect: Effect.Effect<void>) => {
            Effect.runPromise(effect.pipe(Effect.provide(EffectTalkLayer))).catch(
                (err) => {
                    console.error("Effect execution error:", err);
                },
            );
        },

        /**
         * Clean up runtime
         */
        dispose: () => {
            // No cleanup needed for this approach
        },
    };
}
