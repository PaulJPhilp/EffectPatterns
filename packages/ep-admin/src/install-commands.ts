/**
 * Install and rules commands for AI tool integration
 *
 * Commands for installing Effect patterns into AI tools and generating skills
 */

import {
	ApplicationPatternRepositoryService,
	DatabaseLayer,
	EffectPatternRepositoryLive,
	EffectPatternRepositoryService,
	type SkillLevel,
} from "@effect-patterns/toolkit";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import * as path from "node:path";
import { emitJson } from "./cli/output.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import {
	generateCategorySkill,
	generateGeminiSkill,
	generateOpenAISkill,
	groupPatternsByCategory,
	patternFromDatabase,
	writeGeminiSkill,
	writeOpenAISkill,
	writeSkill,
	type PatternContent,
} from "./skills/skill-generator.js";
import { colorize, getProjectRoot } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();

/**
 * Rule type for pattern installation
 */
interface Rule {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly skillLevel?: string;
	readonly useCase?: readonly string[];
	readonly content: string;
}

/**
 * Format a single rule
 */
const formatRule = (rule: Rule): string => {
	const lines: string[] = [];
	lines.push(`### ${rule.title}`);
	lines.push(`**ID:** ${rule.id}`);
	const useCase = rule.useCase?.join(", ") || "N/A";
	const skillLevel = rule.skillLevel || "N/A";
	lines.push(`**Use Case:** ${useCase} | **Skill Level:** ${skillLevel}`);
	lines.push("");
	lines.push(rule.content);
	lines.push("");
	return lines.join("\n");
};

/**
 * Inject rules into a target file
 */
const injectRulesIntoFile = (filePath: string, rules: readonly Rule[]) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const startMarker = "# --- BEGIN EFFECTPATTERNS RULES ---";
		const endMarker = "# --- END EFFECTPATTERNS RULES ---";

		const formattedRules = rules.map(formatRule).join("\n---\n\n");
		const managedBlock = `${startMarker}\n\n${formattedRules}\n${endMarker}`;

		const fileExists = yield* fs.exists(filePath);

		let content = "";
		if (fileExists) {
			content = yield* fs.readFileString(filePath);
		}

		const startIndex = content.indexOf(startMarker);
		const endIndex = content.indexOf(endMarker);

		let newContent: string;

		if (startIndex !== -1 && endIndex !== -1) {
			const before = content.substring(0, startIndex);
			const after = content.substring(endIndex + endMarker.length);
			newContent = before + managedBlock + after;
		} else {
			newContent = content
				? `${content}\n\n${managedBlock}\n`
				: `${managedBlock}\n`;
		}

		const dir = path.dirname(filePath);
		yield* fs.makeDirectory(dir, { recursive: true });
		yield* fs.writeFileString(filePath, newContent);

		return rules.length;
	});

/**
 * install:add - Add rules to AI tool configuration
 */
