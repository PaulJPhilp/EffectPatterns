#!/usr/bin/env bun

/**
 * scaffold-test-project.ts
 *
 * Creates a new TypeScript/Effect project at ~/Projects/TestRepos/<name>,
 * installs dependencies, and runs `ep install add --tool <tool>` for each
 * selected tool target.
 *
 * Usage:
 *   bun run scaffold                              # interactive mode
 *   bun run scaffold my-app                       # basic template, all tools
 *   bun run scaffold my-app --template service     # service template, all tools
 *   bun run scaffold my-app --tool cursor --tool agents
 */

import path from 'node:path';
import { Args, Command, Options, Prompt } from '@effect/cli';
import { FileSystem, Command as PlatformCommand } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import { Array as Arr, Data, Effect, Option } from 'effect';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ScaffoldError extends Data.TaggedError('ScaffoldError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export const TEMPLATES = ['basic', 'service', 'cli', 'http-server'] as const;
export type Template = (typeof TEMPLATES)[number];

export const TOOLS = ['agents', 'cursor', 'vscode', 'windsurf'] as const;
export type Tool = (typeof TOOLS)[number];

const TEST_REPOS_DIR = path.join(
  process.env.HOME ?? '/Users/paul',
  'Projects',
  'TestRepos',
);

const EP_CLI_ENTRY = path.resolve(
  import.meta.dirname,
  '..',
  'packages',
  'ep-cli',
  'src',
  'index.ts',
);

// ---------------------------------------------------------------------------
// Scaffold file contents
// ---------------------------------------------------------------------------

export const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      esModuleInterop: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outDir: 'dist',
      rootDir: 'src',
      skipLibCheck: true,
    },
    include: ['src'],
  },
  null,
  2,
);

export const GITIGNORE = `node_modules/
dist/
.env
`;

export const makePackageJson = (name: string, template: Template) => {
  const deps: Record<string, string> = { effect: 'latest' };
  const devDeps: Record<string, string> = {
    typescript: 'latest',
    tsx: 'latest',
    '@types/node': 'latest',
  };

  if (template === 'cli') {
    deps['@effect/cli'] = 'latest';
    deps['@effect/platform'] = 'latest';
    deps['@effect/platform-node'] = 'latest';
  }
  if (template === 'http-server') {
    deps['@effect/platform'] = 'latest';
    deps['@effect/platform-node'] = 'latest';
    deps['@effect/experimental'] = 'latest';
  }
  if (template === 'service') {
    devDeps.vitest = 'latest';
  }

  const scripts: Record<string, string> = {
    dev: 'tsx src/index.ts',
    build: 'tsc',
    start: 'node dist/index.js',
  };
  if (template === 'service') {
    scripts.test = 'vitest run';
  }

  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  );
};

// ---------------------------------------------------------------------------
// Template files
// ---------------------------------------------------------------------------

