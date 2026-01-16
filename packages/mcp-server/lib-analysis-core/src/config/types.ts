import type { RuleSeverity } from "../services/rule-registry";
import type { RuleId } from "../tools/ids";

export type RuleLevel = "off" | "warn" | "error";

export interface RuleOverrides {
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
	readonly enabled: boolean;
	readonly severity: RuleSeverity;
	readonly options?: Record<string, unknown>;
}

export type ResolvedRules = Record<RuleId, ResolvedRuleConfig>;

export interface ResolvedConfig {
	readonly rules: ResolvedRules;
	readonly ignore: readonly string[];
	readonly include: readonly string[];
}
