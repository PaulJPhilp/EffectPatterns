import { Data, Effect } from 'effect';

interface Loading {
  readonly _tag: 'Loading';
}
interface Success {
  readonly _tag: 'Success';
  readonly data: string;
}
interface Failure {
  readonly _tag: 'Failure';
  readonly error: string;
}

const Loading = Data.tagged<Loading>('Loading');
const Success = Data.tagged<Success>('Success');
const Failure = Data.tagged<Failure>('Failure');

type State = Loading | Success | Failure;

const state1: State = Loading();
const state2: State = Success({ data: 'Hello' });
const state3: State = Failure({ error: 'Oops' });

function handleState(state: State): string {
  switch (state._tag) {
    case 'Loading':
      return 'Loading...';
    case 'Success':
      return `Data: ${state.data}`;
    case 'Failure':
      return `Error: ${state.error}`;
  }
}

const program = Effect.gen(function* () {
  yield* Effect.log(`state1: ${handleState(state1)}`);
  yield* Effect.log(`state2: ${handleState(state2)}`);
  yield* Effect.log(`state3: ${handleState(state3)}`);
});

Effect.runPromise(program);
