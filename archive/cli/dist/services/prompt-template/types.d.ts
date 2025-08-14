export interface ParameterDefinition {
    readonly type: "string" | "number" | "boolean" | "array" | "object";
    readonly description?: string;
    readonly required?: boolean;
    readonly default?: unknown;
}
export interface PromptTemplate {
    readonly content: string;
    readonly parameters: Record<string, ParameterDefinition>;
    readonly metadata: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map