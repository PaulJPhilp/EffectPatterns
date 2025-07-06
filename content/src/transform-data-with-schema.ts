import { Schema, Effect } from "effect";

// Define types for better type safety
type RawEvent = {
  name: string;
  timestamp: string;
};

type ParsedEvent = {
  name: string;
  timestamp: Date;
};

// Define the schema for our event
const ApiEventSchema = Schema.Struct({
  name: Schema.String,
  timestamp: Schema.String
});

// Example input
const rawInput: RawEvent = {
  name: "User Login",
  timestamp: "2025-06-22T20:08:42.000Z"
};

// Parse and transform
const program = Effect.gen(function* () {
  const parsed = yield* Schema.decode(ApiEventSchema)(rawInput);
  return {
    name: parsed.name,
    timestamp: new Date(parsed.timestamp)
  } as ParsedEvent;
});

Effect.runPromise(program).then(
  (event) => {
    console.log('Event year:', event.timestamp.getFullYear());
    console.log('Full event:', event);
  },
  (error) => {
    console.error('Failed to parse event:', error);
  }
);