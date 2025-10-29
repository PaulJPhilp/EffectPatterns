export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model-reasoning",
    name: "Grok Reasoning",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "OpenAI's next-generation language model",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Google's fast and efficient multimodal model",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google's next-generation fast and efficient multimodal model",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "OpenAI's advanced language model with improved capabilities",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "OpenAI's smaller, faster next-generation language model",
  },
  {
    id: "claude-4.5-haiku",
    name: "Claude 4.5 Haiku",
    description: "Anthropic's fast and efficient next-generation model",
  },
];
