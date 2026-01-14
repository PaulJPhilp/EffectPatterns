# MCP Server Improvement Plan

## Overview

This plan outlines improvements to the Effect Patterns MCP server based on practical experience using it for code improvements. The goal is to enhance the server's ability to provide context-aware suggestions, automated refactoring, and cross-file pattern consistency.

## Current State

The MCP server currently provides:
- Pattern search and retrieval
- Documentation access
- Basic code examples

## Improvement Goals

1. **Context-Aware Analysis** - Analyze existing code and suggest improvements
2. **Pattern Library** - Curated patterns with ready-to-use code generation
3. **Automated Refactoring** - Apply suggested changes automatically
4. **Cross-File Consistency** - Ensure patterns are consistent across the codebase
5. **Real-Time Feedback** - Provide suggestions during development

---

## Phase 1: Define MCP Server Enhancement Architecture

### Duration: 1-2 days

### Tasks:

1. **Review Current MCP Server Structure**
   - Location: `app/mcp/mcp-server/`
   - Analyze existing tools and resources
   - Document current capabilities

2. **Define New Tool Interfaces**
   ```typescript
   // New tools to add:
   interface AnalyzeCodeTool {
     name: "analyze_code";
     input: {
       filePath: string;
       analysisType: "validation" | "patterns" | "errors" | "all";
     };
     output: {
       suggestions: Suggestion[];
       patterns: PatternMatch[];
       issues: Issue[];
     };
   }

   interface GeneratePatternTool {
     name: "generate_pattern";
     input: {
       patternType: string;
       context: Record<string, unknown>;
     };
     output: {
       code: string;
       imports: string[];
       explanation: string;
     };
   }

   interface ApplyRefactoringTool {
     name: "apply_refactoring";
     input: {
       filePath: string;
       refactoringId: string;
       options?: Record<string, unknown>;
     };
     output: {
       success: boolean;
       changes: FileChange[];
       errors?: string[];
     };
   }
   ```

3. **Design Pattern Library Schema**
   ```typescript
   interface PatternDefinition {
     id: string;
     name: string;
     category: "validation" | "service" | "error-handling" | "composition";
     description: string;
     template: string;
     variables: TemplateVariable[];
     examples: PatternExample[];
     relatedPatterns: string[];
   }
   ```

### Deliverables:
- [ ] Architecture document
- [ ] Tool interface definitions
- [ ] Pattern library schema
- [ ] Database schema updates (if needed)

---

## Phase 2: Implement Context-Aware Analysis

### Duration: 3-4 days

### Tasks:

1. **Create Code Analyzer Service**
   ```typescript
   // Location: app/mcp/mcp-server/src/services/analyzer/
   
   export class CodeAnalyzer extends Effect.Service<CodeAnalyzer>()(
     "CodeAnalyzer",
     {
       effect: Effect.gen(function* () {
         return {
           analyzeFile: (filePath: string) => Effect.gen(function* () {
             // Parse TypeScript AST
             // Detect patterns and anti-patterns
             // Generate suggestions
           }),
           
           detectPatterns: (code: string) => Effect.gen(function* () {
             // Identify Effect patterns in use
             // Find opportunities for improvement
           }),
           
           suggestImprovements: (analysis: Analysis) => Effect.gen(function* () {
             // Generate actionable suggestions
             // Prioritize by impact
           }),
         };
       }),
     }
   );
   ```

2. **Pattern Detection Rules**
   ```typescript
   // Rules for detecting patterns and anti-patterns
   const detectionRules = [
     {
       id: "missing-validation",
       pattern: /Effect\.gen\(function\*.*\{[^}]*yield\*.*FileSystem/,
       suggestion: "Add input validation using Effect.filterOrFail",
       priority: "high",
     },
     {
       id: "node-fs-usage",
       pattern: /import.*from\s+["']node:fs/,
       suggestion: "Use @effect/platform FileSystem instead",
       priority: "medium",
     },
     {
       id: "any-type",
       pattern: /:\s*any\b/,
       suggestion: "Replace 'any' with proper Effect types",
       priority: "high",
     },
   ];
   ```

3. **Implement MCP Tool**
   ```typescript
   // Add to MCP server tools
   server.tool(
     "analyze_code",
     "Analyze code for Effect pattern improvements",
     {
       filePath: z.string().describe("Path to the file to analyze"),
       analysisType: z.enum(["validation", "patterns", "errors", "all"]),
     },
     async ({ filePath, analysisType }) => {
       const analyzer = yield* CodeAnalyzer;
       const result = yield* analyzer.analyzeFile(filePath);
       return formatAnalysisResult(result);
     }
   );
   ```

### Deliverables:
- [ ] CodeAnalyzer service
- [ ] Pattern detection rules
- [ ] `analyze_code` MCP tool
- [ ] Unit tests for analyzer

