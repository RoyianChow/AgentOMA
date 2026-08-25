import ts from "typescript";

/**
 * BND-01 — production/sandbox import isolation.
 *
 * Task 01's safety model depends on the synthetic sandbox app (see the repo's
 * `apps/` directory) being unreachable from `src/`, and on the sandbox never
 * importing unreviewed production code. `verify-production-invariance.mjs`
 * already checks *built output* for sandbox markers; this is a complementary
 * *source-level* check that catches a violation at PR time, before a build
 * even runs.
 *
 * AST-based rather than a text/regex scan, for the same reason as PRV-01's
 * raw-env-access detector: a string/element scan would false-positive on
 * a comment or test string merely naming the sandbox app's directory, and
 * would miss module specifiers reached only through re-exports, dynamic
 * `import()`, or `require()`.
 *
 * Deliberately does not hardcode the sandbox app's slug anywhere in this
 * file: the caller (see tools/security-policy/) supplies it as a parameter.
 * A separate, pre-existing boundary check on the sandbox side fails any
 * `src/` file containing that literal slug as a substring, so keeping it out
 * of this shared production-tree module avoids a false trip there too.
 */
export type ImportSpecifierHit = {
  /** 1-indexed line number. */
  line: number;
  /** The literal module specifier text, e.g. a relative path into the sandbox app's source tree. */
  specifier: string;
};

/**
 * Scans a single source file's text for every static import/export-from
 * module specifier, dynamic `import()` call, and `require()` call whose
 * argument is a string literal. Pure — no filesystem or network access — so
 * it's fast and deterministic to unit test.
 */
export function findImportSpecifiers(fileName: string, sourceText: string): ImportSpecifierHit[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const hits: ImportSpecifierHit[] = [];

  function pushHit(node: ts.Node, specifier: string) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    hits.push({ line: line + 1, specifier });
  }

  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      pushHit(node, node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      // Dynamic import(): import("...")
      pushHit(node, node.arguments[0].text);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      pushHit(node, node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hits;
}

export type Zone = "production" | "sandbox";

export type ImportBoundaryViolation = ImportSpecifierHit & {
  file: string;
  reason: string;
};

/**
 * Resolves a (possibly relative) module specifier against the importing
 * file's own repo-relative directory, so that a deep relative traversal
 * (several `../` segments) into the sandbox root from inside `src/` is
 * caught even though the literal specifier string doesn't start with the
 * sandbox root's own path prefix.
 */
function resolveSpecifier(filePath: string, specifier: string): string {
  if (!specifier.startsWith(".")) return specifier;
  const fileDir = filePath.split("/").slice(0, -1);
  const parts = specifier.split("/");
  const resolved = [...fileDir];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

/**
 * Checks whether any import in `hits` (found in `filePath`, known to be in
 * `zone`) crosses the production/sandbox boundary:
 *   - a production-zone file must never resolve into `sandboxRoot`, and must
 *     never reference the sandbox's workspace package name.
 *   - a sandbox-zone file must never resolve into `productionRoot` (`src/`).
 */
export function checkImportBoundary(
  filePath: string,
  hits: ImportSpecifierHit[],
  zone: Zone,
  productionRoot: string,
  sandboxRoot: string,
  sandboxPackageName: string,
): ImportBoundaryViolation[] {
  const violations: ImportBoundaryViolation[] = [];

  for (const hit of hits) {
    if (hit.specifier === sandboxPackageName) {
      violations.push({
        ...hit,
        file: filePath,
        reason: `production code must not import the sandbox workspace package "${sandboxPackageName}"`,
      });
      continue;
    }

    const resolved = resolveSpecifier(filePath, hit.specifier);

    if (zone === "production" && (resolved.startsWith(`${sandboxRoot}/`) || resolved === sandboxRoot)) {
      violations.push({
        ...hit,
        file: filePath,
        reason: `production code must not import from ${sandboxRoot}`,
      });
    } else if (
      zone === "sandbox" &&
      (resolved.startsWith(`${productionRoot}/`) || resolved === productionRoot)
    ) {
      violations.push({
        ...hit,
        file: filePath,
        reason: `sandbox code must not import unreviewed production code from ${productionRoot}`,
      });
    }
  }

  return violations;
}
