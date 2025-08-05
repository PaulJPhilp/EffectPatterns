import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { Liquid } from "liquidjs";
import { parse as parseYaml } from "yaml";
const liquid = new Liquid();
export class TemplateService extends Effect.Service()("TemplateService", {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const loadTemplate = (filePath) => Effect.gen(function* () {
            // Check file extension first
            if (!filePath.endsWith('.mdx')) {
                return yield* Effect.fail(new Error("Only .mdx files are supported"));
            }
            const content = yield* fs.readFileString(filePath);
            // Parse frontmatter from MDX content
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
            if (!frontmatterMatch) {
                return yield* Effect.fail(new Error("No frontmatter found in .mdx file"));
            }
            const [, frontmatterContent, templateContent] = frontmatterMatch;
            // Parse YAML frontmatter
            let metadata;
            try {
                metadata = parseYaml(frontmatterContent);
            }
            catch (error) {
                return yield* Effect.fail(new Error(`Invalid YAML frontmatter: ${error}`));
            }
            // Extract parameters from frontmatter
            const parameters = {};
            const paramsObj = (metadata.parameters || {});
            for (const [key, value] of Object.entries(paramsObj)) {
                if (typeof value === "object" && value !== null && "type" in value) {
                    const paramValue = value;
                    const type = paramValue.type;
                    if (typeof type === "string" && ["string", "number", "boolean", "array", "object"].includes(type)) {
                        parameters[key] = {
                            type: type,
                            description: typeof paramValue.description === "string" ? paramValue.description : undefined,
                            required: typeof paramValue.required === "boolean" ? paramValue.required : undefined,
                            default: paramValue.default
                        };
                    }
                    else {
                        continue;
                    }
                }
                else {
                    continue;
                }
            }
            return {
                content: templateContent.trim(),
                parameters,
                metadata
            };
        });
        const validateParameterType = (value, expectedType) => {
            switch (expectedType) {
                case "string":
                    return typeof value === "string"
                        ? Effect.void
                        : Effect.fail(new Error(`Expected string but got ${typeof value}`));
                case "number":
                    return typeof value === "number"
                        ? Effect.void
                        : Effect.fail(new Error(`Expected number but got ${typeof value}`));
                case "boolean":
                    return typeof value === "boolean"
                        ? Effect.void
                        : Effect.fail(new Error(`Expected boolean but got ${typeof value}`));
                case "array":
                    return Array.isArray(value)
                        ? Effect.void
                        : Effect.fail(new Error(`Expected array but got ${typeof value}`));
                case "object":
                    return typeof value === "object" && value !== null && !Array.isArray(value)
                        ? Effect.void
                        : Effect.fail(new Error(`Expected object, got ${typeof value}`));
                default:
                    return Effect.void;
            }
        };
        const validateParameters = (template, parameters) => Effect.gen(function* () {
            const templateParams = template.parameters;
            const providedParams = new Set(Object.keys(parameters));
            const requiredParams = Object.entries(templateParams)
                .filter(([, def]) => def.required !== false)
                .map(([name]) => name);
            // Check for missing required parameters
            const missingParams = requiredParams.filter((param) => !providedParams.has(param));
            if (missingParams.length > 0) {
                return yield* Effect.fail(new Error(`Missing required parameters: ${missingParams.join(", ")}`));
            }
            // Check for unknown parameters
            const unknownParams = Array.from(providedParams).filter((param) => !(param in templateParams));
            if (unknownParams.length > 0) {
                return yield* Effect.fail(new Error(`Unknown parameters: ${unknownParams.join(", ")}`));
            }
            // Validate parameter types
            for (const [name, value] of Object.entries(parameters)) {
                const definition = templateParams[name];
                // Ensure definition is a valid ParameterDefinition with a type property
                if (!definition || typeof definition !== 'object' || !('type' in definition) || !definition.type)
                    continue;
                yield* validateParameterType(value, definition.type);
            }
        });
        const renderTemplate = (template, parameters) => Effect.gen(function* () {
            // Validate parameters first
            yield* validateParameters(template, parameters);
            // Merge parameters with default values
            const mergedParams = {};
            // Add default values
            for (const [name, definition] of Object.entries(template.parameters)) {
                if ('default' in definition && definition.default !== undefined) {
                    mergedParams[name] = definition.default;
                }
            }
            // Override with provided values
            for (const [name, value] of Object.entries(parameters)) {
                mergedParams[name] = value;
            }
            // Render template with Liquid
            try {
                const rendered = yield* Effect.promise(() => liquid.parseAndRender(template.content, mergedParams));
                return rendered;
            }
            catch (error) {
                return yield* Effect.fail(new Error(`Template rendering failed: ${error}`));
            }
        });
        return {
            loadTemplate,
            renderTemplate,
            validateParameters
        };
    }),
    dependencies: []
}) {
}
// Helper function to load and render a template in one step
export const renderPromptTemplate = (templatePath, parameters) => Effect.gen(function* () {
    const templateService = yield* TemplateService;
    const template = yield* templateService.loadTemplate(templatePath);
    const rendered = yield* templateService.renderTemplate(template, parameters);
    return rendered;
});
