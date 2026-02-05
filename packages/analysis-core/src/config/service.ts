import { Effect } from "effect";
import type { RuleDefinition, RuleSeverity } from "../services/rule-registry";
import type { RuleId } from "../tools/ids";
import type {
    AnalysisConfig,
    ResolvedConfig,
    ResolvedRuleConfig,
    RuleConfig,
} from "./types";
import { isLevelEnabled } from "./types";

const resolveRule = (rule: RuleDefinition, cfg?: RuleConfig): ResolvedRuleConfig => {
	if (cfg === undefined) {
		return { level: rule.defaultLevel, severity: rule.severity };
	}

	if (typeof cfg === "string") {
		return { level: cfg, severity: rule.severity };
	}

	const [level, overrides] = cfg;
	return {
		level,
		severity: overrides.severity ?? rule.severity,
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
		.filter((r) => isLevelEnabled(resolved.rules[r.id].level))
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
	const level = resolved.rules[ruleId]?.level;
	return level !== undefined ? isLevelEnabled(level) : true;
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
