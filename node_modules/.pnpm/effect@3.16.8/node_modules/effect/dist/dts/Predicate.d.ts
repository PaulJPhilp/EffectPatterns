import type { TypeLambda } from "./HKT.js";
import type { TupleOf, TupleOfAtLeast } from "./Types.js";
/**
 * @category models
 * @since 2.0.0
 */
export interface Predicate<in A> {
    (a: A): boolean;
}
/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface PredicateTypeLambda extends TypeLambda {
    readonly type: Predicate<this["Target"]>;
}
/**
 * @category models
 * @since 2.0.0
 */
export interface Refinement<in A, out B extends A> {
    (a: A): a is B;
}
/**
 * @since 3.6.0
 * @category type-level
 */
export declare namespace Predicate {
    /**
     * @since 3.6.0
     * @category type-level
     */
    type In<T extends Any> = [T] extends [Predicate<infer _A>] ? _A : never;
    /**
     * @since 3.6.0
     * @category type-level
     */
    type Any = Predicate<never>;
}
/**
 * @since 3.6.0
 * @category type-level
 */
export declare namespace Refinement {
    /**
     * @since 3.6.0
     * @category type-level
     */
    type In<T extends Any> = [T] extends [Refinement<infer _A, infer _>] ? _A : never;
    /**
     * @since 3.6.0
     * @category type-level
     */
    type Out<T extends Any> = [T] extends [Refinement<infer _, infer _B>] ? _B : never;
    /**
     * @since 3.6.0
     * @category type-level
     */
    type Any = Refinement<any, any>;
}
/**
 * Given a `Predicate<A>` returns a `Predicate<B>`
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate, Number } from "effect"
 *
 * const minLength3 = Predicate.mapInput(Number.greaterThan(2), (s: string) => s.length)
 *
 * assert.deepStrictEqual(minLength3("a"), false)
 * assert.deepStrictEqual(minLength3("aa"), false)
 * assert.deepStrictEqual(minLength3("aaa"), true)
 * assert.deepStrictEqual(minLength3("aaaa"), true)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export declare const mapInput: {
    /**
     * Given a `Predicate<A>` returns a `Predicate<B>`
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const minLength3 = Predicate.mapInput(Number.greaterThan(2), (s: string) => s.length)
     *
     * assert.deepStrictEqual(minLength3("a"), false)
     * assert.deepStrictEqual(minLength3("aa"), false)
     * assert.deepStrictEqual(minLength3("aaa"), true)
     * assert.deepStrictEqual(minLength3("aaaa"), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <B, A>(f: (b: B) => A): (self: Predicate<A>) => Predicate<B>;
    /**
     * Given a `Predicate<A>` returns a `Predicate<B>`
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const minLength3 = Predicate.mapInput(Number.greaterThan(2), (s: string) => s.length)
     *
     * assert.deepStrictEqual(minLength3("a"), false)
     * assert.deepStrictEqual(minLength3("aa"), false)
     * assert.deepStrictEqual(minLength3("aaa"), true)
     * assert.deepStrictEqual(minLength3("aaaa"), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B>;
};
/**
 * Determine if an `Array` is a tuple with exactly `N` elements, narrowing down the type to `TupleOf`.
 *
 * An `Array` is considered to be a `TupleOf` if its length is exactly `N`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTupleOf } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTupleOf([1, 2, 3], 3), true);
 * assert.deepStrictEqual(isTupleOf([1, 2, 3], 2), false);
 * assert.deepStrictEqual(isTupleOf([1, 2, 3], 4), false);
 *
 * const arr: number[] = [1, 2, 3];
 * if (isTupleOf(arr, 3)) {
 *   console.log(arr);
 *   // ^? [number, number, number]
 * }
 * ```
 *
 * @category guards
 * @since 3.3.0
 */
