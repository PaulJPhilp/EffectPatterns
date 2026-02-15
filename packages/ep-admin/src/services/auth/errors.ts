import { Data } from "effect";

export class AuthNotInitializedError extends Data.TaggedError("AuthNotInitializedError")<{
  readonly message: string;
}> {}

export class AuthInvalidCredentialsError extends Data.TaggedError("AuthInvalidCredentialsError")<{
  readonly message: string;
}> {}

export class AuthSessionExpiredError extends Data.TaggedError("AuthSessionExpiredError")<{
  readonly message: string;
}> {}

export class AuthUnauthorizedUserError extends Data.TaggedError("AuthUnauthorizedUserError")<{
  readonly message: string;
  readonly expectedUser: string;
  readonly currentUser: string;
}> {}

export class AuthServiceTokenError extends Data.TaggedError("AuthServiceTokenError")<{
  readonly message: string;
}> {}

export class AuthConfigurationError extends Data.TaggedError("AuthConfigurationError")<{
  readonly message: string;
}> {}
