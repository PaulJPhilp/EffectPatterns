"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-alphabetical";
exports.ids = ["vendor-chunks/is-alphabetical"];
exports.modules = {

/***/ "(ssr)/./node_modules/is-alphabetical/index.js":
/*!***********************************************!*\
  !*** ./node_modules/is-alphabetical/index.js ***!
  \***********************************************/
/***/ ((module) => {

eval("\n\nmodule.exports = alphabetical\n\n// Check if the given character code, or the character code at the first\n// character, is alphabetical.\nfunction alphabetical(character) {\n  var code = typeof character === 'string' ? character.charCodeAt(0) : character\n\n  return (\n    (code >= 97 && code <= 122) /* a-z */ ||\n    (code >= 65 && code <= 90) /* A-Z */\n  )\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaXMtYWxwaGFiZXRpY2FsL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9wYXVsL1Byb2plY3RzL0VmZmVjdC1QYXR0ZXJucy9hcHAvY2hhdC1hc3Npc3RhbnQvbm9kZV9tb2R1bGVzL2lzLWFscGhhYmV0aWNhbC9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBhbHBoYWJldGljYWxcblxuLy8gQ2hlY2sgaWYgdGhlIGdpdmVuIGNoYXJhY3RlciBjb2RlLCBvciB0aGUgY2hhcmFjdGVyIGNvZGUgYXQgdGhlIGZpcnN0XG4vLyBjaGFyYWN0ZXIsIGlzIGFscGhhYmV0aWNhbC5cbmZ1bmN0aW9uIGFscGhhYmV0aWNhbChjaGFyYWN0ZXIpIHtcbiAgdmFyIGNvZGUgPSB0eXBlb2YgY2hhcmFjdGVyID09PSAnc3RyaW5nJyA/IGNoYXJhY3Rlci5jaGFyQ29kZUF0KDApIDogY2hhcmFjdGVyXG5cbiAgcmV0dXJuIChcbiAgICAoY29kZSA+PSA5NyAmJiBjb2RlIDw9IDEyMikgLyogYS16ICovIHx8XG4gICAgKGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MCkgLyogQS1aICovXG4gIClcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/is-alphabetical/index.js\n");

/***/ })

};
;