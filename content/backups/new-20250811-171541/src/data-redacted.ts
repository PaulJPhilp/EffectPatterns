import { Effect, Redacted } from 'effect';

const secret = Redacted.make('super-secret-password');

function authenticate(user: string, password: Redacted.Redacted<string>) {
  // Simulate authentication logic
  return Effect.succeed(
    user === 'admin' && Redacted.value(password) === 'super-secret-password'
      ? 'Authenticated'
      : 'Failed'
  );
}

const program = Effect.gen(function* () {
  yield* Effect.log(`Password: ${secret}`); // Should log <redacted>
  yield* Effect.log(`Password as string: ${String(secret)}`); // Should log <redacted>
  const authResult = yield* authenticate('admin', secret);
  yield* Effect.log(`Authentication result: ${authResult}`);
});

Effect.runPromise(program);
