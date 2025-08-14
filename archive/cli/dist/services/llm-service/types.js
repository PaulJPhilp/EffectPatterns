import { AnthropicLanguageModel } from "@effect/ai-anthropic";
import { GoogleAiLanguageModel } from "@effect/ai-google";
import { OpenAiLanguageModel } from "@effect/ai-openai";
// Function to select model layer
export const selectModel = (provider, model) => {
    switch (provider) {
        case "google":
            return GoogleAiLanguageModel.layer({ model });
        case "openai":
            return OpenAiLanguageModel.layer({ model });
        case "anthropic":
            return AnthropicLanguageModel.layer({ model });
    }
};
//# sourceMappingURL=types.js.map