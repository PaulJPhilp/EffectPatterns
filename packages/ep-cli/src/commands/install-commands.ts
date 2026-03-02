/**
 * Install Commands
 */

import { Command, Options, Prompt } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import path from "node:path";
import { Display } from "../services/display/index.js";
import { Install, InstalledRule, Rule } from "../services/install/index.js";
import { colorize } from "../utils.js";
import { UnsupportedToolError } from "../errors.js";

type InstallTool = "agent" | "claude" | "cursor" | "vscode" | "windsurf";

const EFFECT_AGENT_START = "<!-- EFFECT_SKILLS_AGENT_START -->";
const EFFECT_AGENT_END = "<!-- EFFECT_SKILLS_AGENT_END -->";

const normalizeTool = (tool: string): InstallTool | null => {
  if (tool === "agents") return "agent";
  if (tool === "agent" || tool === "claude" || tool === "cursor" || tool === "vscode" || tool === "windsurf") {
    return tool;
  }
  return null;
};

const installTargetByTool: Record<InstallTool, string> = {
  agent: "AGENTS.md",
  claude: ".claude/skills/",
  cursor: ".cursor/rules/",
  vscode: ".github/copilot-instructions.md",
  windsurf: ".windsurf/rules/",
};

const categoryConfigs: Record<string, { slug: string; description: string }> = {
  "building-apis": {
    slug: "effect-building-apis",
    description: "Building HTTP APIs, routing, middleware, authentication, CORS, rate limiting",
  },
  "building-data-pipelines": {
    slug: "effect-data-pipelines",
    description: "Data pipelines, backpressure, batching, fan-out, pagination, dead letter queues",
  },
  "concurrency": {
    slug: "effect-concurrency",
    description: "Parallel execution, fibers, Deferred, Semaphore, Latch, Queue, PubSub, race conditions",
  },
  "core-concepts": {
    slug: "effect-core-concepts",
    description: "Fundamentals: Effect.gen, pipe, map, flatMap, Option, Either, Ref, Config, Layer",
  },
  "domain-modeling": {
    slug: "effect-domain-modeling",
    description: "Brand, Schema contracts, TaggedError, Option/Either for domain types",
  },
  "error-management": {
    slug: "effect-error-management",
    description: "catchTag/catchAll, pattern matching on failures, mapError, retry, Cause",
  },
  "getting-started": {
    slug: "effect-getting-started",
    description: "New Effect projects, first programs, Effect vs Promise migration",
  },
  "making-http-requests": {
    slug: "effect-http-requests",
    description: "HttpClient, timeouts, caching, retries, logging HTTP requests",
  },
  "observability": {
    slug: "effect-observability",
    description: "Logging, metrics, tracing, OpenTelemetry, Prometheus, dashboards",
  },
  "platform": {
    slug: "effect-platform",
    description: "Filesystem, shell commands, environment variables, key-value storage, terminal I/O",
  },
  "resource-management": {
    slug: "effect-resource-management",
    description: "acquireRelease, Scope, Layer.scoped, pools, hierarchical resources",
  },
  "scheduling": {
    slug: "effect-scheduling",
    description: "Repeated tasks, cron, debounce, throttle, backoff, circuit breakers",
  },
  "schema": {
    slug: "effect-schema",
    description: "Schema validation, parsing, transforms, unions, recursive schemas, forms, AI output, config",
  },
  "streams": {
    slug: "effect-streams",
    description: "Stream, Sink, transforms, stateful operations, grouping, windowing, error handling in streams",
  },
  "testing": {
    slug: "effect-testing",
    description: "Mock layers, testing services, concurrent/streaming tests, property-based testing",
  },
  "tooling-and-debugging": {
    slug: "effect-tooling",
    description: "Editor setup, CI/CD, linting, DevTools, profiling, LSP, MCP server",
  },
};

const groupByCategory = (
  rules: ReadonlyArray<Rule>
): Map<string, Rule[]> => {
  const byCategory = new Map<string, Rule[]>();
  for (const rule of rules) {
    const cat = rule.category ?? "core-concepts";
    const existing = byCategory.get(cat) ?? [];
    existing.push(rule);
    byCategory.set(cat, existing);
  }
  return byCategory;
};

