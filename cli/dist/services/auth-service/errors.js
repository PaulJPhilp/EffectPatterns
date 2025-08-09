import { Data } from "effect";
export class AuthError extends Data.TaggedError("AuthError") {
}
