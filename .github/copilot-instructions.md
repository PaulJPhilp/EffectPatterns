# Effect-Patterns AI Agent Instructions

## Project Overview
Effect-Patterns is a community-driven knowledge base of practical patterns for building robust applications with Effect-TS. The project includes:
- A pattern server for serving API endpoints
- Documentation and examples of Effect-TS patterns
- Rules and guidelines for AI coding agents
- MCP server integration for context-aware coding assistance

## Key Architectural Patterns

### Service Pattern
All services must use the modern `Effect.Service` pattern:
```typescript
export class UserService extends Effect.Service<UserService>()("UserService", {
  // Enable static accessor methods
  accessors: true,
  
  // Define implementation with dependencies
  effect: Effect.gen(function* () {
    // Get dependencies
    const logger = yield* LoggerService;
    const db = yield* DatabaseService;
    
    return {
      getUser: (id: string) => Effect.gen(function* () {
        yield* logger.log(`Fetching user ${id}`);
        return yield* db.query(`SELECT * FROM users WHERE id = ${id}`);
      })
    };
  }),
  
  // Declare dependencies
  dependencies: [LoggerService.Default, DatabaseService.Default] 
}) {}
```

### Dependency Injection
- Use Layer-based DI with `Layer.merge`
- Compose layers logically:
```typescript
const mainLayer = Layer.merge(
  DatabaseService.Default,
  LoggerService.Default,
  NodeContext.layer
);

const program = Effect.gen(function* () {
  // Program logic
}).pipe(Effect.provide(mainLayer));
```

### Error Handling
Define tagged errors for type-safety:
```typescript
export class ServiceError extends Data.TaggedError("ServiceError")<{
  message: string;
  cause?: unknown;
}> {}

// Usage
Effect.gen(function* () {
  try {
    // Operation
  } catch (cause) {
    yield* Effect.fail(new ServiceError({ 
      message: "Operation failed",
      cause
    }));
  }
});
```

### HTTP Server
Build HTTP servers with `@effect/platform`:
```typescript
const app = HttpRouter.empty.pipe(
  HttpRouter.get("/health", () =>
    Effect.succeed({ status: "ok" }).pipe(
      Effect.flatMap(HttpServerResponse.json)
    )
  )
);

const server = NodeHttpServer.layer(() => 
  require("node:http").createServer(),
  { port: 3001 }
);

const serverLayer = HttpServer.serve(app);
```

## Project Structure
```
/
├── api/           # API endpoint implementations
├── app/           # Next.js web application
├── content/       # Pattern documentation content
├── docs/         # Project documentation
├── packages/     # Shared packages
├── rules/        # AI coding rules
├── scripts/      # Build/deployment scripts
├── server/       # Pattern server implementation
└── services/     # Shared services
```

## Development Workflow
1. Start MCP server for AI assistance:
   ```bash
   npx @effect/mcp-server --layer src/layers.ts:AppLayer
   ```
2. Run server in dev mode:
   ```bash
   bun run server:dev
   ```
3. Run tests:
   ```bash
   bun test
   ```

## Testing Guidelines

### Test Structure
Place tests adjacent to implementation:
```
services/
  my-service/
    service.ts
    types.ts
    errors.ts
    __tests__/
      service.test.ts
```

### Test Pattern
```typescript
describe("MyService", () => {
  const testLayer = Layer.provide(
    MyService.Default,
    NodeContext.layer
  );

  it("should perform operation", () => 
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.myMethod("test");
      expect(result).toBe("expected");
    }).pipe(Effect.provide(testLayer))
  );

  it("should handle errors", () => 
    Effect.gen(function* () {
      const service = yield* MyService;
      const error = yield* service.riskyMethod().pipe(Effect.flip);
      expect(error).toBeInstanceOf(ServiceError);
    }).pipe(Effect.provide(testLayer))
  );
});
```

## Common Patterns
- Use `Effect.gen` for sequential operations
- Handle data validation with `Schema.struct()`
- Follow TypeScript strict mode conventions
- Use direct imports:
  ```typescript
  // ✅ Preferred
  import { Effect, Layer } from "effect"
  import { FileSystem } from "@effect/platform"

  // ❌ Avoid
  import * as Effect from "effect"
  ```

## Configuration & Deployment

### Configuration Pattern
Use type-safe configuration with Effect's Config service:
```typescript
// Define config schema
const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  })
)

// Create config service
class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  effect: Effect.gen(function* () {
    const config = yield* ServerConfig;
    return {
      getConfig: () => Effect.succeed(config)
    };
  })
}) {}

// Use in application
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  const { host, port } = yield* config.getConfig();
});
```

