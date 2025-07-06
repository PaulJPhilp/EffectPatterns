import { Effect } from "effect";

const program = Effect.succeed(10).pipe(Effect.map((n) => n * 2));

const result = Effect.runSync(program); // result is 20