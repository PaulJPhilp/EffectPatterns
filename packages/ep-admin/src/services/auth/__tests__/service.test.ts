import { Effect } from "effect";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Auth,
} from "../index.js";

describe.sequential("Auth Service", () => {
  let tempDir: string;
  let configPath: string;
  let sessionPath: string;
  let previousEnv: NodeJS.ProcessEnv;

  const runAuth = <A>(
    program: Effect.Effect<A, unknown, Auth>
  ): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(Auth.Default)));

  beforeEach(async () => {
    previousEnv = { ...process.env };
    tempDir = await mkdtemp(path.join(tmpdir(), "ep-admin-auth-"));
    configPath = path.join(tempDir, "config", "auth.json");
    sessionPath = path.join(tempDir, "state", "session.json");
    process.env.EP_ADMIN_AUTH_CONFIG_FILE = configPath;
    process.env.EP_ADMIN_AUTH_SESSION_FILE = sessionPath;
    process.env.EP_ADMIN_AUTH_SESSION_TTL_HOURS = "12";
  });

  afterEach(async () => {
    process.env = previousEnv;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("initializes auth config with restrictive file permissions", async () => {
    await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({
          passphrase: "very-secure-passphrase",
          serviceToken: "service-token-1234567890",
        });
      })
    );

    const raw = await readFile(configPath, "utf8");
    expect(raw).not.toContain("very-secure-passphrase");
    expect(raw).not.toContain("service-token-1234567890");

    const configStats = await stat(configPath);
    expect(configStats.mode & 0o777).toBe(0o600);
  });

  it("creates a session on login and reports status", async () => {
    const status = await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({ passphrase: "very-secure-passphrase" });
        yield* auth.login("very-secure-passphrase");
        return yield* auth.status();
      })
    );

    expect(status.initialized).toBe(true);
    expect(status.loggedIn).toBe(true);
    expect(status.expiresAt).toBeDefined();

    const sessionStats = await stat(sessionPath);
    expect(sessionStats.mode & 0o777).toBe(0o600);
  });

  it("rejects invalid passphrase", async () => {
    await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({ passphrase: "correct-passphrase" });
      })
    );

    await expect(
      runAuth(
        Effect.gen(function* () {
          const auth = yield* Auth;
          yield* auth.login("wrong-passphrase");
        })
      )
    ).rejects.toThrow("Invalid passphrase.");
  });

  it("fails authorization when auth is not initialized", async () => {
    await expect(
      runAuth(
        Effect.gen(function* () {
          const auth = yield* Auth;
          yield* auth.ensureAuthorized();
        })
      )
    ).rejects.toThrow("ep-admin auth has not been initialized.");
  });

  it("allows service token bypass for automation", async () => {
    const result = await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({
          passphrase: "correct-passphrase",
          serviceToken: "automation-service-token",
        });
        return yield* auth.ensureAuthorized("automation-service-token");
      })
    );

    expect(result.mode).toBe("service_token");
  });

  it("rejects incorrect service token", async () => {
    await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({
          passphrase: "correct-passphrase",
          serviceToken: "automation-service-token",
        });
      })
    );

    await expect(
      runAuth(
        Effect.gen(function* () {
          const auth = yield* Auth;
          yield* auth.ensureAuthorized("wrong-token");
        })
      )
    ).rejects.toThrow("Invalid EP_ADMIN_SERVICE_TOKEN");
  });

  it("rejects expired session and clears it", async () => {
    await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({ passphrase: "correct-passphrase" });
        yield* auth.login("correct-passphrase");
      })
    );

    const configRaw = await readFile(configPath, "utf8");
    const config = JSON.parse(configRaw) as { username: string };

    await writeFile(
      sessionPath,
      JSON.stringify(
        {
          username: config.username,
          createdAt: new Date(Date.now() - 60_000).toISOString(),
          expiresAt: new Date(Date.now() - 1_000).toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(
      runAuth(
        Effect.gen(function* () {
          const auth = yield* Auth;
          yield* auth.ensureAuthorized();
        })
      )
    ).rejects.toThrow("ep-admin login session has expired.");

    await expect(stat(sessionPath)).rejects.toBeTruthy();
  });

  it("binds access to initialized OS username", async () => {
    await runAuth(
      Effect.gen(function* () {
        const auth = yield* Auth;
        yield* auth.initialize({ passphrase: "correct-passphrase" });
        yield* auth.login("correct-passphrase");
      })
    );

    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as {
      version: number;
      username: string;
      passphrase: unknown;
      createdAt: string;
      serviceToken?: unknown;
    };
    parsed.username = "some-other-user";
    await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

    await expect(
      runAuth(
        Effect.gen(function* () {
          const auth = yield* Auth;
          yield* auth.ensureAuthorized();
        })
      )
    ).rejects.toThrow("Authenticated OS user does not match initialized ep-admin user.");
  });
});
