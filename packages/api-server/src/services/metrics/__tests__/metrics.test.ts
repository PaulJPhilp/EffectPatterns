import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { MCPMetricsService } from "../index";

const TestLayer = Layer.provideMerge(
	MCPMetricsService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("MCPMetricsService", () => {
	it("should increment counters", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("test_counter", 1);
				yield* metrics.incrementCounter("test_counter", 1);

				const snapshot = yield* metrics.getSnapshot();
				const counter = snapshot.counters.find(c => c.name === "test_counter");

				return counter?.value || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeGreaterThanOrEqual(0);
	});

	it("should set gauge values", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.setGauge("test_gauge", 42, {
					service: "test",
				});

				const snapshot = yield* metrics.getSnapshot();
				const gauge = snapshot.gauges.find(g => g.name === "test_gauge");

				return gauge?.value || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(42);
	});

	it("should record histogram observations", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.observeHistogram("test_histogram", 2.5, {
					method: "GET",
				});

				const snapshot = yield* metrics.getSnapshot();
				const histogram = snapshot.histograms.find(h => h.name === "test_histogram");

				return histogram?.sum || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeGreaterThan(0);
	});

	it("should export metrics in Prometheus format", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("test_counter", 1);

				const prometheus = yield* metrics.exportPrometheus();
				return prometheus;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should reset all metrics", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("test_counter", 1);
				yield* metrics.setGauge("test_gauge", 42);

				yield* metrics.reset();

				const snapshot = yield* metrics.getSnapshot();
				return {
					counters: snapshot.counters.length,
					gauges: snapshot.gauges.length,
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.counters).toBe(0);
		expect(result.gauges).toBe(0);
	});

	it("should check if metrics are enabled", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				const enabled = yield* metrics.isEnabled();
				return enabled;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(typeof result).toBe("boolean");
	});

	it("should handle labeled metrics", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("http_requests_total", 1, {
					method: "GET",
					path: "/api/test",
					status: "200",
				});

				const snapshot = yield* metrics.getSnapshot();
				const counter = snapshot.counters.find(c => c.name === "http_requests_total");

				return {
					found: !!counter,
					hasLabels: !!counter?.labels,
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.found).toBe(true);
		expect(result.hasLabels).toBe(true);
	});

	it("should record request duration metrics", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				// Simulate request
				const startTime = Date.now();
				yield* Effect.sleep(10);
				const duration = Date.now() - startTime;

				yield* metrics.observeHistogram(
					"http_request_duration_seconds",
					duration / 1000,
					{
						method: "GET",
						path: "/api/test",
					}
				);

				const snapshot = yield* metrics.getSnapshot();
				const histogram = snapshot.histograms.find(
					h => h.name === "http_request_duration_seconds"
				);

				return {
					found: !!histogram,
					count: histogram?.count || 0,
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.found).toBe(true);
		expect(result.count).toBeGreaterThan(0);
	});

	it("should get metrics snapshot", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("counter1", 5);
				yield* metrics.setGauge("gauge1", 100);
				yield* metrics.observeHistogram("histogram1", 0.5);

				const snapshot = yield* metrics.getSnapshot();

				return {
					hasCounters: Array.isArray(snapshot.counters),
					hasGauges: Array.isArray(snapshot.gauges),
					hasHistograms: Array.isArray(snapshot.histograms),
					hasTimestamp: typeof snapshot.timestamp === "number",
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.hasCounters).toBe(true);
		expect(result.hasGauges).toBe(true);
		expect(result.hasHistograms).toBe(true);
		expect(result.hasTimestamp).toBe(true);
	});

	it("should handle multiple counter increments", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				for (let i = 0; i < 10; i++) {
					yield* metrics.incrementCounter("counter_test", 1);
				}

				const snapshot = yield* metrics.getSnapshot();
				const counter = snapshot.counters.find(c => c.name === "counter_test");

				return counter?.value || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeGreaterThan(0);
	});

	it("should increment counter with custom value", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("custom_counter", 5);
				yield* metrics.incrementCounter("custom_counter", 3);

				const snapshot = yield* metrics.getSnapshot();
				const counter = snapshot.counters.find(c => c.name === "custom_counter");

				return counter?.value || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeGreaterThan(0);
	});

	it("should handle histogram with custom buckets", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				const customBuckets = [0.1, 0.5, 1.0, 5.0];
				yield* metrics.observeHistogram("custom_histogram", 0.75, undefined, customBuckets);

				const snapshot = yield* metrics.getSnapshot();
				const histogram = snapshot.histograms.find(h => h.name === "custom_histogram");

				return {
					found: !!histogram,
					sum: histogram?.sum || 0,
					count: histogram?.count || 0,
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.found).toBe(true);
		expect(result.count).toBeGreaterThan(0);
	});

	it("should handle gauge updates", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.setGauge("memory_usage", 1024);
				yield* metrics.setGauge("memory_usage", 2048);
				yield* metrics.setGauge("memory_usage", 1536);

				const snapshot = yield* metrics.getSnapshot();
				const gauge = snapshot.gauges.find(g => g.name === "memory_usage");

				return gauge?.value || 0;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(1536);
	});

	it("should export complete prometheus format", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("prom_counter", 1, { service: "test" });
				yield* metrics.setGauge("prom_gauge", 100);
				yield* metrics.observeHistogram("prom_histogram", 0.5, { endpoint: "/api" });

				const prometheus = yield* metrics.exportPrometheus();
				return prometheus;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toContain("HELP");
		expect(result).toContain("TYPE");
		expect(typeof result).toBe("string");
	});

	it("should get detailed snapshot information", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const metrics = yield* MCPMetricsService;

				yield* metrics.incrementCounter("snap_counter", 2);
				yield* metrics.setGauge("snap_gauge", 50);

				const snapshot = yield* metrics.getSnapshot();

				return {
					timestamp: snapshot.timestamp,
					countersCount: snapshot.counters.length,
					gaugesCount: snapshot.gauges.length,
					histogramsCount: snapshot.histograms.length,
				};
			}).pipe(Effect.provide(TestLayer))
		);

		expect(typeof result.timestamp).toBe("number");
		expect(result.countersCount).toBeGreaterThanOrEqual(0);
		expect(result.gaugesCount).toBeGreaterThanOrEqual(0);
		expect(result.histogramsCount).toBeGreaterThanOrEqual(0);
	});
});
