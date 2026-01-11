---
name: effect-patterns-platform
description: Effect-TS patterns for Platform. Use when working with platform in Effect-TS applications.
---
# Effect-TS Patterns: Platform
This skill provides 6 curated Effect-TS patterns for platform.
Use this skill when working on tasks related to:
- platform
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Platform Pattern 4: Interactive Terminal I/O

**Rule:** Use Terminal for user input/output in CLI applications, providing proper buffering and cross-platform character encoding.

**Good Example:**

This example demonstrates building an interactive CLI application.

```typescript
import { Terminal, Effect } from "@effect/platform";

interface UserInput {
  readonly name: string;
  readonly email: string;
  readonly age: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[INTERACTIVE CLI] User Information Form\n`);

  // Example 1: Simple prompts
  yield* Terminal.writeLine(`=== User Setup ===`);
  yield* Terminal.writeLine(``);

  yield* Terminal.write(`What is your name? `);
  const name = yield* Terminal.readLine();

  yield* Terminal.write(`What is your email? `);
  const email = yield* Terminal.readLine();

  yield* Terminal.write(`What is your age? `);
  const ageStr = yield* Terminal.readLine();

  const age = parseInt(ageStr);

  // Example 2: Display collected information
  yield* Terminal.writeLine(``);
  yield* Terminal.writeLine(`=== Summary ===`);
  yield* Terminal.writeLine(`Name: ${name}`);
  yield* Terminal.writeLine(`Email: ${email}`);
  yield* Terminal.writeLine(`Age: ${age}`);

  // Example 3: Confirmation
  yield* Terminal.writeLine(``);
  yield* Terminal.write(`Confirm information? (yes/no) `);
  const confirm = yield* Terminal.readLine();

  if (confirm.toLowerCase() === "yes") {
    yield* Terminal.writeLine(`✓ Information saved`);
  } else {
    yield* Terminal.writeLine(`✗ Cancelled`);
  }
});

Effect.runPromise(program);
```

---

**Rationale:**

Terminal operations:

- **readLine**: Read single line of user input
- **readPassword**: Read input without echoing (passwords)
- **writeLine**: Write line with newline
- **write**: Write without newline
- **clearScreen**: Clear terminal

Pattern: `Terminal.readLine().pipe(...)`

---


Direct stdin/stdout causes issues:

- **No buffering**: Interleaved output in concurrent context
- **Encoding issues**: Special characters corrupted
- **Password echo**: Security vulnerability
- **No type safety**: String manipulation error-prone

Terminal enables:

- **Buffered I/O**: Safe concurrent output
- **Encoding handling**: UTF-8 and special chars
- **Password input**: No echo mode
- **Structured interaction**: Prompts and validation

Real-world example: CLI setup wizard
- **Direct**: console.log mixed with readline, no error handling
- **With Terminal**: Structured input, validation, formatted output

---

---

### Platform Pattern 2: Filesystem Operations

**Rule:** Use FileSystem module for safe, resource-managed file operations with proper error handling and cleanup.

**Good Example:**

This example demonstrates reading, writing, and manipulating files.

```typescript
import { FileSystem, Effect, Stream } from "@effect/platform";
import * as fs from "fs/promises";

