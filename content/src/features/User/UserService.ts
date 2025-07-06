import { Context, Effect } from "effect";

// Define the user interface
export interface User {
  id: string;
  name: string;
}

// Define the service as a class extending Context.Tag
export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getUser: (id: string) => Effect.Effect<User>;
  }
>() {}
