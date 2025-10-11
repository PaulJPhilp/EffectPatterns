/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/throttleit";
exports.ids = ["vendor-chunks/throttleit"];
exports.modules = {

/***/ "(ssr)/./node_modules/throttleit/index.js":
/*!******************************************!*\
  !*** ./node_modules/throttleit/index.js ***!
  \******************************************/
/***/ ((module) => {

eval("function throttle(function_, wait) {\n\tif (typeof function_ !== 'function') {\n\t\tthrow new TypeError(`Expected the first argument to be a \\`function\\`, got \\`${typeof function_}\\`.`);\n\t}\n\n\t// TODO: Add `wait` validation too in the next major version.\n\n\tlet timeoutId;\n\tlet lastCallTime = 0;\n\n\treturn function throttled(...arguments_) { // eslint-disable-line func-names\n\t\tclearTimeout(timeoutId);\n\n\t\tconst now = Date.now();\n\t\tconst timeSinceLastCall = now - lastCallTime;\n\t\tconst delayForNextCall = wait - timeSinceLastCall;\n\n\t\tif (delayForNextCall <= 0) {\n\t\t\tlastCallTime = now;\n\t\t\tfunction_.apply(this, arguments_);\n\t\t} else {\n\t\t\ttimeoutId = setTimeout(() => {\n\t\t\t\tlastCallTime = Date.now();\n\t\t\t\tfunction_.apply(this, arguments_);\n\t\t\t}, delayForNextCall);\n\t\t}\n\t};\n}\n\nmodule.exports = throttle;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvdGhyb3R0bGVpdC9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0EsaUZBQWlGLGlCQUFpQjtBQUNsRzs7QUFFQTs7QUFFQTtBQUNBOztBQUVBLDRDQUE0QztBQUM1Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUEiLCJzb3VyY2VzIjpbIi9Vc2Vycy9wYXVsL1Byb2plY3RzL0VmZmVjdC1QYXR0ZXJucy9hcHAvY2hhdC1hc3Npc3RhbnQvbm9kZV9tb2R1bGVzL3Rocm90dGxlaXQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gdGhyb3R0bGUoZnVuY3Rpb25fLCB3YWl0KSB7XG5cdGlmICh0eXBlb2YgZnVuY3Rpb25fICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIGJlIGEgXFxgZnVuY3Rpb25cXGAsIGdvdCBcXGAke3R5cGVvZiBmdW5jdGlvbl99XFxgLmApO1xuXHR9XG5cblx0Ly8gVE9ETzogQWRkIGB3YWl0YCB2YWxpZGF0aW9uIHRvbyBpbiB0aGUgbmV4dCBtYWpvciB2ZXJzaW9uLlxuXG5cdGxldCB0aW1lb3V0SWQ7XG5cdGxldCBsYXN0Q2FsbFRpbWUgPSAwO1xuXG5cdHJldHVybiBmdW5jdGlvbiB0aHJvdHRsZWQoLi4uYXJndW1lbnRzXykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZ1bmMtbmFtZXNcblx0XHRjbGVhclRpbWVvdXQodGltZW91dElkKTtcblxuXHRcdGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cdFx0Y29uc3QgdGltZVNpbmNlTGFzdENhbGwgPSBub3cgLSBsYXN0Q2FsbFRpbWU7XG5cdFx0Y29uc3QgZGVsYXlGb3JOZXh0Q2FsbCA9IHdhaXQgLSB0aW1lU2luY2VMYXN0Q2FsbDtcblxuXHRcdGlmIChkZWxheUZvck5leHRDYWxsIDw9IDApIHtcblx0XHRcdGxhc3RDYWxsVGltZSA9IG5vdztcblx0XHRcdGZ1bmN0aW9uXy5hcHBseSh0aGlzLCBhcmd1bWVudHNfKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdGxhc3RDYWxsVGltZSA9IERhdGUubm93KCk7XG5cdFx0XHRcdGZ1bmN0aW9uXy5hcHBseSh0aGlzLCBhcmd1bWVudHNfKTtcblx0XHRcdH0sIGRlbGF5Rm9yTmV4dENhbGwpO1xuXHRcdH1cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0aHJvdHRsZTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/throttleit/index.js\n");

/***/ })

};
;