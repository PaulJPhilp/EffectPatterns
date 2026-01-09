import { Context, Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TUILoader } from "../../tui-loader.js";
import { ICONS } from "../helpers.js";
import { Display } from "../service.js";

// --- Test Utilities ---

class TestConsole extends Context.Tag("TestConsole")<
  TestConsole,
  { logs: string[]; errors: string[] }
>() {}

const LiveTestConsole = Layer.sync(TestConsole, () => {
  const logs: string[] = [];
  const errors: string[] = [];
  
  vi.spyOn(console, "log").mockImplementation((msg) => { logs.push(String(msg)); });
  vi.spyOn(console, "error").mockImplementation((msg) => { errors.push(String(msg)); });
  vi.spyOn(console, "table").mockImplementation((msg) => { logs.push("[TABLE]"); });

  return { logs, errors };
});

const makeMockTUILoader = (tuiModule: any | null) => 
  Layer.succeed(TUILoader, TUILoader.of({ load: () => Effect.succeed(tuiModule) }));

const runTest = <A, E>(
  program: Effect.Effect<A, E, Display | TestConsole>,
  tuiModule: any | null
) => {
  const displayLayer = Layer.provide(Display.Default, makeMockTUILoader(tuiModule));
  
  return Effect.gen(function* () {
    const tc = yield* TestConsole;
    yield* program;
    return tc;
  }).pipe(
    Effect.provide(displayLayer),
    Effect.provide(LiveTestConsole),
    Effect.runPromise
  );
};

// --- Tests ---

describe("Display Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Console Fallback (No TUI)", () => {
    it("should cover all basic logging methods", async () => {
      const tc = await runTest(
        Effect.gen(function* () {
          const d = yield* Display;
          yield* d.showSuccess("s");
          yield* d.showError("e");
          yield* d.showInfo("i");
          yield* d.showWarning("w");
        }),
        null
      );
      expect(tc.logs.some(l => l.includes(ICONS.success))).toBe(true);
      expect(tc.errors.some(e => e.includes(ICONS.error))).toBe(true);
      expect(tc.logs.some(l => l.includes(ICONS.info))).toBe(true);
      expect(tc.logs.some(l => l.includes(ICONS.warning))).toBe(true);
    });

    it("should cover complex methods", async () => {
      const tc = await runTest(
        Effect.gen(function* () {
          const d = yield* Display;
          yield* d.showPanel("c", "t");
          yield* d.showTable([{a:1}], { columns: [{key:"a", header:"A"}] });
          yield* d.showHighlight("h");
          yield* d.showSeparator();
        }),
        null
      );
      expect(tc.logs.join("\n")).toContain("t");
      expect(tc.logs).toContain("[TABLE]");
      expect(tc.logs.some(l => l.includes(ICONS.highlight))).toBe(true);
      expect(tc.logs.some(l => l.includes("──"))).toBe(true);
    });
  });

  describe("TUI Integration", () => {
    class MockTag extends Context.Tag("MockTag")<MockTag, {}>() {}

    it("should call TUI methods for all operations", async () => {
      const spies = {
        displaySuccess: vi.fn().mockReturnValue(Effect.void),
        displayError: vi.fn().mockReturnValue(Effect.void),
        displayInfo: vi.fn().mockReturnValue(Effect.void),
        displayWarning: vi.fn().mockReturnValue(Effect.void),
        displayPanel: vi.fn().mockReturnValue(Effect.void),
        displayTable: vi.fn().mockReturnValue(Effect.void),
        displayHighlight: vi.fn().mockReturnValue(Effect.void),
      };

      const tuiModule = {
        DisplayService: MockTag,
        ...spies
      };

      await runTest(
        Effect.gen(function* () {
          const d = yield* Display;
          yield* d.showSuccess("s");
          yield* d.showError("e");
          yield* d.showInfo("i");
          yield* d.showWarning("w");
          yield* d.showPanel("c", "t");
          yield* d.showTable([], { columns: [] });
          yield* d.showHighlight("h");
        }).pipe(Effect.provideService(MockTag, {})),
        tuiModule
      );

      expect(spies.displaySuccess).toHaveBeenCalled();
      expect(spies.displayError).toHaveBeenCalled();
      expect(spies.displayInfo).toHaveBeenCalled();
      expect(spies.displayWarning).toHaveBeenCalled();
      expect(spies.displayPanel).toHaveBeenCalled();
      expect(spies.displayTable).toHaveBeenCalled();
      expect(spies.displayHighlight).toHaveBeenCalled();
    });
  });
});
