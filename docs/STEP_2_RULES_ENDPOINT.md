# Step 2: Implement GET /api/v1/rules Endpoint with Schema Validation

## Prompt for AI Coding Agent

### Objective
Implement the GET /api/v1/rules endpoint, ensuring the response is validated using the Schema module from the effect package.

### Context
This is the second step in building our Pattern Server. The goal is to create a functional API endpoint that reads rule files, validates their structure, and serves them as a JSON array. Using effect/Schema is critical for ensuring API responses are reliable and well-formed.

### Files to Modify
- `server/index.ts`

### Technical Requirements

#### 1. Define a Rule Schema
At the top of the file (after imports), define a schema for a Rule using `import { Schema } from "effect"`. The schema should define the expected structure and types for a rule object based on the existing rules files in `rules/cursor/` and `rules/windsurf/`.

**Expected Rule Structure** (based on existing .mdc files):
```typescript
{
  id: string;
  title: string;
  description: string;
  skillLevel?: string;  // Optional: "beginner" | "intermediate" | "advanced"
  useCase?: string[];   // Optional: Array of use case categories
  content: string;      // The main rule content/body
}
```

Use Schema.Struct to define this:
```typescript
const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});
```

#### 2. Create the API Endpoint
Add a new route handler for `GET /api/v1/rules` to the router.

The handler should:
- Use `Effect.gen` for sequential logic
- Read rule files from the `rules/cursor/` directory
- Parse each file's frontmatter and content
- Validate the response using Schema
- Return JSON response

#### 3. Read and Parse Data
Inside the handler, use Effect's platform APIs to:
1. Read all `.mdc` files from `rules/cursor/` directory
2. For each file, parse its YAML frontmatter (metadata) and markdown content
3. Transform each file into a Rule object matching the schema

**Important**: Use `@effect/platform` APIs for file operations:
```typescript
import { FileSystem } from "@effect/platform";

// Inside Effect.gen:
const fs = yield* FileSystem.FileSystem;
const files = yield* fs.readDirectory("rules/cursor");
```

**Note**: You'll need to use the `gray-matter` library (already installed) to parse MDX/Markdown files with frontmatter:
```typescript
import matter from "gray-matter";
```

#### 4. Validate the Response
Before sending the response, use `Schema.decodeUnknown(Schema.Array(RuleSchema))` to validate that the array of parsed rule objects conforms to your defined schema.

```typescript
const validatedRules = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(rulesData);
```

This ensures:
- Type safety at runtime
- Data conforms to expected structure
- Invalid data is caught before sending to client

#### 5. Serve Data or Handle Errors

**On Success**: If validation succeeds, serve the validated data as a JSON response using `HttpServerResponse.json()`.

**On Failure**: If validation fails, the server must:
- Log a detailed error using `Effect.logError`
- Return a 500 Internal Server Error response
- This indicates an issue with the source rule files, not the client's request

```typescript
const rulesHandler = Effect.gen(function* () {
  try {
    // Read and parse rules
    const rules = yield* readAndParseRules();

    // Validate against schema
    const validated = yield* Schema.decodeUnknown(Schema.Array(RuleSchema))(rules);

    // Return JSON response
    return yield* HttpServerResponse.json(validated);
  } catch (error) {
    yield* Effect.logError("Failed to load rules", { error });
    return yield* HttpServerResponse.json(
      { error: "Failed to load rules" },
      { status: 500 }
    );
  }
});
```

### Implementation Guidelines

#### Follow Repository Patterns

1. **Use Schema for Data Validation** (pattern: `define-contracts-with-schema.mdx`)
   ```typescript
   const RuleSchema = Schema.Struct({
     id: Schema.String,
     title: Schema.String,
     // ...
   });
   ```

2. **Use Effect.gen for Sequential Logic** (pattern: `use-gen-for-business-logic.mdx`)
   ```typescript
   Effect.gen(function* () {
     const fs = yield* FileSystem.FileSystem;
     // ...
   })
   ```

3. **Use Tagged Errors** (pattern: `define-tagged-errors.mdx`)
   ```typescript
   class RuleLoadError extends Data.TaggedError("RuleLoadError")<{
     path: string;
     cause: unknown;
   }> {}
   ```

4. **Use Structured Logging** (pattern: `leverage-structured-logging.mdx`)
   ```typescript
   yield* Effect.logInfo("Loading rules", { count: files.length });
   ```

5. **Handle File Operations Safely** (pattern: `wrap-asynchronous-computations.mdx`)
   ```typescript
   const content = yield* Effect.tryPromise({
     try: () => fs.readFileString(filePath),
     catch: (error) => new RuleLoadError({ path: filePath, cause: error })
   });
   ```

### Expected Directory Structure

