/**
 * @since 2.0.0
 */
import { dual, isFunction as isFunction_ } from "./Function.js";
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
export const mapInput = /*#__PURE__*/dual(2, (self, f) => b => self(f(b)));
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
export const isTupleOf = /*#__PURE__*/dual(2, (self, n) => self.length === n);
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
export const isTupleOfAtLeast = /*#__PURE__*/dual(2, (self, n) => self.length >= n);
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
export const isTruthy = input => !!input;
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
export const isSet = input => input instanceof Set;
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
export const isMap = input => input instanceof Map;
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
export const isString = input => typeof input === "string";
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
export const isNumber = input => typeof input === "number";
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
export const isBoolean = input => typeof input === "boolean";
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
export const isBigInt = input => typeof input === "bigint";
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
export const isSymbol = input => typeof input === "symbol";
// TODO: make public
/** @internal */
export const isPropertyKey = u => isString(u) || isNumber(u) || isSymbol(u);
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
export const isFunction = isFunction_;
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
export const isUndefined = input => input === undefined;
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
export const isNotUndefined = input => input !== undefined;
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
export const isNull = input => input === null;
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
export const isNotNull = input => input !== null;
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
export const isNever = _ => false;
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
export const isUnknown = _ => true;
/** @internal */
export const isRecordOrArray = input => typeof input === "object" && input !== null;
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
export const isObject = input => isRecordOrArray(input) || isFunction(input);
/**
 * Checks whether a value is an `object` containing a specified property key.
 *
 * @category guards
 * @since 2.0.0
 */
export const hasProperty = /*#__PURE__*/dual(2, (self, property) => isObject(self) && property in self);
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
export const isTagged = /*#__PURE__*/dual(2, (self, tag) => hasProperty(self, "_tag") && self["_tag"] === tag);
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
export const isNullable = input => input === null || input === undefined;
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
export const isNotNullable = input => input !== null && input !== undefined;
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
export const isError = input => input instanceof Error;
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
export const isUint8Array = input => input instanceof Uint8Array;
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
export const isDate = input => input instanceof Date;
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
export const isIterable = input => hasProperty(input, Symbol.iterator);
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
export const isRecord = input => isRecordOrArray(input) && !Array.isArray(input);
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
export const isReadonlyRecord = isRecord;
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
export const isPromise = input => hasProperty(input, "then") && "catch" in input && isFunction(input.then) && isFunction(input.catch);
/**
 * @category guards
 * @since 2.0.0
 */
export const isPromiseLike = input => hasProperty(input, "then") && isFunction(input.then);
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
export const isRegExp = input => input instanceof RegExp;
/**
 * @since 2.0.0
 */
export const compose = /*#__PURE__*/dual(2, (ab, bc) => a => ab(a) && bc(a));
/**
 * @category combining
 * @since 2.0.0
 */
export const product = (self, that) => ([a, b]) => self(a) && that(b);
/**
 * @category combining
 * @since 2.0.0
 */
export const all = collection => {
  return as => {
    let collectionIndex = 0;
    for (const p of collection) {
      if (collectionIndex >= as.length) {
        break;
      }
      if (p(as[collectionIndex]) === false) {
        return false;
      }
      collectionIndex++;
    }
    return true;
  };
};
/**
 * @category combining
 * @since 2.0.0
 */
export const productMany = (self, collection) => {
  const rest = all(collection);
  return ([head, ...tail]) => self(head) === false ? false : rest(tail);
};
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
export const tuple = (...elements) => all(elements);
/**
 * ```ts skip-type-checking
 * { ab: Refinement<A, B>; cd: Refinement<C, D>, ... } -> Refinement<{ ab: A; cd: C; ... }, { ab: B; cd: D; ... }>
 * { a: Predicate<A, B>; b: Predicate<B>, ... } -> Predicate<{ a: A; b: B; ... }>
 * { ab: Refinement<A, B>; c: Predicate<C>, ... } -> Refinement<{ ab: A; c: C; ... }, { ab: B; c: С; ... }>
 * ```
 *
 * @since 2.0.0
 */
export const struct = fields => {
  const keys = Object.keys(fields);
  return a => {
    for (const key of keys) {
      if (!fields[key](a[key])) {
        return false;
      }
    }
    return true;
  };
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
export const not = self => a => !self(a);
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
export const or = /*#__PURE__*/dual(2, (self, that) => a => self(a) || that(a));
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
export const and = /*#__PURE__*/dual(2, (self, that) => a => self(a) && that(a));
/**
 * @category combinators
 * @since 2.0.0
 */
export const xor = /*#__PURE__*/dual(2, (self, that) => a => self(a) !== that(a));
/**
 * @category combinators
 * @since 2.0.0
 */
export const eqv = /*#__PURE__*/dual(2, (self, that) => a => self(a) === that(a));
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
export const implies = /*#__PURE__*/dual(2, (antecedent, consequent) => a => antecedent(a) ? consequent(a) : true);
/**
 * @category combinators
 * @since 2.0.0
 */
export const nor = /*#__PURE__*/dual(2, (self, that) => a => !(self(a) || that(a)));
/**
 * @category combinators
 * @since 2.0.0
 */
export const nand = /*#__PURE__*/dual(2, (self, that) => a => !(self(a) && that(a)));
/**
 * @category elements
 * @since 2.0.0
 */
export const every = collection => a => {
  for (const p of collection) {
    if (!p(a)) {
      return false;
    }
  }
  return true;
};
/**
 * @category elements
 * @since 2.0.0
 */
export const some = collection => a => {
  for (const p of collection) {
    if (p(a)) {
      return true;
    }
  }
  return false;
};
//# sourceMappingURL=Predicate.js.map