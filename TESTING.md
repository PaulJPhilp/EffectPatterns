# CLI Testing Guide

Comprehensive testing documentation for the Effect Patterns CLI.

## Test Suites

### 1. Full CLI Test Suite (`scripts/__tests__/ep-cli.test.ts`)

Complete integration and unit tests for all CLI commands.

**Coverage:**
- Help and version commands
- Error handling
- `install` command (list and add)
- `pattern` command
- `admin` command (validate, test, generate, rules, release, pipeline)
- Command structure consistency
- Integration workflows

**Run:**
```bash
bun run test:cli
```

### 2. Install Add Command Tests (`scripts/ep-rules-add.test.ts`)

Detailed tests for the `install add` command with server integration.

**Coverage:**
- Tool validation
- API integration with Pattern Server
- File operations (.cursor, AGENTS.md, etc.)
- Managed block replacement
- Error handling
- Output messages

**Run:**
```bash
vitest run scripts/ep-rules-add.test.ts
```

## Running Tests

### All CLI Tests

```bash
bun run test:cli
```

This runs both:
- Full CLI test suite
- Install add command tests

### Individual Test Suites

```bash
# Full CLI test suite only
vitest run scripts/__tests__/ep-cli.test.ts

# Install add tests only
vitest run scripts/ep-rules-add.test.ts
```

### Watch Mode

```bash
# Watch all CLI tests
vitest scripts/__tests__/ep-cli.test.ts scripts/ep-rules-add.test.ts

# Watch specific suite
vitest scripts/__tests__/ep-cli.test.ts
```

### With Coverage

```bash
vitest run scripts/__tests__/ep-cli.test.ts --coverage
```

## Test Prerequisites

### Pattern Server

Many tests require the Pattern Server to be running. The tests automatically start/stop the server, but you can also run it manually:

```bash
# In a separate terminal
bun run server:dev
```

### Clean State

Tests automatically clean up after themselves, but you can manually clean:

```bash
# Remove test artifacts
rm -rf .cursor .windsurf .vscode .kilo .kira .trae .goose
rm -f AGENTS.md GEMINI.md CLAUDE.md .goosehints
```

## Test Structure

### Full CLI Test Suite

```typescript
describe("ep CLI", () => {
  describe("Help and Version", () => {
    // --help, -h, --version tests
  });

  describe("Error Handling", () => {
    // Unknown commands, invalid options
  });
});

describe("ep install", () => {
  describe("install list", () => {
    // List all supported tools
  });

  describe("install add", () => {
    // Add rules to various tools
  });
});

describe("ep pattern", () => {
  describe("pattern new", () => {
    // Create new patterns
  });
});

describe("ep admin", () => {
  describe("admin validate", () => {
    // Validate patterns
  });

  describe("admin test", () => {
    // Run tests
  });

  describe("admin generate", () => {
    // Generate README
  });

  describe("admin rules", () => {
    // Generate AI rules
  });

  describe("admin release", () => {
    // Preview and create releases
  });

  describe("admin pipeline", () => {
    // Full pipeline
  });
});

describe("CLI Integration", () => {
  // End-to-end workflows
});
```

### Install Add Test Suite

```typescript
describe("ep install add command", () => {
  describe("Tool Validation", () => {
    // --tool option validation
  });

  describe("API Integration", () => {
    // Pattern Server interaction
  });

  describe("File Operations", () => {
    // Directory/file creation
    // Managed block handling
  });

  describe("Update Behavior", () => {
    // Replace vs append managed blocks
  });

  describe("Output Messages", () => {
    // Progress messages
    // Rule counts
  });

  describe("Error Handling", () => {
    // File system errors
    // Server unavailable
  });
});
```

## Test Helpers

### `runCommand(args: string[])`

Execute a CLI command and capture output.

```typescript
const result = await runCommand(["install", "add", "--tool", "cursor"]);

expect(result.exitCode).toBe(0);
expect(result.stdout).toContain("Successfully added");
```

**Returns:**
```typescript
{
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### `startServer()` / `stopServer()`

Start and stop the Pattern Server for testing.

```typescript
beforeAll(async () => {
  await startServer();
});

