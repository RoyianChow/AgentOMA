import ts from "typescript";

/**
 * PRV-01 — detects direct `process.env` property/element access in a source
 * file's AST. Deliberately AST-based rather than a text/regex scan: a naive
 * grep for the string "process.env" produces false positives (e.g. a test
 * asserting some OTHER file's source does not contain that string) and misses
 * bracket-notation access (`process.env["KEY"]`).
 *
 * AGENTS.md: "No new process.env outside src/env.ts."
 */
export type RawEnvAccessHit = {
  /** 1-indexed line number. */
  line: number;
  /** The accessed key, or "<dynamic>" when the key isn't a string literal. */
  key: string;
};

export type AllowlistEntry = {
  file: string;
  reason: string;
  allowedKeys: string[];
  owner: string;
  reviewDate: string;
};

export type Allowlist = {
  controlId: string;
  description: string;
  entries: AllowlistEntry[];
};

function isProcessEnvAccessBase(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "process" &&
    ts.isIdentifier(expression.name) &&
    expression.name.text === "env"
  );
}

/**
 * Scans a single source file's text for process.env.KEY and
 * process.env["KEY"] / process.env[expr] access. Pure — no filesystem or
 * network access — so it's fast and deterministic to unit test.
 */
export function findRawEnvAccess(
  fileName: string,
  sourceText: string,
): RawEnvAccessHit[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const hits: RawEnvAccessHit[] = [];

  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node) && isProcessEnvAccessBase(node.expression)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      hits.push({ line: line + 1, key: node.name.text });
    } else if (ts.isElementAccessExpression(node) && isProcessEnvAccessBase(node.expression)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const arg = node.argumentExpression;
      const key = arg && ts.isStringLiteralLike(arg) ? arg.text : "<dynamic>";
      hits.push({ line: line + 1, key });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return hits;
}

export type RawEnvAccessViolation = RawEnvAccessHit & {
  file: string;
  reason: string;
};

/**
 * Cross-references detected access against the reviewed allowlist. A hit in
 * an unlisted file, or a key not in that file's `allowedKeys` (unless the
 * file is allowlisted for every key via `"*"`), is a violation.
 */
export function checkFileAgainstAllowlist(
  filePath: string,
  hits: RawEnvAccessHit[],
  allowlist: Allowlist,
): RawEnvAccessViolation[] {
  const entry = allowlist.entries.find((e) => e.file === filePath);
  const violations: RawEnvAccessViolation[] = [];
  for (const hit of hits) {
    if (!entry) {
      violations.push({ ...hit, file: filePath, reason: "file not in allowlist" });
      continue;
    }
    const keyAllowed = entry.allowedKeys.includes("*") || entry.allowedKeys.includes(hit.key);
    if (!keyAllowed) {
      violations.push({
        ...hit,
        file: filePath,
        reason: `key "${hit.key}" not in this file's allowedKeys`,
      });
    }
  }
  return violations;
}
