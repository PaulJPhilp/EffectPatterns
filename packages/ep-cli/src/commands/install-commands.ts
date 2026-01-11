/**
 * Install Commands
 */

import { Args, Command, Options, Prompt } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option, Schema } from "effect";
import { Display } from "../services/display/index.js";
import { colorize } from "../utils/string.js";

// State File
const INSTALLED_STATE_FILE = ".ep-installed.json";

// Rules Schema
const RuleSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  skillLevel: Schema.optional(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  content: Schema.String,
});

type Rule = typeof RuleSchema.Type;

interface InstalledRule extends Rule {
  installedAt: string;
  tool: string;
  version: string;
}

// Mock Rules for Interactive Mode
const MOCK_RULES: Rule[] = [
  {
    id: "error-management",
    title: "Error Recovery Pattern",
    description: "Best practices for handling errors in Effect",
    skillLevel: "beginner",
    useCase: ["error-management"],
    content: "Content v1.0",
  },
  {
    id: "concurrency",
    title: "Concurrency Control",
    description: "Managing concurrent tasks safely",
    skillLevel: "intermediate",
    useCase: ["concurrency"],
    content: "Content v1.0",
  },
  {
    id: "resource-management",
    title: "Resource Management",
    description: "Safe acquisition and release of resources",
    skillLevel: "advanced",
    useCase: ["resource-management"],
    content: "Content v1.0",
  },
];

// Helpers
const loadInstalledRules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists(INSTALLED_STATE_FILE);
  if (!exists) return [];

  const content = yield* fs.readFileString(INSTALLED_STATE_FILE);
  try {
    return JSON.parse(content) as InstalledRule[];
  } catch {
    return [];
  }
});

const saveInstalledRules = (rules: InstalledRule[]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.writeFileString(INSTALLED_STATE_FILE, JSON.stringify(rules, null, 2));
  });

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
      yield* Console.log(colorize("\n🚀 Installing rules for " + options.tool + "...\n", "cyan"));

      let rulesToInstall: Rule[] = [];

      if (options.interactive) {
        const choices = MOCK_RULES.map((rule) => ({
          title: `${rule.title} (${rule.skillLevel || "general"})`,
          value: rule,
          description: rule.description,
        }));

        rulesToInstall = yield* Prompt.multiSelect({
          message: "Select rules to install:",
          choices,
        });
      } else {
        // Mock default behavior
        rulesToInstall = MOCK_RULES;
        if (Option.isSome(options.skillLevel)) {
          const skillLevel = Option.getOrUndefined(options.skillLevel);
          if (skillLevel) {
            rulesToInstall = rulesToInstall.filter(
              (r) => r.skillLevel === skillLevel
            );
          }
        }
      }

      if (rulesToInstall.length === 0) {
        yield* Display.showWarning("No rules selected or found matching criteria.");
        return;
      }

      // Save to state
      const current = yield* loadInstalledRules;
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
      const current = yield* loadInstalledRules;
      if (current.length === 0) {
        yield* Display.showWarning("No rules installed.");
        return;
      }

      let toRemoveIds: string[] = [];

      if (args.ruleId._tag === "Some") {
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
      const current = yield* loadInstalledRules;
      const installed = current.find(r => r.id === args.ruleId);

      if (!installed) {
        yield* Display.showError(`Rule '${args.ruleId}' is not installed.`);
        return;
      }

      const latest = MOCK_RULES.find(r => r.id === args.ruleId);
      if (!latest) {
        yield* Display.showWarning(`Rule '${args.ruleId}' no longer exists in registry.`);
        return;
      }

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
      if (options.installed) {
        const rules = yield* loadInstalledRules;
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