export declare const isTupleOf: {
    /**
     * Determine if an `Array` is a tuple with exactly `N` elements, narrowing down the type to `TupleOf`.
     *
     * An `Array` is considered to be a `TupleOf` if its length is exactly `N`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTupleOf } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 3), true);
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 2), false);
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 4), false);
     *
     * const arr: number[] = [1, 2, 3];
     * if (isTupleOf(arr, 3)) {
     *   console.log(arr);
     *   // ^? [number, number, number]
     * }
     * ```
     *
     * @category guards
     * @since 3.3.0
     */
    <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOf<N, T>;
    /**
     * Determine if an `Array` is a tuple with exactly `N` elements, narrowing down the type to `TupleOf`.
     *
     * An `Array` is considered to be a `TupleOf` if its length is exactly `N`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTupleOf } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 3), true);
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 2), false);
     * assert.deepStrictEqual(isTupleOf([1, 2, 3], 4), false);
     *
     * const arr: number[] = [1, 2, 3];
     * if (isTupleOf(arr, 3)) {
     *   console.log(arr);
     *   // ^? [number, number, number]
     * }
     * ```
     *
     * @category guards
     * @since 3.3.0
     */
    <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOf<N, T>;
};
/**
 * Determine if an `Array` is a tuple with at least `N` elements, narrowing down the type to `TupleOfAtLeast`.
 *
 * An `Array` is considered to be a `TupleOfAtLeast` if its length is at least `N`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTupleOfAtLeast } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 3), true);
 * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 2), true);
 * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 4), false);
 *
 * const arr: number[] = [1, 2, 3, 4];
 * if (isTupleOfAtLeast(arr, 3)) {
 *   console.log(arr);
 *   // ^? [number, number, number, ...number[]]
 * }
 * ```
 *
 * @category guards
 * @since 3.3.0
 */
