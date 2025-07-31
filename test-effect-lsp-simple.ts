import { Effect } from "effect";

// This should trigger a floating effect diagnostic from the Effect LSP
Effect.succeed(1);

export {};