```
rules/
├── cursor/           # Cursor IDE rules (.mdc files)
│   ├── rule-1.mdc
│   ├── rule-2.mdc
│   └── ...
└── windsurf/         # Windsurf IDE rules (.mdc files)
    ├── rule-1.mdc
    └── ...
```

Each .mdc file has this structure:
```markdown
---
description: Rule description
globs: "*.ts, *.tsx"
alwaysApply: false
---

# Rule Title

Rule content here...
```

### File Format Details

The .mdc files use YAML frontmatter:
- Parse with `gray-matter` library
- Frontmatter becomes metadata object
- Content becomes rule body

Example:
```typescript
import matter from "gray-matter";

const fileContent = yield* fs.readFileString(filePath);
const { data, content } = matter(fileContent);

const rule = {
  id: fileNameWithoutExtension,
  title: extractTitleFromContent(content), // First # heading
  description: data.description,
  content: content
};
```

### Expected Response Format

```json
[
  {
    "id": "use-effect-gen",
    "title": "Use Effect.gen for Sequential Logic",
    "description": "Prefer Effect.gen over long chains for better readability",
    "skillLevel": "intermediate",
    "useCase": ["Core Concepts", "Composition"],
    "content": "# Use Effect.gen for Sequential Logic\n\n..."
  },
  {
    "id": "define-tagged-errors",
    "title": "Define Tagged Errors",
    "description": "Use Data.TaggedError for type-safe error handling",
    "content": "# Define Tagged Errors\n\n..."
  }
]
```

### Testing the Endpoint

After implementation, test with:

```bash
# Start the server
bun run server:dev

# Test the endpoint
curl http://localhost:3001/api/v1/rules

# Check response
curl -i http://localhost:3001/api/v1/rules | jq '.[0]'
```

### Validation Criteria

The implementation should:
1. ✅ Read all .mdc files from `rules/cursor/` directory
2. ✅ Parse frontmatter and content correctly
3. ✅ Transform into Rule objects matching schema
4. ✅ Validate response using Schema.Array(RuleSchema)
5. ✅ Return JSON array of rules on success
6. ✅ Return 500 error with logging on validation failure
7. ✅ Use Effect.gen for sequential logic
8. ✅ Use FileSystem service for file operations
9. ✅ Use structured logging
10. ✅ Handle errors with tagged error types
11. ✅ Follow repository patterns and conventions

### Reference Patterns

Review these patterns for implementation guidance:
- `define-contracts-with-schema.mdx` - Schema definition and validation
- `parse-with-schema-decode.mdx` - Using Schema.decodeUnknown
- `transform-data-with-schema.mdx` - Data transformation with Schema
- `handle-get-request.mdx` - GET endpoint implementation
- `send-json-response.mdx` - JSON response handling
- `define-tagged-errors.mdx` - Error type definition
- `leverage-structured-logging.mdx` - Logging practices
- `use-gen-for-business-logic.mdx` - Effect.gen usage

### Error Handling

Handle these error scenarios:

1. **Directory Not Found**
   ```typescript
   class RulesDirectoryNotFoundError extends Data.TaggedError("RulesDirectoryNotFoundError")<{
     path: string;
   }> {}
   ```

2. **File Read Error**
   ```typescript
   class RuleFileReadError extends Data.TaggedError("RuleFileReadError")<{
     file: string;
     cause: unknown;
   }> {}
   ```

3. **Parse Error**
   ```typescript
   class RuleParseError extends Data.TaggedError("RuleParseError")<{
     file: string;
     cause: unknown;
   }> {}
   ```

4. **Schema Validation Error**
   ```typescript
   class RuleValidationError extends Data.TaggedError("RuleValidationError")<{
     errors: unknown;
   }> {}
   ```

### Additional Notes

- The server should continue to serve the `/health` endpoint
- Use `rules/cursor/` as the primary source (Windsurf rules are similar format)
- Extract the title from the first `# Heading` in the markdown content
- The `id` should be derived from the filename (without .mdc extension)
- Log the number of rules loaded on successful response
- Consider adding caching in future iterations (not required for Step 2)

### Final Output

Provide:
1. Complete updated `server/index.ts` source code
2. List of any helper functions created
3. Example curl command to test the endpoint
4. Example response showing the JSON structure

### Success Criteria

Implementation is successful when:
- ✅ Server starts without errors
- ✅ GET /api/v1/rules returns valid JSON array
- ✅ Response is validated against RuleSchema
- ✅ Rules are loaded from rules/cursor/ directory
- ✅ Logs show structured messages
- ✅ Errors are handled gracefully with 500 status
- ✅ Code follows Effect-TS patterns
- ✅ TypeScript compiles without errors
- ✅ All validation criteria met
