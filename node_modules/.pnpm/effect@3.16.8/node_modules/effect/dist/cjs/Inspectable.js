"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withRedactableContext = exports.toStringUnknown = exports.toJSON = exports.symbolRedactable = exports.stringifyCircular = exports.redact = exports.isRedactable = exports.format = exports.NodeInspectSymbol = exports.Class = exports.BaseProto = void 0;
var _GlobalValue = require("./GlobalValue.js");
var _Predicate = require("./Predicate.js");
/**
 * @since 2.0.0
 * @category symbols
 */
const NodeInspectSymbol = exports.NodeInspectSymbol = /*#__PURE__*/Symbol.for("nodejs.util.inspect.custom");
/**
 * @since 2.0.0
 */
const toJSON = x => {
  try {
    if ((0, _Predicate.hasProperty)(x, "toJSON") && (0, _Predicate.isFunction)(x["toJSON"]) && x["toJSON"].length === 0) {
      return x.toJSON();
    } else if (Array.isArray(x)) {
      return x.map(toJSON);
    }
  } catch {
    return {};
  }
  return redact(x);
};
/**
 * @since 2.0.0
 */
exports.toJSON = toJSON;
const format = x => JSON.stringify(x, null, 2);
/**
 * @since 2.0.0
 */
exports.format = format;
const BaseProto = exports.BaseProto = {
  toJSON() {
    return toJSON(this);
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  toString() {
    return format(this.toJSON());
  }
};
/**
 * @since 2.0.0
 */
class Class {
  /**
   * @since 2.0.0
   */
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  /**
   * @since 2.0.0
   */
  toString() {
    return format(this.toJSON());
  }
}
/**
 * @since 2.0.0
 */
exports.Class = Class;
const toStringUnknown = (u, whitespace = 2) => {
  if (typeof u === "string") {
    return u;
  }
  try {
    return typeof u === "object" ? stringifyCircular(u, whitespace) : String(u);
  } catch {
    return String(u);
  }
};
/**
 * @since 2.0.0
 */
exports.toStringUnknown = toStringUnknown;
const stringifyCircular = (obj, whitespace) => {
  let cache = [];
  const retVal = JSON.stringify(obj, (_key, value) => typeof value === "object" && value !== null ? cache.includes(value) ? undefined // circular reference
  : cache.push(value) && (redactableState.fiberRefs !== undefined && isRedactable(value) ? value[symbolRedactable](redactableState.fiberRefs) : value) : value, whitespace);
  cache = undefined;
  return retVal;
};
/**
 * @since 3.10.0
 * @category redactable
 */
exports.stringifyCircular = stringifyCircular;
const symbolRedactable = exports.symbolRedactable = /*#__PURE__*/Symbol.for("effect/Inspectable/Redactable");
/**
 * @since 3.10.0
 * @category redactable
 */
const isRedactable = u => typeof u === "object" && u !== null && symbolRedactable in u;
exports.isRedactable = isRedactable;
const redactableState = /*#__PURE__*/(0, _GlobalValue.globalValue)("effect/Inspectable/redactableState", () => ({
  fiberRefs: undefined
}));
/**
 * @since 3.10.0
 * @category redactable
 */
const withRedactableContext = (context, f) => {
  const prev = redactableState.fiberRefs;
  redactableState.fiberRefs = context;
  try {
    return f();
  } finally {
    redactableState.fiberRefs = prev;
  }
};
/**
 * @since 3.10.0
 * @category redactable
 */
exports.withRedactableContext = withRedactableContext;
const redact = u => {
  if (isRedactable(u) && redactableState.fiberRefs !== undefined) {
    return u[symbolRedactable](redactableState.fiberRefs);
  }
  return u;
};
exports.redact = redact;
//# sourceMappingURL=Inspectable.js.map