/**
 * Interactive Dialog Helpers
 * Pure utility functions for CLI prompts using Node.js readline
 */

import { createInterface } from "readline";
import { Effect } from "effect";
import chalk from "chalk";

/**
 * Create a readline interface
 */
const createReadlineInterface = () =>
  createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
  });

/**
 * Prompt user with a question
 */
export const prompt = (question: string): Effect.Effect<string> =>
  Effect.tryPromise({
    try: () => {
      const rl = createReadlineInterface();

      return new Promise<string>((resolve) => {
        rl.question(chalk.cyan(`${question}: `), (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    },
    catch: (error) => new Error(`Failed to read input: ${error}`),
  });

/**
 * Prompt for multiline input (e.g., memory content)
 * Type 'END' on a new line to finish
 */
export const promptMultiline = (question: string): Effect.Effect<string> =>
  Effect.gen(function* () {
    yield* Effect.sync(() => {
      console.log(chalk.cyan(`${question}:`));
      console.log(chalk.gray("(Type END on a new line to finish)"));
    });

    return yield* Effect.tryPromise({
      try: () => {
        const rl = createReadlineInterface();
        const lines: string[] = [];

        return new Promise<string>((resolve) => {
          rl.on("line", (line) => {
            if (line.trim().toUpperCase() === "END") {
              rl.close();
              resolve(lines.join("\n"));
            } else {
              lines.push(line);
            }
          });

          rl.on("close", () => {
            resolve(lines.join("\n"));
          });
        });
      },
      catch: (error) => new Error(`Failed to read input: ${error}`),
    });
  });

/**
 * Prompt for choice from options
 */
export const promptChoice = (
  question: string,
  options: string[]
): Effect.Effect<string> =>
  Effect.gen(function* () {
    yield* Effect.sync(() => {
      console.log(chalk.cyan(`${question}:`));
      options.forEach((opt, idx) => {
        console.log(chalk.gray(`  ${idx + 1}. ${opt}`));
      });
    });

    return yield* Effect.tryPromise({
      try: () => {
        const rl = createReadlineInterface();

        return new Promise<string>((resolve) => {
          rl.question(chalk.cyan(`Choose (1-${options.length}): `), (answer) => {
            rl.close();
            const idx = parseInt(answer, 10) - 1;
            if (idx >= 0 && idx < options.length) {
              resolve(options[idx]);
            } else {
              resolve(options[0]);
            }
          });
        });
      },
      catch: (error) => new Error(`Failed to read input: ${error}`),
    });
  });

/**
 * Prompt for confirmation (yes/no)
 */
export const promptConfirm = (question: string): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: () => {
      const rl = createReadlineInterface();

      return new Promise<boolean>((resolve) => {
        rl.question(chalk.cyan(`${question} (yes/no): `), (answer) => {
          rl.close();
          resolve(answer.toLowerCase().startsWith("y"));
        });
      });
    },
    catch: (error) => new Error(`Failed to read input: ${error}`),
  });

