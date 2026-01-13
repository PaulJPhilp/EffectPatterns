import { Effect } from "effect";

export type PatternCategory =
	| "validation"
	| "service"
	| "error-handling"
	| "composition";

export interface PatternDefinition {
	readonly id: string;
	readonly name: string;
	readonly category: PatternCategory;
	readonly description: string;
	readonly template: string;
	readonly imports: readonly string[];
	readonly variables: readonly string[];
}

const PatternLibrary: Record<string, PatternDefinition> = {
	"validation-filter-or-fail": {
		id: "validation-filter-or-fail",
		name: "Input Validation with Effect.filterOrFail",
		category: "validation",
		description: "Create a validator using Effect.filterOrFail",
		template:
			"const validate{{Name}} = ({{paramName}}: {{paramType}}): " +
			"Effect.Effect<{{paramType}}, Error> =>\n" +
			"  Effect.succeed({{paramName}}).pipe(\n" +
			"    Effect.filterOrFail(\n" +
			"      ({{shortName}}) => {{condition}},\n" +
			"      () => new Error(`{{errorMessage}}`)\n" +
			"    )\n" +
			"  );\n",
		imports: ["import { Effect } from \"effect\";"],
		variables: [
			"Name",
			"paramName",
			"paramType",
			"shortName",
			"condition",
			"errorMessage",
		],
	},
	"service-effect-service": {
		id: "service-effect-service",
		name: "Effect.Service Skeleton",
		category: "service",
		description: "Create a new Effect.Service skeleton",
		template:
			"export class {{ServiceName}} extends " +
			"Effect.Service<{{ServiceName}}>()(\n" +
			"  \"{{ServiceName}}\",\n" +
			"  {\n" +
			"    effect: Effect.gen(function* () {\n" +
			"      return {\n" +
			"        {{methodName}}: ({{params}}) => " +
			"Effect.succeed({{defaultReturn}}),\n" +
			"      };\n" +
			"    }),\n" +
			"  }\n" +
			");\n",
		imports: ["import { Effect } from \"effect\";"],
		variables: ["ServiceName", "methodName", "params", "defaultReturn"],
	},
};

export const listPatterns = (): readonly PatternDefinition[] =>
	Object.values(PatternLibrary);

export const getPattern = (
	patternId: string
): Effect.Effect<PatternDefinition, Error> => {
	const pattern = PatternLibrary[patternId];
	if (!pattern) {
		return Effect.fail(new Error(`Unknown patternId: ${patternId}`));
	}
	return Effect.succeed(pattern);
};

export const renderTemplate = (
	template: string,
	variables: Record<string, string>
): string => {
	let out = template;

	for (const [key, value] of Object.entries(variables)) {
		const token = `{{${key}}}`;
		out = out.split(token).join(value);
	}

	return out;
};

export const validateVariables = (
	pattern: PatternDefinition,
	variables: Record<string, string>
): Effect.Effect<void, Error> => {
	const missing = pattern.variables.filter((v) => !(v in variables));
	if (missing.length > 0) {
		return Effect.fail(
			new Error(
				`Missing template variables: ${missing.join(", ")}`
			)
		);
	}
	return Effect.succeed(undefined);
};
