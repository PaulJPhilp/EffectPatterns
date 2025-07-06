import { Effect, Schema } from "effect";

const UserSchema = Schema.Struct({ name: Schema.String });

const processUserInput = (input: unknown) =>
  Schema.decode(UserSchema)(input).pipe(
    Effect.map((user) => `Welcome, ${user.name}!`),
    Effect.catchTag("ParseError", () => Effect.succeed("Invalid user data.")),
  );