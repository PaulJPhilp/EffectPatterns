import { processPromptFromText, generateObject, generateText, processPromptFromMdx, streamText } from "./service.js";
export interface LLMServiceApi {
    generateText: typeof generateText;
    generateObject: typeof generateObject;
    processPromptFromMdx: typeof processPromptFromMdx;
    processPromptFromText: typeof processPromptFromText;
    streamText: typeof streamText;
}
