import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { NodeContext } from "@effect/platform-node";
export const setupTestDirectories = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    // Create test directories
    const testDirs = [
        "/tmp/test-input",
        "/tmp/test-output",
        "/tmp/empty-test",
        "/Users/paul/Projects/Effect-Patterns/apply-prompt-test",
        "/Users/paul/Projects/Effect-Patterns/integration-test/.config",
        "/Users/paul/Projects/Effect-Patterns/integration-test/source"
    ];
    for (const dir of testDirs) {
        yield* fs.makeDirectory(dir, { recursive: true });
    }
    // Create test files
    const testFiles = [
        { path: "/tmp/test-input/file1.txt", content: "Hello World" },
        { path: "/tmp/test-input/file2.md", content: "# Markdown File" },
        { path: "/tmp/test-input/nested/deep.txt", content: "Deep nested file" },
        { path: "/Users/paul/Projects/Effect-Patterns/integration-test/source/critical.md", content: "Critical test file" }
    ];
    for (const file of testFiles) {
        yield* fs.makeDirectory(path.dirname(file.path), { recursive: true });
        yield* fs.writeFileString(file.path, file.content);
    }
    return { setupComplete: true };
}).pipe(Effect.provide(NodeContext.layer));
