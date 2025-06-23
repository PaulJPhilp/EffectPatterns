/**
 * @since 2.0.0
 */
import type { RuntimeFiber } from "./Fiber.js";
/**
 * @since 2.0.0
 * @category models
 */
export type Task = () => void;
/**
 * @since 2.0.0
 * @category models
 */
export interface Scheduler {
    shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false;
    scheduleTask(task: Task, priority: number): void;
}
/**
 * @since 2.0.0
 * @category utils
 */
export declare class PriorityBuckets<in out T = Task> {
    /**
     * @since 2.0.0
     */
    buckets: Array<[number, Array<T>]>;
    /**
     * @since 2.0.0
     */
    scheduleTask(task: T, priority: number): void;
}
/**
 * @since 2.0.0
 * @category constructors
 */
export declare class MixedScheduler implements Scheduler {
    /**
     * @since 2.0.0
     */
    readonly maxNextTickBeforeTimer: number;
    /**
     * @since 2.0.0
     */
    running: boolean;
    /**
     * @since 2.0.0
     */
    tasks: PriorityBuckets<Task>;
    constructor(
    /**
     * @since 2.0.0
     */
    maxNextTickBeforeTimer: number);
    /**
     * @since 2.0.0
     */
    private starveInternal;
    /**
     * @since 2.0.0
     */
    private starve;
    /**
     * @since 2.0.0
     */
    shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false;
    /**
     * @since 2.0.0
     */
    scheduleTask(task: Task, priority: number): void;
}
/**
 * @since 2.0.0
 * @category schedulers
 */
export declare const defaultScheduler: Scheduler;
/**
 * @since 2.0.0
 * @category constructors
 */
export declare class SyncScheduler implements Scheduler {
    /**
     * @since 2.0.0
     */
    tasks: PriorityBuckets<Task>;
    /**
     * @since 2.0.0
     */
    deferred: boolean;
    /**
     * @since 2.0.0
     */
    scheduleTask(task: Task, priority: number): void;
    /**
     * @since 2.0.0
     */
    shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false;
    /**
     * @since 2.0.0
     */
    flush(): void;
}
/**
 * @since 2.0.0
 * @category constructors
 */
export declare class ControlledScheduler implements Scheduler {
    /**
     * @since 2.0.0
     */
    tasks: PriorityBuckets<Task>;
    /**
     * @since 2.0.0
     */
    deferred: boolean;
    /**
     * @since 2.0.0
     */
    scheduleTask(task: Task, priority: number): void;
    /**
     * @since 2.0.0
     */
    shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false;
    /**
     * @since 2.0.0
     */
    step(): void;
}
/**
 * @since 2.0.0
 * @category constructors
 */
export declare const makeMatrix: (...record: Array<[number, Scheduler]>) => Scheduler;
/**
 * @since 2.0.0
 * @category utilities
 */
export declare const defaultShouldYield: Scheduler["shouldYield"];
/**
 * @since 2.0.0
 * @category constructors
 */
export declare const make: (scheduleTask: Scheduler["scheduleTask"], shouldYield?: Scheduler["shouldYield"]) => Scheduler;
/**
 * @since 2.0.0
 * @category constructors
 */
export declare const makeBatched: (callback: (runBatch: () => void) => void, shouldYield?: Scheduler["shouldYield"]) => Scheduler;
/**
 * @since 2.0.0
 * @category constructors
 */
export declare const timer: (ms: number, shouldYield?: Scheduler["shouldYield"]) => Scheduler;
/**
 * @since 2.0.0
 * @category constructors
 */
export declare const timerBatched: (ms: number, shouldYield?: Scheduler["shouldYield"]) => Scheduler;
//# sourceMappingURL=Scheduler.d.ts.map