---

## Phase 3: Add Pattern Library with Code Generation

### Duration: 3-4 days

### Tasks:

1. **Create Pattern Library**
   ```typescript
   // Location: app/mcp/mcp-server/src/patterns/
   
   export const EFFECT_PATTERNS = {
     validation: {
       filterOrFail: {
         id: "validation-filter-or-fail",
         name: "Input Validation with filterOrFail",
         template: `
   const validate{{Name}} = ({{paramName}}: {{paramType}}): Effect.Effect<{{paramType}}, Error> =>
     Effect.succeed({{paramName}}).pipe(
       Effect.filterOrFail(
         ({{shortName}}) => {{condition}},
         () => new Error(\`{{errorMessage}}\`)
       )
     );`,
         variables: [
           { name: "Name", description: "Validator name (PascalCase)" },
           { name: "paramName", description: "Parameter name" },
           { name: "paramType", description: "Parameter type" },
           { name: "shortName", description: "Short variable name" },
           { name: "condition", description: "Validation condition" },
           { name: "errorMessage", description: "Error message" },
         ],
       },
     },
     
     service: {
       effectService: {
         id: "service-effect-service",
         name: "Effect Service Pattern",
         template: `
   export class {{ServiceName}} extends Effect.Service<{{ServiceName}}>()(
     "{{ServiceName}}",
     {
       effect: Effect.gen(function* () {
         {{#dependencies}}
         const {{depName}} = yield* {{DepType}};
         {{/dependencies}}
         
         return {
           {{#methods}}
           {{methodName}}: ({{params}}) => Effect.gen(function* () {
             // Implementation
           }),
           {{/methods}}
         };
       }),
     }
   );`,
       },
     },
     
     fileOperations: {
       readWithValidation: {
         id: "file-read-with-validation",
         name: "File Read with Validation",
         template: `
   export const {{functionName}} = (
     filePath: string,
   ): Effect.Effect<{{returnType}}, Error, FileSystem.FileSystem> =>
     Effect.gen(function* () {
       const validatedPath = yield* validateFilePath(filePath);
       const fs = yield* FileSystem.FileSystem;
       return yield* fs.{{operation}}(validatedPath);
     });`,
       },
     },
   };
   ```

2. **Implement Code Generator**
   ```typescript
   // Location: app/mcp/mcp-server/src/services/generator/
   
   export class PatternGenerator extends Effect.Service<PatternGenerator>()(
     "PatternGenerator",
     {
       effect: Effect.gen(function* () {
         return {
           generateFromPattern: (
             patternId: string,
             variables: Record<string, string>
           ) => Effect.gen(function* () {
             const pattern = EFFECT_PATTERNS[patternId];
             const code = renderTemplate(pattern.template, variables);
             const imports = extractRequiredImports(pattern);
             return { code, imports };
           }),
           
           suggestPattern: (context: CodeContext) => Effect.gen(function* () {
             // Analyze context and suggest appropriate pattern
           }),
         };
       }),
     }
   );
   ```

3. **Implement MCP Tool**
   ```typescript
   server.tool(
     "generate_pattern",
     "Generate Effect pattern code from template",
     {
       patternId: z.string().describe("Pattern ID from library"),
       variables: z.record(z.string()).describe("Template variables"),
     },
     async ({ patternId, variables }) => {
       const generator = yield* PatternGenerator;
       const result = yield* generator.generateFromPattern(patternId, variables);
       return formatGeneratedCode(result);
     }
   );
   ```

### Deliverables:
- [ ] Pattern library with 10+ patterns
- [ ] PatternGenerator service
- [ ] `generate_pattern` MCP tool
- [ ] Pattern documentation

---

## Phase 4: Implement Automated Refactoring

### Duration: 4-5 days

### Tasks:

1. **Create Refactoring Engine**
   ```typescript
   // Location: app/mcp/mcp-server/src/services/refactoring/
   
   export class RefactoringEngine extends Effect.Service<RefactoringEngine>()(
     "RefactoringEngine",
     {
       effect: Effect.gen(function* () {
         const fileSystem = yield* FileSystem.FileSystem;
         const analyzer = yield* CodeAnalyzer;
         const generator = yield* PatternGenerator;
         
         return {
           applyRefactoring: (
             filePath: string,
             refactoringId: string
           ) => Effect.gen(function* () {
             // Read file
             const content = yield* fileSystem.readFileString(filePath);
             
             // Parse and analyze
             const analysis = yield* analyzer.analyzeFile(filePath);
             
             // Apply refactoring
             const refactored = yield* applyTransformation(
               content,
               refactoringId,
               analysis
             );
             
             // Write back
             yield* fileSystem.writeFileString(filePath, refactored);
             
             return { success: true, changes: [{ filePath, diff: "..." }] };
           }),
           
           previewRefactoring: (
             filePath: string,
             refactoringId: string
           ) => Effect.gen(function* () {
             // Show what would change without applying
           }),
         };
       }),
     }
   );
   ```

2. **Define Refactoring Types**
   ```typescript
   const REFACTORINGS = {
     "add-validation": {
       id: "add-validation",
       name: "Add Input Validation",
       description: "Add Effect.filterOrFail validation to function inputs",
       transform: (ast: AST, options: Options) => {
         // Find function parameters
         // Add validation at start of Effect.gen
         // Return modified AST
       },
     },
     
     "replace-node-fs": {
       id: "replace-node-fs",
       name: "Replace Node.js fs with @effect/platform",
       description: "Replace Node.js fs imports with Effect platform services",
       transform: (ast: AST, options: Options) => {
         // Replace imports
         // Update function calls
         // Add service dependencies
       },
     },
     
     "add-error-types": {
       id: "add-error-types",
       name: "Add Proper Error Types",
       description: "Replace Error with PlatformError or custom error types",
       transform: (ast: AST, options: Options) => {
         // Find Error type annotations
         // Replace with appropriate Effect error types
       },
     },
   };
   ```

3. **Implement MCP Tool**
   ```typescript
   server.tool(
     "apply_refactoring",
     "Apply automated refactoring to a file",
     {
       filePath: z.string().describe("Path to the file to refactor"),
       refactoringId: z.string().describe("ID of the refactoring to apply"),
       preview: z.boolean().optional().describe("Preview changes without applying"),
     },
     async ({ filePath, refactoringId, preview }) => {
       const engine = yield* RefactoringEngine;
       
       if (preview) {
         return yield* engine.previewRefactoring(filePath, refactoringId);
       }
       
       return yield* engine.applyRefactoring(filePath, refactoringId);
     }
   );
   ```

### Deliverables:
- [ ] RefactoringEngine service
- [ ] 5+ refactoring transformations
- [ ] `apply_refactoring` MCP tool
- [ ] Preview functionality
- [ ] Rollback capability

---

## Phase 5: Add Cross-File Pattern Consistency

### Duration: 3-4 days

### Tasks:

1. **Create Consistency Analyzer**
   ```typescript
   // Location: app/mcp/mcp-server/src/services/consistency/
   
   export class ConsistencyAnalyzer extends Effect.Service<ConsistencyAnalyzer>()(
     "ConsistencyAnalyzer",
     {
       effect: Effect.gen(function* () {
         const fileSystem = yield* FileSystem.FileSystem;
         const analyzer = yield* CodeAnalyzer;
         
         return {
           analyzeProject: (projectPath: string) => Effect.gen(function* () {
             // Find all TypeScript files
             const files = yield* findTypeScriptFiles(projectPath);
             
             // Analyze each file
             const analyses = yield* Effect.all(
               files.map(f => analyzer.analyzeFile(f))
             );
             
             // Find inconsistencies
             const inconsistencies = findInconsistencies(analyses);
             
             return {
               files: files.length,
               patterns: extractPatternUsage(analyses),
               inconsistencies,
               recommendations: generateRecommendations(inconsistencies),
             };
           }),
           
           suggestUnification: (inconsistencies: Inconsistency[]) => 
             Effect.gen(function* () {
               // Suggest how to unify patterns across files
             }),
         };
       }),
     }
   );
   ```

2. **Define Consistency Rules**
   ```typescript
   const CONSISTENCY_RULES = [
     {
       id: "import-style",
       name: "Consistent Import Style",
       check: (files: FileAnalysis[]) => {
         // Check if all files use same import style
       },
     },
     {
       id: "error-handling",
       name: "Consistent Error Handling",
       check: (files: FileAnalysis[]) => {
         // Check if error types are consistent
       },
     },
     {
       id: "service-pattern",
       name: "Consistent Service Pattern",
       check: (files: FileAnalysis[]) => {
         // Check if all services follow same pattern
       },
     },
     {
       id: "validation-pattern",
       name: "Consistent Validation Pattern",
       check: (files: FileAnalysis[]) => {
         // Check if validation is applied consistently
       },
     },
   ];
   ```

3. **Implement MCP Tool**
   ```typescript
   server.tool(
     "analyze_consistency",
     "Analyze pattern consistency across project files",
     {
       projectPath: z.string().describe("Path to the project root"),
       rules: z.array(z.string()).optional().describe("Specific rules to check"),
     },
     async ({ projectPath, rules }) => {
       const analyzer = yield* ConsistencyAnalyzer;
       const result = yield* analyzer.analyzeProject(projectPath);
       return formatConsistencyReport(result);
     }
   );
   ```

### Deliverables:
- [ ] ConsistencyAnalyzer service
- [ ] Consistency rules
- [ ] `analyze_consistency` MCP tool
- [ ] Project-wide recommendations

---

## Phase 6: Testing and Documentation

### Duration: 2-3 days

### Tasks:

1. **Unit Tests**
   - Test each new service
   - Test pattern detection rules
   - Test code generation
   - Test refactoring transformations

2. **Integration Tests**
   - Test MCP tool endpoints
   - Test end-to-end workflows
   - Test with real codebase

3. **Documentation**
   - Update MCP server README
   - Document new tools
   - Add usage examples
   - Create pattern library documentation

4. **Smoke Tests**
   - Test with ep-admin codebase
   - Verify suggestions are accurate
   - Validate refactoring safety

### Deliverables:
- [ ] Unit test suite (80%+ coverage)
- [ ] Integration test suite
- [ ] Updated README.md
- [ ] Pattern library documentation
- [ ] Usage examples

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Architecture | 1-2 days | None |
| Phase 2: Context-Aware Analysis | 3-4 days | Phase 1 |
| Phase 3: Pattern Library | 3-4 days | Phase 1 |
| Phase 4: Automated Refactoring | 4-5 days | Phase 2, 3 |
| Phase 5: Cross-File Consistency | 3-4 days | Phase 2 |
| Phase 6: Testing & Docs | 2-3 days | All phases |

**Total Estimated Duration: 16-22 days**

---

## Success Metrics

1. **Code Analysis Accuracy**: 90%+ accurate pattern detection
2. **Code Generation Quality**: Generated code compiles without errors
3. **Refactoring Safety**: Zero data loss, all changes reversible
4. **User Satisfaction**: Reduced time to implement Effect patterns by 50%
5. **Test Coverage**: 80%+ coverage on new services

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AST parsing complexity | Use TypeScript compiler API |
| Refactoring breaks code | Always preview, add rollback |
| Pattern library incomplete | Start with most common patterns |
| Performance issues | Cache analysis results |
| False positives | Allow user feedback, tune rules |

---

## Implementation Status

### Completed ✅

**Phase 1: Architecture** - Complete
- Tool interfaces defined in `src/tools/schemas.ts`
- Pattern library schema in `src/tools/patterns.ts`

**Phase 2: Context-Aware Analysis** - Complete
- `CodeAnalyzerService` with 20 detection rules
- AST-based analysis using TypeScript compiler API
- Rules cover: async/await, node:fs, try/catch, Context.Tag, Promise.all, console.log, Effect.runSync, Schema validation, and more

**Phase 3: Pattern Library** - Complete
- 200+ patterns in database accessible via `PatternsService`
- `PatternGeneratorService` supports both:
  - Database patterns via `generateFromDatabase()` function
  - Template patterns via `generateFromTemplate()` method
- `buildSnippet` from toolkit generates code from database patterns

**Template Scaffolding (supplemental)**
- `src/tools/patterns.ts` includes a small set of scaffolding templates for
  quick generation (currently 8 templates, including error handling, layers,
  resource management, streams, and HttpClient)

**Phase 4: Automated Refactoring** - Complete
- `RefactoringEngineService` with 7 automated fixes
- Write mode enabled: set `preview: false` to apply changes
- Fixes include: replace-node-fs, replace-context-tag, replace-promise-all, replace-console-log, add-schema-decode

**Refactoring Safety**
- Refactorings are implemented using TypeScript AST transforms for safety
  (call expression rewrites, import rewrites, and comment injection)
- Remaining work: convert `add-filter-or-fail-validator` from string-append to
  AST insertion once insertion strategy is finalized

**Phase 5: Cross-File Consistency** - Complete
- `ConsistencyAnalyzerService` detects mixed patterns across files

**Phase 6: Testing** - Complete
- 142 tests passing across analysis-core and mcp-server
- Integration tests for API routes

### API Usage

**Generate from Database Pattern:**
```typescript
import { generateFromDatabase } from "./services/pattern-generator";

const result = yield* generateFromDatabase({
  patternId: "effect-service-pattern",
  customName: "MyService",
  moduleType: "esm",
});
```

**Generate from Template:**
```typescript
const generator = yield* PatternGeneratorService;
const result = yield* generator.generate({
  patternId: "validation-filter-or-fail",
  variables: { Name: "FilePath", paramName: "path", ... },
});
```

**Apply Refactoring (Preview):**
```bash
curl -X POST /api/apply-refactoring \
  -H "x-api-key: $API_KEY" \
  -d '{"refactoringId": "replace-node-fs", "files": [...], "preview": true}'
```

**Apply Refactoring (Write):**
```bash
curl -X POST /api/apply-refactoring \
  -H "x-api-key: $API_KEY" \
  -d '{"refactoringId": "replace-node-fs", "files": [...], "preview": false}'
```

---

*Created: January 2026*
*Last Updated: January 2026*
