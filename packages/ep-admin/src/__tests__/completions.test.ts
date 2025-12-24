/**
 * Unit tests for shell completions generator
 */

import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
    EP_ADMIN_COMMANDS,
    generateCompletion,
    getCompletionPath,
    getInstallInstructions,
    type CompletionConfig
} from "../completions.js";

describe("Shell Completions", () => {
    describe("EP_ADMIN_COMMANDS config", () => {
        it("should have the correct CLI name", () => {
            expect(EP_ADMIN_COMMANDS.name).toBe("ep-admin");
        });

        it("should define global options", () => {
            expect(EP_ADMIN_COMMANDS.globalOptions.length).toBeGreaterThan(0);

            const optionNames = EP_ADMIN_COMMANDS.globalOptions.map(o => o.name);
            expect(optionNames).toContain("help");
            expect(optionNames).toContain("version");
            expect(optionNames).toContain("log-level");
            expect(optionNames).toContain("no-color");
            expect(optionNames).toContain("json");
            expect(optionNames).toContain("verbose");
        });

        it("should define commands", () => {
            expect(EP_ADMIN_COMMANDS.commands.length).toBeGreaterThan(0);

            const commandNames = EP_ADMIN_COMMANDS.commands.map(c => c.name);
            expect(commandNames).toContain("publish");
            expect(commandNames).toContain("ingest");
            expect(commandNames).toContain("qa");
            expect(commandNames).toContain("db");
            expect(commandNames).toContain("rules");
        });

        it("should have subcommands for major commands", () => {
            const publishCmd = EP_ADMIN_COMMANDS.commands.find(c => c.name === "publish");
            expect(publishCmd?.subcommands).toBeDefined();
            expect(publishCmd?.subcommands?.length).toBeGreaterThan(0);

            const subNames = publishCmd?.subcommands?.map(s => s.name) ?? [];
            expect(subNames).toContain("validate");
            expect(subNames).toContain("test");
            expect(subNames).toContain("pipeline");
        });

        it("should have log-level option with valid values", () => {
            const logLevelOpt = EP_ADMIN_COMMANDS.globalOptions.find(
                o => o.name === "log-level"
            );

            expect(logLevelOpt?.takesValue).toBe(true);
            expect(logLevelOpt?.values).toContain("debug");
            expect(logLevelOpt?.values).toContain("info");
            expect(logLevelOpt?.values).toContain("warn");
            expect(logLevelOpt?.values).toContain("error");
            expect(logLevelOpt?.values).toContain("silent");
        });
    });

    describe("generateCompletion", () => {
        describe("bash", () => {
            it("should generate valid bash completion script", () => {
                const script = generateCompletion("bash");

                // Should have shebang-style comment
                expect(script).toContain("# Bash completion for ep-admin");

                // Should define the completion function
                expect(script).toContain("_ep-admin_completions()");

                // Should use _init_completion
                expect(script).toContain("_init_completion");

                // Should register with complete command
                expect(script).toContain("complete -F _ep-admin_completions ep-admin");

                // Should include command names
                expect(script).toContain("publish");
                expect(script).toContain("ingest");
            });

            it("should include global options in bash script", () => {
                const script = generateCompletion("bash");

                expect(script).toContain("--help");
                expect(script).toContain("--version");
                expect(script).toContain("-v"); // verbose alias
                expect(script).toContain("-h"); // help alias
            });

            it("should include subcommand completions", () => {
                const script = generateCompletion("bash");

                // Should have case for publish subcommands
                expect(script).toContain("publish)");
                expect(script).toContain("validate");
                expect(script).toContain("pipeline");
            });
        });

        describe("zsh", () => {
            it("should generate valid zsh completion script", () => {
                const script = generateCompletion("zsh");

                // Should have compdef header
                expect(script).toContain("#compdef ep-admin");

                // Should define the completion function
                expect(script).toContain("_ep-admin()");

                // Should use _arguments
                expect(script).toContain("_arguments");

                // Should call itself at end
                expect(script).toContain("_ep-admin");
            });

            it("should include option descriptions in zsh script", () => {
                const script = generateCompletion("zsh");

                // Should include option with description
                expect(script).toContain("--help");
                expect(script).toContain("Show help information");
            });

            it("should include commands with descriptions", () => {
                const script = generateCompletion("zsh");

                expect(script).toContain("'publish:Publishing pipeline commands'");
                expect(script).toContain("'ingest:Content ingestion commands'");
            });

            it("should handle options with values", () => {
                const script = generateCompletion("zsh");

                // log-level should show available values
                expect(script).toContain("--log-level");
                expect(script).toContain("debug");
                expect(script).toContain("silent");
            });
        });

        describe("fish", () => {
            it("should generate valid fish completion script", () => {
                const script = generateCompletion("fish");

                // Should have header
                expect(script).toContain("# Fish completion for ep-admin");

                // Should disable file completion by default
                expect(script).toContain("complete -c ep-admin -f");

                // Should define completions
                expect(script).toContain("complete -c ep-admin");
            });

            it("should include global options in fish script", () => {
                const script = generateCompletion("fish");

                expect(script).toContain("-l help");
                expect(script).toContain("-l version");
                expect(script).toContain("-s v"); // verbose short option
            });

            it("should include commands as subcommands", () => {
                const script = generateCompletion("fish");

                expect(script).toContain("__fish_use_subcommand");
                expect(script).toContain("-a 'publish'");
                expect(script).toContain("-d 'Publishing pipeline commands'");
            });

            it("should include nested subcommands", () => {
                const script = generateCompletion("fish");

                expect(script).toContain("__fish_seen_subcommand_from publish");
                expect(script).toContain("-a 'validate'");
            });

            it("should handle options with predefined values", () => {
                const script = generateCompletion("fish");

                // log-level option should have -xa for exclusive args
                expect(script).toContain("-l log-level");
                expect(script).toContain("-xa 'debug info warn error silent'");
            });
        });

        describe("custom config", () => {
            it("should generate completions for custom config", () => {
                const customConfig: CompletionConfig = {
                    name: "my-cli",
                    globalOptions: [
                        { name: "help", alias: "h", description: "Show help" },
                    ],
                    commands: [
                        {
                            name: "run",
                            description: "Run something",
                            subcommands: [
                                { name: "fast", description: "Run fast" },
                            ],
                        },
                    ],
                };

                const bashScript = generateCompletion("bash", customConfig);
                expect(bashScript).toContain("my-cli");
                expect(bashScript).toContain("run");

                const zshScript = generateCompletion("zsh", customConfig);
                expect(zshScript).toContain("#compdef my-cli");
                expect(zshScript).toContain("'run:Run something'");

                const fishScript = generateCompletion("fish", customConfig);
                expect(fishScript).toContain("complete -c my-cli");
                expect(fishScript).toContain("-a 'run'");
            });
        });
    });

    describe("getCompletionPath", () => {
        const home = os.homedir();

        it("should return bash completion path", () => {
            const result = getCompletionPath("bash", "ep-admin");
            expect(result).toBe(path.join(home, ".bash_completion.d", "ep-admin"));
        });

        it("should return zsh completion path with underscore prefix", () => {
            const result = getCompletionPath("zsh", "ep-admin");
            expect(result).toBe(path.join(home, ".zsh", "completions", "_ep-admin"));
        });

        it("should return fish completion path with .fish extension", () => {
            const result = getCompletionPath("fish", "ep-admin");
            expect(result).toBe(
                path.join(home, ".config", "fish", "completions", "ep-admin.fish")
            );
        });

        it("should work with custom CLI names", () => {
            expect(getCompletionPath("bash", "my-cli")).toContain("my-cli");
            expect(getCompletionPath("zsh", "my-cli")).toContain("_my-cli");
            expect(getCompletionPath("fish", "my-cli")).toContain("my-cli.fish");
        });
    });

    describe("getInstallInstructions", () => {
        const testPath = "/path/to/completion";

        it("should return bash instructions", () => {
            const instructions = getInstallInstructions("bash", testPath);

            expect(instructions).toContain("Bash completions installed");
            expect(instructions).toContain(testPath);
            expect(instructions).toContain("~/.bashrc");
            expect(instructions).toContain("source");
        });

        it("should return zsh instructions", () => {
            const instructions = getInstallInstructions("zsh", testPath);

            expect(instructions).toContain("Zsh completions installed");
            expect(instructions).toContain(testPath);
            expect(instructions).toContain("~/.zshrc");
            expect(instructions).toContain("fpath");
            expect(instructions).toContain("compinit");
        });

        it("should return fish instructions", () => {
            const instructions = getInstallInstructions("fish", testPath);

            expect(instructions).toContain("Fish completions installed");
            expect(instructions).toContain(testPath);
            expect(instructions).toContain("automatically loaded");
        });

        it("should include the actual file path", () => {
            const customPath = "/custom/path/to/completions";

            for (const shell of ["bash", "zsh", "fish"] as const) {
                const instructions = getInstallInstructions(shell, customPath);
                expect(instructions).toContain(customPath);
            }
        });
    });

    describe("Script validity checks", () => {
        it("should not have syntax errors in bash script (basic check)", () => {
            const script = generateCompletion("bash");

            // Check balanced braces
            const openBraces = (script.match(/{/g) || []).length;
            const closeBraces = (script.match(/}/g) || []).length;
            expect(openBraces).toBe(closeBraces);

            // Check for required bash elements
            expect(script).toContain("_init_completion");
            expect(script).toContain("COMPREPLY");
            expect(script).toContain("complete -F");
        });

        it("should not have syntax errors in zsh script (basic check)", () => {
            const script = generateCompletion("zsh");

            // Check for required zsh elements
            expect(script).toContain("#compdef");
            expect(script).toContain("typeset -A opt_args");
            expect(script).toContain("_arguments");
            expect(script).toContain("_describe");
        });

        it("should not have syntax errors in fish script (basic check)", () => {
            const script = generateCompletion("fish");

            // Fish completion lines should all start with 'complete' or '#'
            const lines = script.split("\n").filter(l => l.trim());
            const validLines = lines.filter(
                line =>
                    line.trim().startsWith("complete") ||
                    line.trim().startsWith("#") ||
                    line.trim() === ""
            );
            expect(validLines.length).toBe(lines.length);
        });
    });
});
