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
	"error-tagged-error": {
		id: "error-tagged-error",
		name: "Data.TaggedError Skeleton",
		category: "error-handling",
		description: "Create a Data.TaggedError for typed failures",
		template:
			"import { Data } from \"effect\";\n\n" +
			"export class {{ErrorName}} extends Data.TaggedError(\"{{Tag}}\")<" +
			"{\n" +
			"  readonly {{fieldName}}: {{fieldType}};\n" +
			"}> {}\n",
		imports: ["import { Data } from \"effect\";"],
		variables: ["ErrorName", "Tag", "fieldName", "fieldType"],
	},
	"effect-try-promise": {
		id: "effect-try-promise",
		name: "Effect.tryPromise Skeleton",
		category: "error-handling",
		description: "Wrap a Promise-returning call in Effect.tryPromise",
		template:
			"export const {{name}} = ({{params}}): Effect.Effect<{{A}}, {{E}}> =>\n" +
			"  Effect.tryPromise({\n" +
			"    try: () => {{promiseExpr}},\n" +
			"    catch: (cause) => new {{ErrorName}}({ {{fieldName}}: String(cause) }),\n" +
			"  });\n",
		imports: ["import { Effect } from \"effect\";"],
		variables: [
			"name",
			"params",
			"A",
			"E",
			"promiseExpr",
			"ErrorName",
			"fieldName",
		],
	},
	"layer-from-effect-service": {
		id: "layer-from-effect-service",
		name: "Layer.succeed for Service",
		category: "composition",
		description: "Create a Layer from an Effect.Service instance",
		template:
			"export const {{LayerName}} = Layer.succeed({{ServiceName}}, " +
			"{{ServiceName}}.Default);\n",
		imports: ["import { Layer } from \"effect\";"],
		variables: ["LayerName", "ServiceName"],
	},
	"resource-acquire-release": {
		id: "resource-acquire-release",
		name: "Effect.acquireRelease Skeleton",
		category: "composition",
		description: "Acquire and release a resource safely",
		template:
			"export const {{name}} = Effect.acquireRelease(\n" +
			"  {{acquire}},\n" +
			"  (resource) => {{release}}\n" +
			");\n",
		imports: ["import { Effect } from \"effect\";"],
		variables: ["name", "acquire", "release"],
	},
	"stream-from-effect": {
		id: "stream-from-effect",
		name: "Stream.fromEffect Skeleton",
		category: "composition",
		description: "Lift an Effect into a Stream",
		template:
			"export const {{name}} = Stream.fromEffect({{effectExpr}});\n",
		imports: ["import { Stream } from \"effect\";"],
		variables: ["name", "effectExpr"],
	},
	"http-client-request": {
		id: "http-client-request",
		name: "HttpClient.request Skeleton",
		category: "composition",
		description: "Make an HTTP request with @effect/platform HttpClient",
		template:
			"export const {{name}} = Effect.gen(function* () {\n" +
			"  const client = yield* HttpClient.HttpClient;\n" +
			"  const request = HttpClientRequest.{{method}}(\"{{url}}\");\n" +
			"  const response = yield* client.execute(request);\n" +
			"  return response;\n" +
			"});\n",
		imports: [
			"import { HttpClient, HttpClientRequest } from \"@effect/platform\";",
			"import { Effect } from \"effect\";",
		],
		variables: ["name", "method", "url"],
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
