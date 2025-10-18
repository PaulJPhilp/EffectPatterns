import { Effect } from "effect"

const program = Effect.fail("Expected error for testing")
Effect.runPromise(program)