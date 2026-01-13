export const FixIdValues = [
	"replace-node-fs",
	"add-filter-or-fail-validator",
	"wrap-effect-map-callback",
] as const;

export type FixId = (typeof FixIdValues)[number];

export const RuleIdValues = [
	"async-await",
	"node-fs",
	"missing-validation",
	"effect-map-fn-reference",
	"try-catch-in-effect",
	"try-catch-boundary-ok",
	"catch-log-and-swallow",
	"throw-in-effect-code",
	"any-type",
	"yield-star-non-effect",
	"non-typescript",
] as const;

export type RuleId = (typeof RuleIdValues)[number];