### Environment Setup
Required environment variables:
```env
# API Security
PATTERN_API_KEY=your-secret-api-key-here

# OpenTelemetry Configuration
OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS=
SERVICE_NAME=effect-patterns-mcp-server

# Server Configuration
NODE_ENV=development
PORT=3000
```

### Deployment Process
1. Build and test:
   ```bash
   bun run build
   bun test
   ```

2. Deploy to staging:
   ```bash
   cd services/mcp-server
   vercel --env staging
   ```

3. Verify deployment:
   ```bash
   bun run smoke-test https://your-deployment-url.vercel.app
   ```

4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Post-Deployment Verification
Always run smoke tests:
```bash
# Health check
curl https://your-deployment-url.vercel.app/api/health

# Authenticated endpoint
curl -H "x-api-key: $PATTERN_API_KEY" \
  https://your-deployment-url.vercel.app/api/patterns
```

## CLI Usage

The project includes a CLI tool (`ep`) for managing patterns and AI rules:

### Installation
```bash
# Install dependencies
bun install

# Link CLI globally
bun link

# Verify installation
ep --help

# Check version
ep --version
```

### Common Commands

#### Pattern Management
```bash
# Create new pattern
ep pattern new                              # Interactive wizard
ep pattern new --title "My Pattern"         # With options
ep pattern new --skill-level intermediate   # Specify level

# Validate patterns
ep admin validate                           # Basic validation
ep admin validate --verbose                 # Detailed output
ep admin validate --fix                     # Auto-fix issues

# Run pattern tests
ep admin test                               # Run all tests
ep admin test --verbose                     # Detailed output
ep admin test --pattern "error-handling"    # Test specific pattern
```

#### AI Tool Integration
```bash
# List supported AI tools
ep install list

# Install rules into an AI tool
ep install add --tool cursor                              # All rules
ep install add --tool cursor --skill-level beginner       # By skill level
ep install add --tool cursor --use-case error-handling    # By use case
ep install add --tool agents --server-url http://localhost:3002  # Custom server

# Multiple filters
ep install add --tool cursor \
  --skill-level intermediate \
  --use-case error-handling,testing
```

#### Repository Management
```bash
# Run complete pipeline
ep admin pipeline                # Full validation
ep admin pipeline --quick       # Skip long-running checks

# Generate documentation
ep admin generate              # Generate README
ep admin generate --verify     # Verify only
ep admin rules generate        # Generate AI rules
ep admin rules generate --tool cursor  # For specific tool

# Release management
ep admin release preview      # Preview next version
ep admin release create       # Create release
ep admin release create --dry-run  # Test release process
```

### CLI Architecture

The CLI is built with `@effect/cli` following Effect-TS patterns:

#### Error Types
Define tagged errors for type-safe error handling:
```typescript
// CLI-specific errors
export class ToolError extends Data.TaggedError("ToolError")<{
  tool: string;
  reason: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string;
  message: string;
  value?: unknown;
}> {}

export class ApiError extends Data.TaggedError("ApiError")<{
  endpoint: string;
  statusCode: number;
  body?: unknown;
}> {}
```

