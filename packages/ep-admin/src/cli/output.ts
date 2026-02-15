import { Console, Effect } from "effect";

export const emitJson = (payload: unknown): Effect.Effect<void> =>
  Console.log(JSON.stringify(payload, null, 2));

export const emitInfo = (
  message: string,
  jsonMode: boolean
): Effect.Effect<void> => (jsonMode ? Console.error(message) : Console.log(message));

export const emitError = (message: string): Effect.Effect<void> =>
  Console.error(message);
