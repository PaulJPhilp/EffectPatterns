/**
 * Install Commands
 */

import { Args, Command, Options, Prompt } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { Display } from "../services/display/index.js";
import { Install, InstalledRule } from "../services/install/index.js";
import { colorize } from "../utils/string.js";

/**
 * install:add - Add rules to AI tool configuration
 */
export const installAddCommand = Command.make("add", {
  options: {
    tool: Options.text("tool").pipe(
      Options.withDescription("The AI tool to add rules for (cursor, agents, etc.)")
    ),
    serverUrl: Options.text("server-url").pipe(
      Options.withDescription("Pattern Server URL"),
      Options.withDefault("http://localhost:3001")
    ),
    skillLevel: Options.optional(
      Options.text("skill-level").pipe(
        Options.withDescription("Filter rules by skill level")
      )
    ),
    useCase: Options.optional(
      Options.text("use-case").pipe(
        Options.withDescription("Filter rules by use case")
      )
    ),
    interactive: Options.boolean("interactive").pipe(
      Options.withAlias("i"),
      Options.withDescription("Select rules interactively"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Fetch rules from Pattern Server and inject them into AI tool configuration."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const { fetchRule, loadInstalledRules, saveInstalledRules, searchRules } = yield* Install;
      
      yield* Console.log(colorize("\n🚀 Installing rules for " + options.tool + "...\n", "cyan"));

      let rulesToInstall = yield* searchRules({
        skillLevel: Option.getOrUndefined(options.skillLevel),
        useCase: Option.getOrUndefined(options.useCase),
      });

      if (options.interactive) {
        const choices = rulesToInstall.map((rule) => ({
          title: `${rule.title} (${rule.skillLevel || "general"})`,
          value: rule,
          description: rule.description,
        }));

        rulesToInstall = yield* Prompt.multiSelect({
          message: "Select rules to install:",
          choices,
        });
      }

      if (rulesToInstall.length === 0) {
        yield* Display.showWarning("No rules selected or found matching criteria.");
        return;
      }

      // Save to state
      const current = yield* loadInstalledRules();
      const newRules: InstalledRule[] = rulesToInstall.map(r => ({
        ...r,
        installedAt: new Date().toISOString(),
        tool: options.tool,
        version: "1.0.0"
      }));

      // Merge (overwrite existing by id)
      const merged = [...current.filter(c => !newRules.find(n => n.id === c.id)), ...newRules];
      yield* saveInstalledRules(merged);

      yield* Console.log(colorize(`\nInstalling ${rulesToInstall.length} rule(s):`, "bright"));
      for (const rule of rulesToInstall) {
        yield* Console.log(`  • ${rule.title}`);
      }

      yield* Display.showSuccess("Rules installed successfully!");
    })
  )
);

/**
 * install:remove - Remove installed rules
 */
export const installRemoveCommand = Command.make("remove", {
  args: {
    ruleId: Args.optional(Args.text({ name: "rule-id" }))
  }
}).pipe(
  Command.withDescription("Remove installed rules"),
  Command.withHandler(({ args }) =>
    Effect.gen(function* () {
      const { loadInstalledRules, saveInstalledRules } = yield* Install;
      const current = yield* loadInstalledRules();
      
      if (current.length === 0) {
        yield* Display.showWarning("No rules installed.");
        return;
      }

      let toRemoveIds: string[] = [];

      if (Option.isSome(args.ruleId)) {
        toRemoveIds = [args.ruleId.value];
      } else {
        // Interactive removal
        const choices = current.map(r => ({
          title: `${r.title} (${r.tool})`,
          value: r.id,
          description: r.description
        }));

        toRemoveIds = yield* Prompt.multiSelect({
          message: "Select rules to remove:",
          choices
        });
      }

      if (toRemoveIds.length === 0) return;

      const remaining = current.filter(r => !toRemoveIds.includes(r.id));
      yield* saveInstalledRules(remaining);

      yield* Display.showSuccess(`Removed ${toRemoveIds.length} rule(s).`);
    })
  )
);

/**
 * install:diff - Compare installed rule with latest
 */
export const installDiffCommand = Command.make("diff", {
  args: {
    ruleId: Args.text({ name: "rule-id" })
  }
}).pipe(
  Command.withDescription("Compare installed rule with latest version"),
  Command.withHandler(({ args }) =>
    Effect.gen(function* () {
      const { fetchRule, loadInstalledRules } = yield* Install;
      const current = yield* loadInstalledRules();
      const installed = current.find(r => r.id === args.ruleId);

      if (!installed) {
        yield* Display.showError(`Rule '${args.ruleId}' is not installed.`);
        return;
      }

      const latest = yield* fetchRule(args.ruleId);

      yield* Console.log(colorize(`\nDiff for ${installed.title}:\n`, "bright"));
      yield* Console.log(`Installed Version: ${installed.version}`);
      yield* Console.log(`Latest Version:    1.0.0`); // Mock version

      if (installed.content === latest.content) {
        yield* Display.showSuccess("Content is up to date.");
      } else {
        yield* Display.showWarning("Content differs (update available).");
      }
    })
  )
);

/**
 * install:list - List supported tools or installed rules
 */
export const installListCommand = Command.make("list", {
  options: {
    installed: Options.boolean("installed").pipe(
      Options.withDescription("List installed rules"),
      Options.withDefault(false)
    )
  }
}).pipe(
  Command.withDescription("List supported AI tools or installed rules."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const { loadInstalledRules } = yield* Install;
      
      if (options.installed) {
        const rules = yield* loadInstalledRules();
        if (rules.length === 0) {
          yield* Console.log("No rules installed.");
          return;
        }
        yield* Console.log(colorize("\n📦 Installed Rules\n", "bright"));
        console.table(rules.map(r => ({
          ID: r.id,
          Title: r.title,
          Tool: r.tool,
          Installed: r.installedAt
        })));
      } else {
        yield* Console.log(colorize("\n📋 Supported AI Tools\n", "bright"));
        yield* Console.log("  • cursor");
        yield* Console.log("  • agents");
        yield* Console.log("  • vscode");
      }
    })
  )
);

/**
 * install - Main install command
 */
export const installCommand = Command.make("install").pipe(
  Command.withDescription("Install Effect patterns rules into AI tool configurations"),
  Command.withSubcommands([
    installAddCommand,
    installListCommand,
    installRemoveCommand,
    installDiffCommand
  ])
);
