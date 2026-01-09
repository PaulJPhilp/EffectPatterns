/**
 * Shell completions generator for ep-admin CLI
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 * These scripts enable tab-completion for commands, options, and arguments.
 */

import { Effect } from "effect";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	CLI,
	COMPLETION_DIRS,
	COMPLETION_EXTENSIONS,
	COMPLETION_PREFIXES,
	SHELL_TYPES,
	type ShellType,
} from "./constants.js";

// =============================================================================
// Types
// =============================================================================

export type Shell = ShellType;

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
            values: ["debug", "info", "warn", "error", "silent"],
        },
        { name: "no-color", description: "Disable colored output" },
        { name: "json", description: "Output in JSON format" },
        { name: "verbose", alias: "v", description: "Show detailed output" },
        { name: "quiet", alias: "q", description: "Suppress output except errors" },
        { name: "debug", description: "Enable debug mode" },
    ],
    commands: [
        {
            name: "publish",
            description: "Publishing pipeline commands",
            subcommands: [
                { name: "validate", description: "Validate patterns for publishing" },
                { name: "test", description: "Run pattern tests" },
                { name: "publish", description: "Publish validated patterns" },
                { name: "generate", description: "Generate pattern documentation" },
                { name: "lint", description: "Lint pattern content" },
                { name: "pipeline", description: "Run full publishing pipeline" },
            ],
            options: [
                { name: "verbose", alias: "v", description: "Show detailed output" },
                { name: "fix", description: "Auto-fix issues" },
            ],
        },
        {
            name: "ingest",
            description: "Content ingestion commands",
            subcommands: [
                { name: "process", description: "Process content for ingestion" },
                { name: "process-one", description: "Process a single content item" },
                { name: "validate", description: "Validate ingestion data" },
                { name: "test", description: "Test ingestion pipeline" },
                { name: "populate", description: "Populate database with content" },
                { name: "status", description: "Show ingestion status" },
                { name: "pipeline", description: "Run full ingestion pipeline" },
            ],
        },
        {
            name: "qa",
            description: "Quality assurance commands",
            subcommands: [
                { name: "process", description: "Process QA checks" },
                { name: "status", description: "Show QA status" },
                { name: "report", description: "Generate QA report" },
                { name: "repair", description: "Repair QA issues" },
                { name: "test-enhanced", description: "Run enhanced QA tests" },
                { name: "test-single", description: "Test a single item" },
                { name: "fix-permissions", description: "Fix file permissions" },
            ],
        },
        {
            name: "db",
            description: "Database management commands",
            subcommands: [
                { name: "test", description: "Run database tests" },
                { name: "test-quick", description: "Run quick database tests" },
                { name: "verify-migration", description: "Verify database migrations" },
                { name: "mock", description: "Generate mock data" },
            ],
        },
        {
            name: "discord",
            description: "Discord integration commands",
            subcommands: [
                { name: "ingest", description: "Ingest Discord content" },
                { name: "test", description: "Test Discord integration" },
            ],
        },
        {
            name: "skills",
            description: "Skills management commands",
            subcommands: [
                { name: "generate", description: "Generate skills" },
                { name: "skill-generator", description: "Run skill generator" },
                { name: "generate-readme", description: "Generate skills README" },
            ],
        },
        {
            name: "migrate",
            description: "Migration commands",
            subcommands: [
                { name: "state", description: "Show migration state" },
                { name: "postgres", description: "Run PostgreSQL migrations" },
            ],
        },
        {
            name: "ops",
            description: "Operations commands",
            subcommands: [
                { name: "health-check", description: "Run health checks" },
                { name: "rotate-api-key", description: "Rotate API keys" },
                { name: "upgrade-baseline", description: "Upgrade baseline" },
            ],
        },
        {
            name: "test-utils",
            description: "Testing utilities",
            subcommands: [
                { name: "chat-app", description: "Test chat application" },
                { name: "harness", description: "Run test harness" },
                { name: "harness-cli", description: "CLI test harness" },
                { name: "llm", description: "Test LLM integration" },
                { name: "models", description: "Test models" },
                { name: "patterns", description: "Test patterns" },
                { name: "supermemory", description: "Test Supermemory integration" },
            ],
        },
        {
            name: "rules",
            description: "AI rules management",
            options: [
                { name: "tool", description: "Target AI tool", takesValue: true },
            ],
        },
        {
            name: "release",
            description: "Release management commands",
            subcommands: [
                { name: "preview", description: "Preview upcoming release" },
                { name: "create", description: "Create a new release" },
            ],
            options: [
                { name: "dry-run", description: "Preview without making changes" },
            ],
        },
        {
            name: "pipeline-management",
            description: "Pipeline state management",
        },
        {
            name: "pattern",
            description: "Pattern management commands",
            subcommands: [
                {
                    name: "new",
                    description: "Create a new pattern (interactive wizard)",
                    options: [
                        { name: "title", description: "Pattern title", takesValue: true },
                        {
                            name: "skill-level",
                            description: "Skill level",
                            takesValue: true,
                            values: ["beginner", "intermediate", "advanced"],
                        },
                    ],
                },
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
    shell: Shell,
    config: CompletionConfig = EP_ADMIN_COMMANDS
): string => {
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
export const getCompletionPath = (shell: Shell, name: string): string => {
    const home = os.homedir();

    switch (shell) {
        case "bash":
            return path.join(home, COMPLETION_DIRS.BASH, name);
        case "zsh":
            return path.join(home, COMPLETION_DIRS.ZSH, `${COMPLETION_PREFIXES.ZSH}${name}`);
        case "fish":
            return path.join(home, COMPLETION_DIRS.FISH, `${name}${COMPLETION_EXTENSIONS.FISH}`);
    }
};

/**
 * Install completion script to the default location
 */
export const installCompletion = (
    shell: Shell,
    config: CompletionConfig = EP_ADMIN_COMMANDS
): Effect.Effect<string, Error> =>
    Effect.gen(function* () {
        const script = generateCompletion(shell, config);
        const filePath = getCompletionPath(shell, config.name);
        const dir = path.dirname(filePath);

        // Ensure directory exists
        yield* Effect.tryPromise({
            try: () => fs.mkdir(dir, { recursive: true }),
            catch: (e) => new Error(`Failed to create directory: ${e}`),
        });

        // Write completion script
        yield* Effect.tryPromise({
            try: () => fs.writeFile(filePath, script, "utf-8"),
            catch: (e) => new Error(`Failed to write completion script: ${e}`),
        });

        return filePath;
    });

/**
 * Get shell-specific instructions for enabling completions
 */
export const getInstallInstructions = (shell: Shell, filePath: string): string => {
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
