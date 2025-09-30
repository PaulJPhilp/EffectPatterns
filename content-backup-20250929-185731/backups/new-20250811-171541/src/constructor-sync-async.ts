import { Effect } from "effect";

const effectSync = Effect.sync(() => Math.random());

function legacyReadFile(
  path: string,
  cb: (err: Error | null, data?: string) => void
) {
  setTimeout(() => cb(null, "file contents"), 10);
}

const effectAsync = Effect.async<string, string>((resume) => {
  legacyReadFile("file.txt", (err, data) => {
    if (err) resume(Effect.fail(err.message));
    else resume(Effect.succeed(data!));
  });
});

const program = Effect.gen(function* () {
  const syncResult = yield* effectSync;
  yield* Effect.log(`Effect.sync result: ${syncResult}`);
  const asyncResult = yield* effectAsync;
  yield* Effect.log(`Effect.async result: ${asyncResult}`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