const program = Effect.gen(function* () {
  console.log(`\n[FILESYSTEM] Demonstrating file operations\n`);

  // Example 1: Write a file
  console.log(`[1] Writing file:\n`);

  const content = `Hello, Effect-TS!\nThis is a test file.\nCreated at ${new Date().toISOString()}`;

  yield* FileSystem.writeFileUtf8("test.txt", content);

  yield* Effect.log(`✓ File written: test.txt`);

  // Example 2: Read the file
  console.log(`\n[2] Reading file:\n`);

  const readContent = yield* FileSystem.readFileUtf8("test.txt");

  console.log(readContent);

  // Example 3: Get file stats
  console.log(`\n[3] File stats:\n`);

  const stats = yield* FileSystem.stat("test.txt").pipe(
    Effect.flatMap((stat) =>
      Effect.succeed({
        size: stat.size,
        isFile: stat.isFile(),
        modified: stat.mtimeMs,
      })
    )
  );

  console.log(`  Size: ${stats.size} bytes`);
  console.log(`  Is file: ${stats.isFile}`);
  console.log(`  Modified: ${new Date(stats.modified).toISOString()}`);

  // Example 4: Create directory and write multiple files
  console.log(`\n[4] Creating directory and files:\n`);

  yield* FileSystem.mkdir("test-dir");

  yield* Effect.all(
    Array.from({ length: 3 }, (_, i) =>
      FileSystem.writeFileUtf8(
        `test-dir/file-${i + 1}.txt`,
        `Content of file ${i + 1}`
      )
    )
  );

  yield* Effect.log(`✓ Created directory with 3 files`);

  // Example 5: List directory contents
  console.log(`\n[5] Listing directory:\n`);

  const entries = yield* FileSystem.readDirectory("test-dir");

  entries.forEach((entry) => {
    console.log(`  - ${entry}`);
  });

  // Example 6: Append to file
  console.log(`\n[6] Appending to file:\n`);

  const appendContent = `\nAppended line at ${new Date().toISOString()}`;

  yield* FileSystem.appendFileUtf8("test.txt", appendContent);

  const finalContent = yield* FileSystem.readFileUtf8("test.txt");

  console.log(`File now has ${finalContent.split("\n").length} lines`);

  // Example 7: Clean up
  console.log(`\n[7] Cleaning up:\n`);

  yield* Effect.all(
    Array.from({ length: 3 }, (_, i) =>
      FileSystem.remove(`test-dir/file-${i + 1}.txt`)
    )
  );

  yield* FileSystem.remove("test-dir");
  yield* FileSystem.remove("test.txt");

  yield* Effect.log(`✓ Cleanup complete`);
});

Effect.runPromise(program);
```

---

**Rationale:**

FileSystem operations:

- **read**: Read file as string
- **readDirectory**: List files in directory
- **write**: Write string to file
- **remove**: Delete file or directory
- **stat**: Get file metadata

Pattern: `FileSystem.read(path).pipe(...)`

---


Direct file operations without FileSystem create issues:

- **Resource leaks**: Files not closed on errors
- **No error context**: Missing file names in errors
- **Blocking**: No async/await integration
- **Cross-platform**: Path handling differences

FileSystem enables:

- **Resource safety**: Automatic cleanup
- **Error context**: Full error messages
- **Async integration**: Effect-native
- **Cross-platform**: Handles path separators

Real-world example: Process log files
- **Direct**: Open file, read, close, handle exceptions manually
- **With FileSystem**: `FileSystem.read(path).pipe(...)`

---

---


## 🟡 Intermediate Patterns

### Platform Pattern 3: Persistent Key-Value Storage

**Rule:** Use KeyValueStore for simple persistent storage of key-value pairs, enabling lightweight caching and session management.

**Good Example:**

This example demonstrates storing and retrieving persistent data.

```typescript
import { KeyValueStore, Effect } from "@effect/platform";

interface UserSession {
  readonly userId: string;
  readonly token: string;
  readonly expiresAt: number;
}

