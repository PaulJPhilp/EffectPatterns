import { Effect } from "effect";

const program = Effect.logDebug("Processing user", { userId: 123 });

// Run the program with debug logging enabled
Effect.runSync(
  program.pipe(
    Effect.tap(() => Effect.log("Debug logging enabled"))
  )
);