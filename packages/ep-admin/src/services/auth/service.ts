import { Effect, Schema } from "effect";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import path from "node:path";
import { AuthConfigSchema, AuthSessionSchema } from "./schema.js";
import {
  AuthConfigurationError,
  AuthInvalidCredentialsError,
  AuthNotInitializedError,
  AuthServiceTokenError,
  AuthSessionExpiredError,
  AuthUnauthorizedUserError,
} from "./errors.js";
import type {
  AuthConfig,
  AuthSession,
  AuthStatus,
  AuthorizationResult,
  InitializeOptions,
  StoredHash,
} from "./types.js";

const DEFAULT_SESSION_TTL_HOURS = 12;
const HASH_ITERATIONS = 310_000;
const HASH_DIGEST = "sha256" as const;
const HASH_LENGTH_BYTES = 32;

const resolveConfigPath = () => {
  const explicit = process.env.EP_ADMIN_AUTH_CONFIG_FILE?.trim();
  if (explicit) return explicit;
  const configHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
  return path.join(configHome, "ep-admin", "auth.json");
};

const resolveSessionPath = () => {
  const explicit = process.env.EP_ADMIN_AUTH_SESSION_FILE?.trim();
  if (explicit) return explicit;
  const stateHome = process.env.XDG_STATE_HOME || path.join(homedir(), ".local", "state");
  return path.join(stateHome, "ep-admin", "session.json");
};

const resolveSessionTtlHours = () => {
  const raw = process.env.EP_ADMIN_AUTH_SESSION_TTL_HOURS?.trim();
  if (!raw) return DEFAULT_SESSION_TTL_HOURS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_HOURS;
};

const deriveHash = (secret: string, salt: string, iterations: number): string =>
  pbkdf2Sync(secret, salt, iterations, HASH_LENGTH_BYTES, HASH_DIGEST).toString("hex");

const createStoredHash = (secret: string): StoredHash => {
  const salt = randomBytes(16).toString("hex");
  const hash = deriveHash(secret, salt, HASH_ITERATIONS);
  return {
    salt,
    hash,
    iterations: HASH_ITERATIONS,
    digest: HASH_DIGEST,
  };
};

