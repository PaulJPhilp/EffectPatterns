/**
 * Execution service with TUI spinner support
 *
 * Executes external scripts (child processes) with optional TUI spinner feedback.
 * Falls back to console output when TUI is not available.
 */

import { Effect } from "effect";
import { Console } from "effect";
import { spawn } from "node:child_process";
import { promisify } from "node:util";

// Import TUI spinner if available
let spinnerEffectTUI: any = null;
let InkService: any = null;

try {
  const tuiModule = require("effect-cli-tui");
  spinnerEffectTUI = tuiModule.spinnerEffect;
  InkService = tuiModule.InkService;
} catch {
  // TUI not available, will use console fallback
}

export interface ExecutionOptions {
  verbose?: boolean;
  timeout?: number;
}

/**
 * Convert child process spawn to Effect
 * Returns void on success, Error on failure
 */
const spawnEffect = (
  scriptPath: string,
  options?: ExecutionOptions
): Effect.Effect<void, Error> =>
  Effect.async<void, Error>((resume) => {
    const child = spawn("bun", ["run", scriptPath], {
      stdio: options?.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
      shell: true,
      timeout: options?.timeout,
    });

    let output = "";

    if (!options?.verbose) {
      child.stdout?.on("data", (data) => {
        output += data.toString();
      });
      child.stderr?.on("data", (data) => {
        output += data.toString();
      });
    }

    child.on("error", (error) => {
      resume(Effect.fail(error));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed(void 0));
      } else {
        const error = new Error(`Script exited with code ${code}`);
        if (output) {
          (error as any).scriptOutput = output;
        }
        resume(Effect.fail(error));
      }
    });
  });

/**
 * Execute a script with TUI spinner if available
 *
 * Uses effect-cli-tui spinner for visual feedback when TUI services are available.
 * Falls back to console messages otherwise.
 */
export const executeScriptWithTUI = (
  scriptPath: string,
  taskName: string,
  options?: ExecutionOptions
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const task = spawnEffect(scriptPath, options);

    // Try to use TUI spinner if available
    if (InkService && spinnerEffectTUI) {
      const maybeInk = yield* Effect.serviceOption(InkService);
      if (maybeInk._tag === "Some" && !options?.verbose) {
        // Use TUI spinner
        yield* (spinnerEffectTUI(taskName, task, {
          type: "dots",
          color: "cyan",
        }) as Effect.Effect<void, Error>);
        return;
      }
    }

    // Fallback to console with ora-style output
    if (!options?.verbose) {
      yield* Console.log(`⣾ ${taskName}...`);
    }

    yield* task.pipe(
      Effect.catchAll((error) => {
        // Enhance error with script output if available
        if (error instanceof Error && (error as any).scriptOutput) {
          const msg = `${error.message}\n\nScript output:\n${(error as any).scriptOutput}`;
          const enhancedError = new Error(msg);
          Object.defineProperty(enhancedError, 'cause', { value: error });
          return Effect.fail(enhancedError);
        }
        if (error instanceof Error) {
          return Effect.fail(error);
        }
        return Effect.fail(new Error(String(error)));
      })
    );

    if (!options?.verbose) {
      yield* Console.log(`✓ ${taskName} completed`);
    }
  });

/**
 * Execute a script and capture its output
 *
 * Returns the stdout output from the script
 */
export const executeScriptCapture = (
  scriptPath: string,
  options?: ExecutionOptions
): Effect.Effect<string, Error> =>
  Effect.async<string, Error>((resume) => {
    const child = spawn("bun", ["run", scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      timeout: options?.timeout,
    });

    let output = "";
    let errorOutput = "";

    child.stdout?.on("data", (data) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (error) => {
      resume(Effect.fail(error));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed(output));
      } else {
        const error = new Error(
          `Script exited with code ${code}: ${errorOutput}`
        );
        resume(Effect.fail(error));
      }
    });
  });

/**
 * Execute a script with streaming stdio (for verbose output)
 *
 * Useful for commands where you want to see output in real-time
 */
export const executeScriptStream = (
  scriptPath: string,
  options?: ExecutionOptions
): Effect.Effect<void, Error> =>
  Effect.async<void, Error>((resume) => {
    const child = spawn("bun", ["run", scriptPath], {
      stdio: "inherit",
      shell: true,
      timeout: options?.timeout,
    });

    child.on("error", (error) => {
      resume(Effect.fail(error));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed(void 0));
      } else {
        resume(Effect.fail(new Error(`Script exited with code ${code}`)));
      }
    });
  });

/**
 * Wrap any Effect with a console spinner
 *
 * Shows progress messages before and after the effect execution.
 */
export const withSpinner = <A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
  _options?: ExecutionOptions
): Effect.Effect<A, E, R> => {
  const showStart = Console.log(`⣾ ${message}...`);
  const showEnd = Console.log(`✓ ${message} completed`);

  return showStart.pipe(
    Effect.andThen(() => effect),
    Effect.andThen((result) => showEnd.pipe(Effect.map(() => result)))
  );
};
