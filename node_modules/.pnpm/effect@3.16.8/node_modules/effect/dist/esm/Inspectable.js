import { globalValue } from "./GlobalValue.js";
import { hasProperty, isFunction } from "./Predicate.js";
/**
 * @since 2.0.0
 * @category symbols
 */
export const NodeInspectSymbol = /*#__PURE__*/Symbol.for("nodejs.util.inspect.custom");
/**
 * @since 2.0.0
 */
export const toJSON = x => {
  try {
    if (hasProperty(x, "toJSON") && isFunction(x["toJSON"]) && x["toJSON"].length === 0) {
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
export const format = x => JSON.stringify(x, null, 2);
/**
 * @since 2.0.0
 */
export const BaseProto = {
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
export class Class {
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
export const toStringUnknown = (u, whitespace = 2) => {
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
export const stringifyCircular = (obj, whitespace) => {
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
export const symbolRedactable = /*#__PURE__*/Symbol.for("effect/Inspectable/Redactable");
/**
 * @since 3.10.0
 * @category redactable
 */
export const isRedactable = u => typeof u === "object" && u !== null && symbolRedactable in u;
const redactableState = /*#__PURE__*/globalValue("effect/Inspectable/redactableState", () => ({
  fiberRefs: undefined
}));
/**
 * @since 3.10.0
 * @category redactable
 */
export const withRedactableContext = (context, f) => {
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
export const redact = u => {
  if (isRedactable(u) && redactableState.fiberRefs !== undefined) {
    return u[symbolRedactable](redactableState.fiberRefs);
  }
  return u;
};
//# sourceMappingURL=Inspectable.js.map