import { describe, expect, it, vi } from "vitest";

import {
  TASK04_DELEGATED_BOOKING_ACTIONS,
  TASK04_SYNTHETIC_DELEGATION_FIXTURE_VERSION,
  evaluateTask04SyntheticDelegation,
  task04SyntheticDelegationFixture,
  type Task04SyntheticDelegationAuthority,
} from "../booking/synthetic-delegation-fixtures";
import {
  TASK04_APPROVAL_DECISION_VERSION,
  TASK04_SANDBOX_EXPIRES_AT,
} from "../env/server";

function authority(
  overrides: Partial<Task04SyntheticDelegationAuthority> = {},
): Task04SyntheticDelegationAuthority {
  return {
    actorType: "synthetic_delegate",
    actorReference: "SYNTH-DELEGATE-TASK04-0001",
    subjectType: "synthetic_patient",
    subjectReference: "SYNTH-PATIENT-TASK04-0001",
    pharmacyId: "SYNTH-PHARMACY-TASK04-LOCAL",
    bookingLineageReference:
      "SYNTH-BOOKING-LINEAGE-TASK04-0001",
    requestedAction: "booking:view",
    trustedNowUtc: "2026-08-02T12:00:00.000Z",
    sandboxInstanceId: "SYNTH-TASK04-POSTGRES",
    approvalDecisionVersion:
      TASK04_APPROVAL_DECISION_VERSION,
    sandboxLifecycleExpiresAtUtc:
      TASK04_SANDBOX_EXPIRES_AT,
    approvalActive: true,
    lifecycleActive: true,
    ...overrides,
  };
}

const denied = { authorized: false };
const authorized = { authorized: true };

function expectMinimizedDenial(result: unknown): void {
  expect(result).toEqual(denied);
  expect(Object.keys(result as object)).toEqual(["authorized"]);
  expect(JSON.stringify(result)).not.toMatch(
    /scenario|reason|fixture|actor|subject|pharmacy|lineage|expiry|scope/i,
  );
}