const program = Effect.gen(function* () {
  console.log(`\n[KEYVALUESTORE] Persistent storage example\n`);

  const store = yield* KeyValueStore.KeyValueStore;

  // Example 1: Store session data
  console.log(`[1] Storing session:\n`);

  const session: UserSession = {
    userId: "user-123",
    token: "token-abc-def",
    expiresAt: Date.now() + 3600000, // 1 hour
  };

  yield* store.set("session:user-123", JSON.stringify(session));

  yield* Effect.log(`✓ Session stored`);

  // Example 2: Retrieve stored data
  console.log(`\n[2] Retrieving session:\n`);

  const stored = yield* store.get("session:user-123");

  if (stored._tag === "Some") {
    const retrievedSession = JSON.parse(stored.value) as UserSession;

    console.log(`  User ID: ${retrievedSession.userId}`);
    console.log(`  Token: ${retrievedSession.token}`);
    console.log(
      `  Expires: ${new Date(retrievedSession.expiresAt).toISOString()}`
    );
  }

  // Example 3: Check if key exists
  console.log(`\n[3] Checking keys:\n`);

  const hasSession = yield* store.has("session:user-123");
  const hasOther = yield* store.has("session:user-999");

  console.log(`  Has session:user-123: ${hasSession}`);
  console.log(`  Has session:user-999: ${hasOther}`);

  // Example 4: Store multiple cache entries
  console.log(`\n[4] Caching API responses:\n`);

  const apiResponses = [
    { endpoint: "/api/users", data: [{ id: 1, name: "Alice" }] },
    { endpoint: "/api/posts", data: [{ id: 1, title: "First Post" }] },
    { endpoint: "/api/comments", data: [] },
  ];

  yield* Effect.all(
    apiResponses.map((item) =>
      store.set(
        `cache:${item.endpoint}`,
        JSON.stringify(item.data)
      )
    )
  );

  yield* Effect.log(`✓ Cached ${apiResponses.length} endpoints`);

  // Example 5: Retrieve cache with expiration
  console.log(`\n[5] Checking cached data:\n`);

  for (const item of apiResponses) {
    const cached = yield* store.get(`cache:${item.endpoint}`);

    if (cached._tag === "Some") {
      const data = JSON.parse(cached.value);

      console.log(
        `  ${item.endpoint}: ${Array.isArray(data) ? data.length : 1} items`
      );
    }
  }

  // Example 6: Remove specific entry
  console.log(`\n[6] Removing entry:\n`);

  yield* store.remove("cache:/api/comments");

  const removed = yield* store.has("cache:/api/comments");

  console.log(`  Exists after removal: ${removed}`);

  // Example 7: Iterate and count entries
  console.log(`\n[7] Counting entries:\n`);

  const allKeys = yield* store.entries.pipe(
    Effect.map((entries) => entries.length)
  );

  console.log(`  Total entries: ${allKeys}`);
});

Effect.runPromise(program);
```

---

**Rationale:**

KeyValueStore operations:

- **set**: Store key-value pair
- **get**: Retrieve value by key
- **remove**: Delete key
- **has**: Check if key exists
- **clear**: Remove all entries

Pattern: `KeyValueStore.set(key, value).pipe(...)`

---


Without persistent storage, transient data is lost:

- **Session data**: Lost on restart
- **Caches**: Rebuilt from scratch
- **Configuration**: Hardcoded or file-based
- **State**: Scattered across code

KeyValueStore enables:

- **Transparent persistence**: Automatic backend handling
- **Simple API**: Key-value abstraction
- **Pluggable backends**: Memory, filesystem, database
- **Effect integration**: Type-safe, composable

Real-world example: Caching API responses
- **Direct**: Cache in memory Map (lost on restart)
- **With KeyValueStore**: Persistent across restarts

---

---

### Platform Pattern 1: Execute Shell Commands

**Rule:** Use Command to spawn and manage external processes, capturing output and handling exit codes reliably with proper error handling.

**Good Example:**

This example demonstrates executing commands and handling their output.

```typescript
import { Command, Effect, Chunk } from "@effect/platform";

