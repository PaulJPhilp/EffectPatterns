import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveTUILoader, TUILoader, _resetTuiModuleCache } from "../display/tui-loader.js";

// Mock the dynamic import
vi.mock("effect-cli-tui", () => ({
  EffectCLITUILayer: Layer.empty,
  displaySuccess: (message: string) => Effect.sync(() => console.log(`[TUI] Success: ${message}`)),
}));

describe("TUILoader", () => {
  beforeEach(() => {
    _resetTuiModuleCache();
  });

  it("should load the TUI module successfully", async () => {
    const program = Effect.gen(function* () {
      const loader = yield* TUILoader;
      const mod = yield* loader.load();
      return mod;
    }).pipe(Effect.provide(LiveTUILoader));

    const result = await Effect.runPromise(program);
    expect(result).not.toBeNull();
    expect(result!.displaySuccess).toBeDefined();
  });

  it("should return the cached module on subsequent calls", async () => {
    const program = Effect.gen(function* () {
      const loader = yield* TUILoader;
      const mod1 = yield* loader.load();
      const mod2 = yield* loader.load();
      return { mod1, mod2 };
    }).pipe(Effect.provide(LiveTUILoader));

    const { mod1, mod2 } = await Effect.runPromise(program);
    expect(mod1).toBe(mod2);
  });
});