export declare const isTupleOfAtLeast: {
    /**
     * Determine if an `Array` is a tuple with at least `N` elements, narrowing down the type to `TupleOfAtLeast`.
     *
     * An `Array` is considered to be a `TupleOfAtLeast` if its length is at least `N`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTupleOfAtLeast } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 3), true);
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 2), true);
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 4), false);
     *
     * const arr: number[] = [1, 2, 3, 4];
     * if (isTupleOfAtLeast(arr, 3)) {
     *   console.log(arr);
     *   // ^? [number, number, number, ...number[]]
     * }
     * ```
     *
     * @category guards
     * @since 3.3.0
     */
    <N extends number>(n: N): <T>(self: ReadonlyArray<T>) => self is TupleOfAtLeast<N, T>;
    /**
     * Determine if an `Array` is a tuple with at least `N` elements, narrowing down the type to `TupleOfAtLeast`.
     *
     * An `Array` is considered to be a `TupleOfAtLeast` if its length is at least `N`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTupleOfAtLeast } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 3), true);
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 2), true);
     * assert.deepStrictEqual(isTupleOfAtLeast([1, 2, 3], 4), false);
     *
     * const arr: number[] = [1, 2, 3, 4];
     * if (isTupleOfAtLeast(arr, 3)) {
     *   console.log(arr);
     *   // ^? [number, number, number, ...number[]]
     * }
     * ```
     *
     * @category guards
     * @since 3.3.0
     */
    <T, N extends number>(self: ReadonlyArray<T>, n: N): self is TupleOfAtLeast<N, T>;
};
/**
 * Tests if a value is `truthy`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTruthy } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTruthy(1), true)
 * assert.deepStrictEqual(isTruthy(0), false)
 * assert.deepStrictEqual(isTruthy(""), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isTruthy: (input: unknown) => boolean;
/**
 * Tests if a value is a `Set`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isSet } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isSet(new Set([1, 2])), true)
 * assert.deepStrictEqual(isSet(new Set()), true)
 * assert.deepStrictEqual(isSet({}), false)
 * assert.deepStrictEqual(isSet(null), false)
 * assert.deepStrictEqual(isSet(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isSet: (input: unknown) => input is Set<unknown>;
/**
 * Tests if a value is a `Map`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isMap } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isMap(new Map()), true)
 * assert.deepStrictEqual(isMap({}), false)
 * assert.deepStrictEqual(isMap(null), false)
 * assert.deepStrictEqual(isMap(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isMap: (input: unknown) => input is Map<unknown, unknown>;
/**
 * Tests if a value is a `string`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isString } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isString("a"), true)
 *
 * assert.deepStrictEqual(isString(1), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isString: (input: unknown) => input is string;
/**
 * Tests if a value is a `number`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNumber } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNumber(2), true)
 *
 * assert.deepStrictEqual(isNumber("2"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNumber: (input: unknown) => input is number;
/**
 * Tests if a value is a `boolean`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isBoolean } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isBoolean(true), true)
 *
 * assert.deepStrictEqual(isBoolean("true"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isBoolean: (input: unknown) => input is boolean;
/**
 * Tests if a value is a `bigint`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isBigInt } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isBigInt(1n), true)
 *
 * assert.deepStrictEqual(isBigInt(1), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isBigInt: (input: unknown) => input is bigint;
/**
 * Tests if a value is a `symbol`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isSymbol } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isSymbol(Symbol.for("a")), true)
 *
 * assert.deepStrictEqual(isSymbol("a"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isSymbol: (input: unknown) => input is symbol;
/**
 * Tests if a value is a `function`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isFunction } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isFunction(isFunction), true)
 *
 * assert.deepStrictEqual(isFunction("function"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isFunction: (input: unknown) => input is Function;
/**
 * Tests if a value is `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUndefined } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUndefined(undefined), true)
 *
 * assert.deepStrictEqual(isUndefined(null), false)
 * assert.deepStrictEqual(isUndefined("undefined"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isUndefined: (input: unknown) => input is undefined;
/**
 * Tests if a value is not `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotUndefined } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotUndefined(null), true)
 * assert.deepStrictEqual(isNotUndefined("undefined"), true)
 *
 * assert.deepStrictEqual(isNotUndefined(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNotUndefined: <A>(input: A) => input is Exclude<A, undefined>;
/**
 * Tests if a value is `null`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNull } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNull(null), true)
 *
 * assert.deepStrictEqual(isNull(undefined), false)
 * assert.deepStrictEqual(isNull("null"), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNull: (input: unknown) => input is null;
/**
 * Tests if a value is not `null`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotNull } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotNull(undefined), true)
 * assert.deepStrictEqual(isNotNull("null"), true)
 *
 * assert.deepStrictEqual(isNotNull(null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNotNull: <A>(input: A) => input is Exclude<A, null>;
/**
 * A guard that always fails.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNever } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNever(null), false)
 * assert.deepStrictEqual(isNever(undefined), false)
 * assert.deepStrictEqual(isNever({}), false)
 * assert.deepStrictEqual(isNever([]), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNever: (input: unknown) => input is never;
/**
 * A guard that always succeeds.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUnknown } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUnknown(null), true)
 * assert.deepStrictEqual(isUnknown(undefined), true)
 *
 * assert.deepStrictEqual(isUnknown({}), true)
 * assert.deepStrictEqual(isUnknown([]), true)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isUnknown: (input: unknown) => input is unknown;
/**
 * Tests if a value is an `object`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isObject } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isObject({}), true)
 * assert.deepStrictEqual(isObject([]), true)
 *
 * assert.deepStrictEqual(isObject(null), false)
 * assert.deepStrictEqual(isObject(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isObject: (input: unknown) => input is object;
/**
 * Checks whether a value is an `object` containing a specified property key.
 *
 * @category guards
 * @since 2.0.0
 */
