import { z } from "zod";

import {
  opaqueReferenceSchema,
  sandboxPharmacyIdSchema,
  utcInstantSchema,
} from "./contracts";
import {
  TASK04_APPROVAL_DECISION_VERSION,
  TASK04_SANDBOX_EXPIRES_AT,
} from "../env/server";

export const TASK04_SYNTHETIC_DELEGATION_FIXTURE_VERSION =
  "TASK04_SYNTHETIC_DELEGATION_FIXTURE_V1" as const;

export const TASK04_SYNTHETIC_DELEGATION_SCENARIOS = [
  "active",
  "expired",
  "revoked",
  "wrong_subject",
  "wrong_scope",
] as const;

export const TASK04_DELEGATED_BOOKING_ACTIONS = [
  "booking:view",
  "booking:reschedule",
  "booking:cancel",
] as const;

const task04SyntheticDelegationScenarioSchema = z.enum(
  TASK04_SYNTHETIC_DELEGATION_SCENARIOS,
);
const task04DelegatedBookingActionSchema = z.enum(
  TASK04_DELEGATED_BOOKING_ACTIONS,
);
const task04ApprovalDecisionVersionSchema = z.literal(
  TASK04_APPROVAL_DECISION_VERSION,
);

const task04SyntheticDelegationFixtureSchema = z
  .object({
    fixtureContractVersion: z.literal(
      TASK04_SYNTHETIC_DELEGATION_FIXTURE_VERSION,
    ),
    scenario: task04SyntheticDelegationScenarioSchema,
    actorType: z.literal("synthetic_delegate"),
    actorReference: opaqueReferenceSchema,
    subjectType: z.literal("synthetic_patient"),
    subjectReference: opaqueReferenceSchema,
    pharmacyId: sandboxPharmacyIdSchema,
    bookingLineageReference: opaqueReferenceSchema,
    permittedActions: z
      .array(task04DelegatedBookingActionSchema)
      .min(1)
      .max(TASK04_DELEGATED_BOOKING_ACTIONS.length)
      .refine((values) => new Set(values).size === values.length),
    validFromUtc: utcInstantSchema,
    expiresAtUtc: utcInstantSchema,
    revokedAtUtc: utcInstantSchema.nullable(),
    sandboxInstanceId: opaqueReferenceSchema,
    approvalDecisionVersion:
      task04ApprovalDecisionVersionSchema,
    sandboxLifecycleExpiresAtUtc: utcInstantSchema,
  })
  .strict();

const task04SyntheticDelegationAuthoritySchema = z
  .object({
    actorType: z.literal("synthetic_delegate"),
    actorReference: opaqueReferenceSchema,
    subjectType: z.literal("synthetic_patient"),
    subjectReference: opaqueReferenceSchema,
    pharmacyId: sandboxPharmacyIdSchema,
    bookingLineageReference: opaqueReferenceSchema,
    requestedAction: task04DelegatedBookingActionSchema,
    trustedNowUtc: utcInstantSchema,
    sandboxInstanceId: opaqueReferenceSchema,
    approvalDecisionVersion:
      task04ApprovalDecisionVersionSchema,
    sandboxLifecycleExpiresAtUtc: utcInstantSchema,
    approvalActive: z.literal(true),
    lifecycleActive: z.literal(true),
  })
  .strict();

export type Task04SyntheticDelegationFixture = z.infer<
  typeof task04SyntheticDelegationFixtureSchema
>;

export type Task04SyntheticDelegationAuthority = z.infer<
  typeof task04SyntheticDelegationAuthoritySchema
>;

export type Task04SyntheticDelegationResult =
  | Readonly<{ authorized: true }>
  | Readonly<{ authorized: false }>;

const AUTHORIZED = Object.freeze({ authorized: true as const });
const DENIED = Object.freeze({ authorized: false as const });

