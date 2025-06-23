import type * as Effect from "../Effect.js";
import type { Unify } from "../Unify.js";
export declare const functionWithSpan: <Args extends Array<any>, Ret extends Effect.Effect<any, any, any>>(options: {
    readonly body: (...args: Args) => Ret;
    readonly options: Effect.FunctionWithSpanOptions | ((...args: Args) => Effect.FunctionWithSpanOptions);
    readonly captureStackTrace?: boolean | undefined;
}) => (...args: Args) => Unify<Ret>;
//# sourceMappingURL=core-effect.d.ts.map