import { Effect } from "effect";

declare const validateUser: (data: any) => Effect.Effect<any>;
declare const hashPassword: (pw: string) => Effect.Effect<string>;
declare const dbCreateUser: (data: any) => Effect.Effect<any>;

const createUser = (userData: any) =>
  Effect.gen(function* () {
    const validated = yield* validateUser(userData);
    const hashed = yield* hashPassword(validated.password);
    return yield* dbCreateUser({ ...validated, password: hashed });
  });