#### Input Validation
Use Schema for type-safe option validation:
```typescript
// --- Schema Composition and Transformation ---

// Base types with refinements
const SkillLevel = Schema.literal("beginner", "intermediate", "advanced");
const UseCase = Schema.array(Schema.string);
const Version = Schema.string.pipe(
  Schema.filter(v => /^\d+\.\d+\.\d+$/.test(v)),
  Schema.transformer((v: string) => ({
    major: parseInt(v.split(".")[0]),
    minor: parseInt(v.split(".")[1]),
    patch: parseInt(v.split(".")[2])
  }))
);

// Composable schema components
const TimestampFields = Schema.struct({
  createdAt: Schema.number,
  updatedAt: Schema.number
});

const MetadataFields = Schema.struct({
  author: Schema.string,
  tags: Schema.array(Schema.string),
  draft: Schema.boolean
});

// Custom validation transforms
const NonEmptyString = Schema.string.pipe(
  Schema.filter(s => s.trim().length > 0, {
    message: "String must not be empty"
  }),
  Schema.transformer(s => s.trim())
);

const HttpUrl = Schema.string.pipe(
  Schema.filter(url => {
    try {
      new URL(url);
      return url.startsWith("http");
    } catch {
      return false;
    }
  }, {
    message: "Must be a valid HTTP URL"
  })
);

const EmailList = Schema.array(Schema.string).pipe(
  Schema.filter(emails => 
    emails.every(email => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ),
    { message: "All entries must be valid email addresses" }
  )
);

// Composable validation pipeline
const withValidation = <I, O>(schema: Schema.Schema<I, O>) =>
  Schema.struct({
    data: schema,
    validation: Schema.struct({
      enabled: Schema.boolean,
      rules: Schema.array(Schema.string),
      severity: Schema.literal("error", "warn", "info")
    })
  });

// Complex schema composition with transforms
const PatternSchema = Schema.struct({
  // Core fields with validation
  id: NonEmptyString,
  title: Schema.string.pipe(
    Schema.filter(t => t.length >= 3 && t.length <= 100),
    Schema.transformer(t => t.trim())
  ),
  description: NonEmptyString,
  skillLevel: SkillLevel,
  useCase: Schema.array(NonEmptyString),
  
  // Content validation
  content: Schema.string.pipe(
    Schema.filter((c) => c.includes("## Good Example")),
    Schema.transformer((content) => ({
      raw: content,
      // Use the shared utility to split content into sections by markdown headings
      // (handles CRLF, multiple heading levels, and trims results).
      sections: splitSections(content),
      examples: content.match(/\`\`\`[^\n]*([\s\S]*?)\`\`\`/g) ?? []
    }))
  ),
  
  // Links and references
  links: Schema.array(HttpUrl),
  relatedPatterns: Schema.array(Schema.string),
  contributors: Schema.array(Schema.struct({
    name: NonEmptyString,
    email: Schema.string.pipe(
      Schema.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    )
  })),
  
  // Metadata composition
  ...TimestampFields.fields,
  ...MetadataFields.fields,
  
  // Validation rules
  validation: Schema.struct({
    lintRules: Schema.array(Schema.string),
    testCoverage: Schema.number.pipe(
      Schema.filter(n => n >= 0 && n <= 100)
    ),
    reviewers: EmailList
  })
}).pipe(
  // Add computed fields
  Schema.transformer(pattern => ({
    ...pattern,
    slug: pattern.title.toLowerCase().replace(/\s+/g, '-'),
    readingTime: Math.ceil(pattern.content.raw.split(/\s+/).length / 200)
  }))
);

// Command option schemas with cross-field validation
const AddOptions = Schema.struct({
  tool: Schema.string,
  skillLevel: Schema.optional(SkillLevel),
  useCase: Schema.optional(UseCase),
  serverUrl: Schema.optional(Schema.string.pipe(
    Schema.filter(url => url.startsWith("http"))
  ))
});

const ReleaseOptions = Schema.struct({
  version: Version,
  dryRun: Schema.optional(Schema.boolean),
  force: Schema.optional(Schema.boolean)
}).pipe(
  // Cross-field validation
  Schema.filter(opts => 
    !(opts.force && opts.dryRun),
    { message: "Cannot use both force and dry-run" }
  )
);

// --- Validation Helpers ---

// Basic option validation
const validateOptions = (raw: unknown) => 
  Effect.gen(function* () {
    const result = yield* Schema.decode(AddOptions)(raw).pipe(
      Effect.mapError(errors => new ValidationError({
        field: "options",
        message: "Invalid options provided",
        value: errors
      }))
    );
    
    // Business rule validation
    if (result.skillLevel && result.useCase) {
      yield* Effect.fail(new ValidationError({
        field: "options",
        message: "Cannot specify both skillLevel and useCase"
      }));
    }
    
    return result;
  });

// Pattern content validation with custom rules
const validatePattern = (pattern: unknown) =>
  Effect.gen(function* () {
    // Schema validation
    const result = yield* Schema.decode(PatternSchema)(pattern);
    
    // Content structure validation
    if (!result.content.includes("## Rationale")) {
      yield* Effect.fail(new ValidationError({
        field: "content",
        message: "Missing Rationale section"
      }));
    }
    
    // Code example validation
    const hasTypeScript = yield* validateCodeExamples(result.content);
    if (!hasTypeScript) {
      yield* Effect.fail(new ValidationError({
        field: "content",
        message: "Missing TypeScript example"
      }));
    }
    
    // Cross-reference validation
    yield* validateReferences(result);
    
    return result;
  }).pipe(
    Effect.tap(() => Effect.log("Pattern validation successful")),
    Effect.catchAll(error => 
      Effect.gen(function* () {
        yield* Effect.logError(
          `Pattern validation failed: ${error.message}`
        );
        return Effect.fail(error);
      })
    )
  );

// Configuration validation with defaults and constraints
const validateConfig = (config: unknown) =>
  Effect.gen(function* () {
    // Define complex nested schema
    const ConfigSchema = Schema.struct({
      server: Schema.struct({
        url: Schema.string.pipe(
          Schema.filter(url => url.startsWith("http")),
          Schema.description("Server URL must start with http/https")
        ),
        port: Schema.number.pipe(
          Schema.filter(p => p >= 1000 && p <= 65535),
          Schema.description("Port must be between 1000-65535")
        ),
        timeout: Schema.number.pipe(
          Schema.filter(t => t >= 0),
          Schema.description("Timeout must be non-negative")
        )
      }),
      api: Schema.struct({
        key: Schema.string.pipe(
          Schema.pattern(/^[A-Za-z0-9_-]{32}$/),
          Schema.description("API key must be 32 characters [A-Za-z0-9_-]")
        ),
        version: Schema.string.pipe(
          Schema.pattern(/^v\d+$/),
          Schema.description("API version must match pattern v1, v2, etc")
        )
      }),
      logging: Schema.struct({
        level: Schema.literal("debug", "info", "warn", "error"),
        format: Schema.literal("json", "text"),
        destination: Schema.union(
          Schema.literal("stdout"),
          Schema.literal("file"),
          Schema.struct({ path: Schema.string })
        )
      }),
      features: Schema.record(
        Schema.string,
        Schema.union(
          Schema.boolean,
          Schema.struct({
            enabled: Schema.boolean,
            config: Schema.record(Schema.string, Schema.unknown)
          })
        )
      )
    }).pipe(
      // Set defaults for optional fields
      Schema.withDefaults({
        server: {
          timeout: 5000,
          port: 3000
        },
        logging: {
          level: "info",
          format: "json",
          destination: "stdout"
        }
      })
    );
    
    return yield* Schema.decode(ConfigSchema)(config);
  });

// --- Validation Testing Patterns ---

describe("Pattern Validation", () => {
  // Setup test data
  const validPattern = {
    id: "error-handling",
    title: "Effect Error Handling",
    description: "Best practices for handling errors in Effect",
    skillLevel: "intermediate",
    useCase: ["error-handling"],
    content: "# Error Handling\n\n## Good Example\n\n```ts\n// code\n```",
    links: ["https://effect.website"],
    contributors: [{ name: "John", email: "john@effect.website" }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    author: "Team Effect",
    tags: ["error", "patterns"],
    draft: false,
    validation: {
      lintRules: ["no-any"],
      testCoverage: 100,
      reviewers: ["reviewer@effect.website"]
    }
  };

  describe("Schema Validation", () => {
    it("should validate valid pattern", () =>
      Effect.gen(function* () {
        const pattern = yield* validatePattern(validPattern);
        
        // Test core fields
        expect(pattern.id).toBe("error-handling");
        expect(pattern.skillLevel).toBe("intermediate");
        
        // Test computed fields
        expect(pattern.slug).toBe("effect-error-handling");
        expect(typeof pattern.readingTime).toBe("number");
        
        // Test content parsing
        expect(pattern.content.examples).toHaveLength(1);
        expect(pattern.content.sections).toHaveLength(2);
      })
    );

    it("should validate and transform content", () =>
      Effect.gen(function* () {
        const pattern = yield* validatePattern({
          ...validPattern,
          title: "  Spaces  ",
          content: "## Section 1\n```ts\ncode1\n```\n## Section 2\n```ts\ncode2\n```"
        });

        expect(pattern.title).toBe("Spaces");
        expect(pattern.content.sections).toHaveLength(2);
        expect(pattern.content.examples).toHaveLength(2);
      })
    );
  });

  describe("Custom Validation Rules", () => {
    it("should validate required sections", () =>
      Effect.gen(function* () {
        const error = yield* validatePattern({
          ...validPattern,
          content: "# Missing Good Example"
        }).pipe(Effect.flip);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain("Missing Good Example");
      })
    );

    it("should validate email formats", () =>
      Effect.gen(function* () {
        const error = yield* validatePattern({
          ...validPattern,
          contributors: [{ name: "John", email: "invalid" }]
        }).pipe(Effect.flip);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain("email");
      })
    );
  });

  describe("Validation Pipeline", () => {
    const pipeline = withValidation(PatternSchema);

    it("should apply validation rules", () =>
      Effect.gen(function* () {
        const result = yield* Schema.decode(pipeline)({
          data: validPattern,
          validation: {
            enabled: true,
            rules: ["format", "links"],
            severity: "error"
          }
        });

        expect(result.validation.enabled).toBe(true);
        expect(result.validation.rules).toContain("format");
      })
    );
  });

  describe("Error Reporting", () => {
    it("should collect all validation errors", () =>
      Effect.gen(function* () {
        const error = yield* validatePattern({
          ...validPattern,
          title: "", // Empty title
          links: ["not-a-url"], // Invalid URL
          validation: {
            ...validPattern.validation,
            testCoverage: 101 // Invalid range
          }
        }).pipe(Effect.flip);

        expect(error.errors).toHaveLength(3);
        expect(error.errors).toContainEqual(
          expect.objectContaining({
            field: "title",
            message: expect.stringContaining("empty")
          })
        );
      })
    );

    it("should report validation errors with context", () =>
      Effect.gen(function* () {
        const result = yield* validatePattern({
          ...validPattern,
          title: ""
        }).pipe(
          Effect.tapError(error => 
            Effect.sync(() => {
              // Test error reporting format
              expect(error.toJSON()).toEqual({
                _tag: "ValidationError",
                field: "title",
                message: expect.any(String),
                context: expect.any(Object)
              });
            })
          ),
          Effect.flip
        );

        expect(result).toBeDefined();
      })
    );
  });
});
```

#### Command Definition
Commands with validation and error handling:
```typescript
const installAddCommand = Command.make("add", {
  options: {
    tool: Options.string("tool").pipe(
      Options.withDescription("AI tool to configure")
    ),
    skillLevel: Options.optional(Options.string("skill-level")),
    useCase: Options.optional(Options.string("use-case"))
  }
}).pipe(
  Command.withDescription("Install Effect patterns rules into AI tools"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      // Validate options
      const validOptions = yield* validateOptions(options);
      
      // Verify tool is supported
      const tool = yield* verifyTool(validOptions.tool);
      
      // Fetch rules with error handling
      const rules = yield* fetchRules(validOptions).pipe(
        Effect.retry(Schedule.exponential(1000)),
        Effect.catchTag("ApiError", error => 
          Effect.gen(function* () {
            yield* Effect.logError(
              `API error: ${error.statusCode} - ${error.endpoint}`
            );
            return [];
          })
        )
      );
      
      // Install rules with rollback
      yield* installRules(tool, rules).pipe(
        Effect.catchTag("ToolError", error =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `Failed to install rules: ${error.reason}`
            );
            yield* cleanup(tool);
            yield* Effect.fail(error);
          })
        )
      );
      
      yield* Effect.log(`Successfully installed rules for ${tool}`);
    })
  )
);

