export { InvalidMdxFormatError, InvalidFrontmatterError } from "./errors.js";
export interface Frontmatter {
    readonly expectedOutput?: string;
    readonly expectedError?: string;
    needsReview?: boolean;
    readonly [key: string]: unknown;
}
export interface ParsedMdxFile {
    readonly content: string;
    readonly frontmatter: Frontmatter;
    readonly body: string;
}
export interface ParameterDefinition {
    type: "string" | "number" | "boolean" | "array" | "object";
    description?: string;
    required?: boolean;
    default?: unknown;
}
export interface PromptTemplate {
    readonly content: string;
    readonly parameters: Record<string, ParameterDefinition>;
    readonly body: string;
}
//# sourceMappingURL=types.d.ts.map