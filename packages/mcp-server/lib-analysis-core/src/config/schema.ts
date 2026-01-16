import type { RuleSeverity } from "../services/rule-registry";
import type { RuleConfig, RuleLevel } from "./types";

const isObject = (u: unknown): u is Record<string, unknown> =>
	typeof u === "object" && u !== null && !Array.isArray(u);

export const isRuleLevel = (u: unknown): u is RuleLevel =>
	u === "off" || u === "warn" || u === "error";

export const isRuleSeverity = (u: unknown): u is RuleSeverity =>
	u === "low" || u === "medium" || u === "high";

export const isRuleConfig = (u: unknown): u is RuleConfig => {
	if (isRuleLevel(u)) return true;
	if (!Array.isArray(u) || u.length !== 2) return false;
	const [level, overrides] = u;
	if (level !== "warn" && level !== "error") return false;
	if (!isObject(overrides)) return false;
	if ("severity" in overrides && !isRuleSeverity(overrides.severity)) {
		return false;
	}
	if ("options" in overrides && overrides.options !== undefined) {
		if (!isObject(overrides.options)) return false;
	}
	return true;
};