export declare const hasProperty: {
    /**
     * Checks whether a value is an `object` containing a specified property key.
     *
     * @category guards
     * @since 2.0.0
     */
    <P extends PropertyKey>(property: P): (self: unknown) => self is {
        [K in P]: unknown;
    };
    /**
     * Checks whether a value is an `object` containing a specified property key.
     *
     * @category guards
     * @since 2.0.0
     */
    <P extends PropertyKey>(self: unknown, property: P): self is {
        [K in P]: unknown;
    };
};
/**
 * Tests if a value is an `object` with a property `_tag` that matches the given tag.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isTagged } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isTagged(1, "a"), false)
 * assert.deepStrictEqual(isTagged(null, "a"), false)
 * assert.deepStrictEqual(isTagged({}, "a"), false)
 * assert.deepStrictEqual(isTagged({ a: "a" }, "a"), false)
 * assert.deepStrictEqual(isTagged({ _tag: "a" }, "a"), true)
 * assert.deepStrictEqual(isTagged("a")({ _tag: "a" }), true)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isTagged: {
    /**
     * Tests if a value is an `object` with a property `_tag` that matches the given tag.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTagged } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTagged(1, "a"), false)
     * assert.deepStrictEqual(isTagged(null, "a"), false)
     * assert.deepStrictEqual(isTagged({}, "a"), false)
     * assert.deepStrictEqual(isTagged({ a: "a" }, "a"), false)
     * assert.deepStrictEqual(isTagged({ _tag: "a" }, "a"), true)
     * assert.deepStrictEqual(isTagged("a")({ _tag: "a" }), true)
     * ```
     *
     * @category guards
     * @since 2.0.0
     */
    <K extends string>(tag: K): (self: unknown) => self is {
        _tag: K;
    };
    /**
     * Tests if a value is an `object` with a property `_tag` that matches the given tag.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { isTagged } from "effect/Predicate"
     *
     * assert.deepStrictEqual(isTagged(1, "a"), false)
     * assert.deepStrictEqual(isTagged(null, "a"), false)
     * assert.deepStrictEqual(isTagged({}, "a"), false)
     * assert.deepStrictEqual(isTagged({ a: "a" }, "a"), false)
     * assert.deepStrictEqual(isTagged({ _tag: "a" }, "a"), true)
     * assert.deepStrictEqual(isTagged("a")({ _tag: "a" }), true)
     * ```
     *
     * @category guards
     * @since 2.0.0
     */
    <K extends string>(self: unknown, tag: K): self is {
        _tag: K;
    };
};
/**
 * A guard that succeeds when the input is `null` or `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNullable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNullable(null), true)
 * assert.deepStrictEqual(isNullable(undefined), true)
 *
 * assert.deepStrictEqual(isNullable({}), false)
 * assert.deepStrictEqual(isNullable([]), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNullable: <A>(input: A) => input is Extract<A, null | undefined>;
/**
 * A guard that succeeds when the input is not `null` or `undefined`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isNotNullable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isNotNullable({}), true)
 * assert.deepStrictEqual(isNotNullable([]), true)
 *
 * assert.deepStrictEqual(isNotNullable(null), false)
 * assert.deepStrictEqual(isNotNullable(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isNotNullable: <A>(input: A) => input is NonNullable<A>;
/**
 * A guard that succeeds when the input is an `Error`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isError } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isError(new Error()), true)
 *
 * assert.deepStrictEqual(isError(null), false)
 * assert.deepStrictEqual(isError({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isError: (input: unknown) => input is Error;
/**
 * A guard that succeeds when the input is a `Uint8Array`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isUint8Array } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isUint8Array(new Uint8Array()), true)
 *
 * assert.deepStrictEqual(isUint8Array(null), false)
 * assert.deepStrictEqual(isUint8Array({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isUint8Array: (input: unknown) => input is Uint8Array;
/**
 * A guard that succeeds when the input is a `Date`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isDate } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isDate(new Date()), true)
 *
 * assert.deepStrictEqual(isDate(null), false)
 * assert.deepStrictEqual(isDate({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isDate: (input: unknown) => input is Date;
/**
 * A guard that succeeds when the input is an `Iterable`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isIterable } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isIterable([]), true)
 * assert.deepStrictEqual(isIterable(new Set()), true)
 *
 * assert.deepStrictEqual(isIterable(null), false)
 * assert.deepStrictEqual(isIterable({}), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isIterable: (input: unknown) => input is Iterable<unknown>;
/**
 * A guard that succeeds when the input is a record.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isRecord } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isRecord({}), true)
 * assert.deepStrictEqual(isRecord({ a: 1 }), true)
 *
 * assert.deepStrictEqual(isRecord([]), false)
 * assert.deepStrictEqual(isRecord([1, 2, 3]), false)
 * assert.deepStrictEqual(isRecord(null), false)
 * assert.deepStrictEqual(isRecord(undefined), false)
 * assert.deepStrictEqual(isRecord(() => null), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isRecord: (input: unknown) => input is {
    [x: string | symbol]: unknown;
};
/**
 * A guard that succeeds when the input is a readonly record.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isReadonlyRecord } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isReadonlyRecord({}), true)
 * assert.deepStrictEqual(isReadonlyRecord({ a: 1 }), true)
 *
 * assert.deepStrictEqual(isReadonlyRecord([]), false)
 * assert.deepStrictEqual(isReadonlyRecord([1, 2, 3]), false)
 * assert.deepStrictEqual(isReadonlyRecord(null), false)
 * assert.deepStrictEqual(isReadonlyRecord(undefined), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isReadonlyRecord: (input: unknown) => input is {
    readonly [x: string | symbol]: unknown;
};
/**
 * A guard that succeeds when the input is a Promise.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { isPromise } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isPromise({}), false)
 * assert.deepStrictEqual(isPromise(Promise.resolve("hello")), true)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export declare const isPromise: (input: unknown) => input is Promise<unknown>;
/**
 * @category guards
 * @since 2.0.0
 */
