import { Effect, Stream } from "effect";
import * as pty from "node-pty";
import { ProcessError } from "../types";
import { LoggerService } from "./LoggerService";

export interface ProcessHandle {
  readonly pid: number;
  readonly command: string;
  readonly cwd: string;
}

interface ProcessState {
  pid: number;
  command: string;
  cwd: string;
  pty: pty.IPty;
  isRunning: boolean;
  exitCode: number | null;
}

/**
 * Service for spawning and managing child processes via node-pty
 * Provides full terminal emulation support for interactive commands
 */
export class ProcessService extends Effect.Service<ProcessService>()(
  "ProcessService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const logger = yield* LoggerService;

      // In-memory process registry for tracking active processes
      const processes = new Map<number, ProcessState>();

      return {
        /**
         * Spawn a new process with PTY
         */
        spawn: (command: string, cwd: string, env: Record<string, string>) =>
          Effect.acquireRelease(
            // Acquisition: spawn the process
            Effect.gen(function* () {
              yield* logger.info(`Spawning process: ${command} in ${cwd}`);

              try {
                // Merge provided env with process.env
                const spawnEnv = { ...process.env, ...env } as Record<
                  string,
                  string
                >;

                // Spawn PTY with terminal emulation
                const newPty = pty.spawn(command, [], {
                  name: "xterm-256color",
                  cols: 80,
                  rows: 24,
                  cwd,
                  env: spawnEnv,
                });

                // Track the process
                const processState: ProcessState = {
                  pid: newPty.pid,
                  command,
                  cwd,
                  pty: newPty,
                  isRunning: true,
                  exitCode: null,
                };

                processes.set(newPty.pid, processState);

                // Setup exit handler
                newPty.onExit(({ exitCode }) => {
                  processState.exitCode = exitCode;
                  processState.isRunning = false;
                  yield* logger.info(
                    `Process ${newPty.pid} exited with code ${exitCode}`,
                  );
                });

                const handle: ProcessHandle = {
                  pid: newPty.pid,
                  command,
                  cwd,
                };

                yield* logger.debug(`Process spawned with PID ${newPty.pid}`);
                return handle;
              } catch (cause) {
                yield* Effect.fail(
                  new ProcessError({
                    reason: "spawn-failed",
                    cause,
                  }),
                );
              }
            }),
            // Release: cleanup the process
            (handle) =>
              Effect.sync(() => {
                const process = processes.get(handle.pid);
                if (process && process.pty) {
                  try {
                    if (process.isRunning) {
                      process.pty.kill("SIGTERM");
                    }
                  } catch (e) {
                    // Already dead or error killing
                  }
                }
                processes.delete(handle.pid);
                yield* logger.debug(`Cleaned up process ${handle.pid}`);
              }),
          ),

        /**
         * Send input to a process's stdin
         */
        sendInput: (pid: number, input: string) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (!process) {
              yield* Effect.fail(
                new ProcessError({
                  reason: "spawn-failed",
                  pid,
                  cause: new Error(`Process ${pid} not found`),
                }),
              );
              return;
            }

            try {
              yield* Effect.sync(() => {
                process.pty.write(input);
              });
              yield* logger.debug(
                `Sent input to process ${pid}: ${input.length} bytes`,
              );
            } catch (cause) {
              yield* Effect.fail(
                new ProcessError({
                  reason: "spawn-failed",
                  pid,
                  cause,
                }),
              );
            }
          }),

        /**
         * Terminate a process with optional signal
         */
        terminate: (pid: number, signal: NodeJS.Signals = "SIGTERM") =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (!process) {
              yield* logger.warn(`Process ${pid} not found for termination`);
              return;
            }

            try {
              yield* Effect.sync(() => {
                process.pty.kill(signal);
              });
              yield* logger.info(`Terminated process ${pid} with ${signal}`);
              process.isRunning = false;
            } catch (cause) {
              yield* logger.error(`Failed to terminate ${pid}`, cause);
            }
          }),

        /**
         * Send SIGINT (Ctrl+C) to a process
         */
        interrupt: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (!process) {
              yield* logger.warn(`Process ${pid} not found for interrupt`);
              return;
            }

            try {
              yield* Effect.sync(() => {
                process.pty.kill("SIGINT");
              });

              // Give process time to handle SIGINT
              yield* Effect.sleep(100);

              // If still running, force kill
              if (process.isRunning && process.pty.pid > 0) {
                yield* Effect.sync(() => {
                  process.pty.kill("SIGTERM");
                });
              }

              yield* logger.info(`Interrupted process ${pid}`);
            } catch (cause) {
              yield* logger.error(`Failed to interrupt ${pid}`, cause);
            }
          }),

        /**
         * Create a stream of output from a process
         */
        recordStream: (pid: number, streamType: "stdout" | "stderr") =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (!process) {
              yield* logger.warn(`Process ${pid} not found for stream`);
              return Stream.empty<string>();
            }

            yield* logger.debug(
              `Attaching ${streamType} stream to process ${pid}`,
            );

            // For PTY, both stdout and stderr come from pty.onData
            // We'll use pty.onData event
            return Stream.asyncIterable(
              (async function* () {
                try {
                  for await (const data of process.pty) {
                    yield data.toString();
                  }
                } catch (err) {
                  // Stream ended or error occurred
                  yield* logger.debug(
                    `Stream ended for process ${pid}`,
                  );
                }
              })(),
            );
          }),

        /**
         * Get all streams for a process
         */
        getAllStreams: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (!process) {
              return {
                stdout: Stream.empty<string>(),
                stderr: Stream.empty<string>(),
              };
            }

            const stdout = yield* ProcessService.recordStream(pid, "stdout");
            const stderr = yield* ProcessService.recordStream(pid, "stderr");

            return { stdout, stderr };
          }),

        /**
         * Check if a process is running
         */
        isRunning: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            return process?.isRunning ?? false;
          }),

        /**
         * Get the exit code of a completed process
         */
        getExitCode: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            return process?.exitCode ?? -1;
          }),

        /**
         * Clear stream data for a process (not applicable for PTY)
         */
        clearStreams: (pid: number) =>
          Effect.gen(function* () {
            yield* logger.debug(`Cleared streams for process ${pid}`);
          }),
      };
    }),
    dependencies: [LoggerService.Default],
  },
) { }