export const templateFiles: Record<Template, Record<string, string>> = {
  basic: {
    'src/index.ts': `import { Console, Effect } from "effect"

const program = Console.log("Hello from Effect!")

Effect.runPromise(program)
`,
  },

  service: {
    'src/service.ts': `import { Effect } from "effect"

export class Greeter extends Effect.Service<Greeter>()("Greeter", {
  accessors: true,
  succeed: {
    greet: (name: string) => \`Hello, \${name}!\`,
  },
}) {}
`,
    'src/index.ts': `import { Console, Effect } from "effect"
import { Greeter } from "./service.js"

const program = Effect.gen(function* () {
  const message = yield* Greeter.greet("World")
  yield* Console.log(message)
})

Effect.runPromise(program.pipe(Effect.provide(Greeter.Default)))
`,
    'src/service.test.ts': `import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { Greeter } from "./service.js"

describe("Greeter", () => {
  it("greets by name", async () => {
    const result = await Effect.runPromise(
      Greeter.greet("World").pipe(Effect.provide(Greeter.Default))
    )
    expect(result).toBe("Hello, World!")
  })
})
`,
  },

  cli: {
    'src/commands.ts': `import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"

const nameArg = Args.text({ name: "name" }).pipe(Args.withDefault("World"))

export const helloCommand = Command.make("hello", {
  args: { name: nameArg },
}).pipe(
  Command.withDescription("Say hello"),
  Command.withHandler(({ args }) =>
    Console.log(\`Hello, \${args.name}!\`)
  )
)

export const rootCommand = Command.make("app").pipe(
  Command.withDescription("My CLI app"),
  Command.withSubcommands([helloCommand])
)
`,
    'src/index.ts': `import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { rootCommand } from "./commands.js"

const cli = Command.run(rootCommand, {
  name: "app",
  version: "0.1.0",
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
`,
  },

  'http-server': {
    'src/routes.ts': `import { HttpRouter, HttpServerResponse } from "@effect/platform"

export const routes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/health",
    HttpServerResponse.json({ status: "ok" })
  )
)
`,
    'src/index.ts': `import { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"
import { routes } from "./routes.js"

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

const HttpLive = HttpServer.serve(routes).pipe(Layer.provide(ServerLive))

Layer.launch(HttpLive).pipe(
  Effect.tap(Effect.log("Server listening on http://localhost:3000")),
  NodeRuntime.runMain
)
`,
  },
};

// ---------------------------------------------------------------------------
// Shell command helper
// ---------------------------------------------------------------------------

const runCommand = (cmd: string, args: ReadonlyArray<string>, cwd: string) =>
  PlatformCommand.make(cmd, ...args).pipe(
    PlatformCommand.workingDirectory(cwd),
    PlatformCommand.env({
      ...process.env,
      ...(process.env.EFFECT_PATTERNS_API_URL
        ? { EFFECT_PATTERNS_API_URL: process.env.EFFECT_PATTERNS_API_URL }
        : {}),
    }),
    PlatformCommand.stdout('inherit'),
    PlatformCommand.stderr('inherit'),
    PlatformCommand.exitCode,
    Effect.flatMap((code) =>
      code === 0
        ? Effect.void
        : Effect.fail(
            new ScaffoldError({
              message: `Command failed: ${cmd} ${args.join(' ')} (exit ${code})`,
            }),
          ),
    ),
  );

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

