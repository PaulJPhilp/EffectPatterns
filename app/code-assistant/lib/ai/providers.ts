import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model-reasoning": wrapLanguageModel({
          model: anthropic.languageModel(process.env.ANTHROPIC_MODEL || "claude-3-opus-20240229"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openai.languageModel(process.env.OPENAI_MODEL || "gpt-3.5-turbo"),
        "artifact-model": openai.languageModel(process.env.OPENAI_MODEL || "gpt-3.5-turbo"),
        "gpt-5": openai.languageModel("gpt-4o"),
        "gemini-2.0-flash": google.languageModel("gemini-2.0-flash-001"),
        "gemini-2.5-flash": google.languageModel("gemini-2.5-flash"),
        "gpt-4.1": openai.languageModel("gpt-4.1"),
        "gpt-5-mini": openai.languageModel("gpt-5-mini"),
        "claude-4.5-haiku": anthropic.languageModel("claude-4.5-haiku"),
      },
    });
