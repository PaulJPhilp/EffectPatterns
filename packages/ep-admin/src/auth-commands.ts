import { Command, Options, Prompt } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import * as Redacted from "effect/Redacted";
import { emitJson } from "./cli/output.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Auth } from "./services/auth/index.js";
import { Display } from "./services/display/index.js";

const getPassword = (
  provided: Option.Option<string>,
  message: string
) =>
  Option.match(provided, {
    onNone: () =>
      Prompt.password({
        message,
        validate: (value) =>
          value.length < 8
            ? Effect.fail("Passphrase must be at least 8 characters.")
            : Effect.succeed(value),
      }).pipe(Effect.map((secret) => Redacted.value(secret))),
    onSome: Effect.succeed,
  });

const getOptionalSecret = (
  provided: Option.Option<string>
) =>
  Option.match(provided, {
    onSome: (value) => Effect.succeed(value),
    onNone: () =>
      Prompt.confirm({
        message: "Configure a service token for CI/automation bypass?",
        initial: false,
      }).pipe(
        Effect.flatMap((shouldSet) =>
          shouldSet
            ? Prompt.password({
                message: "Service token:",
                validate: (value) =>
                  value.length < 16
                    ? Effect.fail("Service token must be at least 16 characters.")
                    : Effect.succeed(value),
              }).pipe(Effect.map((secret) => Redacted.value(secret)))
            : Effect.succeed(undefined)
        )
      ),
  });

export const authInitCommand = Command.make("init", {
  options: {
    ...globalOptions,
    force: Options.boolean("force").pipe(
      Options.withDescription("Overwrite existing auth configuration"),
      Options.withDefault(false)
    ),
    passphrase: Options.optional(
      Options.text("passphrase").pipe(
        Options.withDescription("Non-interactive passphrase (not recommended)")
      )
    ),
    confirmPassphrase: Options.optional(
      Options.text("confirm-passphrase").pipe(
        Options.withDescription("Non-interactive passphrase confirmation")
      )
    ),
    serviceToken: Options.optional(
      Options.text("service-token").pipe(
        Options.withDescription("Non-interactive automation token (not recommended)")
      )
    ),
  },
}).pipe(
  Command.withDescription("Initialize local ep-admin authentication"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* configureLoggerFromOptions(options);

      const passphrase = yield* getPassword(
        options.passphrase,
        "Create ep-admin passphrase:"
      );
      const confirmation = yield* getPassword(
        options.confirmPassphrase,
        "Confirm passphrase:"
      );

      if (passphrase !== confirmation) {
        return yield* Effect.fail(new Error("Passphrases do not match."));
      }

      const serviceToken = yield* getOptionalSecret(options.serviceToken);
      const auth = yield* Auth;
      yield* auth.initialize({
        passphrase,
        serviceToken,
        force: options.force,
      });

      if (options.json) {
        yield* emitJson({
          ok: true,
          initialized: true,
          serviceTokenConfigured: Boolean(serviceToken),
          next: "ep-admin auth login",
        });
        return;
      }

      yield* Display.showSuccess("ep-admin authentication initialized.");
      yield* Display.showInfo("Next: ep-admin auth login");
    })
  )
);

export const authLoginCommand = Command.make("login", {
  options: {
    ...globalOptions,
    passphrase: Options.optional(
      Options.text("passphrase").pipe(
        Options.withDescription("Non-interactive passphrase (not recommended)")
      )
    ),
  },
}).pipe(
  Command.withDescription("Authenticate and create a local admin session"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* configureLoggerFromOptions(options);
      const passphrase = yield* getPassword(options.passphrase, "Passphrase:");
      const auth = yield* Auth;
      yield* auth.login(passphrase);
      const status = yield* auth.status();

      if (options.json) {
        yield* emitJson({
          ok: true,
          loggedIn: status.loggedIn,
          expiresAt: status.expiresAt,
        });
        return;
      }

      yield* Display.showSuccess("Login successful.");
      if (status.expiresAt) {
        yield* Display.showInfo(`Session expires at: ${status.expiresAt}`);
      }
    })
  )
);

export const authLogoutCommand = Command.make("logout", {
  options: {
    ...globalOptions,
  },
}).pipe(
  Command.withDescription("Delete local admin session"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* configureLoggerFromOptions(options);
      const auth = yield* Auth;
      yield* auth.logout();
      if (options.json) {
        yield* emitJson({ ok: true, loggedOut: true });
        return;
      }
      yield* Display.showSuccess("Logged out.");
    })
  )
);

export const authStatusCommand = Command.make("status", {
  options: {
    ...globalOptions,
  },
}).pipe(
  Command.withDescription("Show current auth/session status"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* configureLoggerFromOptions(options);
      const auth = yield* Auth;
      const status = yield* auth.status();

      if (options.json) {
        yield* emitJson(status);
        return;
      }

      if (!status.initialized) {
        yield* Display.showWarning("Auth not initialized.");
        yield* Display.showInfo("Run: ep-admin auth init");
        return;
      }

      yield* Console.log(`Initialized user: ${status.expectedUser}`);
      yield* Console.log(`Current user: ${status.currentUser}`);
      yield* Console.log(`Logged in: ${status.loggedIn ? "yes" : "no"}`);
      if (status.expiresAt) {
        yield* Console.log(`Session expires: ${status.expiresAt}`);
      }
      if (status.reason) {
        yield* Console.log(`Reason: ${status.reason}`);
      }
    })
  )
);

export const authCommand = Command.make("auth").pipe(
  Command.withDescription("Authenticate ep-admin and manage local sessions"),
  Command.withSubcommands([
    authInitCommand,
    authLoginCommand,
    authLogoutCommand,
    authStatusCommand,
  ])
);
