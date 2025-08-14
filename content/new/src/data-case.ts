import { Data } from "effect";

// Define a tagged union for a simple state machine
const Loading = Data.case("Loading", () => ({}));
const Success = Data.case("Success", (value: { data: string }) => value);
const Failure = Data.case("Failure", (value: { error: string }) => value);

type State = ReturnType<typeof Loading> | ReturnType<typeof Success> | ReturnType<typeof Failure>;

// Create instances
const state1: State = Loading();
const state2: State = Success({ data: "Hello" });
const state3: State = Failure({ error: "Oops" });

// Pattern match on the state
function handleState(state: State): string {
  switch (state._tag) {
    case "Loading":
      return "Loading...";
    case "Success":
      return `Data: ${state.data}`;
    case "Failure":
      return `Error: ${state.error}`;
  }
}