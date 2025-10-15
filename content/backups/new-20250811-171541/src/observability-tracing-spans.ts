import { Effect } from 'effect';

const fetchUser = Effect.sync(() => ({ id: 1, name: 'Alice' })).pipe(
  Effect.withSpan('db.fetchUser')
);

const fetchData = Effect.tryPromise({
  try: () => fetch('https://api.example.com/data').then((res) => res.json()),
  catch: (err) => `Network error: ${String(err)}`,
}).pipe(
  Effect.withSpan('http.fetchData', {
    attributes: { url: 'https://api.example.com/data' },
  })
);

const program = Effect.gen(function* () {
  yield* Effect.log('Starting workflow').pipe(
    Effect.withSpan('workflow.start')
  );
  const user = yield* fetchUser;
  const data = yield* fetchData;
  yield* Effect.log(
    `Fetched user: ${user.name}, data: ${JSON.stringify(data)}`
  ).pipe(Effect.withSpan('workflow.end'));
});

Effect.runPromise(program);
