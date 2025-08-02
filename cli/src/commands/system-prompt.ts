import { Command, Args, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
import { Path } from "@effect/platform";

// system-prompt file <file-name>
const systemPromptFile = Command.make(
  "file",
  { 
    file: Args.file({ name: "file-name", exists: "yes" })
  },
  ({ file }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const path = yield* Path.Path;
      const templateService = yield* TemplateService;
      
      // Verify the file is a valid prompt template
      const absolutePath = path.resolve(file);
      yield* templateService.loadTemplate(absolutePath);
      
      // Store the system prompt file path
      yield* config.setSystemPromptFile(absolutePath);
      yield* Console.log(`System prompt set to: ${absolutePath}`);
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error setting system prompt: ${error.message}`).pipe(
          Effect.andThen(Effect.fail(error))
        )
      )
    )
);

// system-prompt clear
const systemPromptClear = Command.make(
  "clear",
  {},
  () =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      yield* config.clearSystemPromptFile();
      yield* Console.log("System prompt cleared");
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error clearing system prompt: ${error.message}`).pipe(
          Effect.andThen(Effect.fail(error))
        )
      )
    )
);

export const systemPromptCommand = Command.make("system-prompt").pipe(
  Command.withSubcommands([systemPromptFile, systemPromptClear])
);
