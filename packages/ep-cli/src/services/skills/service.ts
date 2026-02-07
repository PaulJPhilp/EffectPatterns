/**
 * Skills Service implementation
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import * as path from "node:path";
import { PATHS } from "../../constants.js";
import type { SkillsService } from "./api.js";
import {
    SkillNotFoundError,
    SkillsDirectoryNotFoundError
} from "./errors.js";
import type {
    SkillMetadata,
    SkillStats,
    ValidationIssue
} from "./types.js";

/**
 * Skills service using Effect.Service pattern
 */
export class Skills extends Effect.Service<Skills>()("Skills", {
	accessors: true,
	effect: Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const getSkillsDirectory = Effect.gen(function* () {
			const cwd = yield* Effect.sync(() => process.cwd());
			return path.join(cwd, PATHS.SKILLS_DIR);
		});

		const listAllSkills = Effect.gen(function* () {
			const skillsDir = yield* getSkillsDirectory;

			const exists = yield* fs.exists(skillsDir);
			if (!exists) {
				return yield* Effect.fail(
					new SkillsDirectoryNotFoundError({ path: skillsDir })
				);
			}

			const entries = yield* fs.readDirectory(skillsDir);
			const skills: SkillMetadata[] = [];

			for (const entryName of entries) {
				if (entryName === "README.md") continue;

				const entryPath = path.join(skillsDir, entryName);
				const stat = yield* fs.stat(entryPath);

				if (stat.type === "Directory") {
					const skillPath = path.join(entryPath, "SKILL.md");
					const skillExists = yield* fs.exists(skillPath);

					if (skillExists) {
						const content = yield* fs.readFileString(skillPath);
						const metadata = yield* parseSkillMetadata(entryName, content, skillPath);
						skills.push(metadata);
					}
				}
			}

			return skills;
		});

		const parseSkillMetadata = (
			category: string,
			content: string,
			filePath: string
		): Effect.Effect<SkillMetadata, never> =>
			Effect.gen(function* () {
				const lines = content.split("\n");
				let patternCount = 0;
				const skillLevels = new Set<"beginner" | "intermediate" | "advanced">();

				for (const line of lines) {
					if (line.startsWith("###")) {
						patternCount++;
					}
					if (line.toLowerCase().includes("beginner")) skillLevels.add("beginner");
					if (line.toLowerCase().includes("intermediate")) skillLevels.add("intermediate");
					if (line.toLowerCase().includes("advanced")) skillLevels.add("advanced");
				}

				const title = lines.find((l) => l.startsWith("# "))?.replace("# ", "") || category;

				return {
					category,
					title,
					patternCount,
					skillLevels: Array.from(skillLevels),
					filePath,
				};
			});

		const getSkillByCategory = (category: string) =>
			Effect.gen(function* () {
				const skillsDir = yield* getSkillsDirectory;
				const skillPath = path.join(skillsDir, category, "SKILL.md");

				const exists = yield* fs.exists(skillPath);
				if (!exists) {
					return yield* Effect.fail(new SkillNotFoundError({ category }));
				}

				const content = yield* fs.readFileString(skillPath);
				const metadata = yield* parseSkillMetadata(category, content, skillPath);

				return { metadata, content };
			});

		const validateSkill = (category: string) =>
			Effect.gen(function* () {
				const skill = yield* getSkillByCategory(category);
				const errors: ValidationIssue[] = [];

				// Validate structure
				if (!skill.content.includes("# ")) {
					errors.push({
						category,
						filePath: skill.metadata.filePath,
						error: "Missing main heading",
					});
				}

				if (skill.metadata.patternCount === 0) {
					errors.push({
						category,
						filePath: skill.metadata.filePath,
						error: "No patterns found (no ### headings)",
					});
				}

				if (skill.metadata.skillLevels.length === 0) {
					errors.push({
						category,
						filePath: skill.metadata.filePath,
						error: "No skill levels mentioned",
					});
				}

				// Validate required sections
				const requiredSections = ["Good Example", "Anti-Pattern", "Rationale"];
				for (const section of requiredSections) {
					if (!skill.content.includes(section)) {
						errors.push({
							category,
							filePath: skill.metadata.filePath,
							error: `Missing required section: ${section}`,
						});
					}
				}

				return errors;
			});

		const validateAllSkills = Effect.gen(function* () {
			const skills = yield* listAllSkills;
			const allErrors: ValidationIssue[] = [];

			for (const skill of skills) {
				const errors = yield* validateSkill(skill.category);
				allErrors.push(...errors);
			}

			return allErrors;
		});

		const getStats = Effect.gen(function* () {
			const skills = yield* listAllSkills;

			const stats: SkillStats = {
				totalSkills: skills.length,
				totalPatterns: skills.reduce((sum, s) => sum + s.patternCount, 0),
				skillsByLevel: {
					beginner: skills.filter((s) => s.skillLevels.includes("beginner")).length,
					intermediate: skills.filter((s) => s.skillLevels.includes("intermediate")).length,
					advanced: skills.filter((s) => s.skillLevels.includes("advanced")).length,
				},
				categoryCoverage: skills.map((s) => ({
					category: s.category,
					patterns: s.patternCount,
				})),
			};

			return stats;
		});

		return {
			listAll: listAllSkills,
			getByCategory: getSkillByCategory,
			validate: validateSkill,
			validateAll: validateAllSkills,
			getStats,
		} as SkillsService;
	}),
}) { }
