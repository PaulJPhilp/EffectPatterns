import ts from "typescript";

/**
 * Creates a TypeScript SourceFile from a string.
 */
export const createSourceFile = (
  filename: string,
  source: string
): ts.SourceFile => {
  return ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
};

/**
 * Validates if a node is a call expression to a specific method on an object.
 * e.g., Effect.map -> objectName="Effect", methodName="map"
 */
export const isMethodCall = (
  node: ts.Node,
  objectName: string,
  methodName: string
): node is ts.CallExpression => {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return false;

  return (
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === objectName &&
    ts.isIdentifier(expr.name) &&
    expr.name.text === methodName
  );
};

/**
 * checks if a node is a specific function call.
 * e.g. filterOrFail(...)
 */
export const isFunctionCall = (
  node: ts.Node,
  functionName: string
): node is ts.CallExpression => {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression) && node.expression.text === functionName) return true;
  return false;
}

/**
 * Checks if the file has a specific import.
 * Naive implementation: checks purely for module specifier, doesn't validate named imports.
 */
export const hasImport = (
  sourceFile: ts.SourceFile,
  moduleSpecifier: string
): boolean => {
  let found = false;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      if (
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === moduleSpecifier
      ) {
        found = true;
      }
    }
  });
  return found;
};

/**
 * Checks if the file imports from "effect" module using AST analysis.
 * Handles: import { Effect } from "effect", import * as E from "effect", etc.
 */
export const hasEffectImport = (sourceFile: ts.SourceFile): boolean => {
  return hasImport(sourceFile, "effect");
};

/**
 * Checks if the source file looks like Effect code using AST-based detection.
 * More reliable than regex-based detection.
 */
export const looksLikeEffectCode = (sourceFile: ts.SourceFile): boolean => {
  if (hasEffectImport(sourceFile)) return true;

  let indicatorFound = false;
  const visit = (node: ts.Node): void => {
    if (indicatorFound) return;
    
    // Check for yield*
    if (ts.isYieldExpression(node) && node.asteriskToken) {
      indicatorFound = true;
      return;
    }

    // Check for Effect.* calls or identifier usage
    if (ts.isIdentifier(node) && node.text === "Effect") {
      indicatorFound = true;
      return;
    }

    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  return indicatorFound;
};

/**
 * Utilities for finding nodes in the AST.
 */
export const ASTUtils = {
  createSourceFile,
  isMethodCall,
  isFunctionCall,
  hasImport,
  hasEffectImport,
  looksLikeEffectCode,
};
