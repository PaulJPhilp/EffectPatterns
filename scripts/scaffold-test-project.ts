#!/usr/bin/env bun

/**
 * scaffold-test-project.ts
 *
 * Creates a new TypeScript/Effect project at ~/Projects/TestRepos/<name>,
 * installs dependencies, and runs `ep install add --tool agents` to set up
 * Effect Patterns rules.
 *
 * Usage: bun run scaffold [project-name]
 */

import { Command, FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Data, Effect } from "effect";
import path from "node:path";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ScaffoldError extends Data.TaggedError("ScaffoldError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_REPOS_DIR = path.join(
  process.env.HOME ?? "/Users/paul",
  "Projects",
  "TestRepos"
);

const EP_CLI_ENTRY = path.resolve(
  import.meta.dirname,
  "..",
  "packages",
  "ep-cli",
  "src",
  "index.ts"
);

// ---------------------------------------------------------------------------
// Scaffold file contents
// ---------------------------------------------------------------------------

const makePackageJson = (name: string) =>
  JSON.stringify(
    {
      name,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "tsx src/index.ts",
        build: "tsc",
        start: "node dist/index.js",
      },
      dependencies: {
        effect: "latest",
      },
      devDependencies: {
        typescript: "latest",
        tsx: "latest",
        "@types/node": "latest",
      },
    },
    null,
    2
  );

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      esModuleInterop: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outDir: "dist",
      rootDir: "src",
      skipLibCheck: true,
    },
    include: ["src"],
  },
  null,
  2
);

const INDEX_TS = `import { Console, Effect } from "effect"

const program = Console.log("Hello from Effect!")

Effect.runPromise(program)
`;

const GITIGNORE = `node_modules/
dist/
.env
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const runCommand = (
  cmd: string,
  args: ReadonlyArray<string>,
  cwd: string
) =>
  Command.make(cmd, ...args).pipe(
    Command.workingDirectory(cwd),
    Command.env({
      ...process.env,
      ...(process.env.EFFECT_PATTERNS_API_URL
        ? { EFFECT_PATTERNS_API_URL: process.env.EFFECT_PATTERNS_API_URL }
        : {}),
    }),
    Command.stdout("inherit"),
    Command.stderr("inherit"),
    Command.exitCode,
    Effect.flatMap((code) =>
      code === 0
        ? Effect.void
        : Effect.fail(
            new ScaffoldError({
              message: `Command failed: ${cmd} ${args.join(" ")} (exit ${code})`,
            })
          )
    )
  );

// ---------------------------------------------------------------------------
// Main program
// ---------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const projectName = process.argv[2] ?? "my-effect-app";
  const projectDir = path.join(TEST_REPOS_DIR, projectName);

  // 1. Guard against overwriting an existing project
  const exists = yield* fs.exists(projectDir);
  if (exists) {
    return yield* Effect.fail(
      new ScaffoldError({
        message: `Directory already exists: ${projectDir}`,
      })
    );
  }

  console.log(`\nScaffolding ${projectName} at ${projectDir}...\n`);

  // 2. Create directories
  yield* fs.makeDirectory(path.join(projectDir, "src"), { recursive: true });

  // 3. Write scaffold files
  yield* fs.writeFileString(
    path.join(projectDir, "package.json"),
    makePackageJson(projectName)
  );
  yield* fs.writeFileString(
    path.join(projectDir, "tsconfig.json"),
    TSCONFIG
  );
  yield* fs.writeFileString(
    path.join(projectDir, "src", "index.ts"),
    INDEX_TS
  );
  yield* fs.writeFileString(
    path.join(projectDir, ".gitignore"),
    GITIGNORE
  );

  console.log("  Wrote package.json");
  console.log("  Wrote tsconfig.json");
  console.log("  Wrote src/index.ts");
  console.log("  Wrote .gitignore");

  // 4. Install dependencies
  console.log("\nInstalling dependencies...\n");
  yield* runCommand("bun", ["install"], projectDir);

  // 5. Install Effect Patterns rules via ep CLI (non-fatal — requires API access)
  console.log("\nInstalling Effect Patterns rules...\n");
  const epResult = yield* runCommand(
    "bun",
    ["run", EP_CLI_ENTRY, "install", "add", "--tool", "agents"],
    projectDir
  ).pipe(Effect.either);

  const epFailed = epResult._tag === "Left";
  if (epFailed) {
    console.warn(
      "  Warning: ep install failed (API may be unavailable). You can retry later with:"
    );
    console.warn(
      `    cd ${projectDir} && bun run ${EP_CLI_ENTRY} install add --tool agents`
    );
  }

  // 6. Summary
  console.log(`
Done! Your project is ready at:
  ${projectDir}

Next steps:
  cd ${projectDir}
  bun run dev${epFailed ? "\n  # Then retry: bun run ep install add --tool agents" : ""}
`);
});

Effect.runPromise(
  program.pipe(Effect.provide(NodeContext.layer))
).catch((error) => {
  if (error instanceof ScaffoldError) {
    console.error(`\nError: ${error.message}`);
  } else {
    console.error("\nUnexpected error:", error);
  }
  process.exitCode = 1;
});