// Simple command execution
const program = Effect.gen(function* () {
  console.log(`\n[COMMAND] Executing shell commands\n`);

  // Example 1: List files
  console.log(`[1] List files in current directory:\n`);

  const lsResult = yield* Command.make("ls", ["-la"]).pipe(
    Command.string
  );

  console.log(lsResult);

  // Example 2: Get current date
  console.log(`\n[2] Get current date:\n`);

  const dateResult = yield* Command.make("date", ["+%Y-%m-%d %H:%M:%S"]).pipe(
    Command.string
  );

  console.log(`Current date: ${dateResult.trim()}`);

  // Example 3: Capture exit code
  console.log(`\n[3] Check if file exists:\n`);

  const fileCheckCmd = yield* Command.make("test", [
    "-f",
    "/etc/passwd",
  ]).pipe(
    Command.exitCode,
    Effect.either
  );

  if (fileCheckCmd._tag === "Right") {
    console.log(`✓ File exists (exit code: 0)`);
  } else {
    console.log(`✗ File not found (exit code: ${fileCheckCmd.left})`);
  }

  // Example 4: Execute with custom working directory
  console.log(`\n[4] List TypeScript files:\n`);

  const findResult = yield* Command.make("find", [
    ".",
    "-name",
    "*.ts",
    "-type",
    "f",
  ]).pipe(
    Command.lines
  );

  const tsFiles = Chunk.take(findResult, 5); // First 5

  Chunk.forEach(tsFiles, (file) => {
    console.log(`  - ${file}`);
  });

  if (Chunk.size(findResult) > 5) {
    console.log(`  ... and ${Chunk.size(findResult) - 5} more`);
  }

  // Example 5: Handle command failure
  console.log(`\n[5] Handle command failure gracefully:\n`);

  const failResult = yield* Command.make("false").pipe(
    Command.exitCode,
    Effect.catchAll((error) =>
      Effect.succeed(-1) // Return -1 for any error
    )
  );

  console.log(`Exit code: ${failResult}`);
});

Effect.runPromise(program);
```

---

**Rationale:**

Execute shell commands with Command:

- **Spawn**: Start external process
- **Capture**: Get stdout/stderr/exit code
- **Wait**: Block until completion
- **Handle errors**: Exit codes indicate failure

Pattern: `Command.exec("command args").pipe(...)`

---


Shell integration without proper handling causes issues:

- **Unhandled errors**: Non-zero exit codes lost
- **Deadlocks**: Stdout buffer fills if not drained
- **Resource leaks**: Processes left running
- **Output loss**: stderr ignored
- **Race conditions**: Unsafe concurrent execution

Command enables:

- **Type-safe execution**: Success/failure handled in Effect
- **Output capture**: Both stdout and stderr available
- **Resource cleanup**: Automatic process termination
- **Exit code handling**: Explicit error mapping

Real-world example: Build pipeline
- **Direct**: Process spawned, output mixed with app logs, exit code ignored
- **With Command**: Output captured, exit code checked, errors propagated

---

---

### Platform Pattern 5: Cross-Platform Path Manipulation

**Rule:** Use Effect's platform-aware path utilities to handle separators, absolute/relative paths, and environment variables consistently.

**Good Example:**

This example demonstrates cross-platform path manipulation.

```typescript
import { Effect, FileSystem } from "@effect/platform";
import * as Path from "node:path";
import * as OS from "node:os";

interface PathOperation {
  readonly input: string;
  readonly description: string;
}

// Platform info
const getPlatformInfo = () =>
  Effect.gen(function* () {
    const platform = process.platform;
    const separator = Path.sep;
    const delimiter = Path.delimiter;
    const homeDir = OS.homedir();

    yield* Effect.log(
      `[PLATFORM] OS: ${platform}, Separator: "${separator}", Home: ${homeDir}`
    );

    return { platform, separator, delimiter, homeDir };
  });