export declare const isPromiseLike: (input: unknown) => input is PromiseLike<unknown>;
/**
 * Tests if a value is a `RegExp`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * assert.deepStrictEqual(Predicate.isRegExp(/a/), true)
 * assert.deepStrictEqual(Predicate.isRegExp("a"), false)
 * ```
 *
 * @category guards
 * @since 3.9.0
 */
export declare const isRegExp: (input: unknown) => input is RegExp;
/**
 * @since 2.0.0
 */
export declare const compose: {
    /**
     * @since 2.0.0
     */
    <A, B extends A, C extends B>(bc: Refinement<B, C>): (ab: Refinement<A, B>) => Refinement<A, C>;
    /**
     * @since 2.0.0
     */
    <A, B extends A>(bc: Predicate<NoInfer<B>>): (ab: Refinement<A, B>) => Refinement<A, B>;
    /**
     * @since 2.0.0
     */
    <A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C>;
    /**
     * @since 2.0.0
     */
    <A, B extends A>(ab: Refinement<A, B>, bc: Predicate<NoInfer<B>>): Refinement<A, B>;
};
/**
 * @category combining
 * @since 2.0.0
 */
export declare const product: <A, B>(self: Predicate<A>, that: Predicate<B>) => Predicate<readonly [A, B]>;
/**
 * @category combining
 * @since 2.0.0
 */
export declare const all: <A>(collection: Iterable<Predicate<A>>) => Predicate<ReadonlyArray<A>>;
/**
 * @category combining
 * @since 2.0.0
 */
export declare const productMany: <A>(self: Predicate<A>, collection: Iterable<Predicate<A>>) => Predicate<readonly [A, ...Array<A>]>;
/**
 * Similar to `Promise.all` but operates on `Predicate`s.
 *
 * ```ts skip-type-checking
 * [Refinement<A, B>, Refinement<C, D>, ...] -> Refinement<[A, C, ...], [B, D, ...]>
 * [Predicate<A>, Predicate<B>, ...] -> Predicate<[A, B, ...]>
 * [Refinement<A, B>, Predicate<C>, ...] -> Refinement<[A, C, ...], [B, C, ...]>
 * ```
 *
 * @since 2.0.0
 */
