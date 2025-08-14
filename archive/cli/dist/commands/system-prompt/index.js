// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { systemPromptFile } from "./file.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { systemPromptClear } from "./clear.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommandGroup } from "../_shared.js";
export const systemPromptCommand = makeCommandGroup("system-prompt", {}, [systemPromptFile, systemPromptClear], { description: "Manage the global system prompt file" });
//# sourceMappingURL=index.js.map