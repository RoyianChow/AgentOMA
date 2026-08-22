import { describe, it, expect } from "vitest";
import {
  findRawEnvAccess,
  checkFileAgainstAllowlist,
  type Allowlist,
} from "../raw-env-access";

describe("findRawEnvAccess", () => {
  it("detects a plain property access", () => {
    const hits = findRawEnvAccess("f.ts", `const x = process.env.DATABASE_URL;`);
    expect(hits).toEqual([{ line: 1, key: "DATABASE_URL" }]);
  });

  it("detects bracket access with a string literal key", () => {
    const hits = findRawEnvAccess("f.ts", `const x = process.env["DATABASE_URL"];`);
    expect(hits).toEqual([{ line: 1, key: "DATABASE_URL" }]);
  });

  it("marks a dynamic bracket key as <dynamic>", () => {
    const hits = findRawEnvAccess("f.ts", `const k = "X"; const x = process.env[k];`);
    expect(hits).toEqual([{ line: 1, key: "<dynamic>" }]);
  });

  it("reports the correct line number for multi-line source", () => {
    const source = `const a = 1;\nconst b = 2;\nconst c = process.env.SECRET;`;
    const hits = findRawEnvAccess("f.ts", source);
    expect(hits).toEqual([{ line: 3, key: "SECRET" }]);
  });

  it("does NOT flag process.env appearing only inside a string literal", () => {
    // Regression case: this is exactly the false positive a naive text/regex
    // scan produces — a test asserting some OTHER file's source doesn't
    // contain the string "process.env".
    const hits = findRawEnvAccess(
      "f.ts",
      `expect(someOtherFileSource).not.toContain("process.env");`,
    );
    expect(hits).toEqual([]);
  });

  it("does NOT flag an unrelated .env property on a different object", () => {
    const hits = findRawEnvAccess("f.ts", `const x = notProcess.env.FOO;`);
    expect(hits).toEqual([]);
  });

  it("finds multiple accesses in one file", () => {
    const source = `const a = process.env.A;\nconst b = process.env.B;`;
    const hits = findRawEnvAccess("f.ts", source);
    expect(hits).toEqual([
      { line: 1, key: "A" },
      { line: 2, key: "B" },
    ]);
  });
});

describe("checkFileAgainstAllowlist", () => {
  const allowlist: Allowlist = {
    controlId: "PRV-01",
    description: "test fixture",
    entries: [
      { file: "src/env.ts", reason: "r", allowedKeys: ["*"], owner: "o", reviewDate: "2027-01-01" },
      { file: "src/lib/db/test/harness.ts", reason: "r", allowedKeys: ["TEST_DATABASE_URL"], owner: "o", reviewDate: "2027-01-01" },
    ],
  };

  it("allows any key in a file allowlisted with '*'", () => {
    const violations = checkFileAgainstAllowlist(
      "src/env.ts",
      [{ line: 1, key: "ANYTHING" }],
      allowlist,
    );
    expect(violations).toEqual([]);
  });

  it("allows a specifically allowlisted key", () => {
    const violations = checkFileAgainstAllowlist(
      "src/lib/db/test/harness.ts",
      [{ line: 8, key: "TEST_DATABASE_URL" }],
      allowlist,
    );
    expect(violations).toEqual([]);
  });

  it("flags a key not in that file's allowedKeys, even though the file is allowlisted", () => {
    const violations = checkFileAgainstAllowlist(
      "src/lib/db/test/harness.ts",
      [{ line: 9, key: "SOME_OTHER_SECRET" }],
      allowlist,
    );
    expect(violations).toEqual([
      { line: 9, key: "SOME_OTHER_SECRET", file: "src/lib/db/test/harness.ts", reason: 'key "SOME_OTHER_SECRET" not in this file\'s allowedKeys' },
    ]);
  });

  it("fails closed: flags any access in a file that isn't in the allowlist at all", () => {
    const violations = checkFileAgainstAllowlist(
      "src/some/random/new-file.ts",
      [{ line: 1, key: "SECRET_KEY" }],
      allowlist,
    );
    expect(violations).toEqual([
      { line: 1, key: "SECRET_KEY", file: "src/some/random/new-file.ts", reason: "file not in allowlist" },
    ]);
  });
});
