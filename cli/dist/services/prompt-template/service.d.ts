import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { MdxService } from "../mdx-service/service.js";
export interface PromptTemplate {
    readonly content: string;
    readonly parameters: Record<string, ParameterDefinition>;
    readonly metadata: Record<string, unknown>;
}
export interface ParameterDefinition {
    readonly type: "string" | "number" | "boolean" | "array" | "object";
    readonly description?: string;
    readonly required?: boolean;
    readonly default?: unknown;
}
declare const TemplateService_base: Effect.Service.Class<TemplateService, "TemplateService", {
    readonly effect: Effect.Effect<{
        readonly loadTemplate: (filePath: string) => Effect.Effect<PromptTemplate, Error>;
        readonly renderTemplate: (template: PromptTemplate, parameters: Record<string, unknown>) => Effect.Effect<string, Error>;
        readonly validateParameters: (template: PromptTemplate, parameters: Record<string, unknown>) => Effect.Effect<void, Error>;
    }, never, MdxService | FileSystem.FileSystem | Path.Path>;
    readonly dependencies: readonly [import("effect/Layer").Layer<MdxService, never, FileSystem.FileSystem>];
}>;
export declare class TemplateService extends TemplateService_base {
}
export declare const renderPromptTemplate: (templatePath: string, parameters: Record<string, unknown>) => Effect.Effect<string, Error, TemplateService>;
export {};