const ACTIVE_ACTOR = "SYNTH-DELEGATE-TASK04-0001";
const ACTIVE_SUBJECT = "SYNTH-PATIENT-TASK04-0001";
const WRONG_SUBJECT = "SYNTH-PATIENT-TASK04-WRONG-0001";
const ACTIVE_PHARMACY = "SYNTH-PHARMACY-TASK04-LOCAL";
const WRONG_PHARMACY = "SYNTH-PHARMACY-TASK04-OTHER";
const ACTIVE_LINEAGE = "SYNTH-BOOKING-LINEAGE-TASK04-0001";
const WRONG_LINEAGE = "SYNTH-BOOKING-LINEAGE-TASK04-OTHER";
const SANDBOX_INSTANCE = "SYNTH-TASK04-POSTGRES";
const VALID_FROM_UTC = "2026-08-01T00:00:00.000Z";
const ACTIVE_EXPIRY_UTC = "2026-08-05T23:59:59.999Z";
const EXPIRED_EXPIRY_UTC = "2026-08-03T00:00:00.000Z";
const REVOKED_AT_UTC = "2026-08-02T00:00:00.000Z";

function fixture(
  input: Pick<
    Task04SyntheticDelegationFixture,
    | "scenario"
    | "subjectReference"
    | "pharmacyId"
    | "bookingLineageReference"
    | "expiresAtUtc"
    | "revokedAtUtc"
  >,
): Task04SyntheticDelegationFixture {
  const parsed = task04SyntheticDelegationFixtureSchema.parse({
    fixtureContractVersion:
      TASK04_SYNTHETIC_DELEGATION_FIXTURE_VERSION,
    scenario: input.scenario,
    actorType: "synthetic_delegate",
    actorReference: ACTIVE_ACTOR,
    subjectType: "synthetic_patient",
    subjectReference: input.subjectReference,
    pharmacyId: input.pharmacyId,
    bookingLineageReference: input.bookingLineageReference,
    permittedActions: [...TASK04_DELEGATED_BOOKING_ACTIONS],
    validFromUtc: VALID_FROM_UTC,
    expiresAtUtc: input.expiresAtUtc,
    revokedAtUtc: input.revokedAtUtc,
    sandboxInstanceId: SANDBOX_INSTANCE,
    approvalDecisionVersion:
      TASK04_APPROVAL_DECISION_VERSION,
    sandboxLifecycleExpiresAtUtc:
      TASK04_SANDBOX_EXPIRES_AT,
  });
  Object.freeze(parsed.permittedActions);
  return Object.freeze(parsed);
}

const FIXTURES = Object.freeze({
  active: Object.freeze(
    fixture({
      scenario: "active",
      subjectReference: ACTIVE_SUBJECT,
      pharmacyId: ACTIVE_PHARMACY,
      bookingLineageReference: ACTIVE_LINEAGE,
      expiresAtUtc: ACTIVE_EXPIRY_UTC,
      revokedAtUtc: null,
    }),
  ),
  expired: Object.freeze(
    fixture({
      scenario: "expired",
      subjectReference: ACTIVE_SUBJECT,
      pharmacyId: ACTIVE_PHARMACY,
      bookingLineageReference: ACTIVE_LINEAGE,
      expiresAtUtc: EXPIRED_EXPIRY_UTC,
      revokedAtUtc: null,
    }),
  ),
  revoked: Object.freeze(
    fixture({
      scenario: "revoked",
      subjectReference: ACTIVE_SUBJECT,
      pharmacyId: ACTIVE_PHARMACY,
      bookingLineageReference: ACTIVE_LINEAGE,
      expiresAtUtc: ACTIVE_EXPIRY_UTC,
      revokedAtUtc: REVOKED_AT_UTC,
    }),
  ),
  wrong_subject: Object.freeze(
    fixture({
      scenario: "wrong_subject",
      subjectReference: WRONG_SUBJECT,
      pharmacyId: ACTIVE_PHARMACY,
      bookingLineageReference: ACTIVE_LINEAGE,
      expiresAtUtc: ACTIVE_EXPIRY_UTC,
      revokedAtUtc: null,
    }),
  ),
  wrong_scope: Object.freeze(
    fixture({
      scenario: "wrong_scope",
      subjectReference: ACTIVE_SUBJECT,
      pharmacyId: WRONG_PHARMACY,
      bookingLineageReference: WRONG_LINEAGE,
      expiresAtUtc: ACTIVE_EXPIRY_UTC,
      revokedAtUtc: null,
    }),
  ),
} satisfies Record<
  (typeof TASK04_SYNTHETIC_DELEGATION_SCENARIOS)[number],
  Task04SyntheticDelegationFixture
>);
const SERVER_OWNED_FIXTURES = new WeakSet<object>(
  Object.values(FIXTURES),
);

