import * as Predicate from "../../Predicate.js";
/** @internal */
export const getKeysForIndexSignature = (input, parameter) => {
  switch (parameter._tag) {
    case "StringKeyword":
    case "TemplateLiteral":
      return Object.keys(input);
    case "SymbolKeyword":
      return Object.getOwnPropertySymbols(input);
    case "Refinement":
      return getKeysForIndexSignature(input, parameter.from);
  }
};
/**
 * JavaScript does not store the insertion order of properties in a way that
 * combines both string and symbol keys. The internal order groups string keys
 * and symbol keys separately. Hence concatenating the keys is fine.
 *
 * @internal
 */
export const ownKeys = o => Object.keys(o).concat(Object.getOwnPropertySymbols(o));
/** @internal */
export const memoizeThunk = f => {
  let done = false;
  let a;
  return () => {
    if (done) {
      return a;
    }
    a = f();
    done = true;
    return a;
  };
};
/** @internal */
export const formatDate = date => {
  try {
    return date.toISOString();
  } catch {
    return String(date);
  }
};
/** @internal */
export const formatUnknown = (u, checkCircular = true) => {
  if (Array.isArray(u)) {
    return `[${u.map(i => formatUnknown(i, checkCircular)).join(",")}]`;
  }
  if (Predicate.isDate(u)) {
    return formatDate(u);
  }
  if (Predicate.hasProperty(u, "toString") && Predicate.isFunction(u["toString"]) && u["toString"] !== Object.prototype.toString) {
    return u["toString"]();
  }
  if (Predicate.isString(u)) {
    return JSON.stringify(u);
  }
  if (Predicate.isNumber(u) || u == null || Predicate.isBoolean(u) || Predicate.isSymbol(u)) {
    return String(u);
  }
  if (Predicate.isBigInt(u)) {
    return String(u) + "n";
  }
  if (Predicate.isIterable(u)) {
    return `${u.constructor.name}(${formatUnknown(Array.from(u), checkCircular)})`;
  }
  try {
    if (checkCircular) {
      JSON.stringify(u); // check for circular references
    }
    const pojo = `{${ownKeys(u).map(k => `${Predicate.isString(k) ? JSON.stringify(k) : String(k)}:${formatUnknown(u[k], false)}`).join(",")}}`;
    const name = u.constructor.name;
    return u.constructor !== Object.prototype.constructor ? `${name}(${pojo})` : pojo;
  } catch {
    return "<circular structure>";
  }
};
/** @internal */
export const formatPropertyKey = name => typeof name === "string" ? JSON.stringify(name) : String(name);
/** @internal */
export const isNonEmpty = x => Array.isArray(x);
/** @internal */
export const isSingle = x => !Array.isArray(x);
/** @internal */
export const formatPathKey = key => `[${formatPropertyKey(key)}]`;
/** @internal */
export const formatPath = path => isNonEmpty(path) ? path.map(formatPathKey).join("") : formatPathKey(path);
//# sourceMappingURL=util.js.map