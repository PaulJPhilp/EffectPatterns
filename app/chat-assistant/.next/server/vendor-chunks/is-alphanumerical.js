"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-alphanumerical";
exports.ids = ["vendor-chunks/is-alphanumerical"];
exports.modules = {

/***/ "(ssr)/./node_modules/is-alphanumerical/index.js":
/*!*************************************************!*\
  !*** ./node_modules/is-alphanumerical/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\n\nvar alphabetical = __webpack_require__(/*! is-alphabetical */ \"(ssr)/./node_modules/is-alphabetical/index.js\")\nvar decimal = __webpack_require__(/*! is-decimal */ \"(ssr)/./node_modules/is-decimal/index.js\")\n\nmodule.exports = alphanumerical\n\n// Check if the given character code, or the character code at the first\n// character, is alphanumerical.\nfunction alphanumerical(character) {\n  return alphabetical(character) || decimal(character)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaXMtYWxwaGFudW1lcmljYWwvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVosbUJBQW1CLG1CQUFPLENBQUMsc0VBQWlCO0FBQzVDLGNBQWMsbUJBQU8sQ0FBQyw0REFBWTs7QUFFbEM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL3BhdWwvUHJvamVjdHMvRWZmZWN0LVBhdHRlcm5zL2FwcC9jaGF0LWFzc2lzdGFudC9ub2RlX21vZHVsZXMvaXMtYWxwaGFudW1lcmljYWwvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbnZhciBhbHBoYWJldGljYWwgPSByZXF1aXJlKCdpcy1hbHBoYWJldGljYWwnKVxudmFyIGRlY2ltYWwgPSByZXF1aXJlKCdpcy1kZWNpbWFsJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHBoYW51bWVyaWNhbFxuXG4vLyBDaGVjayBpZiB0aGUgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUsIG9yIHRoZSBjaGFyYWN0ZXIgY29kZSBhdCB0aGUgZmlyc3Rcbi8vIGNoYXJhY3RlciwgaXMgYWxwaGFudW1lcmljYWwuXG5mdW5jdGlvbiBhbHBoYW51bWVyaWNhbChjaGFyYWN0ZXIpIHtcbiAgcmV0dXJuIGFscGhhYmV0aWNhbChjaGFyYWN0ZXIpIHx8IGRlY2ltYWwoY2hhcmFjdGVyKVxufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/is-alphanumerical/index.js\n");

/***/ })

};
;