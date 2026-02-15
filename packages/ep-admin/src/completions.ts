/**
 * Shell completions generator for ep-admin CLI
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 * These scripts enable tab-completion for commands, options, and arguments.
 */

import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";
import * as os from "node:os";
import * as path from "node:path";

import {
    CLI,
    COMPLETION_DIRS,
    COMPLETION_EXTENSIONS,
    COMPLETION_PREFIXES,
    SHELL_TYPES,
    ShellType,
} from "./constants.js";

// Validation functions using Effect patterns
const validateShell = (shell: string): Effect.Effect<ShellType, Error> =>
    Effect.succeed(shell as ShellType).pipe(
        Effect.filterOrFail(
            (s): s is ShellType => SHELL_TYPES.includes(s),
            () => new Error(`Invalid shell: ${shell}. Must be: ${SHELL_TYPES.join(", ")}`)
        )
    );

const validateCompletionConfig = (config: CompletionConfig): Effect.Effect<CompletionConfig, Error> =>
    Effect.succeed(config).pipe(
        Effect.filterOrFail(
            (c) => c.name.length > 0,
            () => new Error("Completion config name cannot be empty")
        ),
        Effect.filterOrFail(
            (c) => c.commands.length > 0,
            () => new Error("Completion config must have at least one command")
        )
    );

const validateFilePath = (filePath: string): Effect.Effect<string, Error> =>
    Effect.succeed(filePath).pipe(
        Effect.filterOrFail(
            (path) => path.length > 0 && !path.includes(".."),
            () => new Error(`Invalid file path: ${filePath}`)
        )
    );

export type Shell = ShellType;

// =============================================================================
// Types
// =============================================================================

export interface CompletionConfig {
    readonly name: string;
    readonly commands: ReadonlyArray<CommandDef>;
    readonly globalOptions: ReadonlyArray<OptionDef>;
}

export interface CommandDef {
    readonly name: string;
    readonly description: string;
    readonly subcommands?: ReadonlyArray<CommandDef>;
    readonly options?: ReadonlyArray<OptionDef>;
    readonly args?: ReadonlyArray<ArgDef>;
}

export interface OptionDef {
    readonly name: string;
    readonly alias?: string;
    readonly description: string;
    readonly takesValue?: boolean;
    readonly values?: ReadonlyArray<string>;
}

export interface ArgDef {
    readonly name: string;
    readonly description: string;
    readonly values?: ReadonlyArray<string>;
}

// =============================================================================
// ep-admin Command Structure
// =============================================================================

/**
 * Complete command structure for ep-admin
 */
