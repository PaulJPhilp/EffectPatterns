import { describe, it, expect } from "vitest";
import { Effect, Scope } from "effect";
import { ResourceManagement } from "../ResourceManagement";
import { LoggerService } from "../LoggerService";

/**
 * Test suite for ResourceManagement
 * Tests resource lifecycle, cleanup, and scope management
 */

describe("ResourceManagement", () => {
  const runResourceManagement = async <A>(
    effect: Effect.Effect<A, never, any>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(LoggerService.Default),
        Effect.provide(ResourceManagement)
      )
    );
  };

  describe("trackResourceLifecycle", () => {
    it("should acquire and release resource", async () => {
      let acquired = false;
      let released = false;

      await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;
            const resource = yield* rm.trackResourceLifecycle(
              "test-resource",
              Effect.sync(() => {
                acquired = true;
                return "resource";
              }),
              () =>
                Effect.sync(() => {
                  released = true;
                })
            );

            expect(acquired).toBe(true);
            expect(resource).toBe("resource");
          })
        )
      );

      expect(released).toBe(true);
    });

    it("should cleanup even on error", async () => {
      let cleaned = false;

      const result = await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            return yield* rm
              .trackResourceLifecycle(
                "error-resource",
                Effect.succeed("value"),
                () =>
                  Effect.sync(() => {
                    cleaned = true;
                  })
              )
              .pipe(
                Effect.andThen(() =>
                  Effect.fail(new Error("Intentional error"))
                ),
                Effect.catchAll(() => Effect.succeed("caught"))
              );
          })
        )
      );

      expect(result).toBe("caught");
      expect(cleaned).toBe(true);
    });
  });

  describe("executeWithCleanup", () => {
    it("should execute effect with guaranteed cleanup", async () => {
      let executed = false;
      let cleaned = false;

      await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          yield* rm.executeWithCleanup(
            Effect.scoped(
              Effect.gen(function* () {
                executed = true;
                return "result";
              })
            ),
            Effect.sync(() => {
              cleaned = true;
            })
          );
        })
      );

      expect(executed).toBe(true);
      expect(cleaned).toBe(true);
    });
  });

  describe("manageResources", () => {
    it("should manage multiple resources", async () => {
      const results: string[] = [];

      await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            const resources = yield* rm.manageResources([
              {
                name: "resource1",
                acquire: Effect.sync(() => {
                  results.push("acquire1");
                  return "r1";
                }),
                release: () =>
                  Effect.sync(() => {
                    results.push("release1");
                  }),
              },
              {
                name: "resource2",
                acquire: Effect.sync(() => {
                  results.push("acquire2");
                  return "r2";
                }),
                release: () =>
                  Effect.sync(() => {
                    results.push("release2");
                  }),
              },
            ]);

            expect(resources).toEqual(["r1", "r2"]);
          })
        )
      );

      // Verify LIFO cleanup order
      expect(results).toEqual([
        "acquire1",
        "acquire2",
        "release2",
        "release1",
      ]);
    });
  });

  describe("releaseAll", () => {
    it("should release resources in reverse order", async () => {
      const order: string[] = [];

      await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          const resources = [
            {
              value: "r1",
              cleanup: () =>
                Effect.sync(() => {
                  order.push("cleanup1");
                }),
            },
            {
              value: "r2",
              cleanup: () =>
                Effect.sync(() => {
                  order.push("cleanup2");
                }),
            },
            {
              value: "r3",
              cleanup: () =>
                Effect.sync(() => {
                  order.push("cleanup3");
                }),
            },
          ];

          yield* rm.releaseAll(resources);
        })
      );

      expect(order).toEqual(["cleanup3", "cleanup2", "cleanup1"]);
    });
  });

  describe("createTrackedResource", () => {
    it("should create tracked resource with cleanup", async () => {
      let acquired = false;
      let released = false;

      await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            const resource = yield* rm.createTrackedResource(
              "tracked",
              Effect.sync(() => {
                acquired = true;
                return "value";
              }),
              () =>
                Effect.sync(() => {
                  released = true;
                })
            );

            expect(acquired).toBe(true);
            expect(resource.value).toBe("value");
          })
        )
      );

      expect(released).toBe(true);
    });
  });

  describe("ensureCleanup", () => {
    it("should cleanup on success", async () => {
      let cleaned = false;

      const result = await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          return yield* rm.ensureCleanup(
            Effect.succeed("success"),
            Effect.sync(() => {
              cleaned = true;
            })
          );
        })
      );

      expect(result).toBe("success");
      expect(cleaned).toBe(true);
    });

    it("should cleanup even on failure", async () => {
      let cleaned = false;

      const result = await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          return yield* rm
            .ensureCleanup(
              Effect.fail(new Error("error")),
              Effect.sync(() => {
                cleaned = true;
              })
            )
            .pipe(
              Effect.catchAll(() => Effect.succeed("caught"))
            );
        })
      );

      expect(result).toBe("caught");
      expect(cleaned).toBe(true);
    });
  });

  describe("createResourcePool", () => {
    it("should reuse pooled resources", async () => {
      const created: string[] = [];

      const results = await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          const pool = rm.createResourcePool(
            Effect.gen(function* () {
              const id = `resource-${created.length}`;
              created.push(id);
              return id;
            }),
            () => Effect.succeed(void 0),
            2
          );

          // Acquire first
          const r1 = yield* pool.acquire();
          expect(created).toHaveLength(1);

          // Release first
          yield* pool.release(r1);

          // Acquire again (should reuse)
          const r2 = yield* pool.acquire();
          expect(created).toHaveLength(1); // Should still be 1

          // Acquire second (new)
          const r3 = yield* pool.acquire();
          expect(created).toHaveLength(2);

          return { r1, r2, r3, createdCount: created.length };
        })
      );

      expect(results.r1).toBe(results.r2);
      expect(results.createdCount).toBe(2);
    });

    it("should respect max pool size", async () => {
      let releaseCount = 0;

      await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          const pool = rm.createResourcePool(
            Effect.succeed("resource"),
            () =>
              Effect.sync(() => {
                releaseCount++;
              }),
            1
          );

          const r1 = yield* pool.acquire();
          yield* pool.release(r1);

          // Try to add second when pool is full
          const r2 = yield* pool.acquire();
          yield* pool.release(r2);

          expect(releaseCount).toBe(1); // Second one should have been discarded
        })
      );

      expect(releaseCount).toBe(1);
    });
  });

  describe("monitorResources", () => {
    it("should monitor resource usage", async () => {
      const result = await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            return yield* rm.monitorResources(
              "test-monitoring",
              Effect.succeed("monitored")
            );
          })
        )
      );

      expect(result).toBe("monitored");
    });

    it("should track resource duration", async () => {
      const startTime = Date.now();

      await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            yield* rm.monitorResources(
              "slow-resource",
              Effect.sleep(10).pipe(Effect.andThen(() => Effect.succeed("done")))
            );
          })
        )
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe("withScope", () => {
    it("should execute effect with scope", async () => {
      let executed = false;

      await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          yield* rm.withScope(() =>
            Effect.gen(function* () {
              executed = true;
              return "result";
            })
          );
        })
      );

      expect(executed).toBe(true);
    });
  });

  describe("Resource Lifecycle Patterns", () => {
    it("should handle nested resource cleanup", async () => {
      const events: string[] = [];

      await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            const outer = yield* rm.trackResourceLifecycle(
              "outer",
              Effect.sync(() => {
                events.push("outer-acquire");
                return "outer";
              }),
              () =>
                Effect.sync(() => {
                  events.push("outer-release");
                })
            );

            const inner = yield* rm.trackResourceLifecycle(
              "inner",
              Effect.sync(() => {
                events.push("inner-acquire");
                return "inner";
              }),
              () =>
                Effect.sync(() => {
                  events.push("inner-release");
                })
            );

            expect(outer).toBe("outer");
            expect(inner).toBe("inner");
          })
        )
      );

      // Verify LIFO order
      expect(events).toEqual([
        "outer-acquire",
        "inner-acquire",
        "inner-release",
        "outer-release",
      ]);
    });

    it("should handle cleanup chain failures", async () => {
      const events: string[] = [];

      const result = await runResourceManagement(
        Effect.scoped(
          Effect.gen(function* () {
            const rm = yield* ResourceManagement;

            return yield* rm
              .trackResourceLifecycle(
                "resource",
                Effect.sync(() => {
                  events.push("acquire");
                  return "value";
                }),
                () =>
                  Effect.sync(() => {
                    events.push("release");
                  })
              )
              .pipe(
                Effect.andThen(() => Effect.fail(new Error("error"))),
                Effect.catchAll(() =>
                  Effect.sync(() => {
                    events.push("caught");
                  })
                )
              );
          })
        )
      );

      expect(events).toContain("acquire");
      expect(events).toContain("release");
      expect(events).toContain("caught");
    });

    it("should handle multiple resource pools", async () => {
      const created = { pool1: 0, pool2: 0 };

      await runResourceManagement(
        Effect.gen(function* () {
          const rm = yield* ResourceManagement;

          const pool1 = rm.createResourcePool(
            Effect.sync(() => {
              created.pool1++;
              return `p1-${created.pool1}`;
            }),
            () => Effect.succeed(void 0),
            2
          );

          const pool2 = rm.createResourcePool(
            Effect.sync(() => {
              created.pool2++;
              return `p2-${created.pool2}`;
            }),
            () => Effect.succeed(void 0),
            2
          );

          // Use both pools
          const r1 = yield* pool1.acquire();
          const r2 = yield* pool2.acquire();

          yield* pool1.release(r1);
          yield* pool2.release(r2);

          // Reuse from pools
          const r1b = yield* pool1.acquire();
          const r2b = yield* pool2.acquire();

          expect(created.pool1).toBe(1);
          expect(created.pool2).toBe(1);
        })
      );

      expect(created.pool1).toBe(1);
      expect(created.pool2).toBe(1);
    });
  });
});
