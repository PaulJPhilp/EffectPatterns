// Define a tagged union for a simple state machine
type State =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Success"; readonly data: string }
  | { readonly _tag: "Failure"; readonly error: string };

// Create instances
const state1: State = { _tag: "Loading" };
const state2: State = { _tag: "Success", data: "Hello" };
const state3: State = { _tag: "Failure", error: "Oops" };

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