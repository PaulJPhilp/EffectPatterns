/**
 * Login Command
 *
 * Opens the browser to EffectTalk.dev for authentication and captures
 * the API key via a local callback server.
 */

import { Command } from "@effect/cli";
import { Console, Duration, Effect } from "effect";
import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { writeConfig } from "../services/config/writer.js";

const AUTH_BASE_URL = "https://effecttalk.dev/cli/auth";
const PRIMARY_PORT = 4567;
const FALLBACK_PORT = 4568;
const TIMEOUT = Duration.minutes(5);

interface AuthResult {
  readonly apiKey: string;
  readonly email: string;
}

/**
 * Try to start an HTTP server on the given port.
 * Returns an Effect that fails if the port is busy.
 */
const tryListen = (server: Server, port: number): Effect.Effect<number, Error> =>
  Effect.async<number, Error>((resume) => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      resume(Effect.fail(new Error(`Port ${port} unavailable: ${err.code}`)));
    });
    server.listen(port, "127.0.0.1", () => {
      resume(Effect.succeed(port));
    });
  });

/**
 * Open a URL in the user's default browser.
 */
const openBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      const { exec } = require("node:child_process") as typeof import("node:child_process");
      const cmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${cmd} "${url}"`);
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(`Failed to open browser: ${String(error)}`),
  });

/**
 * Wait for the authentication callback on the local server.
 */
const waitForCallback = (
  server: Server,
  port: number,
  expectedState: string,
): Effect.Effect<AuthResult, Error> =>
  Effect.async<AuthResult, Error>((resume) => {
    server.on("request", (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const state = url.searchParams.get("state");
      if (state !== expectedState) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Invalid state parameter");
        return;
      }

      const apiKey = url.searchParams.get("apiKey") ?? "";
      const email = url.searchParams.get("email") ?? "";

      if (!apiKey) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing apiKey parameter");
        resume(Effect.fail(new Error("Callback received without apiKey")));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body style=\"font-family:system-ui;text-align:center;padding:2em\">" +
        "<h1>Success!</h1><p>You can close this tab and return to the terminal.</p>" +
        "</body></html>"
      );

      resume(Effect.succeed({ apiKey, email }));
    });
  });

/**
 * Shut down the HTTP server.
 */
const closeServer = (server: Server): Effect.Effect<void> =>
  Effect.async<void>((resume) => {
    server.close(() => {
      resume(Effect.succeed(void 0));
    });
  });

export const loginCommand = Command.make("login").pipe(
  Command.withDescription("Authenticate with EffectTalk.dev"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      const state = randomBytes(32).toString("hex");
      const server = createServer();

      // Try primary port, fall back to secondary
      const port = yield* tryListen(server, PRIMARY_PORT).pipe(
        Effect.orElse(() => tryListen(server, FALLBACK_PORT)),
        Effect.mapError(() => new Error(
          `Could not start local server on port ${PRIMARY_PORT} or ${FALLBACK_PORT}. ` +
          "Please free one of these ports and try again."
        )),
      );

      const authUrl = `${AUTH_BASE_URL}?state=${state}&port=${port}`;

      yield* Console.log("\nAuthenticating with EffectTalk...");
      yield* Console.log("Your browser should open automatically.\n");
      yield* Console.log(`If it doesn't, open this URL manually:`);
      yield* Console.log(`  ${authUrl}\n`);
      yield* Console.log("Waiting for authentication... (timeout: 5 minutes)\n");

      // Open browser (best-effort — don't fail if it can't open)
      yield* openBrowser(authUrl).pipe(Effect.catchAll(() => Effect.void));

      // Wait for callback with timeout
      const result = yield* waitForCallback(server, port, state).pipe(
        Effect.timeout(TIMEOUT),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(new Error(
            "Authentication timed out after 5 minutes.\n" +
            "Run `ep login` again to retry."
          ))
        ),
        Effect.ensuring(closeServer(server)),
      );

      // Write credentials to config file
      const configPath = yield* writeConfig({
        apiKey: result.apiKey,
        email: result.email,
      });

      const displayEmail = result.email || "unknown";
      yield* Console.log(`Success! Authenticated as ${displayEmail}.`);
      yield* Console.log(`   API key saved to ${configPath}`);
    })
  )
);
