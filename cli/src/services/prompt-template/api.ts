import { Effect } from "effect";
import { PromptTemplate } from "./types.js";

export interface TemplateServiceApi {
  loadTemplate: (filePath: string) => Effect.Effect<PromptTemplate, Error>;
  renderTemplate: (template: PromptTemplate, parameters: Record<string, unknown>) => Effect.Effect<string, Error>;
  validateParameters: (template: PromptTemplate, parameters: Record<string, unknown>) => Effect.Effect<void, Error>;
}