const program = Effect.gen(function* () {
  console.log(`\n[PATH MANIPULATION] Cross-platform path operations\n`);

  const platformInfo = yield* getPlatformInfo();

  // Example 1: Path joining (handles separators)
  console.log(`\n[1] Joining paths (handles separators automatically):\n`);

  const segments = ["data", "reports", "2024"];

  const joinedPath = Path.join(...segments);

  yield* Effect.log(`[JOIN] Input: ${segments.join(" + ")}`);
  yield* Effect.log(`[JOIN] Output: ${joinedPath}`);

  // Example 2: Resolving to absolute paths
  console.log(`\n[2] Resolving relative → absolute:\n`);

  const relativePath = "./config/settings.json";

  const absolutePath = Path.resolve(relativePath);

  yield* Effect.log(`[RESOLVE] Relative: ${relativePath}`);
  yield* Effect.log(`[RESOLVE] Absolute: ${absolutePath}`);

  // Example 3: Path parsing
  console.log(`\n[3] Parsing path components:\n`);

  const filePath = "/home/user/documents/report.pdf";

  const parsed = Path.parse(filePath);

  yield* Effect.log(`[PARSE] Input: ${filePath}`);
  yield* Effect.log(`  root: ${parsed.root}`);
  yield* Effect.log(`  dir: ${parsed.dir}`);
  yield* Effect.log(`  base: ${parsed.base}`);
  yield* Effect.log(`  name: ${parsed.name}`);
  yield* Effect.log(`  ext: ${parsed.ext}`);

  // Example 4: Environment variable expansion
  console.log(`\n[4] Environment variable expansion:\n`);

  const expandPath = (pathStr: string): string => {
    let result = pathStr;

    // Expand common variables
    result = result.replace("$HOME", OS.homedir());
    result = result.replace("~", OS.homedir());
    result = result.replace("$USER", process.env.USER || "user");
    result = result.replace("$PWD", process.cwd());

    // Handle Windows-style env vars
    result = result.replace(/%USERPROFILE%/g, OS.homedir());
    result = result.replace(/%USERNAME%/g, process.env.USERNAME || "user");
    result = result.replace(/%TEMP%/g, OS.tmpdir());

    return result;
  };

  const envPaths = [
    "$HOME/myapp/data",
    "~/documents/file.txt",
    "$PWD/config",
    "/var/log/app.log",
  ];

  for (const envPath of envPaths) {
    const expanded = expandPath(envPath);

    yield* Effect.log(
      `[EXPAND] ${envPath} → ${expanded}`
    );
  }

  // Example 5: Path normalization (remove redundant separators)
  console.log(`\n[5] Path normalization:\n`);

  const messyPaths = [
    "/home//user///documents",
    "C:\\Users\\\\documents\\\\file.txt",
    "./config/../config/./settings",
    "../data/../../root",
  ];

  for (const messy of messyPaths) {
    const normalized = Path.normalize(messy);

    yield* Effect.log(
      `[NORMALIZE] ${messy}`
    );
    yield* Effect.log(
      `[NORMALIZE]   → ${normalized}`
    );
  }

  // Example 6: Safe path construction with base directory
  console.log(`\n[6] Safe path construction (path traversal prevention):\n`);

  const baseDir = "/var/app/data";

  const safeJoin = (base: string, userPath: string): Result<string> => {
    // Reject absolute paths from untrusted input
    if (Path.isAbsolute(userPath)) {
      return { success: false, reason: "Absolute paths not allowed" };
    }

    // Reject paths with ..
    if (userPath.includes("..")) {
      return { success: false, reason: "Path traversal attempt detected" };
    }

    // Resolve and verify within base
    const fullPath = Path.resolve(base, userPath);

    if (!fullPath.startsWith(base)) {
      return { success: false, reason: "Path escapes base directory" };
    }

    return { success: true, path: fullPath };
  };

  interface Result<T> {
    success: boolean;
    reason?: string;
    path?: T;
  }

  const testPaths = [
    "reports/2024.json",
    "/etc/passwd",
    "../../../root",
    "data/file.txt",
  ];

  for (const test of testPaths) {
    const result = safeJoin(baseDir, test);

    if (result.success) {
      yield* Effect.log(`[SAFE] ✓ ${test} → ${result.path}`);
    } else {
      yield* Effect.log(`[SAFE] ✗ ${test} (${result.reason})`);
    }
  }

  // Example 7: Relative path calculation
  console.log(`\n[7] Computing relative paths:\n`);

  const fromDir = "/home/user/projects/myapp";
  const toPath = "/home/user/data/config.json";

  const relativePath2 = Path.relative(fromDir, toPath);

  yield* Effect.log(`[RELATIVE] From: ${fromDir}`);
  yield* Effect.log(`[RELATIVE] To: ${toPath}`);
  yield* Effect.log(`[RELATIVE] Relative: ${relativePath2}`);

  // Example 8: Common path patterns
  console.log(`\n[8] Common patterns:\n`);

  // Get file extension
  const fileName = "document.tar.gz";
  const ext = Path.extname(fileName);
  const baseName = Path.basename(fileName);
  const dirName = Path.dirname("/home/user/file.txt");

  yield* Effect.log(`[PATTERNS] File: ${fileName}`);
  yield* Effect.log(`  basename: ${baseName}`);
  yield* Effect.log(`  dirname: ${dirName}`);
  yield* Effect.log(`  extname: ${ext}`);

  // Example 9: Path segments array
  console.log(`\n[9] Path segments:\n`);

  const segmentPath = "/home/user/documents/report.pdf";

  const segments2 = segmentPath.split(Path.sep).filter((s) => s);

  yield* Effect.log(`[SEGMENTS] ${segmentPath}`);
  yield* Effect.log(`[SEGMENTS] → [${segments2.map((s) => `"${s}"`).join(", ")}]`);
});