export const installAddCommand = Command.make("add", {
	options: {
		...globalOptions,
		tool: Options.text("tool").pipe(
			Options.withDescription(
				"The AI tool to add rules for (cursor, agents, etc.)"
			)
		),
		skillLevel: Options.text("skill-level").pipe(
			Options.withDescription(
				"Filter by skill level (beginner, intermediate, advanced)"
			),
			Options.optional
		),
		useCase: Options.text("use-case").pipe(
			Options.withDescription(
				"Filter by use case (error-management, core-concepts, etc.)"
			),
			Options.optional
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Fetch rules from database and inject them into AI tool configuration."
	),
	Command.withHandler(
		({ options }) =>
			Effect.scoped(
				Effect.gen(function* () {
					yield* configureLoggerFromOptions(options);
					const tool = options.tool;
					const skillLevelFilter = options.skillLevel;
					const useCaseFilter = options.useCase;

					const supportedTools = [
						"cursor",
						"agents",
						"windsurf",
						"gemini",
						"claude",
						"vscode",
						"kilo",
						"kira",
						"trae",
						"goose",
					];

					if (!supportedTools.includes(tool)) {
						if (options.json) {
							yield* emitJson({
								ok: false,
								error: `Unsupported tool: ${tool}`,
								supportedTools,
							});
							return yield* Effect.fail(new Error(`Unsupported tool: ${tool}`));
						}
						yield* Console.error(
							colorize(`\n❌ Error: Tool "${tool}" is not supported\n`, "RED")
						);
						yield* Console.error(
							colorize("Currently supported tools:\n", "BRIGHT")
						);
						for (const t of supportedTools) {
							yield* Console.error(`  • ${t}`);
						}
						return yield* Effect.fail(new Error(`Unsupported tool: ${tool}`));
					}

					const repo = yield* EffectPatternRepositoryService;
					const searchParams: {
						query?: string;
						skillLevel?: SkillLevel;
						limit?: number;
					} = { limit: 1000 };

					if (Option.isSome(skillLevelFilter)) {
						searchParams.skillLevel =
							skillLevelFilter.value.toLowerCase() as SkillLevel;
					}

					const dbPatterns = yield* Effect.tryPromise({
						try: () => repo.search(searchParams),
						catch: (error) =>
							new Error(
								`Failed to query patterns: ${error instanceof Error ? error.message : String(error)}`
							),
					});

					const allRules: Rule[] = dbPatterns.map((p) => ({
						id: p.slug,
						title: p.title,
						description: p.summary,
						skillLevel: p.skillLevel ?? undefined,
						useCase: p.useCases ?? undefined,
						content: p.content ?? p.summary,
					}));

					if (!options.json) {
						yield* Console.log(
							`✓ Loaded ${allRules.length} rules from database`
						);
					}

					let rules = allRules;

					if (Option.isSome(skillLevelFilter)) {
						const level = skillLevelFilter.value;
						if (!options.json) {
							yield* Console.log(
								colorize(
									`📊 Filtered to ${rules.length} rules with skill level: ` +
									`${level}\n`,
									"CYAN"
								)
							);
						}
					}

					if (Option.isSome(useCaseFilter)) {
						const useCase = useCaseFilter.value;
						rules = rules.filter((rule) =>
							rule.useCase?.some(
								(uc) => uc.toLowerCase() === useCase.toLowerCase()
							)
						);
						if (!options.json) {
							yield* Console.log(
								colorize(
									`📊 Filtered to ${rules.length} rules with use case: ` +
									`${useCase}\n`,
									"CYAN"
								)
							);
						}
					}

					if (rules.length === 0) {
						if (options.json) {
							yield* emitJson({
								ok: false,
								error: "No rules match the specified filters",
								ruleCount: 0,
							});
							return yield* Effect.fail(
								new Error("No rules match the specified filters")
							);
						}
						yield* Console.log(
							colorize("⚠️  No rules match the specified filters\n", "YELLOW")
						);
						return;
					}

					const toolFileMap: Record<string, string> = {
						agents: "AGENTS.md",
						windsurf: ".windsurf/rules.md",
						gemini: "GEMINI.md",
						claude: "CLAUDE.md",
						vscode: ".vscode/rules.md",
						kilo: ".kilo/rules.md",
						kira: ".kira/rules.md",
						trae: ".trae/rules.md",
						goose: ".goosehints",
						cursor: ".cursor/rules.md",
					};

					const targetFile = toolFileMap[tool] || ".cursor/rules.md";

					if (!options.json) {
						yield* Console.log(
							colorize(`📝 Injecting rules into ${targetFile}...\n`, "CYAN")
						);
					}

					const count = yield* injectRulesIntoFile(targetFile, rules).pipe(
						Effect.catchAll((error) =>
							Effect.gen(function* () {
								if (options.json) {
									yield* emitJson({
										ok: false,
										error: "Failed to inject rules",
										details: String(error),
									});
								} else {
									yield* Console.log(
										colorize("❌ Failed to inject rules\n", "RED")
									);
									yield* Console.log(`Error: ${error}\n`);
								}
								return yield* Effect.fail(
									new Error("Failed to inject rules")
								);
							})
						)
					);

					if (options.json) {
						yield* emitJson({
							ok: true,
							tool,
							targetFile,
							ruleCount: count,
						});
						return;
					}

					yield* Display.showPanel(
						`Successfully added ${count} rules to ${targetFile}

Tool: ${tool}
File: ${targetFile}
Rules Added: ${count}

Your AI tool configuration has been updated with Effect patterns!`,
						"Installation Complete",
						{ type: "success" }
					);
				})
			).pipe(
				Effect.provide(EffectPatternRepositoryLive),
			) as any
	)
);

/**
 * install:list - List all supported AI tools
 */
export const installListCommand = Command.make("list", {
	options: {
		...globalOptions,
	},
	args: {},
}).pipe(
	Command.withDescription(
		"List all supported AI tools and their configuration file paths."
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);
			const tools = [
				{ name: "cursor", desc: "Cursor IDE", file: ".cursor/rules.md" },
				{ name: "agents", desc: "AGENTS.md standard", file: "AGENTS.md" },
				{ name: "windsurf", desc: "Windsurf IDE", file: ".windsurf/rules.md" },
				{ name: "gemini", desc: "Gemini AI", file: "GEMINI.md" },
				{ name: "claude", desc: "Claude AI", file: "CLAUDE.md" },
				{
					name: "vscode",
					desc: "VS Code / Continue.dev",
					file: ".vscode/rules.md",
				},
				{ name: "kilo", desc: "Kilo IDE", file: ".kilo/rules.md" },
				{ name: "kira", desc: "Kira IDE", file: ".kira/rules.md" },
				{ name: "trae", desc: "Trae IDE", file: ".trae/rules.md" },
				{ name: "goose", desc: "Goose AI", file: ".goosehints" },
			];

			if (options.json) {
				yield* emitJson({ tools });
				return;
			}

			yield* Console.log(colorize("\n📋 Supported AI Tools\n", "BRIGHT"));
			yield* Console.log("═".repeat(60));
			yield* Console.log("");

			for (const tool of tools) {
				yield* Console.log(
					colorize(`  ${tool.name.padEnd(12)}`, "CYAN") +
					`${tool.desc.padEnd(30)}` +
					colorize(tool.file, "DIM")
				);
			}

			yield* Console.log("");
			yield* Console.log("═".repeat(60));
			yield* Console.log(colorize("\n💡 Usage:\n", "BRIGHT"));
			yield* Console.log(
				colorize("  bun run ep install add --tool <name>\n", "CYAN")
			);
		})
	)
);

