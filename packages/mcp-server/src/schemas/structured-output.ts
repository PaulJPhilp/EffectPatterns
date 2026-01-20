/**
 * Structured Tool Output and Annotations for MCP 2.0
 *
 * This file contains definitions for structured content, annotations,
 * and enhanced response formats for better client integration.
 */

// ============================================================================
// Structured Content Types
// ============================================================================

export interface StructuredContent {
    type: "structured";
    mimeType: string;
    data: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface TextContent {
    type: "text";
    text: string;
}

export interface ImageContent {
    type: "image";
    data: string; // base64 encoded
    mimeType: string;
}

export interface ResourceContent {
    type: "resource";
    resource: {
        uri: string;
        name?: string;
        description?: string;
        mimeType?: string;
    };
}

export type ToolContent =
    | TextContent
    | ImageContent
    | ResourceContent
    | StructuredContent;

// ============================================================================
// Tool Annotations
// ============================================================================

export interface ToolAnnotation {
    type: "info" | "warning" | "error" | "success" | "progress";
    title: string;
    message: string;
    details?: Record<string, any>;
    timestamp?: string;
    severity?: "low" | "medium" | "high" | "critical";
}

export interface ToolResponseMetadata {
    executionTime?: number; // milliseconds
    requestId?: string;
    sessionId?: string;
    version?: string;
    annotations?: ToolAnnotation[];
    relatedTools?: string[];
    nextSteps?: string[];
    warnings?: string[];
}

// ============================================================================
// Enhanced Tool Response
// ============================================================================

export interface EnhancedToolResponse {
    content: ToolContent[];
    metadata?: ToolResponseMetadata;
    isError?: boolean;
    error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

// ============================================================================
// Structured Content Builders
// ============================================================================

export class ContentBuilder {
    static text(text: string): TextContent {
        return { type: "text", text };
    }

    static structured(
        mimeType: string,
        data: Record<string, any>,
        metadata?: Record<string, any>,
    ): StructuredContent {
        return {
            type: "structured",
            mimeType,
            data,
            metadata,
        };
    }

    static json(data: Record<string, any>, title?: string): StructuredContent {
        return this.structured("application/json", data, {
            title,
            timestamp: new Date().toISOString(),
        });
    }

    static markdown(markdown: string): StructuredContent {
        return this.structured(
            "text/markdown",
            { content: markdown },
            {
                format: "markdown",
                timestamp: new Date().toISOString(),
            },
        );
    }

    static html(html: string): StructuredContent {
        return this.structured(
            "text/html",
            { content: html },
            {
                format: "html",
                timestamp: new Date().toISOString(),
            },
        );
    }

    static image(base64Data: string, mimeType: string): ImageContent {
        return {
            type: "image",
            data: base64Data,
            mimeType,
        };
    }

    static resource(
        uri: string,
        name?: string,
        description?: string,
        mimeType?: string,
    ): ResourceContent {
        return {
            type: "resource",
            resource: {
                uri,
                name,
                description,
                mimeType,
            },
        };
    }
}

// ============================================================================
// Annotation Builders
// ============================================================================

export class AnnotationBuilder {
    static info(
        title: string,
        message: string,
        details?: Record<string, any>,
    ): ToolAnnotation {
        return {
            type: "info",
            title,
            message,
            details,
            timestamp: new Date().toISOString(),
            severity: "low",
        };
    }

    static warning(
        title: string,
        message: string,
        details?: Record<string, any>,
        severity: "low" | "medium" | "high" = "medium",
    ): ToolAnnotation {
        return {
            type: "warning",
            title,
            message,
            details,
            timestamp: new Date().toISOString(),
            severity,
        };
    }

    static error(
        title: string,
        message: string,
        details?: Record<string, any>,
        severity: "medium" | "high" | "critical" = "high",
    ): ToolAnnotation {
        return {
            type: "error",
            title,
            message,
            details,
            timestamp: new Date().toISOString(),
            severity,
        };
    }

    static success(
        title: string,
        message: string,
        details?: Record<string, any>,
    ): ToolAnnotation {
        return {
            type: "success",
            title,
            message,
            details,
            timestamp: new Date().toISOString(),
            severity: "low",
        };
    }

    static progress(
        title: string,
        message: string,
        current: number,
        total: number,
        details?: Record<string, any>,
    ): ToolAnnotation {
        return {
            type: "progress",
            title,
            message,
            details: {
                ...details,
                progress: {
                    current,
                    total,
                    percentage: Math.round((current / total) * 100),
                },
            },
            timestamp: new Date().toISOString(),
            severity: "low",
        };
    }
}

// ============================================================================
// Enhanced Response Builder
// ============================================================================

export class ResponseBuilder {
    private response: EnhancedToolResponse = {
        content: [],
        metadata: {
            executionTime: 0,
            requestId: crypto.randomUUID(),
            version: "2.0.0",
            annotations: [],
        },
    };

    static create(): ResponseBuilder {
        const builder = new ResponseBuilder();
        if (builder.response.metadata) {
            builder.response.metadata.executionTime = 0;
            builder.response.metadata.requestId = crypto.randomUUID();
            builder.response.metadata.version = "2.0.0";
            builder.response.metadata.annotations = [];
        }
        return builder;
    }

    addContent(content: ToolContent): ResponseBuilder {
        this.response.content.push(content);
        return this;
    }

    addText(text: string): ResponseBuilder {
        return this.addContent(ContentBuilder.text(text));
    }

    addJson(data: Record<string, any>, title?: string): ResponseBuilder {
        return this.addContent(ContentBuilder.json(data, title));
    }

    addMarkdown(markdown: string): ResponseBuilder {
        return this.addContent(ContentBuilder.markdown(markdown));
    }