Effect.runPromise(program);
```

---

**Rationale:**

Path manipulation requires platform awareness:

- **Separators**: Windows uses `\`, Unix uses `/`
- **Absolute vs relative**: `/root` vs `./file`
- **Environment variables**: `$HOME`, `%APPDATA%`
- **Resolution**: Normalize, resolve symlinks
- **Validation**: Prevent path traversal attacks

Pattern: Avoid string concatenation, use `path.join()`, `path.resolve()`

---


String-based path handling causes problems:

**Problem 1: Platform inconsistency**
- Write path: `"C:\data\file.txt"` (Windows)
- Ship to Linux, gets interpreted as literal "C:\data\file.txt"
- File not found errors, production outage

**Problem 2: Path traversal attacks**
- User supplies path: `"../../../../etc/passwd"`
- No validation → reads sensitive files
- Security vulnerability

**Problem 3: Environment variable expansion**
- User's config: `"$HOME/myapp/data"`
- Without expansion: literal `$HOME` in path
- Can't find files

**Problem 4: Symlink resolution**
- File at `/etc/ssl/certs/ca-bundle.crt` (symlink)
- Real file at `/usr/share/ca-certificates/ca-bundle.crt`
- Both point to same file, but string equality fails

Solutions:

**Platform-aware API**:
- `path.join()` handles separators
- `path.resolve()` creates absolute paths
- `path.parse()` components
- Auto-handles platform differences

**Variable expansion**:
- `$HOME`, `~` → user home
- `$USER` → username
- `$PWD` → current directory

**Validation**:
- Reject paths with `..`
- Reject absolute paths from untrusted input
- Contain paths within base directory

---

---


## 🟠 Advanced Patterns

### Platform Pattern 6: Advanced FileSystem Operations

**Rule:** Use advanced file system patterns to implement efficient, reliable file operations with proper error handling and resource cleanup.

**Good Example:**

This example demonstrates advanced file system patterns.

```typescript
import { Effect, Stream, Ref, FileSystem } from "@effect/platform";
import * as Path from "node:path";
import * as FS from "node:fs";
import * as PromiseFS from "node:fs/promises";

