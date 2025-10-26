import { Command, Options } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { app } from './analyzer/analyzer/graph.js';

const analyzerCommand = Command.make(
  'analyzer',
  {
    inputFile: Options.text('input').pipe(
      Options.withDescription('Path to the input JSON file.'),
    ),
    outputFile: Options.text('output').pipe(
      Options.withDescription('Path for the output report.'),
    ),
  },
  ({ inputFile, outputFile }) =>
    Effect.gen(function* () {
      yield* Effect.log('Starting analysis agent graph...');
      const initialState = { inputFile, outputFile } as const;
      const result = yield* Effect.tryPromise(() => app.invoke(initialState));
      yield* Effect.log('Analysis complete!');
      yield* Effect.logDebug({
        message: 'Analyzer result',
        result,
      });
    }),
);

const cli = Command.run(analyzerCommand, {
  name: 'effect-patterns-analyzer',
  version: '0.1.0',
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