afterAll(() => {
  stopServer();
});
```

## Writing New Tests

### Basic Command Test

```typescript
it("should run command successfully", async () => {
  const result = await runCommand(["command", "subcommand"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("expected output");
});
```

### Test with Server

```typescript
describe.sequential("my command", () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(() => {
    stopServer();
  });

  it("should interact with server", async () => {
    const result = await runCommand(["install", "add", "--tool", "cursor"]);
    expect(result.exitCode).toBe(0);
  });
});
```

### Test with File Cleanup

```typescript
it("should create file", async () => {
  const result = await runCommand(["install", "add", "--tool", "cursor"]);

  expect(result.exitCode).toBe(0);

  const fileExists = await fs
    .stat(".cursor/rules.md")
    .then(() => true)
    .catch(() => false);

  expect(fileExists).toBe(true);

  // Cleanup
  await fs.rm(".cursor", { recursive: true });
});
```

### Test with Timeout

```typescript
it("should complete long-running command", async () => {
  const result = await runCommand(
    ["admin", "pipeline"],
    { timeout: 180000 } // 3 minutes
  );

  expect([0, 1]).toContain(result.exitCode);
});
```

## Common Test Patterns

### Testing Help Output

```typescript
it("should show help", async () => {
  const result = await runCommand(["command", "--help"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("USAGE");
  expect(result.stdout).toContain("DESCRIPTION");
});
```

### Testing Error Cases

```typescript
it("should reject invalid input", async () => {
  const result = await runCommand(["command", "--invalid"]);

  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("error message");
});
```

### Testing File Creation

```typescript
it("should create file", async () => {
  await runCommand(["command"]);

  const content = await fs.readFile("path/to/file", "utf-8");
  expect(content).toContain("expected content");
});
```

### Testing Multiple Tools

```typescript
const tools = ["cursor", "agents", "windsurf"];

for (const tool of tools) {
  it(`should support ${tool}`, async () => {
    const result = await runCommand(["install", "add", "--tool", tool]);
    expect(result.exitCode).toBe(0);
  });
}
```

## Debugging Tests

### Verbose Output

```typescript
const result = await runCommand(["command", "--verbose"]);
console.log("STDOUT:", result.stdout);
console.log("STDERR:", result.stderr);
console.log("EXIT CODE:", result.exitCode);
```

### Run Single Test

```bash
vitest run scripts/__tests__/ep-cli.test.ts -t "should show help"
```

### Run with UI

```bash
vitest --ui scripts/__tests__/ep-cli.test.ts
```

### Check Server Status

If tests are failing due to server issues:

```bash
# Check if server is running
curl http://localhost:3001/health

# Start server manually
bun run server:dev
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Push to `main`
- Pull requests

**CI Configuration:**
```yaml
- name: Run CLI tests
  run: bun run test:cli

- name: Run all tests
  run: bun run test:all
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
bun run test:cli
```

## Test Coverage

Current test coverage includes:

- ✅ All CLI commands (help, version, etc.)
- ✅ Install command (list, add)
- ✅ Pattern command structure
- ✅ Admin commands (validate, test, generate, rules, release, pipeline)
- ✅ Error handling
- ✅ File operations
- ✅ Server integration
- ✅ Command structure consistency
- ✅ Integration workflows

### Coverage Gaps

Areas not yet covered (future work):
- Interactive wizard for `pattern new` (requires stdin mocking)
- `admin release create` (would create actual releases)
- Git operations in `release` commands
- Edge cases with non-TTY environments

## Troubleshooting

### Tests Hanging

**Cause**: Pattern Server not stopping properly

**Solution**:
```bash
pkill -f "bun.*server"
bun run test:cli
```

### Port Already in Use

**Cause**: Previous server instance still running

**Solution**:
```bash
lsof -ti:3001 | xargs kill -9
```

### File Permission Errors

**Cause**: Test artifacts not cleaned up

**Solution**:
```bash
chmod -R 755 .cursor .windsurf .vscode .kilo .kira .trae .goose
rm -rf .cursor .windsurf .vscode .kilo .kira .trae .goose
rm -f AGENTS.md GEMINI.md CLAUDE.md .goosehints
```

### Timeout Errors

**Cause**: Commands taking longer than expected

**Solution**: Increase timeout in test:
```typescript
const result = await runCommand(
  ["command"],
  { timeout: 300000 } // 5 minutes
);
```

## Best Practices

1. **Use sequential tests** when tests interact with shared resources:
   ```typescript
   describe.sequential("tests with shared state", () => {
     // tests
   });
   ```

2. **Clean up after tests**:
   ```typescript
   afterEach(async () => {
     await fs.rm(".cursor", { recursive: true }).catch(() => {});
   });
   ```

3. **Test exit codes flexibly** for commands that may legitimately fail:
   ```typescript
   expect([0, 1]).toContain(result.exitCode);
   ```

4. **Use timeouts** for long-running commands:
   ```typescript
   await runCommand(["admin", "pipeline"], { timeout: 180000 });
   ```

5. **Start/stop server** in `beforeAll`/`afterAll` to avoid overhead:
   ```typescript
   beforeAll(async () => await startServer());
   afterAll(() => stopServer());
   ```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Effect-TS Testing](https://effect.website/docs/testing)
- [CLI Testing Best Practices](https://github.com/oclif/oclif/blob/main/docs/testing.md)