const markerByTool: Partial<Record<InstallTool, { start: string; end: string }>> = {
  agent: { start: EFFECT_AGENT_START, end: EFFECT_AGENT_END },
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const upsertManagedSection = (
  current: string,
  startMarker: string,
  endMarker: string,
  sectionBody: string
): string => {
  const managedSection = `${startMarker}\n${sectionBody}\n${endMarker}\n`;
  const replacePattern = new RegExp(
    `${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}\\n?`,
    "m"
  );

  if (current.includes(startMarker) && current.includes(endMarker)) {
    return current.replace(replacePattern, managedSection);
  }

  if (current.trim().length === 0) {
    return managedSection;
  }

  const separator = current.endsWith("\n") ? "\n" : "\n\n";
  return `${current}${separator}${managedSection}`;
};

const buildAgentSection = (
  rules: ReadonlyArray<Pick<InstalledRule, "id" | "title" | "skillLevel" | "useCase" | "description">>,
  generatedAtIso: string
): string =>
  [
    "## Effect Skills",
    "",
    `Generated by ep on ${generatedAtIso}.`,
    "",
    ...rules.flatMap((rule) => [
      `### ${rule.title}`,
      `- ID: ${rule.id}`,
      `- Skill Level: ${rule.skillLevel ?? "general"}`,
      `- Use Cases: ${(rule.useCase ?? []).join(", ") || "none"}`,
      "",
      rule.description,
      "",
    ]),
  ].join("\n");

const formatCategoryTitle = (category: string): string =>
  category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const buildClaudeSkillFile = (
  category: string,
  description: string,
  rules: ReadonlyArray<Pick<Rule, "title" | "skillLevel" | "description">>,
  generatedAtIso: string
): string =>
  [
    `## Effect Patterns: ${formatCategoryTitle(category)}`,
    "",
    `Use when: ${description}`,
    "",
    `Updated: ${generatedAtIso}`,
    "",
    "### Patterns",
    "",
    ...rules.map((rule) => {
      const level = rule.skillLevel ?? "general";
      return `- **${rule.title}** (${level}): ${rule.description}`;
    }),
    "",
  ].join("\n");

const buildMdcSkillFile = (
  category: string,
  description: string,
  rules: ReadonlyArray<Pick<Rule, "title" | "skillLevel" | "description">>,
  generatedAtIso: string
): string =>
  [
    "---",
    `description: "Effect patterns: ${description}"`,
    `globs: "**/*.ts, **/*.tsx"`,
    `alwaysApply: false`,
    "---",
    "",
    `# Effect Patterns: ${formatCategoryTitle(category)}`,
    "",
    `Use when: ${description}`,
    "",
    `Updated: ${generatedAtIso}`,
    "",
    ...rules.map((rule) => {
      const level = rule.skillLevel ?? "general";
      return `- **${rule.title}** (${level}): ${rule.description}`;
    }),
    "",
  ].join("\n");

const buildCopilotFile = (
  byCategory: Map<string, ReadonlyArray<Pick<Rule, "title" | "skillLevel" | "description">>>,
  generatedAtIso: string
): string => {
  const sections: string[] = [
    "# Effect Patterns",
    "",
    `Generated by ep on ${generatedAtIso}.`,
    "",
  ];

  for (const [cat, rules] of byCategory) {
    const config = categoryConfigs[cat];
    if (!config) continue;
    sections.push(
      `## ${formatCategoryTitle(cat)}`,
      "",
      `Use when: ${config.description}`,
      "",
      ...rules.map((rule) => {
        const level = rule.skillLevel ?? "general";
        return `- **${rule.title}** (${level}): ${rule.description}`;
      }),
      "",
    );
  }

  return sections.join("\n");
};

/**
 * install:add - Add rules to AI tool configuration
 */
export const installAddCommand = Command.make("add", {
  options: {
    tool: Options.text("tool").pipe(
      Options.withDescription("Target tool format (agent, claude, cursor, vscode, windsurf)"),
      Options.withDefault("agent")
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
  Command.withDescription("Install rules into supported local tool config files."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const { loadInstalledRules, saveInstalledRules, searchRules } = yield* Install;
      const fs = yield* FileSystem.FileSystem;

      const normalizedTool = normalizeTool(options.tool);
      if (!normalizedTool) {
        const supportedTools = ["agent", "claude", "cursor", "vscode", "windsurf"];
        yield* Display.showError(
          `Tool '${options.tool}' is not supported by local file injection yet. Supported: ${supportedTools.join(", ")}`
        );
        return yield* Effect.fail(new UnsupportedToolError({
          tool: options.tool,
          supported: supportedTools,
        }));
      }
      const targetPath = installTargetByTool[normalizedTool];

      yield* Console.log(colorize("\nInstalling rules for " + normalizedTool + "...\n", "CYAN"));

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

      const generatedAt = new Date().toISOString();

      if (normalizedTool === "agent") {
        const markers = markerByTool[normalizedTool];
        if (!markers) {
          return yield* Effect.fail(new Error(`Missing marker configuration for tool: ${normalizedTool}`));
        }

        const managedBody = buildAgentSection(rulesToInstall, generatedAt);
        const exists = yield* fs.exists(targetPath);
        const current = exists ? yield* fs.readFileString(targetPath) : "";
        const nextContent = upsertManagedSection(
          current,
          markers.start,
          markers.end,
          managedBody
        );

        yield* fs.writeFileString(targetPath, nextContent);
      } else if (normalizedTool === "claude") {
        const skillsDir = ".claude/skills";
        yield* fs.makeDirectory(skillsDir, { recursive: true });

        const byCategory = groupByCategory(rulesToInstall);

        let filesWritten = 0;
        for (const [cat, rules] of byCategory) {
          const config = categoryConfigs[cat];
          if (!config) continue;
          const filePath = path.join(skillsDir, `${config.slug}.md`);
          const content = buildClaudeSkillFile(cat, config.description, rules, generatedAt);
          yield* fs.writeFileString(filePath, content);
          filesWritten++;
        }

        yield* Console.log(
          colorize(
            `\n✅ Installed ${rulesToInstall.length} rule(s) across ${filesWritten} skill file(s) in ${skillsDir}/`,
            "GREEN"
          )
        );
      } else if (normalizedTool === "cursor" || normalizedTool === "windsurf") {
        const rulesDir = targetPath; // e.g. ".cursor/rules/" or ".windsurf/rules/"
        yield* fs.makeDirectory(rulesDir, { recursive: true });

        const byCategory = groupByCategory(rulesToInstall);

        let filesWritten = 0;
        for (const [cat, rules] of byCategory) {
          const config = categoryConfigs[cat];
          if (!config) continue;
          const filePath = path.join(rulesDir, `${config.slug}.mdc`);
          const content = buildMdcSkillFile(cat, config.description, rules, generatedAt);
          yield* fs.writeFileString(filePath, content);
          filesWritten++;
        }

        yield* Console.log(
          colorize(
            `\n✅ Installed ${rulesToInstall.length} rule(s) across ${filesWritten} file(s) in ${rulesDir}`,
            "GREEN"
          )
        );
      } else if (normalizedTool === "vscode") {
        yield* fs.makeDirectory(path.dirname(targetPath), { recursive: true });

        const byCategory = groupByCategory(rulesToInstall);
        const content = buildCopilotFile(byCategory, generatedAt);
        yield* fs.writeFileString(targetPath, content);

        yield* Console.log(
          colorize(
            `\n✅ Installed ${rulesToInstall.length} rule(s) to ${targetPath}`,
            "GREEN"
          )
        );
      }

      // Save install state
      const current = yield* loadInstalledRules();
      const newRules: InstalledRule[] = rulesToInstall.map((r) => ({
        ...r,
        installedAt: new Date().toISOString(),
        tool: normalizedTool,
        version: "1.0.0",
      }));
      const merged = [
        ...current.filter((c) => !newRules.find((n) => n.id === c.id && n.tool === c.tool)),
        ...newRules,
      ];
      yield* saveInstalledRules(merged);

      if (normalizedTool === "agent") {
        yield* Console.log(`✅ Installed Effect Skills to ${targetPath}`);
      }
      yield* Display.showInfo(`Next: ep install list --installed`);
    })
  )
);

/**
 * Display installed rules or message if none exist
 */
const displayInstalledRules = (
  loadInstalledRules: () => Effect.Effect<InstalledRule[], unknown>
): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    const rules = yield* loadInstalledRules();
    if (rules.length === 0) {
      yield* Console.log("No rules installed.");
      return;
    }
    yield* Console.log(colorize("\n📦 Installed Rules\n", "BRIGHT"));
    console.table(rules.map(r => ({
      ID: r.id,
      Title: r.title,
      Tool: r.tool,
      Installed: r.installedAt
    })));
  });

