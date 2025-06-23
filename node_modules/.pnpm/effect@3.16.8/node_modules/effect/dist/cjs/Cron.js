"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unsafeParse = exports.sequence = exports.parse = exports.next = exports.match = exports.make = exports.isParseError = exports.isCron = exports.equals = exports.TypeId = exports.ParseErrorTypeId = exports.ParseError = exports.Equivalence = void 0;
var Arr = _interopRequireWildcard(require("./Array.js"));
var Data = _interopRequireWildcard(require("./Data.js"));
var Either = _interopRequireWildcard(require("./Either.js"));
var Equal = _interopRequireWildcard(require("./Equal.js"));
var equivalence = _interopRequireWildcard(require("./Equivalence.js"));
var _Function = require("./Function.js");
var Hash = _interopRequireWildcard(require("./Hash.js"));
var _Inspectable = require("./Inspectable.js");
var dateTime = _interopRequireWildcard(require("./internal/dateTime.js"));
var N = _interopRequireWildcard(require("./Number.js"));
var Option = _interopRequireWildcard(require("./Option.js"));
var _Pipeable = require("./Pipeable.js");
var _Predicate = require("./Predicate.js");
var String = _interopRequireWildcard(require("./String.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 * @category symbols
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("effect/Cron");
const CronProto = {
  [TypeId]: TypeId,
  [Equal.symbol](that) {
    return isCron(that) && equals(this, that);
  },
  [Hash.symbol]() {
    return (0, _Function.pipe)(Hash.hash(this.tz), Hash.combine(Hash.array(Arr.fromIterable(this.seconds))), Hash.combine(Hash.array(Arr.fromIterable(this.minutes))), Hash.combine(Hash.array(Arr.fromIterable(this.hours))), Hash.combine(Hash.array(Arr.fromIterable(this.days))), Hash.combine(Hash.array(Arr.fromIterable(this.months))), Hash.combine(Hash.array(Arr.fromIterable(this.weekdays))), Hash.cached(this));
  },
  toString() {
    return (0, _Inspectable.format)(this.toJSON());
  },
  toJSON() {
    return {
      _id: "Cron",
      tz: this.tz,
      seconds: Arr.fromIterable(this.seconds),
      minutes: Arr.fromIterable(this.minutes),
      hours: Arr.fromIterable(this.hours),
      days: Arr.fromIterable(this.days),
      months: Arr.fromIterable(this.months),
      weekdays: Arr.fromIterable(this.weekdays)
    };
  },
  [_Inspectable.NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
/**
 * Checks if a given value is a `Cron` instance.
 *
 * @since 2.0.0
 * @category guards
 */
const isCron = u => (0, _Predicate.hasProperty)(u, TypeId);
/**
 * Creates a `Cron` instance.
 *
 * @since 2.0.0
 * @category constructors
 */
exports.isCron = isCron;
const make = values => {
  const o = Object.create(CronProto);
  o.seconds = new Set(Arr.sort(values.seconds ?? [0], N.Order));
  o.minutes = new Set(Arr.sort(values.minutes, N.Order));
  o.hours = new Set(Arr.sort(values.hours, N.Order));
  o.days = new Set(Arr.sort(values.days, N.Order));
  o.months = new Set(Arr.sort(values.months, N.Order));
  o.weekdays = new Set(Arr.sort(values.weekdays, N.Order));
  o.tz = Option.fromNullable(values.tz);
  const seconds = Array.from(o.seconds);
  const minutes = Array.from(o.minutes);
  const hours = Array.from(o.hours);
  const days = Array.from(o.days);
  const months = Array.from(o.months);
  const weekdays = Array.from(o.weekdays);
  o.first = {
    second: seconds[0] ?? 0,
    minute: minutes[0] ?? 0,
    hour: hours[0] ?? 0,
    day: days[0] ?? 1,
    month: (months[0] ?? 1) - 1,
    weekday: weekdays[0] ?? 0
  };
  o.next = {
    second: nextLookupTable(seconds, 60),
    minute: nextLookupTable(minutes, 60),
    hour: nextLookupTable(hours, 24),
    day: nextLookupTable(days, 32),
    month: nextLookupTable(months, 13),
    weekday: nextLookupTable(weekdays, 7)
  };
  return o;
};
exports.make = make;
const nextLookupTable = (values, size) => {
  const result = new Array(size).fill(undefined);
  if (values.length === 0) {
    return result;
  }
  let current = undefined;
  let index = values.length - 1;
  for (let i = size - 1; i >= 0; i--) {
    while (index >= 0 && values[index] >= i) {
      current = values[index--];
    }
    result[i] = current;
  }
  return result;
};
/**
 * @since 2.0.0
 * @category symbol
 */
const ParseErrorTypeId = exports.ParseErrorTypeId = /*#__PURE__*/Symbol.for("effect/Cron/errors/ParseError");
/**
 * Represents a checked exception which occurs when decoding fails.
 *
 * @since 2.0.0
 * @category models
 */
class ParseError extends /*#__PURE__*/Data.TaggedError("CronParseError") {
  /**
   * @since 2.0.0
   */
  [ParseErrorTypeId] = ParseErrorTypeId;
}
/**
 * Returns `true` if the specified value is an `ParseError`, `false` otherwise.
 *
 * @since 2.0.0
 * @category guards
 */
exports.ParseError = ParseError;
const isParseError = u => (0, _Predicate.hasProperty)(u, ParseErrorTypeId);
/**
 * Parses a cron expression into a `Cron` instance.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Cron, Either } from "effect"
 *
 * // At 04:00 on every day-of-month from 8 through 14.
 * assert.deepStrictEqual(Cron.parse("0 0 4 8-14 * *"), Either.right(Cron.make({
 *   seconds: [0],
 *   minutes: [0],
 *   hours: [4],
 *   days: [8, 9, 10, 11, 12, 13, 14],
 *   months: [],
 *   weekdays: []
 * })))
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
exports.isParseError = isParseError;
const parse = (cron, tz) => {
  const segments = cron.split(" ").filter(String.isNonEmpty);
  if (segments.length !== 5 && segments.length !== 6) {
    return Either.left(new ParseError({
      message: `Invalid number of segments in cron expression`,
      input: cron
    }));
  }
  if (segments.length === 5) {
    segments.unshift("0");
  }
  const [seconds, minutes, hours, days, months, weekdays] = segments;
  const zone = tz === undefined || dateTime.isTimeZone(tz) ? Either.right(tz) : Either.fromOption(dateTime.zoneFromString(tz), () => new ParseError({
    message: `Invalid time zone in cron expression`,
    input: tz
  }));
  return Either.all({
    tz: zone,
    seconds: parseSegment(seconds, secondOptions),
    minutes: parseSegment(minutes, minuteOptions),
    hours: parseSegment(hours, hourOptions),
    days: parseSegment(days, dayOptions),
    months: parseSegment(months, monthOptions),
    weekdays: parseSegment(weekdays, weekdayOptions)
  }).pipe(Either.map(make));
};
/**
 * Parses a cron expression into a `Cron` instance.
 *
 * **Details**
 *
 * This function takes a cron expression as a string and attempts to parse it
 * into a `Cron` instance. If the expression is valid, the resulting `Cron`
 * instance will represent the schedule defined by the cron expression.
 *
 * If the expression is invalid, the function throws a `ParseError`.
 *
 * You can optionally provide a time zone (`tz`) to interpret the cron
 * expression in a specific time zone. If no time zone is provided, the cron
 * expression will use the default time zone.
 *
 * @example
 * ```ts
 * import { Cron } from "effect"
 *
 * // At 04:00 on every day-of-month from 8 through 14.
 * console.log(Cron.unsafeParse("0 4 8-14 * *"))
 * // Output:
 * // {
 * //   _id: 'Cron',
 * //   tz: { _id: 'Option', _tag: 'None' },
 * //   seconds: [ 0 ],
 * //   minutes: [ 0 ],
 * //   hours: [ 4 ],
 * //   days: [
 * //      8,  9, 10, 11,
 * //     12, 13, 14
 * //   ],
 * //   months: [],
 * //   weekdays: []
 * // }
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
exports.parse = parse;
const unsafeParse = (cron, tz) => Either.getOrThrowWith(parse(cron, tz), _Function.identity);
/**
 * Checks if a given `Date` falls within an active `Cron` time window.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Cron, Either } from "effect"
 *
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 04:00:00")), true)
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 05:00:00")), false)
 * ```
 *
 * @throws `IllegalArgumentException` if the given `DateTime.Input` is invalid.
 *
 * @since 2.0.0
 */
exports.unsafeParse = unsafeParse;
const match = (cron, date) => {
  const parts = dateTime.unsafeMakeZoned(date, {
    timeZone: Option.getOrUndefined(cron.tz)
  }).pipe(dateTime.toParts);
  if (cron.seconds.size !== 0 && !cron.seconds.has(parts.seconds)) {
    return false;
  }
  if (cron.minutes.size !== 0 && !cron.minutes.has(parts.minutes)) {
    return false;
  }
  if (cron.hours.size !== 0 && !cron.hours.has(parts.hours)) {
    return false;
  }
  if (cron.months.size !== 0 && !cron.months.has(parts.month)) {
    return false;
  }
  if (cron.days.size === 0 && cron.weekdays.size === 0) {
    return true;
  }
  if (cron.weekdays.size === 0) {
    return cron.days.has(parts.day);
  }
  if (cron.days.size === 0) {
    return cron.weekdays.has(parts.weekDay);
  }
  return cron.days.has(parts.day) || cron.weekdays.has(parts.weekDay);
};
exports.match = match;
const daysInMonth = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
/**
 * Returns the next run `Date` for the given `Cron` instance.
 *
 * Uses the current time as a starting point if no value is provided for `now`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Cron, Either } from "effect"
 *
 * const after = new Date("2021-01-01 00:00:00")
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.next(cron, after), new Date("2021-01-08 04:00:00"))
 * ```
 *
 * @throws `IllegalArgumentException` if the given `DateTime.Input` is invalid.
 * @throws `Error` if the next run date cannot be found within 10,000 iterations.
 *
 * @since 2.0.0
 */
const next = (cron, startFrom) => {
  const tz = Option.getOrUndefined(cron.tz);
  const zoned = dateTime.unsafeMakeZoned(startFrom ?? new Date(), {
    timeZone: tz
  });
  const utc = tz !== undefined && dateTime.isTimeZoneNamed(tz) && tz.id === "UTC";
  const adjustDst = utc ? _Function.constVoid : current => {
    const adjusted = dateTime.unsafeMakeZoned(current, {
      timeZone: zoned.zone,
      adjustForTimeZone: true
    }).pipe(dateTime.toDate);
    // TODO: This implementation currently only skips forward when transitioning into daylight savings time.
    const drift = current.getTime() - adjusted.getTime();
    if (drift > 0) {
      current.setTime(current.getTime() + drift);
    }
  };
  const result = dateTime.mutate(zoned, current => {
    current.setUTCSeconds(current.getUTCSeconds() + 1, 0);
    for (let i = 0; i < 10_000; i++) {
      if (cron.seconds.size !== 0) {
        const currentSecond = current.getUTCSeconds();
        const nextSecond = cron.next.second[currentSecond];
        if (nextSecond === undefined) {
          current.setUTCMinutes(current.getUTCMinutes() + 1, cron.first.second);
          adjustDst(current);
          continue;
        }
        if (nextSecond > currentSecond) {
          current.setUTCSeconds(nextSecond);
          adjustDst(current);
          continue;
        }
      }
      if (cron.minutes.size !== 0) {
        const currentMinute = current.getUTCMinutes();
        const nextMinute = cron.next.minute[currentMinute];
        if (nextMinute === undefined) {
          current.setUTCHours(current.getUTCHours() + 1, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
        if (nextMinute > currentMinute) {
          current.setUTCMinutes(nextMinute, cron.first.second);
          adjustDst(current);
          continue;
        }
      }
      if (cron.hours.size !== 0) {
        const currentHour = current.getUTCHours();
        const nextHour = cron.next.hour[currentHour];
        if (nextHour === undefined) {
          current.setUTCDate(current.getUTCDate() + 1);
          current.setUTCHours(cron.first.hour, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
        if (nextHour > currentHour) {
          current.setUTCHours(nextHour, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
      }
      if (cron.weekdays.size !== 0 || cron.days.size !== 0) {
        let a = Infinity;
        let b = Infinity;
        if (cron.weekdays.size !== 0) {
          const currentWeekday = current.getUTCDay();
          const nextWeekday = cron.next.weekday[currentWeekday];
          a = nextWeekday === undefined ? 7 - currentWeekday + cron.first.weekday : nextWeekday - currentWeekday;
        }
        if (cron.days.size !== 0 && a !== 0) {
          const currentDay = current.getUTCDate();
          const nextDay = cron.next.day[currentDay];
          b = nextDay === undefined ? daysInMonth(current) - currentDay + cron.first.day : nextDay - currentDay;
        }
        const addDays = Math.min(a, b);
        if (addDays !== 0) {
          current.setUTCDate(current.getUTCDate() + addDays);
          current.setUTCHours(cron.first.hour, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
      }
      if (cron.months.size !== 0) {
        const currentMonth = current.getUTCMonth() + 1;
        const nextMonth = cron.next.month[currentMonth];
        if (nextMonth === undefined) {
          current.setUTCFullYear(current.getUTCFullYear() + 1);
          current.setUTCMonth(cron.first.month, cron.first.day);
          current.setUTCHours(cron.first.hour, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
        if (nextMonth > currentMonth) {
          current.setUTCMonth(nextMonth - 1, cron.first.day);
          current.setUTCHours(cron.first.hour, cron.first.minute, cron.first.second);
          adjustDst(current);
          continue;
        }
      }
      return;
    }
    throw new Error("Unable to find next cron date");
  });
  return dateTime.toDateUtc(result);
};
/**
 * Returns an `IterableIterator` which yields the sequence of `Date`s that match the `Cron` instance.
 *
 * @since 2.0.0
 */
exports.next = next;
const sequence = function* (cron, startFrom) {
  while (true) {
    yield startFrom = next(cron, startFrom);
  }
};
/**
 * @category instances
 * @since 2.0.0
 */
exports.sequence = sequence;
const Equivalence = exports.Equivalence = /*#__PURE__*/equivalence.make((self, that) => restrictionsEquals(self.seconds, that.seconds) && restrictionsEquals(self.minutes, that.minutes) && restrictionsEquals(self.hours, that.hours) && restrictionsEquals(self.days, that.days) && restrictionsEquals(self.months, that.months) && restrictionsEquals(self.weekdays, that.weekdays));
const restrictionsArrayEquals = /*#__PURE__*/equivalence.array(equivalence.number);
const restrictionsEquals = (self, that) => restrictionsArrayEquals(Arr.fromIterable(self), Arr.fromIterable(that));
/**
 * Checks if two `Cron`s are equal.
 *
 * @since 2.0.0
 * @category predicates
 */
const equals = exports.equals = /*#__PURE__*/(0, _Function.dual)(2, (self, that) => Equivalence(self, that));
const secondOptions = {
  min: 0,
  max: 59
};
const minuteOptions = {
  min: 0,
  max: 59
};
const hourOptions = {
  min: 0,
  max: 23
};
const dayOptions = {
  min: 1,
  max: 31
};
const monthOptions = {
  min: 1,
  max: 12,
  aliases: {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  }
};
const weekdayOptions = {
  min: 0,
  max: 6,
  aliases: {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  }
};
const parseSegment = (input, options) => {
  const capacity = options.max - options.min + 1;
  const values = new Set();
  const fields = input.split(",");
  for (const field of fields) {
    const [raw, step] = splitStep(field);
    if (raw === "*" && step === undefined) {
      return Either.right(new Set());
    }
    if (step !== undefined) {
      if (!Number.isInteger(step)) {
        return Either.left(new ParseError({
          message: `Expected step value to be a positive integer`,
          input
        }));
      }
      if (step < 1) {
        return Either.left(new ParseError({
          message: `Expected step value to be greater than 0`,
          input
        }));
      }
      if (step > options.max) {
        return Either.left(new ParseError({
          message: `Expected step value to be less than ${options.max}`,
          input
        }));
      }
    }
    if (raw === "*") {
      for (let i = options.min; i <= options.max; i += step ?? 1) {
        values.add(i);
      }
    } else {
      const [left, right] = splitRange(raw, options.aliases);
      if (!Number.isInteger(left)) {
        return Either.left(new ParseError({
          message: `Expected a positive integer`,
          input
        }));
      }
      if (left < options.min || left > options.max) {
        return Either.left(new ParseError({
          message: `Expected a value between ${options.min} and ${options.max}`,
          input
        }));
      }
      if (right === undefined) {
        values.add(left);
      } else {
        if (!Number.isInteger(right)) {
          return Either.left(new ParseError({
            message: `Expected a positive integer`,
            input
          }));
        }
        if (right < options.min || right > options.max) {
          return Either.left(new ParseError({
            message: `Expected a value between ${options.min} and ${options.max}`,
            input
          }));
        }
        if (left > right) {
          return Either.left(new ParseError({
            message: `Invalid value range`,
            input
          }));
        }
        for (let i = left; i <= right; i += step ?? 1) {
          values.add(i);
        }
      }
    }
    if (values.size >= capacity) {
      return Either.right(new Set());
    }
  }
  return Either.right(values);
};
const splitStep = input => {
  const seperator = input.indexOf("/");
  if (seperator !== -1) {
    return [input.slice(0, seperator), Number(input.slice(seperator + 1))];
  }
  return [input, undefined];
};
const splitRange = (input, aliases) => {
  const seperator = input.indexOf("-");
  if (seperator !== -1) {
    return [aliasOrValue(input.slice(0, seperator), aliases), aliasOrValue(input.slice(seperator + 1), aliases)];
  }
  return [aliasOrValue(input, aliases), undefined];
};
function aliasOrValue(field, aliases) {
  return aliases?.[field.toLocaleLowerCase()] ?? Number(field);
}
//# sourceMappingURL=Cron.js.map