import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { NodeContext } from "@effect/platform-node";
import * as OS from "node:os";
export const setupTestDirectories = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const baseTmp = OS.tmpdir();
    const root = path.join(baseTmp, "effect-ai-tests");
    // Create test directories
    const testDirs = [
        path.join(root, "test-input"),
        path.join(root, "test-output"),
        path.join(root, "empty-test"),
        path.join(root, "apply-prompt-test"),
        path.join(root, "integration-test", ".config"),
        path.join(root, "integration-test", "source"),
    ];
    for (const dir of testDirs) {
        yield* fs.makeDirectory(dir, { recursive: true });
    }
    // Create test files
    const testFiles = [
        { path: path.join(root, "test-input", "file1.txt"), content: "Hello World" },
        { path: path.join(root, "test-input", "file2.md"), content: "# Markdown File" },
        { path: path.join(root, "test-input", "nested", "deep.txt"), content: "Deep nested file" },
        { path: path.join(root, "integration-test", "source", "critical.md"), content: "Critical test file" },
    ];
    for (const file of testFiles) {
        yield* fs.makeDirectory(path.dirname(file.path), { recursive: true });
        yield* fs.writeFileString(file.path, file.content);
    }
    return { setupComplete: true };
}).pipe(Effect.provide(NodeContext.layer));