// Compose commands with proper error handling
const epCommand = Command.make("ep").pipe(
  Command.withDescription("Effect Patterns CLI"),
  Command.withSubcommands([
    patternCommand,
    installCommand.pipe(
      Command.tapError(error => 
        Effect.gen(function* () {
          yield* Effect.logError(`Command failed: ${error._tag}`);
          yield* reportError(error);
        })
      )
    ),
    adminCommand
  ])
);
```

#### Runtime Configuration
The CLI uses Effect's runtime system for dependency injection and error handling:
```typescript
// Define runtime layers with error handling
const RuntimeLayers = Layer.mergeAll(
  // HTTP client with retry logic
  FetchHttpClient.layer.pipe(
    Layer.provide(RetryConfig.layer({
      maxAttempts: 3,
      backoff: "exponential"
    }))
  ),
  
  // Node.js context
  NodeContext.layer,
  
  // CLI configuration with validation
  ConfigService.layer.pipe(
    Layer.tap(config => validateConfig(config))
  ),
  
  // Error reporting
  ErrorReporter.layer
);

// Configure and run CLI with comprehensive error handling
const cli = Command.run(epCommand, {
  name: "EffectPatterns CLI",
  version: "0.4.0"
});

cli(process.argv).pipe(
  Effect.provide(RuntimeLayers),
  Effect.tapError(error => logErrorDetails(error)),
  Effect.catchTags({
    // Handle specific error types
    ToolError: error => 
      Effect.gen(function* () {
        yield* Effect.logError(
          `Tool error: ${error.tool} - ${error.reason}`
        );
        return process.exit(1);
      }),
    ValidationError: error =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Validation error: ${error.field} - ${error.message}`
        );
        return process.exit(1);
      }),
    ApiError: error =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `API error: ${error.statusCode} - ${error.endpoint}`
        );
        return process.exit(1);
      })
  }),
  Effect.catchAll(error => 
    Effect.gen(function* () {
      yield* Effect.logError(`Unexpected error: ${error.message}`);
      yield* ErrorReporter.report(error);
      return process.exit(1);
    })
  ),
  NodeRuntime.runMain
);
```

## Additional Resources
- See `docs/SERVICE_PATTERNS.md` for detailed service patterns
- See `docs/patterns-guide.md` for core Effect-TS patterns
- See `rules/` directory for comprehensive coding rules
- See `services/mcp-server/DEPLOYMENT.md` for detailed deployment guide