/**
 * install:skills - Generate Skills from patterns
 */
export const installSkillsCommand = Command.make("skills", {
	options: {
		...globalOptions,
		category: Options.text("category").pipe(
			Options.withDescription("Generate skill for specific category only"),
			Options.optional
		),
		format: Options.text("format").pipe(
			Options.withDescription(
				"Output format: claude, gemini, openai, or both (default: both)"
			),
			Options.withDefault("both")
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Generate Skills (Claude, Gemini, OpenAI) from published Effect patterns"
	),
	Command.withHandler(({ options }) => {
		return Effect.scoped(
			Effect.gen(function* () {
				yield* configureLoggerFromOptions(options);
				const formatOption: string = options.format;
				const validOptions = ["claude", "gemini", "openai", "both"];
				const log = (message: string) =>
					options.json ? Effect.void : Console.log(message);
				const warnings: string[] = [];

				let generateClaude = false;
				let generateGemini = false;
				let generateOpenAI = false;

			const formatLower = formatOption.toLowerCase();

			if (formatLower === "both") {
				generateClaude = true;
				generateGemini = true;
				generateOpenAI = true;
			} else {
				const formats = formatLower.split(",").map((f) => f.trim());

				for (const fmt of formats) {
					if (!validOptions.includes(fmt)) {
						if (options.json) {
							yield* emitJson({
								ok: false,
								error: `Invalid format: ${fmt}`,
								validOptions,
							});
							return yield* Effect.fail(new Error("Invalid format option"));
						}
						yield* Console.error(
							colorize(
								`\n❌ Invalid format: ${fmt}\nValid options: ` +
								`${validOptions.join(", ")}\n`,
								"RED"
							)
						);
						return yield* Effect.fail(new Error("Invalid format option"));
					}

					if (fmt === "claude") generateClaude = true;
					if (fmt === "gemini") generateGemini = true;
					if (fmt === "openai") generateOpenAI = true;
				}
			}

				if (!generateClaude && !generateGemini && !generateOpenAI) {
					if (options.json) {
						yield* emitJson({
							ok: false,
							error: "No format option",
						});
					} else {
						yield* Console.error(
							colorize(
								`\n❌ No formats specified. Valid options: ` +
								`${validOptions.join(", ")}\n`,
								"RED"
							)
						);
					}
					return yield* Effect.fail(new Error("No format option"));
				}

				yield* log(
					colorize("\n🎓 Generating Skills from Effect Patterns\n", "BRIGHT")
				);

				const epRepo = yield* EffectPatternRepositoryService;
				const apRepo = yield* ApplicationPatternRepositoryService;

				yield* log(colorize("📖 Loading patterns from database...", "CYAN"));
				const dbPatterns = yield* Effect.tryPromise({
					try: () => epRepo.findAll(),
					catch: (error) =>
						new Error(`Failed to load patterns from database: ${error}`),
				});

				yield* log(colorize(`✓ Found ${dbPatterns.length} patterns\n`, "GREEN"));

			const applicationPatterns = yield* Effect.tryPromise({
				try: () => apRepo.findAll(),
				catch: (error) =>
					new Error(`Failed to load application patterns: ${error}`),
			});

			const apIdToSlug = new Map(
				applicationPatterns.map((ap) => [ap.id, ap.slug])
			);

			const patterns: PatternContent[] = [];
				for (const dbPattern of dbPatterns) {
					if (dbPattern.applicationPatternId) {
						const pattern = patternFromDatabase(dbPattern);
					const apSlug = apIdToSlug.get(dbPattern.applicationPatternId);
					if (apSlug) {
						pattern.applicationPatternId = apSlug;
						patterns.push(pattern);
					}
					}
				}

				const categoryMap = groupPatternsByCategory(patterns);

				yield* log(
					colorize(
						`✓ Processed ${patterns.length} patterns with application patterns\n`,
						"GREEN"
					)
				);
				yield* log(colorize("🗂️  Grouping patterns by category...", "CYAN"));
				yield* log(colorize(`✓ Found ${categoryMap.size} categories\n`, "GREEN"));

				let claudeCount = 0;
				let geminiCount = 0;
				let openaiCount = 0;

				if (options.category._tag === "Some") {
					const category = options.category.value
						.toLowerCase()
						.replace(/\s+/g, "-");
					const categoryPatterns = categoryMap.get(category);

					if (!categoryPatterns) {
						if (options.json) {
							yield* emitJson({
								ok: false,
								error: `Category not found: ${category}`,
								availableCategories: Array.from(categoryMap.keys()).sort(),
							});
							return yield* Effect.fail(new Error("Category not found"));
						}
						yield* Console.error(
							colorize(`\n❌ Category not found: ${category}\n`, "RED")
						);
						yield* Console.log(colorize("Available categories:\n", "BRIGHT"));
						const sortedCategories = Array.from(categoryMap.keys()).sort();
						for (const cat of sortedCategories) {
							yield* Console.log(`  • ${cat}`);
						}
						return yield* Effect.fail(new Error("Category not found"));
					}

					if (generateClaude) {
						const skillName = `effect-patterns-${category}`;
						const content = generateCategorySkill(category, categoryPatterns);

					yield* Effect.tryPromise({
						try: () => writeSkill(skillName, content, PROJECT_ROOT),
							catch: (error) =>
								new Error(`Failed to write Claude skill: ${error}`),
						});
						claudeCount++;
						yield* log(colorize(`✓ Generated Claude skill: ${skillName}\n`, "GREEN"));
					}

					if (generateGemini) {
						const geminiSkill = generateGeminiSkill(category, categoryPatterns);

					yield* Effect.tryPromise({
						try: () => writeGeminiSkill(geminiSkill, PROJECT_ROOT),
							catch: (error) =>
								new Error(`Failed to write Gemini skill: ${error}`),
						});
						geminiCount++;
						yield* log(
							colorize(`✓ Generated Gemini skill: ${geminiSkill.skillId}\n`, "GREEN")
						);
					}

					if (generateOpenAI) {
						const skillName = `effect-patterns-${category}`;
					const content = generateOpenAISkill(category, categoryPatterns);

					yield* Effect.tryPromise({
						try: () => writeOpenAISkill(skillName, content, PROJECT_ROOT),
							catch: (error) =>
								new Error(`Failed to write OpenAI skill: ${error}`),
						});
						openaiCount++;
						yield* log(colorize(`✓ Generated OpenAI skill: ${skillName}\n`, "GREEN"));
					}

					if (options.json) {
						yield* emitJson({
							ok: true,
							totalPatterns: patterns.length,
							format: formatOption,
							categoryCount: categoryMap.size,
							mode: "single",
							category,
							generated: {
								claude: claudeCount,
								gemini: geminiCount,
								openai: openaiCount,
							},
							warnings,
						});
					}

					return;
				}

				yield* log(
					colorize(
						`📝 Generating ${categoryMap.size} skills for ${formatOption}...\n`,
						"CYAN"
					)
				);

				for (const [category, categoryPatterns] of categoryMap.entries()) {
					if (generateClaude) {
					const skillName = `effect-patterns-${category}`;
					const content = generateCategorySkill(category, categoryPatterns);

					const writeResult = yield* Effect.tryPromise({
						try: () => writeSkill(skillName, content, PROJECT_ROOT),
						catch: (error) =>
							new Error(`Failed to write ${skillName}: ${error}`),
						}).pipe(
							Effect.catchAll((error) =>
								Effect.gen(function* () {
									if (options.json) {
										warnings.push(error.message);
									} else {
										yield* Console.log(colorize(`⚠️  ${error.message}`, "YELLOW"));
									}
									return null;
								})
							)
					);

					if (writeResult !== null) {
						yield* Console.log(
							colorize(
								`  ✓ ${skillName} (${categoryPatterns.length} patterns)`,
								"GREEN"
							)
						);
						claudeCount++;
					}
				}

					if (generateGemini) {
						const geminiSkill = generateGeminiSkill(category, categoryPatterns);

					const writeResult = yield* Effect.tryPromise({
						try: () => writeGeminiSkill(geminiSkill, PROJECT_ROOT),
						catch: (error) =>
							new Error(`Failed to write Gemini skill: ${error}`),
						}).pipe(
							Effect.catchAll((error) =>
								Effect.gen(function* () {
									if (options.json) {
										warnings.push(error.message);
									} else {
										yield* Console.log(colorize(`⚠️  ${error.message}`, "YELLOW"));
									}
									return null;
								})
							)
					);

					if (writeResult !== null) {
						yield* Console.log(
							colorize(
								`  ✓ ${geminiSkill.skillId} (${categoryPatterns.length} ` +
								`patterns)`,
								"GREEN"
							)
						);
						geminiCount++;
					}
				}

					if (generateOpenAI) {
						const skillName = `effect-patterns-${category}`;
					const content = generateOpenAISkill(category, categoryPatterns);

					const writeResult = yield* Effect.tryPromise({
						try: () => writeOpenAISkill(skillName, content, PROJECT_ROOT),
						catch: (error) =>
							new Error(`Failed to write OpenAI skill: ${error}`),
						}).pipe(
							Effect.catchAll((error) =>
								Effect.gen(function* () {
									if (options.json) {
										warnings.push(error.message);
									} else {
										yield* Console.log(colorize(`⚠️  ${error.message}`, "YELLOW"));
									}
									return null;
								})
							)
					);

					if (writeResult !== null) {
						yield* Console.log(
							colorize(
								`  ✓ ${skillName} (${categoryPatterns.length} patterns)`,
								"GREEN"
							)
						);
						openaiCount++;
					}
				}
			}

			const summaryParts: string[] = [];

			if (generateClaude && claudeCount > 0) {
				summaryParts.push(
					`Generated ${claudeCount} Claude Skills from ${patterns.length} ` +
					`Effect patterns.`
				);
				summaryParts.push(
					`Claude Skills Location: content/published/skills/claude/`
				);
			}

			if (generateGemini && geminiCount > 0) {
				summaryParts.push(
					`Generated ${geminiCount} Gemini Skills from ${patterns.length} ` +
					`Effect patterns.`
				);
				summaryParts.push(
					`Gemini Skills Location: content/published/skills/gemini/`
				);
			}

				if (generateOpenAI && openaiCount > 0) {
				summaryParts.push(
					`Generated ${openaiCount} OpenAI Skills from ${patterns.length} ` +
					`Effect patterns.`
				);
				summaryParts.push(
					`OpenAI Skills Location: content/published/skills/openai/`
				);
			}

				summaryParts.push(
					`\nEach skill is organized by category and includes:
- Curated patterns from the published library
- Code examples (Good & Anti-patterns)
- Rationale and best practices
- Skill level guidance (Beginner → Intermediate → Advanced)`
				);

				if (options.json) {
					yield* emitJson({
						ok: true,
						totalPatterns: patterns.length,
						format: formatOption,
						categoryCount: categoryMap.size,
						mode: "all",
						generated: {
							claude: claudeCount,
							gemini: geminiCount,
							openai: openaiCount,
						},
						warnings,
					});
					return;
				}

				yield* Display.showPanel(
					summaryParts.join("\n"),
					"✨ Skills Generation Complete!",
				{ type: "success" }
			);
		})).pipe(
			Effect.provide(DatabaseLayer),
		) as any;
	})
);

/**
 * rules:generate - Generate rules (legacy command)
 */
export const rulesGenerateCommand = Command.make("generate", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed generation output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Generates AI coding rules (.mdc files) from all pattern files."
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* Console.log(
				colorize(
					"\n⚠️  This command is deprecated. Use 'install' commands instead.\n",
					"YELLOW"
				)
			);
			yield* Console.log("Recommended alternatives:");
			yield* Console.log(
				colorize("  bun run ep install add --tool cursor\n", "CYAN")
			);
		})
	)
);

/**
 * Compose install commands
 */
export const installCommand = Command.make("install").pipe(
	Command.withDescription(
		"Install Effect patterns rules into AI tool configurations"
	),
	Command.withSubcommands([
		installAddCommand,
		installListCommand,
		installSkillsCommand,
	])
);

/**
 * Compose rules commands (legacy)
 */
export const rulesCommand = Command.make("rules").pipe(
	Command.withDescription("AI coding rules generation (legacy)"),
	Command.withSubcommands([rulesGenerateCommand])
);