export declare const tuple: {
    /**
     * Similar to `Promise.all` but operates on `Predicate`s.
     *
     * ```ts skip-type-checking
     * [Refinement<A, B>, Refinement<C, D>, ...] -> Refinement<[A, C, ...], [B, D, ...]>
     * [Predicate<A>, Predicate<B>, ...] -> Predicate<[A, B, ...]>
     * [Refinement<A, B>, Predicate<C>, ...] -> Refinement<[A, C, ...], [B, C, ...]>
     * ```
     *
     * @since 2.0.0
     */
    <T extends ReadonlyArray<Predicate.Any>>(...elements: T): [Extract<T[number], Refinement.Any>] extends [never] ? Predicate<{
        readonly [I in keyof T]: Predicate.In<T[I]>;
    }> : Refinement<{
        readonly [I in keyof T]: T[I] extends Refinement.Any ? Refinement.In<T[I]> : Predicate.In<T[I]>;
    }, {
        readonly [I in keyof T]: T[I] extends Refinement.Any ? Refinement.Out<T[I]> : Predicate.In<T[I]>;
    }>;
};
/**
 * ```ts skip-type-checking
 * { ab: Refinement<A, B>; cd: Refinement<C, D>, ... } -> Refinement<{ ab: A; cd: C; ... }, { ab: B; cd: D; ... }>
 * { a: Predicate<A, B>; b: Predicate<B>, ... } -> Predicate<{ a: A; b: B; ... }>
 * { ab: Refinement<A, B>; c: Predicate<C>, ... } -> Refinement<{ ab: A; c: C; ... }, { ab: B; c: С; ... }>
 * ```
 *
 * @since 2.0.0
 */
export declare const struct: {
    /**
     * ```ts skip-type-checking
     * { ab: Refinement<A, B>; cd: Refinement<C, D>, ... } -> Refinement<{ ab: A; cd: C; ... }, { ab: B; cd: D; ... }>
     * { a: Predicate<A, B>; b: Predicate<B>, ... } -> Predicate<{ a: A; b: B; ... }>
     * { ab: Refinement<A, B>; c: Predicate<C>, ... } -> Refinement<{ ab: A; c: C; ... }, { ab: B; c: С; ... }>
     * ```
     *
     * @since 2.0.0
     */
    <R extends Record<string, Predicate.Any>>(fields: R): [Extract<R[keyof R], Refinement.Any>] extends [never] ? Predicate<{
        readonly [K in keyof R]: Predicate.In<R[K]>;
    }> : Refinement<{
        readonly [K in keyof R]: R[K] extends Refinement.Any ? Refinement.In<R[K]> : Predicate.In<R[K]>;
    }, {
        readonly [K in keyof R]: R[K] extends Refinement.Any ? Refinement.Out<R[K]> : Predicate.In<R[K]>;
    }>;
};
/**
 * Negates the result of a given predicate.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate, Number } from "effect"
 *
 * const isPositive = Predicate.not(Number.lessThan(0))
 *
 * assert.deepStrictEqual(isPositive(-1), false)
 * assert.deepStrictEqual(isPositive(0), true)
 * assert.deepStrictEqual(isPositive(1), true)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export declare const not: <A>(self: Predicate<A>) => Predicate<A>;
/**
 * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate, Number } from "effect"
 *
 * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
 *
 * assert.deepStrictEqual(nonZero(-1), true)
 * assert.deepStrictEqual(nonZero(0), false)
 * assert.deepStrictEqual(nonZero(1), true)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export declare const or: {
    /**
     * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
     *
     * assert.deepStrictEqual(nonZero(-1), true)
     * assert.deepStrictEqual(nonZero(0), false)
     * assert.deepStrictEqual(nonZero(1), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A, C extends A>(that: Refinement<A, C>): <B extends A>(self: Refinement<A, B>) => Refinement<A, B | C>;
    /**
     * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
     *
     * assert.deepStrictEqual(nonZero(-1), true)
     * assert.deepStrictEqual(nonZero(0), false)
     * assert.deepStrictEqual(nonZero(1), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A, B extends A, C extends A>(self: Refinement<A, B>, that: Refinement<A, C>): Refinement<A, B | C>;
    /**
     * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
     *
     * assert.deepStrictEqual(nonZero(-1), true)
     * assert.deepStrictEqual(nonZero(0), false)
     * assert.deepStrictEqual(nonZero(1), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate, Number } from "effect"
     *
     * const nonZero = Predicate.or(Number.lessThan(0), Number.greaterThan(0))
     *
     * assert.deepStrictEqual(nonZero(-1), true)
     * assert.deepStrictEqual(nonZero(0), false)
     * assert.deepStrictEqual(nonZero(1), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * const minLength = (n: number) => (s: string) => s.length >= n
 * const maxLength = (n: number) => (s: string) => s.length <= n
 *
 * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
 *
 * assert.deepStrictEqual(length(2)("aa"), true)
 * assert.deepStrictEqual(length(2)("a"), false)
 * assert.deepStrictEqual(length(2)("aaa"), false)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export declare const and: {
    /**
     * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * const minLength = (n: number) => (s: string) => s.length >= n
     * const maxLength = (n: number) => (s: string) => s.length <= n
     *
     * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
     *
     * assert.deepStrictEqual(length(2)("aa"), true)
     * assert.deepStrictEqual(length(2)("a"), false)
     * assert.deepStrictEqual(length(2)("aaa"), false)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A, C extends A>(that: Refinement<A, C>): <B extends A>(self: Refinement<A, B>) => Refinement<A, B & C>;
    /**
     * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * const minLength = (n: number) => (s: string) => s.length >= n
     * const maxLength = (n: number) => (s: string) => s.length <= n
     *
     * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
     *
     * assert.deepStrictEqual(length(2)("aa"), true)
     * assert.deepStrictEqual(length(2)("a"), false)
     * assert.deepStrictEqual(length(2)("aaa"), false)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A, B extends A, C extends A>(self: Refinement<A, B>, that: Refinement<A, C>): Refinement<A, B & C>;
    /**
     * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * const minLength = (n: number) => (s: string) => s.length >= n
     * const maxLength = (n: number) => (s: string) => s.length <= n
     *
     * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
     *
     * assert.deepStrictEqual(length(2)("aa"), true)
     * assert.deepStrictEqual(length(2)("a"), false)
     * assert.deepStrictEqual(length(2)("aaa"), false)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * const minLength = (n: number) => (s: string) => s.length >= n
     * const maxLength = (n: number) => (s: string) => s.length <= n
     *
     * const length = (n: number) => Predicate.and(minLength(n), maxLength(n))
     *
     * assert.deepStrictEqual(length(2)("aa"), true)
     * assert.deepStrictEqual(length(2)("a"), false)
     * assert.deepStrictEqual(length(2)("aaa"), false)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * @category combinators
 * @since 2.0.0
 */
