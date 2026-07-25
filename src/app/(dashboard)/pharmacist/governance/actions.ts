"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePortalUser } from "@/lib/auth-guard";
import {
  addRecordCorrection,
  createAccessCorrectionRequest,
  decideAccessCorrectionRequest,
  executeDestruction,
  placeRecordHold,
  prepareDestructionDryRun,
  recordRestoreDrill,
  releaseRecordHold,
} from "@/lib/governance";

const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(2_000);

function value(formData: FormData, key: string): unknown {
  return formData.get(key);
}

async function admin() {
  // proxy.ts is UX only. Every governance mutation re-verifies the live
  // session, configured pharmacy, TOTP, and pharmacy_admin role here.
  return requirePortalUser(["pharmacy_admin"]);
}

export async function startExportAction(formData: FormData): Promise<never> {
  await admin();
  const patientId = uuid.parse(value(formData, "patientId"));
  redirect(`/pharmacist/governance/patient/${patientId}/export`);
}

export async function placeHoldAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const input = z
    .object({
      patientId: uuid,
      recordType: z.string().trim().max(80).optional(),
      recordId: z.union([uuid, z.literal("")]).optional(),
      reason: text,
    })
    .parse({
      patientId: value(formData, "patientId"),
      recordType: value(formData, "recordType") || undefined,
      recordId: value(formData, "recordId") || undefined,
      reason: value(formData, "reason"),
    });
  await placeRecordHold(actor, {
    ...input,
    recordType: input.recordType || undefined,
    recordId: input.recordId || undefined,
  });
  revalidatePath("/pharmacist/governance");
}

export async function releaseHoldAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const parsed = z
    .object({ holdId: uuid, releaseReason: text })
    .parse({
      holdId: value(formData, "holdId"),
      releaseReason: value(formData, "releaseReason"),
    });
  await releaseRecordHold(actor, parsed.holdId, parsed.releaseReason);
  revalidatePath("/pharmacist/governance");
}

export async function createRequestAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const input = z
    .object({
      patientId: uuid,
      requestKind: z.enum(["access", "correction"]),
      requesterType: z.enum([
        "patient",
        "substitute_decision_maker",
        "legal_representative",
      ]),
      requesterDescription: z.string().trim().max(500).optional(),
      identityVerificationMethod: text,
      scope: text,
    })
    .parse({
      patientId: value(formData, "patientId"),
      requestKind: value(formData, "requestKind"),
      requesterType: value(formData, "requesterType"),
      requesterDescription: value(formData, "requesterDescription") || undefined,
      identityVerificationMethod: value(formData, "identityVerificationMethod"),
      scope: value(formData, "scope"),
    });
  await createAccessCorrectionRequest(actor, input);
  revalidatePath("/pharmacist/governance");
}

export async function decideRequestAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const input = z
    .object({
      requestId: uuid,
      status: z.enum([
        "approved",
        "partially_approved",
        "denied",
        "fulfilled",
        "withdrawn",
      ]),
      decision: text,
    })
    .parse({
      requestId: value(formData, "requestId"),
      status: value(formData, "status"),
      decision: value(formData, "decision"),
    });
  await decideAccessCorrectionRequest(actor, input);
  revalidatePath("/pharmacist/governance");
}

export async function addCorrectionAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const rawPatch = text.parse(value(formData, "patch"));
  const parsedPatch: unknown = JSON.parse(rawPatch);
  const patch = z.record(z.string(), z.unknown()).parse(parsedPatch);
  const input = z
    .object({
      requestId: uuid,
      targetEntityType: z.enum([
        "patient",
        "assessment",
        "claim_draft",
        "intake_session",
      ]),
      targetEntityId: uuid,
      reason: text,
      supersedesCorrectionId: z.union([uuid, z.literal("")]).optional(),
    })
    .parse({
      requestId: value(formData, "requestId"),
      targetEntityType: value(formData, "targetEntityType"),
      targetEntityId: value(formData, "targetEntityId"),
      reason: value(formData, "reason"),
      supersedesCorrectionId:
        value(formData, "supersedesCorrectionId") || undefined,
    });
  await addRecordCorrection(actor, {
    ...input,
    patch,
    supersedesCorrectionId: input.supersedesCorrectionId || undefined,
  });
  revalidatePath("/pharmacist/governance");
}

export async function prepareDestructionAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const patientId = uuid.parse(value(formData, "patientId"));
  await prepareDestructionDryRun(actor, patientId);
  revalidatePath("/pharmacist/governance");
}

export async function executeDestructionAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const runId = uuid.parse(value(formData, "runId"));
  await executeDestruction(actor, runId);
  revalidatePath("/pharmacist/governance");
}

export async function recordRestoreDrillAction(formData: FormData): Promise<void> {
  const actor = await admin();
  const input = z
    .object({
      backupIdentifier: text,
      isolatedEnvironment: text,
      status: z.enum(["planned", "running", "passed", "failed"]),
      evidenceLocation: z.string().trim().max(1_000).optional(),
      startedAt: z.coerce.date(),
      completedAt: z.coerce.date().optional(),
    })
    .parse({
      backupIdentifier: value(formData, "backupIdentifier"),
      isolatedEnvironment: value(formData, "isolatedEnvironment"),
      status: value(formData, "status"),
      evidenceLocation: value(formData, "evidenceLocation") || undefined,
      startedAt: value(formData, "startedAt"),
      completedAt: value(formData, "completedAt") || undefined,
    });
  await recordRestoreDrill(actor, input);
  revalidatePath("/pharmacist/governance");
}