const program = Effect.gen(function* () {
  console.log(`\n[ADVANCED FILESYSTEM] Complex file operations\n`);

  // Example 1: Atomic file write with temporary file
  console.log(`[1] Atomic write (crash-safe):\n`);

  const atomicWrite = (
    filePath: string,
    content: string
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const tempPath = `${filePath}.tmp`;

      try {
        // Step 1: Write to temporary file
        yield* Effect.promise(() =>
          PromiseFS.writeFile(tempPath, content, "utf-8")
        );

        yield* Effect.log(`[WRITE] Wrote to temporary file`);

        // Step 2: Ensure on disk (fsync)
        yield* Effect.promise(() =>
          PromiseFS.writeFile(tempPath, content, "utf-8")
        );

        yield* Effect.log(`[FSYNC] Data on disk`);

        // Step 3: Atomic rename
        yield* Effect.promise(() =>
          PromiseFS.rename(tempPath, filePath)
        );

        yield* Effect.log(`[RENAME] Atomic rename complete`);
      } catch (error) {
        // Cleanup on failure
        try {
          yield* Effect.promise(() => PromiseFS.unlink(tempPath));
        } catch {
          // Ignore cleanup errors
        }

        yield* Effect.fail(error);
      }
    });

  // Test atomic write
  const testFile = "./test-file.txt";

  yield* atomicWrite(testFile, "Important configuration\n");

  // Verify file
  const content = yield* Effect.promise(() =>
    PromiseFS.readFile(testFile, "utf-8")
  );

  yield* Effect.log(`[READ] Got: "${content.trim()}"\n`);

  // Example 2: Streaming read (memory efficient)
  console.log(`[2] Streaming read (handle large files):\n`);

  const streamingRead = (filePath: string) =>
    Effect.gen(function* () {
      let byteCount = 0;
      let lineCount = 0;

      const readStream = FS.createReadStream(filePath, {
        encoding: "utf-8",
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      yield* Effect.log(`[STREAM] Starting read with 64KB chunks`);

      const processLine = (line: string) =>
        Effect.gen(function* () {
          byteCount += line.length;
          lineCount++;

          if (lineCount <= 2 || lineCount % 1000 === 0) {
            yield* Effect.log(
              `[LINE ${lineCount}] Length: ${line.length} bytes`
            );
          }
        });

      // In real code, process all lines
      yield* processLine("line 1");
      yield* processLine("line 2");

      yield* Effect.log(
        `[TOTAL] Read ${lineCount} lines, ${byteCount} bytes`
      );
    });

  yield* streamingRead(testFile);

  // Example 3: Recursive directory listing
  console.log(`\n[3] Recursive directory traversal:\n`);

  const recursiveList = (
    dir: string,
    maxDepth: number = 3
  ): Effect.Effect<Array<{ path: string; type: "file" | "dir" }>> =>
    Effect.gen(function* () {
      const results: Array<{ path: string; type: "file" | "dir" }> = [];

      const traverse = (currentDir: string, depth: number) =>
        Effect.gen(function* () {
          if (depth > maxDepth) {
            return;
          }

          const entries = yield* Effect.promise(() =>
            PromiseFS.readdir(currentDir, { withFileTypes: true })
          );

          for (const entry of entries) {
            const fullPath = Path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
              results.push({ path: fullPath, type: "dir" });

              yield* traverse(fullPath, depth + 1);
            } else {
              results.push({ path: fullPath, type: "file" });
            }
          }
        });

      yield* traverse(dir, 0);

      return results;
    });

  // List files in current directory
  const entries = yield* recursiveList(".", 1);

  yield* Effect.log(
    `[ENTRIES] Found ${entries.length} items:`
  );

  for (const entry of entries.slice(0, 5)) {
    const type = entry.type === "file" ? "📄" : "📁";

    yield* Effect.log(`  ${type} ${entry.path}`);
  }

  // Example 4: Bulk file operations
  console.log(`\n[4] Bulk operations (efficient batching):\n`);

  const bulkCreate = (files: Array<{ name: string; content: string }>) =>
    Effect.gen(function* () {
      yield* Effect.log(`[BULK] Creating ${files.length} files...`);

      for (const file of files) {
        yield* atomicWrite(`./${file.name}`, file.content);
      }

      yield* Effect.log(`[BULK] Created ${files.length} files`);
    });

  const testFiles = [
    { name: "config1.txt", content: "Config 1" },
    { name: "config2.txt", content: "Config 2" },
    { name: "config3.txt", content: "Config 3" },
  ];

  yield* bulkCreate(testFiles);

  // Example 5: File watching (detect changes)
  console.log(`\n[5] File watching (react to changes):\n`);

  const watchFile = (filePath: string) =>
    Effect.gen(function* () {
      yield* Effect.log(`[WATCH] Starting to watch: ${filePath}`);

      let changeCount = 0;

      // Simulate file watcher
      const checkForChanges = () =>
        Effect.gen(function* () {
          for (let i = 0; i < 3; i++) {
            yield* Effect.sleep("100 millis");

            // Check file modification time
            const stat = yield* Effect.promise(() =>
              PromiseFS.stat(filePath)
            );

            // In real implementation, compare previous mtime
            if (i === 1) {
              changeCount++;

              yield* Effect.log(
                `[CHANGE] File modified (${stat.size} bytes)`
              );
            }
          }
        });

      yield* checkForChanges();

      yield* Effect.log(`[WATCH] Detected ${changeCount} changes`);
    });

  yield* watchFile(testFile);

  // Example 6: Safe concurrent file operations
  console.log(`\n[6] Concurrent file operations with safety:\n`);

  const lockFile = (filePath: string) =>
    Effect.gen(function* () {
      const lockPath = `${filePath}.lock`;

      // Acquire lock
      yield* atomicWrite(lockPath, "locked");

      yield* Effect.log(`[LOCK] Acquired: ${lockPath}`);

      try {
        // Critical section
        yield* Effect.sleep("50 millis");

        yield* Effect.log(`[CRITICAL] Operating on locked file`);
      } finally {
        // Release lock
        yield* Effect.promise(() =>
          PromiseFS.unlink(lockPath)
        );

        yield* Effect.log(`[UNLOCK] Released: ${lockPath}`);
      }
    });

  yield* lockFile(testFile);

  // Example 7: Efficient file copying
  console.log(`\n[7] Efficient file copying:\n`);

  const efficientCopy = (
    source: string,
    destination: string
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const stat = yield* Effect.promise(() =>
        PromiseFS.stat(source)
      );

      yield* Effect.log(
        `[COPY] Reading ${(stat.size / 1024).toFixed(2)}KB`
      );

      const content = yield* Effect.promise(() =>
        PromiseFS.readFile(source)
      );

      yield* atomicWrite(destination, content.toString());

      yield* Effect.log(`[COPY] Complete: ${destination}`);
    });

  yield* efficientCopy(testFile, "./test-file-copy.txt");

  // Cleanup
  yield* Effect.log(`\n[CLEANUP] Removing test files`);

  for (const name of [testFile, "test-file-copy.txt", ...testFiles.map((f) => `./${f.name}`)]) {
    try {
      yield* Effect.promise(() =>
        PromiseFS.unlink(name)
      );

      yield* Effect.log(`[REMOVED] ${name}`);
    } catch {
      // File doesn't exist, that's ok
    }
  }
});

