import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { TracingLayerLive, TracingService } from "./otlpLayer";

describe("TracingLayer", () => {
	it("should provide TracingService and return undefined when no span is active", async () => {
		process.env.OTLP_HEADERS = "a=b, c=d";
		process.env.OTLP_ENDPOINT = "http://localhost:4318/v1/traces";
		process.env.SERVICE_NAME = "test-service";
		process.env.SERVICE_VERSION = "0.0.0";

		const traceId = await Effect.runPromise(
			Effect.gen(function* () {
				const tracing = yield* TracingService;
				return tracing.getTraceId();
			}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
		);

		expect(traceId).toBeUndefined();
	});
});
