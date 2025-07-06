import { Effect } from "effect";
declare const step1: () => Effect.Effect<any>;
declare const step2: (a: any) => Effect.Effect<any>;

Effect.gen(function* () {
  const a = yield* step1();
  const b = yield* step2(a);
  return b;
});