export const EP_ADMIN_COMMANDS: CompletionConfig = {
    name: CLI.NAME,
    globalOptions: [
        { name: "help", alias: "h", description: "Show help information" },
        { name: "version", description: "Show version information" },
        {
            name: "log-level",
            description: "Set log level",
            takesValue: true,
            values: ["all", "trace", "debug", "info", "warning", "error", "fatal", "none"],
        },
        { name: "no-color", description: "Disable colored output" },
        { name: "json", description: "Output in JSON format" },
        { name: "verbose", alias: "v", description: "Show detailed output" },
        { name: "quiet", alias: "q", description: "Suppress output except errors" },
        { name: "debug", description: "Enable debug mode" },
    ],
    commands: [
        {
            name: "auth",
            description: "Authentication and local session management",
            subcommands: [
                { name: "init", description: "Initialize local admin authentication" },
                { name: "login", description: "Log in and create a local session" },
                { name: "logout", description: "Clear local session" },
                { name: "status", description: "Show auth/session status" },
            ],
        },
        {
            name: "publish",
            description: "Publishing pipeline commands",
            subcommands: [
                { name: "validate", description: "Validate patterns for publishing" },
                { name: "test", description: "Run pattern tests" },
                { name: "run", description: "Publish validated patterns" },
                { name: "generate", description: "Generate pattern documentation" },
                { name: "lint", description: "Lint pattern content" },
                { name: "pipeline", description: "Run full publishing pipeline" },
            ],
        },
        {
            name: "pattern",
            description: "Pattern discovery and authoring",
            subcommands: [
                { name: "search", description: "Search patterns" },
                { name: "new", description: "Create a new pattern" },
                {
                    name: "skills",
                    description: "Generate and manage skills from patterns",
                    subcommands: [
                        { name: "generate", description: "Generate all skills" },
                        { name: "generate-from-db", description: "Generate skills from DB and upsert" },
                        { name: "skill-generator", description: "Interactive skill generator help" },
                        { name: "generate-readme", description: "Generate skills README" },
                    ],
                },
            ],
        },
        {
            name: "data",
            description: "Ingestion and quality workflows",
            subcommands: [
                {
                    name: "ingest",
                    description: "Content ingestion pipeline",
                    subcommands: [
                        { name: "process", description: "Process content for ingestion" },
                        { name: "process-one", description: "Process a single content item" },
                        { name: "validate", description: "Validate ingested content" },
                        { name: "test", description: "Run ingest tests" },
                        { name: "populate", description: "Populate expectations" },
                        { name: "status", description: "Show ingest status" },
                        { name: "pipeline", description: "Run full ingest pipeline" },
                    ],
                },
                {
                    name: "discord",
                    description: "Discord ingestion helpers",
                    subcommands: [
                        { name: "ingest", description: "Ingest from Discord export" },
                        { name: "test", description: "Test Discord ingestion" },
                        { name: "flatten", description: "Flatten Discord channels export" },
                    ],
                },
                {
                    name: "qa",
                    description: "Quality assurance workflows",
                    subcommands: [
                        { name: "validate", description: "Validate QA checks" },
                        { name: "process", description: "Process QA checks" },
                        { name: "status", description: "Show QA status" },
                        { name: "report", description: "Generate QA report" },
                        { name: "repair", description: "Repair QA failures" },
                        { name: "test-enhanced", description: "Run enhanced QA tests" },
                        { name: "test-single", description: "Run QA test for one item" },
                        { name: "fix-permissions", description: "Fix content permissions" },
                    ],
                },
            ],
        },
        {
            name: "db",
            description: "Database management commands",
            subcommands: [
                {
                    name: "show",
                    description: "Show database content summaries",
                    subcommands: [
                        { name: "all", description: "Show all tracked entities" },
                        { name: "patterns", description: "Show stored effect patterns" },
                        { name: "skills", description: "Show stored skills" },
                    ],
                },
                { name: "test", description: "Run database tests" },
                { name: "test-quick", description: "Run quick database tests" },
                { name: "verify-migration", description: "Verify database migrations" },
                { name: "mock", description: "Generate mock data" },
                { name: "status", description: "Check database status via MCP" },
                { name: "migrate-remote", description: "Run remote migration via MCP" },
                {
                    name: "migrate",
                    description: "Local migration helpers",
                    subcommands: [
                        { name: "state", description: "Show migration state" },
                        { name: "postgres", description: "Run PostgreSQL migrations" },
                    ],
                },
            ],
        },
        {
            name: "dev",
            description: "Development tooling",
            subcommands: [
                {
                    name: "test-utils",
                    description: "Utility test commands",
                    subcommands: [
                        { name: "chat-app", description: "Test chat application" },
                        { name: "harness", description: "Run test harness" },
                        { name: "harness-cli", description: "Run CLI test harness" },
                        { name: "llm", description: "Test LLM integration" },
                        { name: "models", description: "Test model matrix" },
                        { name: "patterns", description: "Test pattern operations" },
                        { name: "supermemory", description: "Test Supermemory integration" },
                    ],
                },
                {
                    name: "autofix",
                    description: "Autofix and prepublish helpers",
                    subcommands: [
                        { name: "prepublish", description: "Run prepublish autofix flow" },
                    ],
                },
            ],
        },
        {
            name: "ops",
            description: "Operations and infrastructure",
            subcommands: [
                { name: "health-check", description: "Run health checks" },
                { name: "rotate-api-key", description: "Rotate API keys" },
                { name: "upgrade-baseline", description: "Upgrade baseline snapshots" },
                {
                    name: "mcp",
                    description: "MCP governance commands",
                    subcommands: [
                        { name: "list-rules", description: "List MCP rules" },
                        { name: "list-fixes", description: "List MCP fixes" },
                    ],
                },
            ],
        },
        {
            name: "config",
            description: "Config, install, and entity management",
            subcommands: [
                {
                    name: "install",
                    description: "Install Effect rules/skills into tools",
                    subcommands: [
                        { name: "add", description: "Inject rules into target tool config" },
                        { name: "list", description: "List supported target tools" },
                        { name: "skills", description: "Generate skills from published patterns" },
                    ],
                },
                {
                    name: "rules",
                    description: "Legacy rules command group",
                    subcommands: [
                        { name: "generate", description: "Generate legacy rule files" },
                    ],
                },
                {
                    name: "utils",
                    description: "Content utility commands",
                    subcommands: [
                        { name: "add-seqid", description: "Add sequence IDs to content files" },
                        { name: "renumber-seqid", description: "Renumber sequence IDs" },
                    ],
                },
                {
                    name: "entities",
                    description: "Entity lock/unlock commands",
                    subcommands: [
                        { name: "lock", description: "Lock entity by slug or id" },
                        { name: "unlock", description: "Unlock entity by slug or id" },
                    ],
                },
            ],
        },
        {
            name: "system",
            description: "System utilities",
            subcommands: [
                {
                    name: "completions",
                    description: "Generate or install shell completions",
                    subcommands: [
                        { name: "generate", description: "Generate completion script" },
                        { name: "install", description: "Install shell completions" },
                    ],
                },
            ],
        },
        {
            name: "release",
            description: "Release management commands",
            subcommands: [
                { name: "preview", description: "Preview upcoming release" },
                { name: "create", description: "Create a new release" },
            ],
        },
    ],
};

