import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RX_CORPUS } from "../corpus";

/**
 * The AI-RX-06 containment boundary.
 *
 * The comments in `contract.ts` state four invariants: no PHI, no model, no
 * persistence, no decision. Comments do not hold a line — these assertions do.
 * They are structural on purpose: a future edit that wires this experiment into
 * the claim path or the audit log fails here rather than in review.
 */

const LIB_DIR = fileURLToPath(new URL("../", import.meta.url));
const ROUTE_DIR = fileURLToPath(
  new URL("../../../app/(dashboard)/pharmacist/rx-intake/", import.meta.url),
);
const SRC_DIR = fileURLToPath(new URL("../../../", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry) && !entry.includes(".test.") ? [full] : [];
  });
}

/**
 * Strips comments before the "does not contain" assertions run.
 *
 * Without this the tests trip over their own documentation: the header in
 * `contract.ts` names `deriveClaimDraft` precisely to say the capability must
 * never call it, and a naive substring check reads that as a violation. The
 * boundary is about what the code does, so the prose has to come out first.
 *
 * Comment-shaped text inside a string literal would also be stripped. Nothing
 * in this capability has one, and a false positive here fails loudly rather
 * than passing something dangerous.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function read(files: string[]): string {
  return files.map((file) => stripComments(readFileSync(file, "utf8"))).join("\n");
}

const CAPABILITY_FILES = [...sourceFiles(LIB_DIR), ...sourceFiles(ROUTE_DIR)];
const CAPABILITY_SOURCE = read(CAPABILITY_FILES);

describe("the capability exists where expected", () => {
  it("has source files on both sides to assert against", () => {
    // Guards the assertions below: if a rename empties these globs, every
    // "does not contain" test would pass vacuously.
    expect(sourceFiles(LIB_DIR).length).toBeGreaterThanOrEqual(4);
    expect(sourceFiles(ROUTE_DIR).length).toBeGreaterThanOrEqual(3);
  });
});

describe("no persistence", () => {
  it("imports no database module", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/from\s+["']@\/lib\/db/);
    expect(CAPABILITY_SOURCE).not.toMatch(/from\s+["']drizzle-orm/);
  });

  it("imports no audit writer", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/from\s+["']@\/lib\/audit["']/);
    expect(CAPABILITY_SOURCE).not.toMatch(/\bwriteAudit\w*\s*\(/);
  });

  it("issues no insert, update, or delete", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/\.(insert|update|delete)\s*\(/);
  });

  it("does not revalidate or redirect as if it had written something", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/revalidatePath|revalidateTag/);
  });
});

describe("no billing or claim derivation", () => {
  it("never reaches claim derivation or the reference tables", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/deriveClaimDraft/);
    expect(CAPABILITY_SOURCE).not.toMatch(/from\s+["']@\/lib\/claims/);
    expect(CAPABILITY_SOURCE).not.toMatch(/from\s+["']@\/config\/ailment-reference["']/);
  });

  it("contains no PIN, fee, or claim-maximum literal", () => {
    // AGENTS.md: these come from reference data or not at all. This capability
    // has no business carrying one, so any occurrence is a defect.
    expect(CAPABILITY_SOURCE).not.toMatch(/\bfeeCents\b|\bpinCode\b|\bclaimMax/i);
  });
});

describe("no model and no network", () => {
  it("makes no outbound call", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/\bfetch\s*\(/);
    expect(CAPABILITY_SOURCE).not.toMatch(/\baxios\b|XMLHttpRequest|WebSocket/);
  });

  it("imports no model vendor SDK", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(
      /@anthropic-ai|openai|@google\/gen|@aws-sdk\/client-bedrock|langchain/i,
    );
  });
});

describe("no free-text input path", () => {
  it("the server action accepts only a fixture id", () => {
    const actions = readFileSync(`${ROUTE_DIR}/actions.ts`, "utf8");
    expect(actions).toMatch(/rxExtractionRequestSchema/);
    // The parser takes a fixture object; the only way to obtain one is
    // findFixture over the built-in corpus.
    expect(actions).toMatch(/findFixture\(/);
    expect(actions).not.toMatch(/\btext\b\s*:/);
  });

  it("offers no upload control", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/type\s*=\s*["']file["']/);
    expect(CAPABILITY_SOURCE).not.toMatch(/FormData|FileReader|multipart/);
  });

  it("never reaches Supabase Storage", () => {
    expect(CAPABILITY_SOURCE).not.toMatch(/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|storage/i);
  });
});

describe("the gate is enforced server-side", () => {
  it("the action checks the gate before it checks the session", () => {
    const actions = readFileSync(`${ROUTE_DIR}/actions.ts`, "utf8");
    const gateAt = actions.indexOf("assertRxIntakeEnabled(");
    const authAt = actions.indexOf("requirePortalUser(");
    expect(gateAt).toBeGreaterThan(-1);
    expect(authAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(authAt);
  });

  it("the action re-checks authorization rather than trusting the page", () => {
    const actions = readFileSync(`${ROUTE_DIR}/actions.ts`, "utf8");
    expect(actions).toMatch(/requirePortalUser\(\s*ASSESSING_ROLES\s*\)/);
  });

  it("no client component imports the gate or the env module", () => {
    // gate.ts reads server env. `server-only` is not a dependency here (see
    // src/config/ailment-reference.ts), so this assertion is the enforcement.
    const clientFiles = sourceFiles(SRC_DIR).filter((file) =>
      /^\s*["']use client["'];/.test(readFileSync(file, "utf8")),
    );
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from\s+["']@\/lib\/rx-intake\/gate["']/);
      expect(source, file).not.toMatch(/from\s+["']@\/env["']/);
    }
  });
});

describe("no autonomous disposition", () => {
  it("the parser can only ever emit requires_human_review", () => {
    const parser = readFileSync(`${LIB_DIR}/parser.ts`, "utf8");
    const statuses = parser.match(/status:\s*"([a-z_]+)"/g) ?? [];
    expect(statuses).toEqual(['status: "requires_human_review"']);
  });

  it("requiresHumanReview is pinned as a literal in the contract", () => {
    // A z.boolean() here would let a future edit ship an auto-accept path that
    // still type-checks. z.literal(true) makes that a compile error.
    const contract = readFileSync(`${LIB_DIR}/contract.ts`, "utf8");
    expect(contract).toMatch(/requiresHumanReview:\s*z\.literal\(true\)/);
    expect(contract).toMatch(/synthetic:\s*z\.literal\(true\)/);
  });
});

describe("the corpus stays synthetic", () => {
  it("uses only reserved 555-01xx phone numbers", () => {
    // Per-fixture, not every fixture: `unidentified-008` deliberately carries no
    // contact number, because a missing clinic identifier is one of the
    // integrity indicators the corpus has to exercise. The rule is that any
    // phone present must be reserved — not that one must be present.
    let total = 0;
    for (const fixture of RX_CORPUS) {
      const phones = fixture.text.match(/[0-9OolI]{3}[\s\-.][0-9OolI]{3}[\s\-.][0-9OolI]{4}/g) ?? [];
      total += phones.length;
      for (const phone of phones) {
        expect(phone, `${fixture.id} → ${phone}`).toMatch(/555[\s\-.]01\d{2}$/);
      }
    }
    // Guards the loop above from passing vacuously if the regex ever stops matching.
    expect(total).toBeGreaterThan(0);
  });

  it("uses only CPSO numbers in the unissued 99xxxx range", () => {
    for (const fixture of RX_CORPUS) {
      const licence = fixture.expected.prescriberLicence;
      if (!licence) continue;
      // Normalise the OCR-confused characters before the range check.
      const normalised = licence.replace(/[Oo]/g, "0").replace(/[lI]/g, "1");
      expect(normalised, fixture.id).toMatch(/^99\d{4}$/);
    }
  });

  it("keeps every fixture id unique", () => {
    const ids = RX_CORPUS.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
