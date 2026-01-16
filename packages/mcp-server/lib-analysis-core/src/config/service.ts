import { Effect } from "effect";
import type { RuleDefinition, RuleSeverity } from "../services/rule-registry";
import type { RuleId } from "../tools/ids";
import type {
	AnalysisConfig,
	ResolvedConfig,
	ResolvedRuleConfig,
	RuleConfig,
	RuleLevel,
} from "./types";

const levelToEnabled = (level: RuleLevel): boolean => level !== "off";

const defaultSeverityForLevel = (level: Exclude<RuleLevel, "off">): RuleSeverity =>
	level === "error" ? "high" : "medium";

const resolveRule = (rule: RuleDefinition, cfg?: RuleConfig): ResolvedRuleConfig => {
	if (cfg === undefined) {
		return { enabled: true, severity: rule.severity };
	}

	if (typeof cfg === "string") {
		if (cfg === "off") {
			return { enabled: false, severity: rule.severity };
		}
		return { enabled: true, severity: defaultSeverityForLevel(cfg) };
	}

	const [level, overrides] = cfg;
	return {
		enabled: levelToEnabled(level),
		severity: overrides.severity ?? defaultSeverityForLevel(level),
		options: overrides.options,
	};
};

export const resolveConfig = (
	rules: readonly RuleDefinition[],
	config?: AnalysisConfig
): ResolvedConfig => {
	const ruleMap = {} as Record<RuleId, ResolvedRuleConfig>;
	for (const r of rules) {
		ruleMap[r.id] = resolveRule(r, config?.rules?.[r.id]);
	}

	return {
		rules: ruleMap,
		ignore: config?.ignore ?? [],
		include: config?.include ?? [],
	};
};

export const applyConfigToRules = (
	rules: readonly RuleDefinition[],
	config?: AnalysisConfig
): readonly RuleDefinition[] => {
	const resolved = resolveConfig(rules, config);
	return rules
		.filter((r) => resolved.rules[r.id].enabled)
		.map((r) => ({
			...r,
			severity: resolved.rules[r.id].severity,
		}));
};

export const isRuleEnabled = (
	ruleId: RuleId,
	rules: readonly RuleDefinition[],
	config?: AnalysisConfig
): boolean => {
	const resolved = resolveConfig(rules, config);
	return resolved.rules[ruleId]?.enabled ?? true;
};

export const resolveRuleSeverity = (
	ruleId: RuleId,
	rules: readonly RuleDefinition[],
	config?: AnalysisConfig
): RuleSeverity => {
	const resolved = resolveConfig(rules, config);
	return resolved.rules[ruleId]?.severity ?? "low";
};

export class ConfigService extends Effect.Service<ConfigService>()(
	"ConfigService",
	{
		sync: () => ({
			resolveConfig,
			applyConfigToRules,
			isRuleEnabled,
			resolveRuleSeverity,
		}),
	}
) { }

export const ConfigServiceLive = ConfigService.Default;
