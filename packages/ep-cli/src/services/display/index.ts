import { Effect } from "effect";
import type { DisplayService } from "./api.js";
import { Display } from "./service.js";

export { LiveTUILoader, TUILoader } from "../tui-loader.js";
export type { DisplayService } from "./api.js";
export { Display } from "./service.js";
export type { PanelOptions, TableColumn, TableOptions } from "./types.js";

// Convenience functions (mirrors current API for easier migration)

export const showSuccess = Display.showSuccess;
export const showError = Display.showError;
export const showInfo = Display.showInfo;
export const showWarning = Display.showWarning;
export const showPanel = Display.showPanel;
export const showTable: DisplayService["showTable"] = (data, options) =>
  Effect.flatMap(Display, (_) => _.showTable(data, options));
export const showHighlight = Display.showHighlight;
export const showSeparator = Display.showSeparator;
