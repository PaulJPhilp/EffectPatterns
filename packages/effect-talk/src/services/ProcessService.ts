import { Effect, Stream } from "effect";
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
  stdout: string[];
  stderr: string[];
  isRunning: boolean;
}

/**
 * Service for spawning and managing child processes via node-pty
 * Currently uses mock implementation; will be replaced with actual node-pty
 */
export class ProcessService extends Effect.Service<ProcessService>()(
  "ProcessService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const logger = yield* LoggerService;

      // In-memory process registry for tracking active processes
      const processes = new Map<number, ProcessState>();
      let pidCounter = 1000;

      return {
        /**
         * Spawn a new process with PTY
         */
        spawn: (command: string, cwd: string, env: Record<string, string>) =>
          Effect.gen(function* () {
            yield* logger.info(`Spawning process: ${command} in ${cwd}`);

            const pid = pidCounter++;
            const handle: ProcessHandle = {
              pid,
              command,
              cwd,
            };

            // Register process
            processes.set(pid, {
              pid,
              command,
              cwd,
              stdout: [],
              stderr: [],
              isRunning: true,
            });

            yield* logger.debug(`Process ${pid} registered`);
            return handle;
          }),

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

            yield* logger.debug(
              `Sending input to process ${pid}: ${input.length} bytes`,
            );
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

            yield* logger.info(`Terminating process ${pid} with ${signal}`);
            process.isRunning = false;
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

            yield* logger.info(`Interrupting process ${pid}`);
            process.isRunning = false;
          }),

        /**
         * Create a stream of output from a process (mock implementation)
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

            // Mock implementation: simulate process output
            return Stream.fromIterable([
              `[${streamType}] Command: ${process.command}\n`,
              `[${streamType}] Working directory: ${process.cwd}\n`,
              `[${streamType}] Process ID: ${pid}\n`,
              `[${streamType}] Starting execution...\n`,
            ]).pipe(
              Stream.delays(100),
              Stream.tap(() => Effect.sync(() => { })),
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
         * Clear stream data for a process
         */
        clearStreams: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            if (process) {
              process.stdout = [];
              process.stderr = [];
              yield* logger.debug(`Cleared streams for process ${pid}`);
            }
          }),

        /**
         * Check if a process is running
         */
        isRunning: (pid: number) =>
          Effect.gen(function* () {
            const process = processes.get(pid);
            return process?.isRunning ?? false;
          }),
      };
    }),
    dependencies: [LoggerService.Default],
  },
) { }
