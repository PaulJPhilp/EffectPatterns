// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { metricsReport } from "./report.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { metricsLast } from "./last.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { metricsClear } from "./clear.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommandGroup } from "../_shared.js";
export const metricsCommand = makeCommandGroup("metrics", {}, [metricsReport, metricsLast, metricsClear], {
    description: "Metrics reporting and utilities",
});
//# sourceMappingURL=index.js.map