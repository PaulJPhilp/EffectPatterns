/**
 * Types for Skills Service
 */

export interface SkillMetadata {
	readonly category: string;
	readonly title: string;
	readonly patternCount: number;
	readonly skillLevels: readonly ("beginner" | "intermediate" | "advanced")[];
	readonly filePath: string;
}

export interface SkillContent {
	readonly metadata: SkillMetadata;
	readonly content: string;
}

export interface ValidationIssue {
	readonly category: string;
	readonly filePath: string;
	readonly error: string;
}

export interface SkillStats {
	readonly totalSkills: number;
	readonly totalPatterns: number;
	readonly skillsByLevel: {
		readonly beginner: number;
		readonly intermediate: number;
		readonly advanced: number;
	};
	readonly categoryCoverage: ReadonlyArray<{
		readonly category: string;
		readonly patterns: number;
	}>;
}