    addAnnotation(annotation: ToolAnnotation): ResponseBuilder {
        if (!this.response.metadata) {
            this.response.metadata = { annotations: [] };
        }
        if (!this.response.metadata.annotations) {
            this.response.metadata.annotations = [];
        }
        this.response.metadata.annotations.push(annotation);
        return this;
    }

    addInfo(
        title: string,
        message: string,
        details?: Record<string, any>,
    ): ResponseBuilder {
        return this.addAnnotation(AnnotationBuilder.info(title, message, details));
    }

    addWarning(
        title: string,
        message: string,
        details?: Record<string, any>,
        severity?: "low" | "medium" | "high",
    ): ResponseBuilder {
        return this.addAnnotation(
            AnnotationBuilder.warning(title, message, details, severity),
        );
    }

    addError(
        title: string,
        message: string,
        details?: Record<string, any>,
        severity?: "medium" | "high" | "critical",
    ): ResponseBuilder {
        return this.addAnnotation(
            AnnotationBuilder.error(title, message, details, severity),
        );
    }

    addSuccess(
        title: string,
        message: string,
        details?: Record<string, any>,
    ): ResponseBuilder {
        return this.addAnnotation(
            AnnotationBuilder.success(title, message, details),
        );
    }

    setExecutionTime(milliseconds: number): ResponseBuilder {
        if (!this.response.metadata) {
            this.response.metadata = {};
        }
        this.response.metadata.executionTime = milliseconds;
        return this;
    }

    setRelatedTools(tools: string[]): ResponseBuilder {
        if (!this.response.metadata) {
            this.response.metadata = {};
        }
        this.response.metadata.relatedTools = tools;
        return this;
    }

    setNextSteps(steps: string[]): ResponseBuilder {
        if (!this.response.metadata) {
            this.response.metadata = {};
        }
        this.response.metadata.nextSteps = steps;
        return this;
    }

    setWarnings(warnings: string[]): ResponseBuilder {
        if (!this.response.metadata) {
            this.response.metadata = {};
        }
        this.response.metadata.warnings = warnings;
        return this;
    }

    setError(
        code: string,
        message: string,
        details?: Record<string, any>,
    ): ResponseBuilder {
        this.response.isError = true;
        this.response.error = { code, message, details };
        return this;
    }

    build(): EnhancedToolResponse {
        return this.response;
    }
}

// Utility Functions
// ============================================================================

export function createSuccessResponse(
    content: ToolContent[],
    _metadata?: Partial<ToolResponseMetadata>,
): EnhancedToolResponse {
    const builder = ResponseBuilder.create();
    content.forEach((item) => builder.addContent(item));
    return builder
        .addSuccess("Success", "Operation completed successfully")
        .build();
}

export function createErrorResponse(
    code: string,
    message: string,
    details?: Record<string, any>,
): EnhancedToolResponse {
    return ResponseBuilder.create()
        .setError(code, message, details)
        .addError("Error", message, details)
        .build();
}

export function createProgressResponse(
    current: number,
    total: number,
    message: string,
    details?: Record<string, any>,
): EnhancedToolResponse {
    return ResponseBuilder.create()
        .addAnnotation(
            AnnotationBuilder.progress(
                "In Progress",
                message,
                current,
                total,
                details,
            ),
        )
        .build();
}

// ============================================================================
// Pattern-Specific Content Builders
// ============================================================================

export class PatternContentBuilder {
    static patternSummary(pattern: any): StructuredContent {
        return ContentBuilder.json(
            {
                id: pattern.id,
                title: pattern.title,
                description: pattern.description,
                category: pattern.category,
                difficulty: pattern.difficulty,
                tags: pattern.tags || [],
                codeSnippet: pattern.codeSnippet
                    ? pattern.codeSnippet.substring(0, 200) + "..."
                    : undefined,
            },
            "Pattern Summary",
        );
    }

    static patternDetails(pattern: any): StructuredContent {
        const markdown = `
# ${pattern.title}

**Category**: ${pattern.category}  
**Difficulty**: ${pattern.difficulty}  
**Tags**: ${pattern.tags?.join(", ") || "None"}

## Description
${pattern.description}

## Code Example
\`\`\`typescript
${pattern.codeSnippet}
\`\`\`

## Usage Notes
${pattern.usageNotes || "No specific usage notes available."}

## Best Practices
${pattern.bestPractices || "Follow general Effect-TS best practices."}
    `.trim();

        return ContentBuilder.markdown(markdown);
    }

    static searchResults(
        results: any[],
        query: string,
        total?: number,
    ): StructuredContent {
        return ContentBuilder.json(
            {
                query,
                results: results.map((p) => ({
                    id: p.id,
                    title: p.title,
                    description: p.description.substring(0, 150) + "...",
                    category: p.category,
                    difficulty: p.difficulty,
                    tags: p.tags || [],
                })),
                total: total || results.length,
                count: results.length,
            },
            "Search Results",
        );
    }

    static analysisResults(analysis: any): StructuredContent {
        const markdown = `
# Code Analysis Results

**File**: ${analysis.filename}  
**Analysis Type**: ${analysis.analysisType}  
**Issues Found**: ${analysis.issues?.length || 0}

## Summary
${analysis.summary || "No summary provided."}

## Issues
${analysis.issues
                ?.map(
                    (issue: any, index: number) => `
### ${index + 1}. ${issue.title}
**Severity**: ${issue.severity}  
**Line**: ${issue.line}  
**Type**: ${issue.type}

${issue.description}

**Suggestion**: ${issue.suggestion}
`,
                )
                .join("\n") || "No issues found."
            }

## Recommendations
${analysis.recommendations?.join("\n- ") || "No specific recommendations."}
    `.trim();

        return ContentBuilder.markdown(markdown);
    }
}
