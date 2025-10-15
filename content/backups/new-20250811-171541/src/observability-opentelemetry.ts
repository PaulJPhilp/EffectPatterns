// Pseudocode: Replace with actual OpenTelemetry integration for your stack
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Effect } from 'effect';

function withOtelSpan<A, E = never, R = never>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.gen(function* () {
    const otelSpan = trace.getTracer('default').startSpan(name);
    return yield* effect.pipe(
      Effect.tap(() =>
        Effect.sync(() => otelSpan.setStatus({ code: SpanStatusCode.OK }))
      ),
      Effect.catchAll((err) =>
        Effect.sync(() => {
          otelSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: String(err),
          });
        }).pipe(Effect.zipRight(Effect.fail(err)))
      ),
      Effect.ensuring(Effect.sync(() => otelSpan.end()))
    );
  });
}

const program = Effect.gen(function* () {
  const user = yield* withOtelSpan(
    'fetchUser',
    Effect.sync(() => {
      // ...fetch user logic
      return { id: 1, name: 'Alice' };
    })
  );
  yield* Effect.log(`Fetched user: ${JSON.stringify(user)}`);
});

Effect.runPromise(program);
