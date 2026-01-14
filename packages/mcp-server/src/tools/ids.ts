export const FixIdValues = [
	"replace-node-fs",
	"add-filter-or-fail-validator",
	"wrap-effect-map-callback",
	"replace-context-tag",
	"replace-promise-all",
	"replace-console-log",
	"add-schema-decode",
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
	"context-tag-anti-pattern",
	"promise-all-in-effect",
	"mutable-ref-in-effect",
	"console-log-in-effect",
	"effect-runSync-unsafe",
	"missing-error-channel",
	"layer-provide-anti-pattern",
	"effect-gen-no-yield",
	"schema-decode-unknown",
] as const;

export type RuleId = (typeof RuleIdValues)[number];
