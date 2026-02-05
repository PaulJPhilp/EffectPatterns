import type { RuleSeverity } from "../services/rule-registry";
import type { RuleId } from "../tools/ids";

export type RuleLevel = "off" | "warn" | "error";

export interface RuleOverrides {
	/** Impact only; changing severity does not change CI exit code—only level (enforcement) does. */
	readonly severity?: RuleSeverity;
	readonly options?: Record<string, unknown>;
}

export type RuleConfig =
	| RuleLevel
	| readonly [Exclude<RuleLevel, "off">, RuleOverrides];

export interface AnalysisConfig {
	readonly rules?: Partial<Record<RuleId, RuleConfig>>;
	readonly ignore?: readonly string[];
	readonly include?: readonly string[];
}

export interface ResolvedRuleConfig {
	/** Resolved enforcement level: off | warn | error. Config overrides win over rule.defaultLevel. */
	readonly level: RuleLevel;
	readonly severity: RuleSeverity;
	readonly options?: Record<string, unknown>;
}

/** Derived: rule is active when level is not "off". Use this instead of storing enabled to avoid footguns (e.g. future appliesTo/file-type gating). */
export const isLevelEnabled = (level: RuleLevel): boolean => level !== "off";

export type ResolvedRules = Record<RuleId, ResolvedRuleConfig>;

export interface ResolvedConfig {
	readonly rules: ResolvedRules;
	readonly ignore: readonly string[];
	readonly include: readonly string[];
}
