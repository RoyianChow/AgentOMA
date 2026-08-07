"use server";

import { ASSESSING_ROLES, AuthorizationError, requirePortalUser } from "@/lib/auth-guard";
import { rxExtractionRequestSchema, type RxExtraction } from "@/lib/rx-intake/contract";
import { findFixture } from "@/lib/rx-intake/corpus";
import {
  assertRxIntakeEnabled,
  RX_GATE_MESSAGES,
  RxCapabilityDisabledError,
} from "@/lib/rx-intake/gate";
import { extractPrescription } from "@/lib/rx-intake/parser";

/**
 * The single server entry point for AI-RX-06.
 *
 * Order matters. The capability gate runs BEFORE the auth guard so that a
 * disabled experiment is indistinguishable from one that was never built — a
 * switched-off capability should not confirm its own existence to an
 * unauthenticated caller, and the kill switch should not depend on a session
 * lookup succeeding.
 *
 * Note what this action does NOT do: it takes no document, writes no row, emits
 * no audit event, and returns no billing value. It maps a fixture id to a parsed
 * draft and stops. `deriveClaimDraft`, the assessment tables, and the audit log
 * are all deliberately absent from this file's imports, and the boundary test
 * asserts they stay absent.
 */

export type RxExtractionResult =
  | { ok: true; extraction: RxExtraction }
  | { ok: false; message: string };

export async function extractSyntheticPrescriptionAction(
  input: unknown,
): Promise<RxExtractionResult> {
  try {
    assertRxIntakeEnabled();
  } catch (error) {
    if (error instanceof RxCapabilityDisabledError) {
      return { ok: false, message: RX_GATE_MESSAGES[error.reason] };
    }
    throw error;
  }

  try {
    // Same roles that may complete an assessment. An intern, student, or
    // technician has no reason to be exercising an unchartered AI experiment.
    await requirePortalUser(ASSESSING_ROLES);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: "Not authorized." };
    }
    throw error;
  }

  const parsed = rxExtractionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid request." };
  }

  // The only accepted input is an id that resolves against the built-in corpus.
  // An id that does not match is refused outright — there is no fallback that
  // would let caller-supplied text reach the parser.
  const fixture = findFixture(parsed.data.corpusFixtureId);
  if (!fixture) {
    return { ok: false, message: "Unknown synthetic fixture." };
  }

  return { ok: true, extraction: extractPrescription(fixture) };
}
