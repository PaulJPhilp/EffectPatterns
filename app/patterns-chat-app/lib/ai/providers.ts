import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
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

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
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
        "chat-model": google.languageModel(
          process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash"
        ),
        "chat-model-reasoning": wrapLanguageModel({
          model: xai.languageModel(process.env.XAI_MODEL || "grok-2-latest"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openai.languageModel(
          process.env.OPENAI_MODEL || "gpt-3.5-turbo"
        ),
        "artifact-model": openai.languageModel(
          process.env.OPENAI_MODEL || "gpt-3.5-turbo"
        ),
        "gpt-5": openai.languageModel("gpt-4o"),
        "gemini-2.0-flash": google.languageModel("gemini-2.0-flash"), // deprecated in 2 weeks, use 2.5 instead
        "gemini-2.5-flash": google.languageModel("gemini-2.5-flash"),
        "gpt-4.1": openai.languageModel("gpt-4-turbo"),
        "gpt-5-mini": openai.languageModel("gpt-4-turbo"),
        "claude-4.5-haiku": anthropic.languageModel(
          "claude-3-5-haiku-20241022"
        ),
      },
    });
