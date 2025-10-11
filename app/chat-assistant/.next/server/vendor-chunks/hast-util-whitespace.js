"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/hast-util-whitespace";
exports.ids = ["vendor-chunks/hast-util-whitespace"];
exports.modules = {

/***/ "(ssr)/./node_modules/hast-util-whitespace/lib/index.js":
/*!********************************************************!*\
  !*** ./node_modules/hast-util-whitespace/lib/index.js ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   whitespace: () => (/* binding */ whitespace)\n/* harmony export */ });\n/**\n * @typedef {import('hast').Nodes} Nodes\n */\n\n// HTML whitespace expression.\n// See <https://infra.spec.whatwg.org/#ascii-whitespace>.\nconst re = /[ \\t\\n\\f\\r]/g\n\n/**\n * Check if the given value is *inter-element whitespace*.\n *\n * @param {Nodes | string} thing\n *   Thing to check (`Node` or `string`).\n * @returns {boolean}\n *   Whether the `value` is inter-element whitespace (`boolean`): consisting of\n *   zero or more of space, tab (`\\t`), line feed (`\\n`), carriage return\n *   (`\\r`), or form feed (`\\f`); if a node is passed it must be a `Text` node,\n *   whose `value` field is checked.\n */\nfunction whitespace(thing) {\n  return typeof thing === 'object'\n    ? thing.type === 'text'\n      ? empty(thing.value)\n      : false\n    : empty(thing)\n}\n\n/**\n * @param {string} value\n * @returns {boolean}\n */\nfunction empty(value) {\n  return value.replace(re, '') === ''\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaGFzdC11dGlsLXdoaXRlc3BhY2UvbGliL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBLGFBQWEsc0JBQXNCO0FBQ25DOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLGdCQUFnQjtBQUMzQjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0E7QUFDTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9wYXVsL1Byb2plY3RzL0VmZmVjdC1QYXR0ZXJucy9hcHAvY2hhdC1hc3Npc3RhbnQvbm9kZV9tb2R1bGVzL2hhc3QtdXRpbC13aGl0ZXNwYWNlL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEB0eXBlZGVmIHtpbXBvcnQoJ2hhc3QnKS5Ob2Rlc30gTm9kZXNcbiAqL1xuXG4vLyBIVE1MIHdoaXRlc3BhY2UgZXhwcmVzc2lvbi5cbi8vIFNlZSA8aHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2U+LlxuY29uc3QgcmUgPSAvWyBcXHRcXG5cXGZcXHJdL2dcblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgKmludGVyLWVsZW1lbnQgd2hpdGVzcGFjZSouXG4gKlxuICogQHBhcmFtIHtOb2RlcyB8IHN0cmluZ30gdGhpbmdcbiAqICAgVGhpbmcgdG8gY2hlY2sgKGBOb2RlYCBvciBgc3RyaW5nYCkuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqICAgV2hldGhlciB0aGUgYHZhbHVlYCBpcyBpbnRlci1lbGVtZW50IHdoaXRlc3BhY2UgKGBib29sZWFuYCk6IGNvbnNpc3Rpbmcgb2ZcbiAqICAgemVybyBvciBtb3JlIG9mIHNwYWNlLCB0YWIgKGBcXHRgKSwgbGluZSBmZWVkIChgXFxuYCksIGNhcnJpYWdlIHJldHVyblxuICogICAoYFxccmApLCBvciBmb3JtIGZlZWQgKGBcXGZgKTsgaWYgYSBub2RlIGlzIHBhc3NlZCBpdCBtdXN0IGJlIGEgYFRleHRgIG5vZGUsXG4gKiAgIHdob3NlIGB2YWx1ZWAgZmllbGQgaXMgY2hlY2tlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdoaXRlc3BhY2UodGhpbmcpIHtcbiAgcmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ29iamVjdCdcbiAgICA/IHRoaW5nLnR5cGUgPT09ICd0ZXh0J1xuICAgICAgPyBlbXB0eSh0aGluZy52YWx1ZSlcbiAgICAgIDogZmFsc2VcbiAgICA6IGVtcHR5KHRoaW5nKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGVtcHR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKHJlLCAnJykgPT09ICcnXG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/hast-util-whitespace/lib/index.js\n");

/***/ })

};
;