const scaffoldCommand = Command.make('scaffold', {
  args: {
    name: Args.optional(Args.text({ name: 'project-name' })),
  },
  options: {
    template: Options.optional(
      Options.text('template').pipe(
        Options.withDescription(`Project template: ${TEMPLATES.join(', ')}`),
      ),
    ),
    tool: Options.repeated(
      Options.text('tool').pipe(
        Options.withDescription(
          `Tool target: ${TOOLS.join(', ')} (repeatable)`,
        ),
      ),
    ),
  },
}).pipe(
  Command.withDescription('Scaffold a new Effect test project with EP rules'),
  Command.withHandler(({ args, options }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // ---- Resolve project name ----
      const projectName = Option.isSome(args.name)
        ? args.name.value
        : yield* Prompt.text({ message: 'Project name:' });

      // ---- Resolve template ----
      let template: Template;
      if (Option.isSome(options.template)) {
        const t = options.template.value;
        if (!TEMPLATES.includes(t as Template)) {
          return yield* Effect.fail(
            new ScaffoldError({
              message: `Unknown template "${t}". Choose from: ${TEMPLATES.join(', ')}`,
            }),
          );
        }
        template = t as Template;
      } else {
        template = yield* Prompt.select({
          message: 'Template:',
          choices: TEMPLATES.map((t) => ({ title: t, value: t })),
        });
      }

      // ---- Resolve tool targets ----
      let tools: ReadonlyArray<Tool>;
      if (Arr.isNonEmptyReadonlyArray(options.tool)) {
        for (const t of options.tool) {
          if (!TOOLS.includes(t as Tool)) {
            return yield* Effect.fail(
              new ScaffoldError({
                message: `Unknown tool "${t}". Choose from: ${TOOLS.join(', ')}`,
              }),
            );
          }
        }
        tools = options.tool as ReadonlyArray<Tool>;
      } else if (Option.isSome(args.name)) {
        // Non-interactive with a name arg but no --tool → all tools
        tools = TOOLS;
      } else {
        tools = yield* Prompt.multiSelect({
          message: 'Install rules for:',
          choices: TOOLS.map((t) => ({
            title: t,
            value: t,
            selected: true,
          })),
        });
      }

      const projectDir = path.join(TEST_REPOS_DIR, projectName);

      // ---- Guard against overwriting ----
      const exists = yield* fs.exists(projectDir);
      if (exists) {
        return yield* Effect.fail(
          new ScaffoldError({
            message: `Directory already exists: ${projectDir}`,
          }),
        );
      }

      console.log(
        `\nScaffolding "${projectName}" (${template}) at ${projectDir}...\n`,
      );

      // ---- Create directories ----
      yield* fs.makeDirectory(path.join(projectDir, 'src'), {
        recursive: true,
      });

      // ---- Write scaffold files ----
      yield* fs.writeFileString(
        path.join(projectDir, 'package.json'),
        makePackageJson(projectName, template),
      );
      yield* fs.writeFileString(
        path.join(projectDir, 'tsconfig.json'),
        TSCONFIG,
      );
      yield* fs.writeFileString(path.join(projectDir, '.gitignore'), GITIGNORE);
      console.log('  Wrote package.json');
      console.log('  Wrote tsconfig.json');
      console.log('  Wrote .gitignore');

      const files = templateFiles[template];
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(projectDir, filePath);
        yield* fs.writeFileString(fullPath, content);
        console.log(`  Wrote ${filePath}`);
      }

      // ---- Install dependencies ----
      console.log('\nInstalling dependencies...\n');
      yield* runCommand('bun', ['install'], projectDir);

      // ---- Git init + initial commit ----
      console.log('\nInitializing git...\n');
      yield* runCommand('git', ['init'], projectDir);
      yield* runCommand('git', ['add', '-A'], projectDir);
      yield* runCommand(
        'git',
        ['commit', '-m', 'Initial scaffold'],
        projectDir,
      );

      // ---- Install EP rules for each tool (non-fatal) ----
      const failedTools: string[] = [];
      for (const tool of tools) {
        console.log(`\nInstalling EP rules for ${tool}...\n`);
        const result = yield* runCommand(
          'bun',
          ['run', EP_CLI_ENTRY, 'install', 'add', '--tool', tool],
          projectDir,
        ).pipe(Effect.either);

        if (result._tag === 'Left') {
          failedTools.push(tool);
          console.warn(
            `  Warning: ep install --tool ${tool} failed (API may be unavailable).`,
          );
        }
      }

      // ---- Summary ----
      const toolList = (tools as ReadonlyArray<string>).join(', ');
      console.log(`
Done! Your project is ready at:
  ${projectDir}

  Template:  ${template}
  Tools:     ${toolList}${
    failedTools.length > 0
      ? `\n  Failed:    ${failedTools.join(', ')} (retry with: cd ${projectDir} && bun run ${EP_CLI_ENTRY} install add --tool <tool>)`
      : ''
  }

Next steps:
  cd ${projectDir}
  bun run dev
`);
    }),
  ),
);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const cli = Command.run(scaffoldCommand, {
    name: 'scaffold',
    version: '0.1.0',
  });

  cli(process.argv)
    .pipe(Effect.provide(NodeContext.layer), Effect.runPromise)
    .catch((error) => {
      if (error instanceof ScaffoldError) {
        console.error(`\nError: ${error.message}`);
      } else {
        console.error('\nUnexpected error:', error);
      }
      process.exitCode = 1;
    });
}