/**
 * Display supported AI tools
 */
const displaySupportedTools = (): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    yield* Console.log(colorize("\n📋 Supported AI Tools\n", "BRIGHT"));
    yield* Console.log("  • agent");
    yield* Console.log("  • claude");
    yield* Console.log("  • cursor");
    yield* Console.log("  • vscode");
    yield* Console.log("  • windsurf");
  });

/**
 * install:list - List supported tools or installed rules
 */
export const installListCommand = Command.make("list", {
  options: {
    installed: Options.boolean("installed").pipe(
      Options.withDescription("List installed rules"),
      Options.withDefault(false)
    ),
    json: Options.boolean("json").pipe(
      Options.withDescription("Output results as JSON"),
      Options.withDefault(false)
    ),
  }
}).pipe(
  Command.withDescription("List supported AI tools or installed rules."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const { loadInstalledRules } = yield* Install;
      const supportedTools = ["agent", "claude", "cursor", "vscode", "windsurf"] as const;

      if (options.json) {
        if (options.installed) {
          const rules = yield* loadInstalledRules();
          yield* Console.log(JSON.stringify({
            count: rules.length,
            rules,
          }, null, 2));
          return;
        }

        yield* Console.log(JSON.stringify({
          tools: supportedTools,
        }, null, 2));
        return;
      }
      
      if (options.installed) {
        yield* displayInstalledRules(loadInstalledRules);
        yield* Display.showInfo("Tip: re-run with --json for machine-readable output.");
      } else {
        yield* displaySupportedTools();
        yield* Display.showInfo("Next: ep install add --tool cursor");
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
    installListCommand
  ])
);