// =============================================================================
// Bash Completion Generator
// =============================================================================

const generateBashCompletion = (config: CompletionConfig): string => {
    const { name, commands, globalOptions } = config;

    const commandNames = commands.map((c) => c.name).join(" ");
    const globalOptNames = globalOptions
        .flatMap((o) => [
            `--${o.name}`,
            ...(o.alias ? [`-${o.alias}`] : []),
        ])
        .join(" ");

    let script = `# Bash completion for ${name}
# Generated by ep-admin completions generate

_${name}_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="${commandNames}"
    local global_opts="${globalOptNames}"

    # Handle completion based on position
    case \${cword} in
        1)
            COMPREPLY=( $(compgen -W "\${commands} \${global_opts}" -- "\${cur}") )
            ;;
        *)
            local cmd="\${words[1]}"
            case "\${cmd}" in
`;

    // Add subcommand completions
    for (const cmd of commands) {
        if (cmd.subcommands && cmd.subcommands.length > 0) {
            const subNames = cmd.subcommands.map((s) => s.name).join(" ");
            const optNames = (cmd.options || [])
                .flatMap((o) => [`--${o.name}`, ...(o.alias ? [`-${o.alias}`] : [])])
                .join(" ");
            script += `                ${cmd.name})
                    COMPREPLY=( $(compgen -W "${subNames} ${optNames}" -- "\${cur}") )
                    ;;
`;
        }
    }

    script += `                *)
                    COMPREPLY=( $(compgen -W "\${global_opts}" -- "\${cur}") )
                    ;;
            esac
            ;;
    esac
}

complete -F _${name}_completions ${name}
`;

    return script;
};

// =============================================================================
// Zsh Completion Generator
// =============================================================================

const generateZshCompletion = (config: CompletionConfig): string => {
    const { name, commands, globalOptions } = config;

    let script = `#compdef ${name}
# Zsh completion for ${name}
# Generated by ep-admin completions generate

_${name}() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -C \\
`;

    // Global options
    for (const opt of globalOptions) {
        const alias = opt.alias ? `(-${opt.alias})` : "";
        if (opt.takesValue && opt.values) {
            script += `        ${alias}'--${opt.name}=[${opt.description}]:level:(${opt.values.join(" ")})' \\\n`;
        } else if (opt.takesValue) {
            script += `        ${alias}'--${opt.name}=[${opt.description}]:value:' \\\n`;
        } else {
            script += `        ${alias}'--${opt.name}[${opt.description}]' \\\n`;
        }
    }

    script += `        '1:command:->commands' \\
        '*::arg:->args'

    case $state in
        commands)
            local -a commands
            commands=(
`;

    for (const cmd of commands) {
        script += `                '${cmd.name}:${cmd.description}'\n`;
    }

    script += `            )
            _describe 'command' commands
            ;;
        args)
            case $words[1] in
`;

    for (const cmd of commands) {
        if (cmd.subcommands && cmd.subcommands.length > 0) {
            script += `                ${cmd.name})
                    local -a subcommands
                    subcommands=(
`;
            for (const sub of cmd.subcommands) {
                script += `                        '${sub.name}:${sub.description}'\n`;
            }
            script += `                    )
                    _describe 'subcommand' subcommands
                    ;;
`;
        }
    }

    script += `            esac
            ;;
    esac
}

_${name}
`;

    return script;
};

// =============================================================================
// Fish Completion Generator
// =============================================================================

