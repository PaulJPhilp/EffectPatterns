# Effect-TS Patterns Guide

This guide documents key patterns demonstrated in the Effect-TS examples. Each pattern shows idiomatic ways to solve common programming challenges using Effect.

## Core Patterns

### 1. Basic Effect Creation and Execution
- Use `Effect.succeed()` for pre-resolved success values
- Use `Effect.fail()` for pre-resolved failures
- Execute with `Effect.runSync()` for synchronous effects
- Execute with `Effect.runPromise()` for asynchronous effects

### 2. Error Handling
- Define tagged errors using `class extends Data.TaggedError()`
- Use `Effect.catchTag()` to handle specific error types
- Distinguish between Not Found and other errors using `Option`
- Use `Effect.catchAll()` for general error handling
- Include error causes with `Effect.cause`

### 3. Service Pattern
- Define services using `Effect.Service` pattern (not Context.Tag)
- Implement sync services with `sync: () => ({...})`
- Implement async services with `effect: Effect.gen()`
- Specify dependencies using `dependencies: [Service.Default]`
- Provide services using `Effect.provide(program, Service.Default)`

### 4. Schema Validation
- Define schemas using `Schema.struct()`
- Validate data using `Schema.decode()`
- Handle validation errors with proper error types
- Use contracts to define service interfaces
- Validate configuration using schemas

### 5. HTTP Server Patterns
- Create servers using `@effect/platform` and `@effect/platform-node`
- Define routes with `HttpServer.serve()`
- Handle requests using `Effect.gen`
- Add timeouts using `Effect.timeout`
- Implement graceful shutdown

### 6. Control Flow
- Use `Effect.gen` for sequential operations
- Handle conditional logic with `Effect.if`
- Chain operations with `.pipe()`
- Use combinators for complex flows
- Schedule repetitive tasks with `Schedule`

### 7. Testing
- Mock dependencies using test implementations
- Use `TestContext` for controlled testing
- Verify effects without executing them
- Test error conditions safely
- Use default layers for simplified testing

## Best Practices

1. **Logging**
	- Use `Effect.logInfo` for detailed operation logging
	- Log start and completion of important operations
	- Include relevant context in log messages

2. **Error Management**
	- Always handle expected error cases
	- Use tagged errors for domain-specific failures
	- Include helpful error messages and context
	- Implement proper error recovery strategies

3. **Resource Management**
	- Use proper cleanup with long-running servers
	- Implement timeouts for bounded execution
	- Handle graceful shutdowns
	- Manage state with appropriate Effect types

4. **Type Safety**
	- Leverage TypeScript for strong typing
	- Use schemas for runtime validation
	- Define clear interfaces for services
	- Maintain proper type constraints

5. **Code Organization**
	- Keep effects pure and composable
	- Separate concerns using services
	- Use layers for dependency injection
	- Maintain clear module boundaries

## Output Format Standards

Each example should follow these output format guidelines:

1. **Logging Format**
	```typescript
	// Use Effect.logInfo for structured logging
	yield* Effect.logInfo("Starting operation...")
	yield* Effect.logInfo(`Processing item: ${JSON.stringify(item)}`)
	```

2. **Error Output**
	- Expected errors should be clearly marked and handled gracefully
	- Use tagged errors for domain-specific failures
	- Include context in error messages
	```typescript
	class DatabaseError extends Data.TaggedError<"DatabaseError">()(<error details>) {}
	yield* Effect.logInfo(`Error occurred: ${error.message}`)
	```

3. **Success Output**
	- Log the start and completion of significant operations
	- Include relevant data in a structured format
	- Use JSON.stringify for complex objects
	```typescript
	yield* Effect.logInfo(`Operation completed: ${JSON.stringify(result)}`)
	```

4. **Long-Running Operations**
	- Log periodic progress updates
	- Include timestamps for important events
	- Signal completion or timeout clearly
	```typescript
	yield* Effect.logInfo("Server started on port 3000")
	// ... after timeout
	yield* Effect.logInfo("Server stopped after 15 seconds")
	```

5. **Testing Output**
	- Clearly separate test cases
	- Show both success and failure scenarios
	- Include expected vs actual results
	```typescript
	yield* Effect.logInfo("=== Test Case 1: Valid Input ===")
	yield* Effect.logInfo(`Result: ${result}`)
	```

## Running Examples

All examples can be run using:
```bash
# Run all examples
bun run all-ts

# Run specific examples (e.g., files 1-5)
bun run all-ts 1 5

# Run from a specific file to the end
bun run all-ts 10
```

Each example demonstrates one or more patterns and includes proper logging and error handling.
