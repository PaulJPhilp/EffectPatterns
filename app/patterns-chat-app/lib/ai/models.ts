/**
 * Type-safe model system for the chat application.
 *
 * All supported model IDs are centralized here to prevent sync issues
 * between the frontend, API schema, and backend implementations.
 */

import { z } from "zod";

/**
 * All valid chat model IDs.
 * This is the single source of truth for model IDs.
 */
export const CHAT_MODEL_IDS = {
  DEFAULT: "chat-model",
  REASONING: "chat-model-reasoning",
  GPT_5: "gpt-5",
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GPT_4_1: "gpt-4.1",
  GPT_5_MINI: "gpt-5-mini",
  CLAUDE_4_5_HAIKU: "claude-4.5-haiku",
} as const;

/**
 * Branded type for chat model IDs.
 * Ensures only valid model IDs can be used throughout the application.
 */
export type ChatModelId = (typeof CHAT_MODEL_IDS)[keyof typeof CHAT_MODEL_IDS];

/**
 * Zod schema for type-safe model ID validation.
 * Automatically stays in sync with CHAT_MODEL_IDS.
 */
export const chatModelIdSchema = z.enum(
  Object.values(CHAT_MODEL_IDS) as [ChatModelId, ...ChatModelId[]]
);

export type ChatModel = {
  id: ChatModelId;
  name: string;
  description: string;
};

export const DEFAULT_CHAT_MODEL: ChatModelId = CHAT_MODEL_IDS.DEFAULT;

export const chatModels: ChatModel[] = [
  {
    id: CHAT_MODEL_IDS.DEFAULT,
    name: "Gemini 2.5 Flash",
    description: "Google's next-generation fast and efficient multimodal model (default)",
  },
  {
    id: CHAT_MODEL_IDS.REASONING,
    name: "Grok Reasoning",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
  {
    id: CHAT_MODEL_IDS.GPT_5,
    name: "GPT-5",
    description: "OpenAI's next-generation language model",
  },
  {
    id: CHAT_MODEL_IDS.GEMINI_2_0_FLASH,
    name: "Gemini 2.0 Flash",
    description: "Google's fast and efficient multimodal model (deprecated)",
  },
  {
    id: CHAT_MODEL_IDS.GEMINI_2_5_FLASH,
    name: "Gemini 2.5 Flash (Explicit)",
    description: "Explicitly select Google's next-generation Gemini 2.5 model",
  },
  {
    id: CHAT_MODEL_IDS.GPT_4_1,
    name: "GPT-4.1",
    description: "OpenAI's advanced language model with improved capabilities",
  },
  {
    id: CHAT_MODEL_IDS.GPT_5_MINI,
    name: "GPT-5 Mini",
    description: "OpenAI's smaller, faster next-generation language model",
  },
  {
    id: CHAT_MODEL_IDS.CLAUDE_4_5_HAIKU,
    name: "Claude 4.5 Haiku",
    description: "Anthropic's fast and efficient next-generation model",
  },
];

/**
 * Helper functions for model capabilities
 */

/**
 * Checks if a model is the reasoning model.
 * Use this instead of string comparisons: `isReasoningModel(modelId)`
 */
export const isReasoningModel = (modelId: ChatModelId): boolean =>
  modelId === CHAT_MODEL_IDS.REASONING;

/**
 * Checks if a model supports file attachments.
 * Reasoning models do not support attachments.
 */
export const supportsAttachments = (modelId: ChatModelId): boolean =>
  !isReasoningModel(modelId);
