import { describe, it, expect } from "vitest";
import { findImportSpecifiers, checkImportBoundary } from "../forbidden-imports";

describe("findImportSpecifiers", () => {
  it("detects a static import specifier", () => {
    const hits = findImportSpecifiers("f.ts", `import { foo } from "./foo";`);
    expect(hits).toEqual([{ line: 1, specifier: "./foo" }]);
  });

  it("detects a re-export specifier", () => {
    const hits = findImportSpecifiers("f.ts", `export { foo } from "./foo";`);
    expect(hits).toEqual([{ line: 1, specifier: "./foo" }]);
  });

  it("detects a dynamic import() call", () => {
    const hits = findImportSpecifiers("f.ts", `const m = await import("./foo");`);
    expect(hits).toEqual([{ line: 1, specifier: "./foo" }]);
  });

  it("detects a require() call", () => {
    const hits = findImportSpecifiers("f.ts", `const m = require("./foo");`);
    expect(hits).toEqual([{ line: 1, specifier: "./foo" }]);
  });

  it("reports the correct line number for multi-line source", () => {
    const source = `const a = 1;\nconst b = 2;\nimport { x } from "./x";`;
    const hits = findImportSpecifiers("f.ts", source);
    expect(hits).toEqual([{ line: 3, specifier: "./x" }]);
  });

  it("does NOT flag a module specifier appearing only inside a string literal comparison", () => {
    // Regression case: the exact false positive a naive text/regex scan
    // produces — a test asserting some OTHER file's source doesn't contain
    // the string "experiment-sandbox".
    const hits = findImportSpecifiers(
      "f.ts",
      `expect(someOtherFileSource).not.toContain("experiment-sandbox");`,
    );
    expect(hits).toEqual([]);
  });

  it("finds multiple specifiers in one file", () => {
    const source = `import a from "./a";\nimport b from "./b";`;
    const hits = findImportSpecifiers("f.ts", source);
    expect(hits).toEqual([
      { line: 1, specifier: "./a" },
      { line: 2, specifier: "./b" },
    ]);
  });

  it("ignores a bare call to a same-named local function named require with no import semantics", () => {
    // require(x) where x isn't a string literal shouldn't crash or match.
    const hits = findImportSpecifiers("f.ts", `const k = "x"; require(k);`);
    expect(hits).toEqual([]);
  });
});

describe("checkImportBoundary", () => {
  const productionRoot = "src";
  const sandboxRoot = "apps/experiment-sandbox/src";
  const sandboxPackageName = "@agentoma/experiment-sandbox";

  it("flags production code resolving a relative import into the sandbox root", () => {
    const filePath = "src/lib/foo.ts";
    const hits = [{ line: 5, specifier: "../../apps/experiment-sandbox/src/bar" }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "production",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([
      {
        line: 5,
        specifier: "../../apps/experiment-sandbox/src/bar",
        file: filePath,
        reason: `production code must not import from ${sandboxRoot}`,
      },
    ]);
  });

  it("flags production code importing the sandbox's workspace package name", () => {
    const filePath = "src/lib/foo.ts";
    const hits = [{ line: 2, specifier: sandboxPackageName }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "production",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([
      {
        line: 2,
        specifier: sandboxPackageName,
        file: filePath,
        reason: `production code must not import the sandbox workspace package "${sandboxPackageName}"`,
      },
    ]);
  });

  it("flags sandbox code importing unreviewed production code", () => {
    const filePath = "apps/experiment-sandbox/src/thing.ts";
    const hits = [{ line: 1, specifier: "../../../src/lib/db/client" }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "sandbox",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([
      {
        line: 1,
        specifier: "../../../src/lib/db/client",
        file: filePath,
        reason: `sandbox code must not import unreviewed production code from ${productionRoot}`,
      },
    ]);
  });

  it("allows an ordinary relative import within the same zone", () => {
    const filePath = "src/lib/foo.ts";
    const hits = [{ line: 1, specifier: "./bar" }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "production",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([]);
  });

  it("allows an unrelated third-party package specifier", () => {
    const filePath = "src/lib/foo.ts";
    const hits = [{ line: 1, specifier: "zod" }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "production",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([]);
  });

  it("does not false-positive on a production file path that merely starts with the sandbox root as a string prefix", () => {
    // e.g. "src/lib/foo.ts" importing "../other-src-sibling/thing" must not
    // be mistaken for crossing into "apps/experiment-sandbox/src-extra".
    const filePath = "apps/experiment-sandbox/src/thing.ts";
    const hits = [{ line: 1, specifier: "./sibling" }];
    const violations = checkImportBoundary(
      filePath,
      hits,
      "sandbox",
      productionRoot,
      sandboxRoot,
      sandboxPackageName,
    );
    expect(violations).toEqual([]);
  });
});
