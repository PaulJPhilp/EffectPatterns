import { describe, it, expect } from "vitest";
import { Effect, TestClock } from "effect";
import { OtelService } from "../service.js";

describe("OtelService", () => {
  it("should initialize OTel SDK", () => {
    return Effect.gen(function* () {
      const otel = yield* OtelService;
      
      yield* otel.initOtelSDK({
        serviceName: "test-service",
        serviceVersion: "1.0.0",
        enableConsole: true
      });
      
      const span = yield* otel.startSpan("test-operation");
      yield* otel.addEvent(span, "test-event", { key: "value" });
      yield* otel.recordCounter("test-counter", 1);
      yield* otel.recordHistogram("test-histogram", 100);
      yield* otel.endSpan(span);
      
      yield* otel.shutdown();
      
      expect(true).toBe(true); // Basic smoke test
    }).pipe(
      Effect.provide(OtelService.Default),
      Effect.runPromise
    );
  });

  it("should handle error recording", () => {
    return Effect.gen(function* () {
      const otel = yield* OtelService;
      
      const span = yield* otel.startSpan("error-test");
      const error = new Error("test error");
      
      yield* otel.recordException(span, error);
      yield* otel.endSpan(span, { code: 2, message: "test error" });
      
      yield* otel.shutdown();
      
      expect(true).toBe(true); // Basic smoke test
    }).pipe(
      Effect.provide(OtelService.Default),
      Effect.runPromise
    );
  });
});
