import { Args, Options } from "@effect/cli";
import { Effect } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
import { TemplateService } from "../../services/prompt-template/service.js";
import { Path } from "@effect/platform";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommand, printText, getGlobalOutputOptions } from "../_shared.js";
export const systemPromptFile = makeCommand("file", {
    file: Args.file({ name: "file-name", exists: "yes" }).pipe(Args.withDescription("Path to a valid prompt template file")),
    output: Options.text("output").pipe(Options.optional, Options.withAlias("o")),
}, ({ file, output }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const path = yield* Path.Path;
    const templateService = yield* TemplateService;
    // Verify the file is a valid prompt template
    const absolutePath = path.resolve(file);
    yield* templateService.loadTemplate(absolutePath);
    // Store the system prompt file path
    yield* config.setSystemPromptFile(absolutePath);
    // Resolve output target: prefer local --output, fall back to group-level
    const outOpt = output;
    const localOut = outOpt && outOpt._tag === "Some" ? outOpt.value : undefined;
    const globalOut = getGlobalOutputOptions()?.outputFile;
    const outputFile = localOut ?? globalOut;
    yield* printText(`System prompt set to: ${absolutePath}`, outputFile ? { outputFile } : undefined);
}), {
    description: "Set the global system prompt file",
    errorPrefix: "Error setting system prompt",
});
//# sourceMappingURL=file.js.map