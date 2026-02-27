# Scaffold script user guide

The scaffold script creates a new TypeScript/Effect project with a chosen template and optionally installs Effect Patterns rules for AI tools (Cursor, VS Code, Windsurf, Agents). Run it from the **Effect-Patterns repository root**.

**Quick start:**

```bash
bun run scaffold my-app --template service
```

---

## Prerequisites

- **Bun** — used to run the script and to install dependencies in the new project
- **Git** — the script runs `git init` and an initial commit
- **Effect Patterns repo** — run the command from the repo root (where `package.json` and `scripts/` live)

Rule installation (`ep install add --tool <tool>`) may call the Effect Patterns API. If the API is unavailable or not configured, the script continues and reports which tools failed; you can retry later from the new project directory.

---

## How to run

**Command:** `bun run scaffold` (defined in the root `package.json`).

### Interactive mode

No arguments: the script prompts for project name, template, and tools.

```bash
bun run scaffold
```

### Non-interactive mode

Pass the project name; optionally pass `--template` and one or more `--tool` options.

```bash
bun run scaffold my-app
```

- Uses the **basic** template and installs rules for **all** tools.

```bash
bun run scaffold my-app --template service
```

- Uses the **service** template and installs rules for all tools.

```bash
bun run scaffold my-app --template cli --tool cursor --tool agents
```

- Uses the **cli** template and installs rules only for Cursor and Agents.

---

## Options

| Option | Description |
|--------|-------------|
| `--template <name>` | Project template. One of: `basic`, `service`, `cli`, `http-server`. |
| `--tool <name>` | Tool to install Effect Patterns rules for; repeatable. Values: `agents`, `cursor`, `vscode`, `windsurf`. |

If you provide a project name but omit `--tool`, the script installs rules for all four tools.

---

## Templates

| Template | Description |
|----------|-------------|
| **basic** | Minimal Effect app: `Console.log` and `Effect.runPromise`. |
| **service** | Effect.Service example (Greeter) plus a Vitest test. |
| **cli** | @effect/cli app with a `hello` subcommand. |
| **http-server** | @effect/platform HTTP server with a `/health` route. |

Each template adds the right dependencies and starter files under `src/`.

---

## Output location and contents

**Directory:** Projects are created under `$HOME/Projects/TestRepos/<project-name>` (e.g. `~/Projects/TestRepos/my-app`). There is no option to change this path.

**Steps the script performs:**

1. Create the project directory and `src/`
2. Write `package.json` (template-specific dependencies), `tsconfig.json`, `.gitignore`
3. Write template files into `src/`
4. Run `bun install`
5. Run `git init` and create an initial commit
6. For each selected tool, run `ep install add --tool <tool>` (using the repo’s ep-cli)

If `ep install add` fails for a tool (e.g. API unavailable), the script prints a warning and continues. The final summary includes a retry command for failed tools.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| **HOME** | Used to build the output path `$HOME/Projects/TestRepos/<name>`. If unset, the script falls back to `/Users/paul`. |
| **EFFECT_PATTERNS_API_URL** | If set, passed to the `ep install add` subprocess (e.g. for a local or staging API). Rule installation may fail if the API is unreachable or not configured. |

---

## Troubleshooting

**"Directory already exists"** — The script will not overwrite an existing directory. Use a different project name or remove the existing directory.

**"Unknown template" / "Unknown tool"** — Use only the supported values:
- Templates: `basic`, `service`, `cli`, `http-server`
- Tools: `agents`, `cursor`, `vscode`, `windsurf`

**ep install failed** — The script prints a warning and a retry command, e.g. `cd <projectDir> && bun run <ep-cli-entry> install add --tool <tool>`. You may need to configure an API key or `EFFECT_PATTERNS_API_URL`; see the [ep-cli README](../../packages/ep-cli/README.md) and project [MCP_CONFIG.md](../../MCP_CONFIG.md) for API and key setup.

---

## Next steps

After scaffolding:

```bash
cd ~/Projects/TestRepos/<project-name>
bun run dev
```

For the **service** template, run tests with:

```bash
bun run test
```
