/**
 * JSON Schema 2020-12 Definitions for MCP 2.0 Tools
 *
 * This file contains all JSON Schema definitions using the 2020-12 dialect
 * for proper MCP 2.0 compliance and validation.
 */

// Base schema structure for JSON Schema 2020-12
export const JSON_SCHEMA_DIALECT =
    "https://json-schema.org/draft/2020-12/schema";

// Common types used across schemas
export const CommonSchemas = {
    // String with description
    string: (description: string, minLength = 0, maxLength?: number) => ({
        type: "string" as const,
        description,
        minLength,
        ...(maxLength && { maxLength }),
    }),

    // Integer with constraints
    integer: (description: string, minimum?: number, maximum?: number) => ({
        type: "integer" as const,
        description,
        ...(minimum !== undefined && { minimum }),
        ...(maximum !== undefined && { maximum }),
    }),

    // Array of strings
    stringArray: (description: string, items?: { enum?: string[] }) => ({
        type: "array" as const,
        description,
        items: {
            type: "string" as const,
            ...items,
        },
    }),

    // Object with filename and source
    fileObject: () => ({
        type: "object" as const,
        properties: {
            filename: {
                type: "string" as const,
                description: "File path for context",
            },
            source: {
                type: "string" as const,
                description: "File source code content",
            },
        },
        required: ["filename", "source"],
    }),
};

// Tool schema definitions
export const ToolSchemas = {
    // Search Patterns Tool
    searchPatterns: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Search Patterns",
        description:
            "Search Effect-TS patterns by query, category, difficulty level, and more",
        properties: {
            q: CommonSchemas.string("Search query string", 1),
            category: {
                type: "string" as const,
                description: "Pattern category filter",
                enum: ["validation", "service", "error-handling", "composition"],
            },
            difficulty: {
                type: "string" as const,
                description: "Difficulty level filter",
                enum: ["beginner", "intermediate", "advanced"],
            },
            limit: CommonSchemas.integer(
                "Maximum number of results to return",
                1,
                100,
            ),
        },
        additionalProperties: false,
    },

    // Get Pattern Tool
    getPattern: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Get Pattern",
        description: "Get full details for a specific pattern by ID",
        properties: {
            id: CommonSchemas.string(
                "Pattern identifier (e.g., 'effect-service')",
                1,
            ),
        },
        required: ["id"],
        additionalProperties: false,
    },

    // List Analysis Rules Tool
    listAnalysisRules: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "List Analysis Rules",
        description:
            "List all available code analysis rules for anti-pattern detection",
        properties: {},
        additionalProperties: false,
    },

    // Analyze Code Tool
    analyzeCode: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Analyze Code",
        description:
            "Analyze TypeScript code for Effect-TS anti-patterns and best practices violations",
        properties: {
            source: CommonSchemas.string("TypeScript source code to analyze", 1),
            filename: CommonSchemas.string(
                "Filename for context (e.g., 'service.ts')",
            ),
            analysisType: {
                type: "string" as const,
                description: "Type of analysis to perform",
                enum: ["validation", "patterns", "errors", "all"],
                default: "all",
            },
        },
        required: ["source"],
        additionalProperties: false,
    },

    // Review Code Tool
    reviewCode: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Review Code",
        description:
            "Get AI-powered architectural review and recommendations for Effect code",
        properties: {
            code: CommonSchemas.string("Source code to review", 1),
            filePath: CommonSchemas.string(
                "File path for context (e.g., 'src/services/user.ts')",
            ),
        },
        required: ["code"],
        additionalProperties: false,
    },

    // Generate Pattern Code Tool
    generatePatternCode: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Generate Pattern Code",
        description: "Generate customized code from a pattern template",
        properties: {
            patternId: CommonSchemas.string(
                "Pattern template ID (e.g., 'effect-service', 'error-handler')",
                1,
            ),
            variables: {
                type: "object" as const,
                description: "Variables for template substitution (key-value pairs)",
                additionalProperties: {
                    type: "string" as const,
                },
                propertyNames: {
                    type: "string" as const,
                    pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
                    description: "Variable names must be valid identifiers",
                },
            },
        },
        required: ["patternId"],
        additionalProperties: false,
    },

    // Analyze Consistency Tool
    analyzeConsistency: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Analyze Consistency",
        description:
            "Detect inconsistencies and anti-patterns across multiple TypeScript files",
        properties: {
            files: {
                type: "array" as const,
                description: "Files to analyze",
                items: CommonSchemas.fileObject(),
                minItems: 1,
                maxItems: 50,
            },
        },
        required: ["files"],
        additionalProperties: false,
    },

    // Apply Refactoring Tool
    applyRefactoring: {
        $schema: JSON_SCHEMA_DIALECT,
        type: "object" as const,
        title: "Apply Refactoring",
        description: "Apply automated refactoring patterns to code",
        properties: {
            refactoringIds: {
                type: "array" as const,
                description: "List of refactoring IDs to apply",
                items: CommonSchemas.string("Refactoring identifier", 1),
                minItems: 1,
                maxItems: 10,
            },
            files: {
                type: "array" as const,
                description: "Files to refactor",
                items: CommonSchemas.fileObject(),
                minItems: 1,
                maxItems: 50,
            },
            preview: {
                type: "boolean" as const,
                description: "Preview changes without applying (safe default)",
                default: true,
            },
        },
        required: ["refactoringIds", "files"],
        additionalProperties: false,
    },
};

// Type exports for TypeScript integration
export type SearchPatternsArgs = {
    q?: string;
    category?: "validation" | "service" | "error-handling" | "composition";
    difficulty?: "beginner" | "intermediate" | "advanced";
    limit?: number;
};

export type GetPatternArgs = {
    id: string;
};

export type ListAnalysisRulesArgs = Record<string, never>;

export type AnalyzeCodeArgs = {
    source: string;
    filename?: string;
    analysisType?: "validation" | "patterns" | "errors" | "all";
};

export type ReviewCodeArgs = {
    code: string;
    filePath?: string;
};

export type GeneratePatternCodeArgs = {
    patternId: string;
    variables?: Record<string, string>;
};

export type AnalyzeConsistencyArgs = {
    files: Array<{
        filename: string;
        source: string;
    }>;
};

export type ApplyRefactoringArgs = {
    refactoringIds: string[];
    files: Array<{
        filename: string;
        source: string;
    }>;
    preview?: boolean;
};
