import { Effect } from "effect";

// This should definitely trigger a floating effect diagnostic
// The Effect is created but not used (floating)
Effect.log("This is a test message");

// This should be fine - the Effect is assigned to a variable
const loggedEffect = Effect.log("This is another test message");

// This should also trigger a diagnostic - unused Effect in a function
function createEffect() {
  Effect.succeed("unused");
  return Effect.succeed("used");
}

export {};
