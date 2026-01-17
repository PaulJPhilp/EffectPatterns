import { Effect } from "effect";

/**
 * Simple logging service for EffectTalk
 */
export class LoggerService extends Effect.Service<LoggerService>()(
    "LoggerService",
    {
        accessors: true,
        effect: Effect.gen(function* () {
            return {
                debug: (message: string) =>
                    Effect.sync(() => {
                        console.log(`[DEBUG] ${message}`);
                    }),

                info: (message: string) =>
                    Effect.sync(() => {
                        console.log(`[INFO] ${message}`);
                    }),

                warn: (message: string) =>
                    Effect.sync(() => {
                        console.warn(`[WARN] ${message}`);
                    }),

                error: (message: string, error?: unknown) =>
                    Effect.sync(() => {
                        console.error(`[ERROR] ${message}`, error);
                    }),
            };
        }),
    },
) { }