export function task04SyntheticDelegationFixture(
  scenarioInput: unknown,
): Task04SyntheticDelegationFixture | undefined {
  const scenario =
    task04SyntheticDelegationScenarioSchema.safeParse(
      scenarioInput,
    );
  return scenario.success ? FIXTURES[scenario.data] : undefined;
}

function fixtureStateIsConsistent(
  fixtureValue: Task04SyntheticDelegationFixture,
): boolean {
  const revoked = fixtureValue.revokedAtUtc !== null;
  return (
    (fixtureValue.scenario === "revoked") === revoked &&
    Date.parse(fixtureValue.validFromUtc) <
      Date.parse(fixtureValue.expiresAtUtc) &&
    Date.parse(fixtureValue.expiresAtUtc) <=
      Date.parse(fixtureValue.sandboxLifecycleExpiresAtUtc)
  );
}

export function evaluateTask04SyntheticDelegation(
  fixtureInput: unknown,
  authorityInput: unknown,
): Task04SyntheticDelegationResult {
  if (
    typeof fixtureInput !== "object" ||
    fixtureInput === null ||
    !SERVER_OWNED_FIXTURES.has(fixtureInput)
  ) {
    return DENIED;
  }
  const fixtureValue =
    task04SyntheticDelegationFixtureSchema.safeParse(fixtureInput);
  const authority =
    task04SyntheticDelegationAuthoritySchema.safeParse(
      authorityInput,
    );
  if (
    !fixtureValue.success ||
    !authority.success ||
    !fixtureStateIsConsistent(fixtureValue.data)
  ) {
    return DENIED;
  }

  const trustedNow = Date.parse(authority.data.trustedNowUtc);
  if (
    fixtureValue.data.revokedAtUtc !== null ||
    trustedNow < Date.parse(fixtureValue.data.validFromUtc) ||
    trustedNow >= Date.parse(fixtureValue.data.expiresAtUtc) ||
    trustedNow >=
      Date.parse(authority.data.sandboxLifecycleExpiresAtUtc) ||
    fixtureValue.data.actorType !== authority.data.actorType ||
    fixtureValue.data.actorReference !==
      authority.data.actorReference ||
    fixtureValue.data.subjectType !== authority.data.subjectType ||
    fixtureValue.data.subjectReference !==
      authority.data.subjectReference ||
    fixtureValue.data.pharmacyId !== authority.data.pharmacyId ||
    fixtureValue.data.bookingLineageReference !==
      authority.data.bookingLineageReference ||
    !fixtureValue.data.permittedActions.includes(
      authority.data.requestedAction,
    ) ||
    fixtureValue.data.sandboxInstanceId !==
      authority.data.sandboxInstanceId ||
    fixtureValue.data.approvalDecisionVersion !==
      authority.data.approvalDecisionVersion ||
    fixtureValue.data.sandboxLifecycleExpiresAtUtc !==
      authority.data.sandboxLifecycleExpiresAtUtc
  ) {
    return DENIED;
  }

  return AUTHORIZED;
}
