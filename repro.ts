import { Effect } from "effect";
import { Display } from "/Users/paul/Projects/Public/Effect-Patterns/packages/ep-cli/src/services/display/service.js";
import { Execution } from "/Users/paul/Projects/Public/Effect-Patterns/packages/ep-cli/src/services/execution/service.js";

// This should fail to compile if the issue persists
const test1 = Execution.withSpinner("test", Effect.void);
const test2 = Execution.executeScriptWithTUI("test.ts", "test");
const test3 = Execution.executeScriptCapture("test.ts");
const test4 = Execution.executeScriptStream("test.ts");
const test5 = Display.showTable([{a:1}], { columns: [{key:"a", header:"A"}] });
console.log(test1, test2, test3, test4, test5);
