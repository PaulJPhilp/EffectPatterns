module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const headerImport = root.find(j.ImportDeclaration, {
    source: { value: "next/headers" }
  });

  if (headerImport.size() === 0) {
    return null;
  }

  const asyncCalleeNames = new Set();

  headerImport.forEach((path) => {
    (path.value.specifiers || []).forEach((spec) => {
      if (spec.type === "ImportSpecifier") {
        const imported = spec.local ? spec.local.name : spec.imported.name;
        if (imported === "cookies" || imported === "headers") {
          asyncCalleeNames.add(imported);
        }
      }
    });
  });

  if (asyncCalleeNames.size() === 0) {
    return null;
  }

  let changed = false;

  function ensureAsync(fnPath) {
    if (!fnPath || fnPath.size() === 0) {
      return;
    }
    const node = fnPath.get().value;
    if (!node.async) {
      node.async = true;
      changed = true;
    }
  }

  asyncCalleeNames.forEach((name) => {
    root
      .find(j.CallExpression, {
        callee: { type: "Identifier", name }
      })
      .forEach((callPath) => {
        const parent = callPath.parent;
        if (parent && parent.value && parent.value.type === "AwaitExpression") {
          return;
        }

        j(callPath).replaceWith(
          j.awaitExpression(j.callExpression(callPath.value.callee, callPath.value.arguments))
        );
        changed = true;

        const func = callPath.closest(j.FunctionDeclaration);
        if (func.size() > 0) {
          ensureAsync(func);
          return;
        }

        const funcExpr = callPath.closest(j.FunctionExpression);
        if (funcExpr.size() > 0) {
          ensureAsync(funcExpr);
          return;
        }

        const arrow = callPath.closest(j.ArrowFunctionExpression);
        if (arrow.size() > 0) {
          ensureAsync(arrow);
        }
      });
  });

  if (!changed) {
    return null;
  }

  return root.toSource({ quote: "double" });
};
