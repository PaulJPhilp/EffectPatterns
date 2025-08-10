import { Command } from "@effect/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { modelList } from "./list.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { modelInfo } from "./info.js";

export const modelCommand = Command.make("model").pipe(
  Command.withSubcommands([modelList, modelInfo])
);