export declare const xor: {
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * @category combinators
 * @since 2.0.0
 */
export declare const eqv: {
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * Represents the logical implication combinator for predicates. In formal
 * logic, the implication operator `->` denotes that if the first proposition
 * (antecedent) is true, then the second proposition (consequent) must also be
 * true. In simpler terms, `p implies q` can be interpreted as "if p then q". If
 * the first predicate holds, then the second predicate must hold
 * for the given context.
 *
 * In practical terms within TypeScript, `p implies q` is equivalent to `!p || (p && q)`.
 *
 * Note that if the antecedent is `false`, the result is `true` by default
 * because the outcome of the consequent cannot be determined.
 *
 * This function is useful in situations where you need to enforce rules or
 * constraints that are contingent on certain conditions.
 * It proves especially helpful in defining property tests.
 *
 * The example below illustrates the transitive property of order using the
 * `implies` function. In simple terms, if `a <= b` and `b <= c`, then `a <= c`
 * must be true.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Predicate } from "effect"
 *
 * type Triple = {
 *   readonly a: number
 *   readonly b: number
 *   readonly c: number
 * }
 *
 * const transitivity = Predicate.implies(
 *   // antecedent
 *   (input: Triple) => input.a <= input.b && input.b <= input.c,
 *   // consequent
 *   (input: Triple) => input.a <= input.c
 * )
 *
 * assert.equal(transitivity({ a: 1, b: 2, c: 3 }), true)
 * // antecedent is `false`, so the result is `true`
 * assert.equal(transitivity({ a: 1, b: 0, c: 0 }), true)
 * ```
 *
 * @category combinators
 * @since 2.0.0
 */
export declare const implies: {
    /**
     * Represents the logical implication combinator for predicates. In formal
     * logic, the implication operator `->` denotes that if the first proposition
     * (antecedent) is true, then the second proposition (consequent) must also be
     * true. In simpler terms, `p implies q` can be interpreted as "if p then q". If
     * the first predicate holds, then the second predicate must hold
     * for the given context.
     *
     * In practical terms within TypeScript, `p implies q` is equivalent to `!p || (p && q)`.
     *
     * Note that if the antecedent is `false`, the result is `true` by default
     * because the outcome of the consequent cannot be determined.
     *
     * This function is useful in situations where you need to enforce rules or
     * constraints that are contingent on certain conditions.
     * It proves especially helpful in defining property tests.
     *
     * The example below illustrates the transitive property of order using the
     * `implies` function. In simple terms, if `a <= b` and `b <= c`, then `a <= c`
     * must be true.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * type Triple = {
     *   readonly a: number
     *   readonly b: number
     *   readonly c: number
     * }
     *
     * const transitivity = Predicate.implies(
     *   // antecedent
     *   (input: Triple) => input.a <= input.b && input.b <= input.c,
     *   // consequent
     *   (input: Triple) => input.a <= input.c
     * )
     *
     * assert.equal(transitivity({ a: 1, b: 2, c: 3 }), true)
     * // antecedent is `false`, so the result is `true`
     * assert.equal(transitivity({ a: 1, b: 0, c: 0 }), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(consequent: Predicate<A>): (antecedent: Predicate<A>) => Predicate<A>;
    /**
     * Represents the logical implication combinator for predicates. In formal
     * logic, the implication operator `->` denotes that if the first proposition
     * (antecedent) is true, then the second proposition (consequent) must also be
     * true. In simpler terms, `p implies q` can be interpreted as "if p then q". If
     * the first predicate holds, then the second predicate must hold
     * for the given context.
     *
     * In practical terms within TypeScript, `p implies q` is equivalent to `!p || (p && q)`.
     *
     * Note that if the antecedent is `false`, the result is `true` by default
     * because the outcome of the consequent cannot be determined.
     *
     * This function is useful in situations where you need to enforce rules or
     * constraints that are contingent on certain conditions.
     * It proves especially helpful in defining property tests.
     *
     * The example below illustrates the transitive property of order using the
     * `implies` function. In simple terms, if `a <= b` and `b <= c`, then `a <= c`
     * must be true.
     *
     * @example
     * ```ts
     * import * as assert from "node:assert"
     * import { Predicate } from "effect"
     *
     * type Triple = {
     *   readonly a: number
     *   readonly b: number
     *   readonly c: number
     * }
     *
     * const transitivity = Predicate.implies(
     *   // antecedent
     *   (input: Triple) => input.a <= input.b && input.b <= input.c,
     *   // consequent
     *   (input: Triple) => input.a <= input.c
     * )
     *
     * assert.equal(transitivity({ a: 1, b: 2, c: 3 }), true)
     * // antecedent is `false`, so the result is `true`
     * assert.equal(transitivity({ a: 1, b: 0, c: 0 }), true)
     * ```
     *
     * @category combinators
     * @since 2.0.0
     */
    <A>(antecedent: Predicate<A>, consequent: Predicate<A>): Predicate<A>;
};
/**
 * @category combinators
 * @since 2.0.0
 */
export declare const nor: {
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * @category combinators
 * @since 2.0.0
 */
export declare const nand: {
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>;
    /**
     * @category combinators
     * @since 2.0.0
     */
    <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>;
};
/**
 * @category elements
 * @since 2.0.0
 */
export declare const every: <A>(collection: Iterable<Predicate<A>>) => Predicate<A>;
/**
 * @category elements
 * @since 2.0.0
 */
export declare const some: <A>(collection: Iterable<Predicate<A>>) => Predicate<A>;
//# sourceMappingURL=Predicate.d.ts.map