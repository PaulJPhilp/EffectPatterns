export type {
  AuthConfig,
  AuthSession,
  AuthStatus,
  AuthorizationResult,
  InitializeOptions,
  StoredHash,
} from "./types.js";

export { AuthConfigSchema, AuthSessionSchema, StoredHashSchema } from "./schema.js";

export {
  AuthConfigurationError,
  AuthInvalidCredentialsError,
  AuthNotInitializedError,
  AuthServiceTokenError,
  AuthSessionExpiredError,
  AuthUnauthorizedUserError,
} from "./errors.js";

export type { AuthService } from "./service.js";
export { Auth } from "./service.js";