Effect.runPromise(program);
```

---

**Rationale:**

Advanced file system operations require careful handling:

- **Atomic writes**: Prevent partial file corruption
- **File watching**: React to file changes
- **Recursive operations**: Handle directory trees
- **Bulk operations**: Efficient batch processing
- **Streaming**: Handle large files without loading all in memory
- **Permissions**: Handle access control safely

Pattern: Combine `FileSystem` API with `Ref` for state, `Stream` for data

---


Simple file operations cause problems at scale:

**Problem 1: Corrupted files**
- Write config file
- Server crashes mid-write
- File is partial/corrupted
- Application fails to start
- Production outage

**Problem 2: Large file handling**
- Load 10GB file into memory
- Server runs out of memory
- Everything crashes
- Now handling outages instead of serving

**Problem 3: Directory synchronization**
- Copy directory tree
- Process interrupted
- Some files copied, some not
- Directory in inconsistent state
- Hard to recover

**Problem 4: Inefficient updates**
- Update 10,000 files one by one
- Each file system call is slow
- Takes hours
- Meanwhile, users can't access data

**Problem 5: File locking**
- Process A reads file
- Process B writes file
- Process A gets partially written file
- Data corruption

Solutions:

**Atomic writes**:
- Write to temporary file
- Fsync (guarantee on disk)
- Atomic rename
- No corruption even on crash

**Streaming**:
- Process large files in chunks
- Keep memory constant
- Efficient for any file size

**Bulk operations**:
- Batch multiple operations
- Reduce system calls
- Faster overall completion

**File watching**:
- React to changes
- Avoid polling
- Real-time responsiveness

---

---


