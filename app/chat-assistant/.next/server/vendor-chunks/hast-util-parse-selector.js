"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/hast-util-parse-selector";
exports.ids = ["vendor-chunks/hast-util-parse-selector"];
exports.modules = {

/***/ "(ssr)/./node_modules/hast-util-parse-selector/index.js":
/*!********************************************************!*\
  !*** ./node_modules/hast-util-parse-selector/index.js ***!
  \********************************************************/
/***/ ((module) => {

eval("\n\nmodule.exports = parse\n\nvar search = /[#.]/g\n\n// Create a hast element from a simple CSS selector.\nfunction parse(selector, defaultTagName) {\n  var value = selector || ''\n  var name = defaultTagName || 'div'\n  var props = {}\n  var start = 0\n  var subvalue\n  var previous\n  var match\n\n  while (start < value.length) {\n    search.lastIndex = start\n    match = search.exec(value)\n    subvalue = value.slice(start, match ? match.index : value.length)\n\n    if (subvalue) {\n      if (!previous) {\n        name = subvalue\n      } else if (previous === '#') {\n        props.id = subvalue\n      } else if (props.className) {\n        props.className.push(subvalue)\n      } else {\n        props.className = [subvalue]\n      }\n\n      start += subvalue.length\n    }\n\n    if (match) {\n      previous = match[0]\n      start++\n    }\n  }\n\n  return {type: 'element', tagName: name, properties: props, children: []}\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaGFzdC11dGlsLXBhcnNlLXNlbGVjdG9yL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQSxRQUFRO0FBQ1I7QUFDQSxRQUFRO0FBQ1I7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsVUFBVTtBQUNWIiwic291cmNlcyI6WyIvVXNlcnMvcGF1bC9Qcm9qZWN0cy9FZmZlY3QtUGF0dGVybnMvYXBwL2NoYXQtYXNzaXN0YW50L25vZGVfbW9kdWxlcy9oYXN0LXV0aWwtcGFyc2Utc2VsZWN0b3IvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VcblxudmFyIHNlYXJjaCA9IC9bIy5dL2dcblxuLy8gQ3JlYXRlIGEgaGFzdCBlbGVtZW50IGZyb20gYSBzaW1wbGUgQ1NTIHNlbGVjdG9yLlxuZnVuY3Rpb24gcGFyc2Uoc2VsZWN0b3IsIGRlZmF1bHRUYWdOYW1lKSB7XG4gIHZhciB2YWx1ZSA9IHNlbGVjdG9yIHx8ICcnXG4gIHZhciBuYW1lID0gZGVmYXVsdFRhZ05hbWUgfHwgJ2RpdidcbiAgdmFyIHByb3BzID0ge31cbiAgdmFyIHN0YXJ0ID0gMFxuICB2YXIgc3VidmFsdWVcbiAgdmFyIHByZXZpb3VzXG4gIHZhciBtYXRjaFxuXG4gIHdoaWxlIChzdGFydCA8IHZhbHVlLmxlbmd0aCkge1xuICAgIHNlYXJjaC5sYXN0SW5kZXggPSBzdGFydFxuICAgIG1hdGNoID0gc2VhcmNoLmV4ZWModmFsdWUpXG4gICAgc3VidmFsdWUgPSB2YWx1ZS5zbGljZShzdGFydCwgbWF0Y2ggPyBtYXRjaC5pbmRleCA6IHZhbHVlLmxlbmd0aClcblxuICAgIGlmIChzdWJ2YWx1ZSkge1xuICAgICAgaWYgKCFwcmV2aW91cykge1xuICAgICAgICBuYW1lID0gc3VidmFsdWVcbiAgICAgIH0gZWxzZSBpZiAocHJldmlvdXMgPT09ICcjJykge1xuICAgICAgICBwcm9wcy5pZCA9IHN1YnZhbHVlXG4gICAgICB9IGVsc2UgaWYgKHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgICBwcm9wcy5jbGFzc05hbWUucHVzaChzdWJ2YWx1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3BzLmNsYXNzTmFtZSA9IFtzdWJ2YWx1ZV1cbiAgICAgIH1cblxuICAgICAgc3RhcnQgKz0gc3VidmFsdWUubGVuZ3RoXG4gICAgfVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBwcmV2aW91cyA9IG1hdGNoWzBdXG4gICAgICBzdGFydCsrXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHt0eXBlOiAnZWxlbWVudCcsIHRhZ05hbWU6IG5hbWUsIHByb3BlcnRpZXM6IHByb3BzLCBjaGlsZHJlbjogW119XG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/hast-util-parse-selector/index.js\n");

/***/ })

};
;