describe("Task 04 deterministic synthetic delegation fixtures", () => {
  it("authorizes every approved booking-management action only when all trusted bindings match", () => {
    const active = task04SyntheticDelegationFixture("active");
    expect(active).toMatchObject({
      fixtureContractVersion:
        TASK04_SYNTHETIC_DELEGATION_FIXTURE_VERSION,
      permittedActions: TASK04_DELEGATED_BOOKING_ACTIONS,
    });

    for (const requestedAction of TASK04_DELEGATED_BOOKING_ACTIONS) {
      expect(
        evaluateTask04SyntheticDelegation(
          active,
          authority({ requestedAction }),
        ),
      ).toEqual(authorized);
    }
  });

  it("uses trusted time with an exclusive expiry boundary", () => {
    const expired = task04SyntheticDelegationFixture("expired");
    expect(
      evaluateTask04SyntheticDelegation(
        expired,
        authority({ trustedNowUtc: "2026-08-02T23:59:59.999Z" }),
      ),
    ).toEqual(authorized);
    expect(
      evaluateTask04SyntheticDelegation(
        expired,
        authority({ trustedNowUtc: "2026-08-03T00:00:00.000Z" }),
      ),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(
        expired,
        authority({ trustedNowUtc: "2026-08-03T00:00:00.001Z" }),
      ),
    ).toEqual(denied);
  });

  it("denies revoked, wrong-subject, and wrong-scope fixtures generically", () => {
    for (const scenario of [
      "revoked",
      "wrong_subject",
      "wrong_scope",
    ] as const) {
      expect(
        evaluateTask04SyntheticDelegation(
          task04SyntheticDelegationFixture(scenario),
          authority(),
        ),
      ).toEqual(denied);
    }
  });

  it.each([
    [
      "actor",
      { actorReference: "SYNTH-DELEGATE-TASK04-WRONG-0001" },
    ],
    [
      "subject",
      { subjectReference: "SYNTH-PATIENT-TASK04-WRONG-0001" },
    ],
    ["pharmacy", { pharmacyId: "SYNTH-PHARMACY-TASK04-OTHER" }],
    [
      "booking lineage",
      {
        bookingLineageReference:
          "SYNTH-BOOKING-LINEAGE-TASK04-OTHER",
      },
    ],
    [
      "sandbox instance",
      { sandboxInstanceId: "SYNTH-TASK04-OTHER-INSTANCE" },
    ],
    [
      "lifecycle expiry",
      {
        sandboxLifecycleExpiresAtUtc:
          "2026-08-04T23:59:59.999Z",
      },
    ],
  ] as const)(
    "denies a wrong authoritative %s with the same minimized result",
    (_label, overrides) => {
      expect(
        evaluateTask04SyntheticDelegation(
          task04SyntheticDelegationFixture("active"),
          authority(overrides),
        ),
      ).toEqual(denied);
    },
  );

  it("fails closed for inactive approval/lifecycle, unsupported actions, unknown scenarios, and contradictory fixtures", () => {
    const active = task04SyntheticDelegationFixture("active");
    expect(
      evaluateTask04SyntheticDelegation(active, {
        ...authority(),
        approvalActive: false,
      }),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(active, {
        ...authority(),
        lifecycleActive: false,
      }),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(active, {
        ...authority(),
        requestedAction: "booking:confirm",
      }),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(active, {
        ...authority(),
        approvalDecisionVersion: "unapproved",
      }),
    ).toEqual(denied);
    expect(task04SyntheticDelegationFixture("unknown")).toBeUndefined();
    expect(
      evaluateTask04SyntheticDelegation(
        {
          ...active,
          scenario: "revoked",
          revokedAtUtc: null,
        },
        authority(),
      ),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(
        {
          ...active,
          permittedActions: [
            ...TASK04_DELEGATED_BOOKING_ACTIONS,
            "booking:confirm",
          ],
        },
        authority(),
      ),
    ).toEqual(denied);
    expect(
      evaluateTask04SyntheticDelegation(
        { ...active },
        authority(),
      ),
    ).toEqual(denied);
  });

  it("rejects serialized, copied, altered-prototype, proxied, and version-forged fixture lookalikes", () => {
    const authentic = task04SyntheticDelegationFixture("active")!;
    const serializedCopy = JSON.parse(
      JSON.stringify(authentic),
    ) as unknown;
    const fieldCopy = {
      ...authentic,
      permittedActions: [...authentic.permittedActions],
    };
    const alteredPrototype = Object.assign(
      Object.create({ fixtureAuthority: "forged" }) as object,
      fieldCopy,
    );
    const proxiedCopy = new Proxy(fieldCopy, {});
    const forgedVersion = {
      ...fieldCopy,
      fixtureContractVersion:
        "TASK04_SYNTHETIC_DELEGATION_FIXTURE_FORGED",
    };

    for (const forged of [
      serializedCopy,
      fieldCopy,
      alteredPrototype,
      proxiedCopy,
      forgedVersion,
    ]) {
      expectMinimizedDenial(
        evaluateTask04SyntheticDelegation(
          forged,
          authority(),
        ),
      );
    }
  });

  it("keeps authentic fixtures and their nested action arrays immutable", () => {
    const authentic = task04SyntheticDelegationFixture("active")!;
    const originalPrototype = Object.getPrototypeOf(authentic);
    const originalActions = [...authentic.permittedActions];

    expect(Object.isFrozen(authentic)).toBe(true);
    expect(Object.isFrozen(authentic.permittedActions)).toBe(true);
    expect(
      Reflect.set(
        authentic as object,
        "scenario",
        "revoked",
      ),
    ).toBe(false);
    expect(
      Reflect.set(
        authentic.permittedActions as unknown as object,
        "0",
        "booking:confirm",
      ),
    ).toBe(false);
    expect(
      Reflect.set(
        authentic as object,
        "permittedActions",
        [...TASK04_DELEGATED_BOOKING_ACTIONS, "booking:confirm"],
      ),
    ).toBe(false);
    expect(
      Reflect.setPrototypeOf(authentic as object, {
        fixtureAuthority: "forged",
      }),
    ).toBe(false);

    expect(authentic.scenario).toBe("active");
    expect(authentic.permittedActions).toEqual(originalActions);
    expect(Object.getPrototypeOf(authentic)).toBe(originalPrototype);
    expect(
      evaluateTask04SyntheticDelegation(authentic, authority()),
    ).toEqual(authorized);
    expect(
      evaluateTask04SyntheticDelegation(authentic, {
        ...authority(),
        requestedAction: "booking:confirm",
      }),
    ).toEqual(denied);
  });

  it.each([
    "booking:confirm",
    "queue:read",
    "waitlist:view",
    "*",
    "production:booking:cancel",
    "unknown:permission",
  ])("denies prohibited permission %s with the exact minimized result", (requestedAction) => {
    expectMinimizedDenial(
      evaluateTask04SyntheticDelegation(
        task04SyntheticDelegationFixture("active"),
        {
          ...authority(),
          requestedAction,
        },
      ),
    );
  });

  it("returns only minimized results and writes no logs", () => {
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "debug").mockImplementation(() => undefined),
    ];
    try {
      const success = evaluateTask04SyntheticDelegation(
        task04SyntheticDelegationFixture("active"),
        authority(),
      );
      const failures = [
        evaluateTask04SyntheticDelegation(
          task04SyntheticDelegationFixture("expired"),
          authority({
            trustedNowUtc: "2026-08-03T00:00:00.000Z",
          }),
        ),
        ...(["revoked", "wrong_subject", "wrong_scope"] as const).map(
          (scenario) =>
            evaluateTask04SyntheticDelegation(
              task04SyntheticDelegationFixture(scenario),
              authority(),
            ),
        ),
        evaluateTask04SyntheticDelegation(
          task04SyntheticDelegationFixture("active"),
          {
            ...authority(),
            requestedAction: "booking:confirm",
          },
        ),
      ];
      expect(Object.keys(success)).toEqual(["authorized"]);
      expect(JSON.stringify(success)).not.toMatch(
        /fixture|actor|subject|pharmacy|lineage|expiry|scope/i,
      );
      expect(
        new Set(failures.map((failure) => JSON.stringify(failure))),
      ).toEqual(
        new Set([JSON.stringify(denied)]),
      );
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});
