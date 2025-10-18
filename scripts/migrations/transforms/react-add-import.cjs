module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const hasJsx =
    root.find(j.JSXElement).size() > 0 ||
    root.find(j.JSXFragment).size() > 0;

  const hasReactImport = root
    .find(j.ImportDeclaration, { source: { value: "react" } })
    .size() > 0;

  if (!hasJsx || hasReactImport) {
    return null;
  }

  const importDecl = j.importDeclaration(
    [j.importDefaultSpecifier(j.identifier("React"))],
    j.literal("react")
  );

  root.get().node.program.body.unshift(importDecl);

  return root.toSource({ quote: "double" });
};