const verifyStoredHash = (secret: string, stored: StoredHash): boolean => {
  try {
    const derived = deriveHash(secret, stored.salt, stored.iterations);
    const left = Buffer.from(derived, "hex");
    const right = Buffer.from(stored.hash, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

const mask = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 8);

const ensureDirectory = (targetPath: string) =>
  Effect.tryPromise({
    try: async () => {
      const dir = path.dirname(targetPath);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await chmod(dir, 0o700).catch(() => void 0);
    },
    catch: (error) =>
      new AuthConfigurationError({
        message: `Failed to create auth directory: ${String(error)}`,
      }),
  });

const readJsonFile = <T>(
  targetPath: string,
  schema: Schema.Schema<T>
): Effect.Effect<T | null, AuthConfigurationError, never> =>
  Effect.tryPromise({
    try: async () => {
      const raw = await readFile(targetPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return Schema.decodeUnknownSync(schema)(parsed);
    },
    catch: (error) => {
      if (typeof error === "object" && error !== null && "code" in error) {
        if ((error as { code?: string }).code === "ENOENT") {
          return new AuthNotInitializedError({
            message: `MISSING_FILE:${targetPath}`,
          });
        }
      }
      return new AuthConfigurationError({
        message: `Failed to read auth file '${targetPath}': ${String(error)}`,
      });
    },
  }).pipe(
    Effect.catchTag("AuthNotInitializedError", () => Effect.succeed(null))
  );

const writeJsonFile = (
  targetPath: string,
  payload: unknown
): Effect.Effect<void, AuthConfigurationError, never> =>
  Effect.gen(function* () {
    yield* ensureDirectory(targetPath);
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    yield* Effect.tryPromise({
      try: async () => {
        await writeFile(targetPath, body, { mode: 0o600 });
        await chmod(targetPath, 0o600).catch(() => void 0);
      },
      catch: (error) =>
        new AuthConfigurationError({
          message: `Failed to write auth file '${targetPath}': ${String(error)}`,
        }),
    });
  });

const removeFile = (targetPath: string) =>
  Effect.tryPromise({
    try: async () => {
      await rm(targetPath, { force: true });
    },
    catch: (error) =>
      new AuthConfigurationError({
        message: `Failed to remove auth file '${targetPath}': ${String(error)}`,
      }),
  });

const getCurrentUser = () =>
  Effect.try({
    try: () => userInfo().username,
    catch: (error) =>
      new AuthConfigurationError({
        message: `Failed to resolve current OS user: ${String(error)}`,
      }),
  });

export interface AuthService {
  readonly initialize: (
    options: InitializeOptions
  ) => Effect.Effect<void, AuthConfigurationError, never>;
  readonly login: (
    passphrase: string
  ) => Effect.Effect<
    void,
    | AuthConfigurationError
    | AuthNotInitializedError
    | AuthInvalidCredentialsError
    | AuthUnauthorizedUserError,
    never
  >;
  readonly logout: () => Effect.Effect<void, AuthConfigurationError, never>;
  readonly status: () => Effect.Effect<
    AuthStatus,
    AuthConfigurationError,
    never
  >;
  readonly ensureAuthorized: (
    serviceToken?: string
  ) => Effect.Effect<
    AuthorizationResult,
    | AuthConfigurationError
    | AuthNotInitializedError
    | AuthInvalidCredentialsError
    | AuthSessionExpiredError
    | AuthUnauthorizedUserError
    | AuthServiceTokenError,
    never
  >;
}

export class Auth extends Effect.Service<Auth>()("Auth", {
  accessors: true,
  effect: Effect.gen(function* () {
    const configPath = resolveConfigPath();
    const sessionPath = resolveSessionPath();

    const loadConfig = () =>
      readJsonFile<AuthConfig>(configPath, AuthConfigSchema);

    const loadSession = () =>
      readJsonFile<AuthSession>(sessionPath, AuthSessionSchema);

    const initialize: AuthService["initialize"] = (options) =>
      Effect.gen(function* () {
        const currentUser = yield* getCurrentUser();
        const existing = yield* loadConfig();

        if (existing && !options.force) {
          return yield* Effect.fail(
            new AuthConfigurationError({
              message:
                "Auth already initialized. Re-run with --force to overwrite credentials.",
            })
          );
        }

        const config: AuthConfig = {
          version: 1,
          username: currentUser,
          passphrase: createStoredHash(options.passphrase),
          serviceToken: options.serviceToken
            ? createStoredHash(options.serviceToken)
            : undefined,
          createdAt: new Date().toISOString(),
        };

        yield* writeJsonFile(configPath, config);
        yield* removeFile(sessionPath);
      });

    const login: AuthService["login"] = (passphrase) =>
      Effect.gen(function* () {
        const config = yield* loadConfig();
        if (!config) {
          return yield* Effect.fail(
            new AuthNotInitializedError({
              message: "Auth not initialized.",
            })
          );
        }

        const currentUser = yield* getCurrentUser();
        if (currentUser !== config.username) {
          return yield* Effect.fail(
            new AuthUnauthorizedUserError({
              message: `Unauthorized user '${currentUser}'.`,
              expectedUser: config.username,
              currentUser,
            })
          );
        }

        if (!verifyStoredHash(passphrase, config.passphrase)) {
          return yield* Effect.fail(
            new AuthInvalidCredentialsError({
              message: "Invalid passphrase.",
            })
          );
        }

        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + resolveSessionTtlHours() * 60 * 60 * 1000
        );

        const session: AuthSession = {
          username: currentUser,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

        yield* writeJsonFile(sessionPath, session);
      });

    const logout: AuthService["logout"] = () => removeFile(sessionPath);

    const status: AuthService["status"] = () =>
      Effect.gen(function* () {
        const currentUser = yield* getCurrentUser();
        const config = yield* loadConfig();
        if (!config) {
          return {
            initialized: false,
            currentUser,
            loggedIn: false,
            reason: "not_initialized",
          } satisfies AuthStatus;
        }

        const session = yield* loadSession();
        if (!session) {
          return {
            initialized: true,
            expectedUser: config.username,
            currentUser,
            loggedIn: false,
            reason: currentUser === config.username ? "not_logged_in" : "wrong_user",
          } satisfies AuthStatus;
        }

        const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
        if (isExpired) {
          yield* removeFile(sessionPath);
          return {
            initialized: true,
            expectedUser: config.username,
            currentUser,
            loggedIn: false,
            reason: "expired",
          } satisfies AuthStatus;
        }

        if (currentUser !== config.username || session.username !== config.username) {
          return {
            initialized: true,
            expectedUser: config.username,
            currentUser,
            loggedIn: false,
            reason: "wrong_user",
          } satisfies AuthStatus;
        }

        return {
          initialized: true,
          expectedUser: config.username,
          currentUser,
          loggedIn: true,
          expiresAt: session.expiresAt,
        } satisfies AuthStatus;
      });

    const ensureAuthorized: AuthService["ensureAuthorized"] = (serviceToken) =>
      Effect.gen(function* () {
        const config = yield* loadConfig();
        if (!config) {
          return yield* Effect.fail(
            new AuthNotInitializedError({
              message: "ep-admin auth has not been initialized.",
            })
          );
        }

        if (serviceToken && serviceToken.trim().length > 0) {
          if (!config.serviceToken) {
            return yield* Effect.fail(
              new AuthServiceTokenError({
                message:
                  "EP_ADMIN_SERVICE_TOKEN is set but no trusted service token is configured. Re-run 'ep-admin auth init --force' to set one.",
              })
            );
          }

          const ok = verifyStoredHash(serviceToken, config.serviceToken);
          if (!ok) {
            return yield* Effect.fail(
              new AuthServiceTokenError({
                message: `Invalid EP_ADMIN_SERVICE_TOKEN (fingerprint ${mask(serviceToken)}).`,
              })
            );
          }

          return {
            mode: "service_token",
            username: config.username,
          } satisfies AuthorizationResult;
        }

        const currentUser = yield* getCurrentUser();
        if (currentUser !== config.username) {
          return yield* Effect.fail(
            new AuthUnauthorizedUserError({
              message:
                "Authenticated OS user does not match initialized ep-admin user.",
              expectedUser: config.username,
              currentUser,
            })
          );
        }

        const session = yield* loadSession();
        if (!session) {
          return yield* Effect.fail(
            new AuthInvalidCredentialsError({
              message: "No active ep-admin login session.",
            })
          );
        }

        if (session.username !== config.username) {
          return yield* Effect.fail(
            new AuthInvalidCredentialsError({
              message: "Stored session does not match the initialized user.",
            })
          );
        }

        const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
        if (isExpired) {
          yield* removeFile(sessionPath);
          return yield* Effect.fail(
            new AuthSessionExpiredError({
              message: "ep-admin login session has expired.",
            })
          );
        }

        return {
          mode: "session",
          username: config.username,
        } satisfies AuthorizationResult;
      });

    return {
      initialize,
      login,
      logout,
      status,
      ensureAuthorized,
    } as AuthService;
  }),
}) {}