const generateFishCompletion = (config: CompletionConfig): string => {
    const { name, commands, globalOptions } = config;

    let script = `# Fish completion for ${name}
# Generated by ep-admin completions generate

# Disable file completion by default
complete -c ${name} -f

# Global options
`;

    for (const opt of globalOptions) {
        const shortFlag = opt.alias ? `-s ${opt.alias}` : "";
        if (opt.takesValue && opt.values) {
            script += `complete -c ${name} ${shortFlag} -l ${opt.name} -d '${opt.description}' -xa '${opt.values.join(" ")}'\n`;
        } else if (opt.takesValue) {
            script += `complete -c ${name} ${shortFlag} -l ${opt.name} -d '${opt.description}' -r\n`;
        } else {
            script += `complete -c ${name} ${shortFlag} -l ${opt.name} -d '${opt.description}'\n`;
        }
    }

    script += `
# Commands
`;

    for (const cmd of commands) {
        script += `complete -c ${name} -n '__fish_use_subcommand' -a '${cmd.name}' -d '${cmd.description}'\n`;
    }

    script += `
# Subcommands
`;

    for (const cmd of commands) {
        if (cmd.subcommands) {
            for (const sub of cmd.subcommands) {
                script += `complete -c ${name} -n '__fish_seen_subcommand_from ${cmd.name}' -a '${sub.name}' -d '${sub.description}'\n`;
            }
        }
    }

    return script;
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate shell completion script for the specified shell
 */
export const generateCompletion = (
    shell: ShellType,
    config: CompletionConfig = EP_ADMIN_COMMANDS
): string => {
    // Simple validation
    if (!SHELL_TYPES.includes(shell)) {
        throw new Error(`Invalid shell: ${shell}. Must be: ${SHELL_TYPES.join(", ")}`);
    }
    if (!config.name || config.commands.length === 0) {
        throw new Error("Invalid completion config");
    }

    switch (shell) {
        case "bash":
            return generateBashCompletion(config);
        case "zsh":
            return generateZshCompletion(config);
        case "fish":
            return generateFishCompletion(config);
    }
};

/**
 * Get the default installation path for completions
 */
export const getCompletionPath = (
    shell: ShellType,
    name: string
): string => {
    // Simple validation without Effect complexity
    if (!SHELL_TYPES.includes(shell)) {
        throw new Error(`Invalid shell: ${shell}. Must be: ${SHELL_TYPES.join(", ")}`);
    }
    if (!name || name.includes("..")) {
        throw new Error(`Invalid file path: ${name}`);
    }

    const home = os.homedir();

    switch (shell) {
        case "bash":
            return path.join(home, COMPLETION_DIRS.BASH, name);
        case "zsh":
            return path.join(
                home,
                COMPLETION_DIRS.ZSH,
                `${COMPLETION_PREFIXES.ZSH}${name}`
            );
        case "fish":
            return path.join(
                home,
                COMPLETION_DIRS.FISH,
                `${name}${COMPLETION_EXTENSIONS.FISH}`
            );
    }
};

/**
 * Install completion script to the default location
 */
export const installCompletion = (
    shell: ShellType,
    config: CompletionConfig = EP_ADMIN_COMMANDS
): Effect.Effect<
    string,
    PlatformError,
    FileSystem.FileSystem | Path.Path
> =>
    Effect.gen(function* () {
        // Generate completion script
        const script = generateCompletion(shell, config);
        const filePath = getCompletionPath(shell, config.name);

        // Use Effect.sync for simple operations to avoid type inference issues
        const fileSystem = yield* FileSystem.FileSystem;
        const pathService = yield* Path.Path;

        // Ensure directory exists
        const dir = pathService.dirname(filePath);
        yield* fileSystem.makeDirectory(dir, { recursive: true });

        // Write completion script
        yield* fileSystem.writeFile(filePath, new TextEncoder().encode(script));

        return filePath;
    });

/**
 * Get shell-specific instructions for enabling completions
 */
export const getInstallInstructions = (
    shell: ShellType,
    filePath: string
): string => {
    // Simple validation
    if (!SHELL_TYPES.includes(shell)) {
        throw new Error(`Invalid shell: ${shell}. Must be: ${SHELL_TYPES.join(", ")}`);
    }
    if (!filePath || filePath.includes("..")) {
        throw new Error(`Invalid file path: ${filePath}`);
    }

    switch (shell) {
        case "bash":
            return `
Bash completions installed to: ${filePath}

To enable, add this to your ~/.bashrc:
  source ${filePath}

Or for system-wide installation, copy to:
  /etc/bash_completion.d/

Then restart your shell or run: source ~/.bashrc
`;

        case "zsh":
            return `
Zsh completions installed to: ${filePath}

To enable, add this to your ~/.zshrc (before compinit):
  fpath=(~/.zsh/completions $fpath)
  autoload -Uz compinit && compinit

Then restart your shell or run: source ~/.zshrc
`;

        case "fish":
            return `
Fish completions installed to: ${filePath}

Completions should be automatically loaded.
If not, restart fish or run: source ${filePath}
`;
    }
};
