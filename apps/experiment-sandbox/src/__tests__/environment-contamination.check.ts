import { describe, expect, it } from "vitest";

import { loadTask04SandboxEnv } from "../env/server";

// Runtime authorization check, deliberately kept OUT of the main suite.
//
// The main suite is hermetic: cases that need a successful environment load
// supply a controlled input record, so they answer "is the code correct?". This
// file answers the separate question "is the environment this command is
// actually running in clean?" — the one that must still fail closed when vendor
// credentials or other prohibited variables are present.
//
// Run it with `npm run sandbox:verify-environment`. It is excluded from
// `sandbox:test` and `sandbox:verify` on purpose: a contaminated shell is an
// operator finding, not a code defect, and conflating the two is what let an
// environment problem read as a Task 04 test failure in the first place.
//
// The instant is pinned inside the approved Task 04 window so this command
// reports contamination only, never approval expiry — those are separate
// findings with separate remedies.
const PROBE_INSTANT = "2026-08-04T12:00:00.000Z";

/**
 * Returns the name of a prohibited variable present in the real environment.
 *
 * assertEnvironmentIsAllowed() is the only authority consulted; nothing about
 * the prohibited set is duplicated here, so this cannot drift from the guard.
 * It rejects one variable at a time and this check reads the real environment
 * only through the sanctioned validator, so a contaminated shell is cleared one
 * re-run at a time. Only the key NAME is returned — values are never read,
 * logged, or reported.
 */
function prohibitedVariableName(): string | undefined {
  try {
    loadTask04SandboxEnv({ now: new Date(PROBE_INSTANT) });
    return undefined;
  } catch (failure) {
    const message =
      failure instanceof Error ? failure.message : String(failure);
    const match =
      /^SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:(.+)$/.exec(message);
    // Anything else is a genuine configuration anomaly, not contamination.
    // Surface it rather than reporting a clean environment.
    if (match === null) throw failure;
    return match[1];
  }
}

describe("Task 04 real execution environment", () => {
  it("carries no prohibited variables", () => {
    expect(
      prohibitedVariableName(),
      "A prohibited variable is set in this environment. Unset it and re-run; the guard reports one variable per run.",
    ).toBeUndefined();
  });
});
