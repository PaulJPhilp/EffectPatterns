"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ownKeys = exports.memoizeThunk = exports.isSingle = exports.isNonEmpty = exports.getKeysForIndexSignature = exports.formatUnknown = exports.formatPropertyKey = exports.formatPathKey = exports.formatPath = exports.formatDate = void 0;
var Predicate = _interopRequireWildcard(require("../../Predicate.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const getKeysForIndexSignature = (input, parameter) => {
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
exports.getKeysForIndexSignature = getKeysForIndexSignature;
const ownKeys = o => Object.keys(o).concat(Object.getOwnPropertySymbols(o));
/** @internal */
exports.ownKeys = ownKeys;
const memoizeThunk = f => {
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
exports.memoizeThunk = memoizeThunk;
const formatDate = date => {
  try {
    return date.toISOString();
  } catch {
    return String(date);
  }
};
/** @internal */
exports.formatDate = formatDate;
const formatUnknown = (u, checkCircular = true) => {
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
exports.formatUnknown = formatUnknown;
const formatPropertyKey = name => typeof name === "string" ? JSON.stringify(name) : String(name);
/** @internal */
exports.formatPropertyKey = formatPropertyKey;
const isNonEmpty = x => Array.isArray(x);
/** @internal */
exports.isNonEmpty = isNonEmpty;
const isSingle = x => !Array.isArray(x);
/** @internal */
exports.isSingle = isSingle;
const formatPathKey = key => `[${formatPropertyKey(key)}]`;
/** @internal */
exports.formatPathKey = formatPathKey;
const formatPath = path => isNonEmpty(path) ? path.map(formatPathKey).join("") : formatPathKey(path);
exports.formatPath = formatPath;
//# sourceMappingURL=util.js.map