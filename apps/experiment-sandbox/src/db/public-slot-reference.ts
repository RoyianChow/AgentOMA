import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { z } from "zod";

import { TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS } from "../booking/config";
import {
  appointmentModalitySchema,
  opaqueReferenceSchema,
  sandboxPharmacyIdSchema,
  utcInstantSchema,
} from "../booking/contracts";
import { task04PublicSlotReferenceSecretSchema } from "../env/server";

// Public slot references are SIGNED rather than stored.
//
// The alternative — mint a random token and keep a lookup row — needs a table
// that grows with every availability view and has to be swept. Here the
// reference carries its own binding and expiry, and the server's secret is what
// makes it trustworthy: nothing is written when one is issued, and nothing has
// to be cleaned up when one lapses.
//
// It also means no database identifier is ever exposed. What the caller holds
// is opaque, self-describing to the server only, and useless anywhere else.
//
// The version byte is what allows the format to change later: an old reference
// stays recognisable and can be rejected precisely, instead of being
// misinterpreted as a malformed reference of the current shape.
const SLOT_REFERENCE_VERSION = 1;
const SLOT_REFERENCE_NONCE_BYTES = 16;
const SLOT_REFERENCE_EXPIRY_BYTES = 8;
const SLOT_REFERENCE_SIGNATURE_BYTES = 32;
const SLOT_REFERENCE_BYTES =
  1 +
  SLOT_REFERENCE_EXPIRY_BYTES +
  SLOT_REFERENCE_NONCE_BYTES +
  SLOT_REFERENCE_SIGNATURE_BYTES;
const SLOT_REFERENCE_CONTRACT =
  "TASK04_PUBLIC_SLOT_REFERENCE_V1";
const SERVICE_CATEGORY_REFERENCE_CONTRACT =
  "TASK04_PUBLIC_SERVICE_CATEGORY_REFERENCE_V1";
const AVAILABILITY_CURSOR_CONTRACT =
  "TASK04_PUBLIC_AVAILABILITY_CURSOR_V1";
const AVAILABILITY_CURSOR_BYTES =
  1 + 4 + SLOT_REFERENCE_SIGNATURE_BYTES;

const slotBindingSchema = z
  .object({
    slotId: opaqueReferenceSchema,
    serviceCategoryId: opaqueReferenceSchema,
    modality: appointmentModalitySchema,
  })
  .strict();

const slotResolutionRequestSchema = z
  .object({
    slotReference: opaqueReferenceSchema,
  })
  .strict();

const publicReferenceLifecycleSchema = z
  .object({
    sandboxInstanceId: z
      .string()
      .regex(/^SYNTH-[A-Z0-9-]{3,64}$/),
    approvalDecisionVersion: z.string().min(1).max(96),
    lifecycleExpiresAtUtc: utcInstantSchema,
  })
  .strict();

export type Task04PublicSlotBinding = z.infer<
  typeof slotBindingSchema
>;
export type Task04PublicSlotResolutionRequest = z.infer<
  typeof slotResolutionRequestSchema
>;

export type Task04IssuedPublicSlotReference = Readonly<{
  slotReference: string;
  expiresAtUtc: string;
}>;

export type Task04ResolvedPublicSlot = Readonly<{
  slotId: string;
  serviceCategoryId: string;
  modality: z.infer<typeof appointmentModalitySchema>;
}>;

type ParsedSlotReference = Readonly<{
  expiryMilliseconds: number;
  nonce: Buffer;
  signature: Buffer;
}>;

function slotReferenceDenied(): never {
  throw new Error("TASK04_SLOT_REFERENCE_DENIED");
}

function parseTrustedInstant(value: string): number {
  const parsed = utcInstantSchema.safeParse(value);
  if (!parsed.success) return slotReferenceDenied();
  return Date.parse(parsed.data);
}

/**
 * Builds the exact bytes that get signed. Every field here is one a caller
 * must not be able to change after issue.
 *
 * An ARRAY, not an object: array serialization has a fixed field order, so one
 * set of values produces exactly one string. Object key order is not guaranteed
 * to be stable, and a signature over an ambiguously serialized payload can be
 * verified against a different reading of the same bytes.
 *
 * The contract string is a domain separator. Slot references, service-category
 * references and availability cursors are all signed with the same secret, so
 * without it a value minted as one could be presented as another.
 *
 * pharmacyId is included even though the app serves a single pharmacy: it means
 * a reference is cryptographically bound to its tenant rather than only being
 * checked against one, which keeps the invariant true by construction if a
 * second pharmacy ever exists.
 *
 * The expiry is INSIDE the signed payload rather than carried beside it, so a
 * caller cannot extend the lifetime of a reference they already hold. The nonce
 * makes two references for the same slot and deadline differ, so they cannot be
 * correlated or guessed from one another.
 */
function canonicalSignatureInput(
  pharmacyId: string,
  binding: Task04PublicSlotBinding,
  expiryMilliseconds: number,
  nonce: Uint8Array,
): string {
  return JSON.stringify([
    SLOT_REFERENCE_CONTRACT,
    pharmacyId,
    binding.slotId,
    binding.serviceCategoryId,
    binding.modality,
    expiryMilliseconds,
    Buffer.from(nonce).toString("base64url"),
  ]);
}

function createSlotReferenceSignature(
  secret: string,
  pharmacyId: string,
  binding: Task04PublicSlotBinding,
  expiryMilliseconds: number,
  nonce: Uint8Array,
): Buffer {
  return createHmac("sha256", secret)
    .update(
      canonicalSignatureInput(
        pharmacyId,
        binding,
        expiryMilliseconds,
        nonce,
      ),
      "utf8",
    )
    .digest();
}

function createServiceCategoryReferenceSignature(
  secret: string,
  pharmacyId: string,
  serviceCategoryId: string,
  lifecycle: z.infer<typeof publicReferenceLifecycleSchema>,
): Buffer {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([
        SERVICE_CATEGORY_REFERENCE_CONTRACT,
        pharmacyId,
        serviceCategoryId,
        lifecycle.sandboxInstanceId,
        lifecycle.approvalDecisionVersion,
        lifecycle.lifecycleExpiresAtUtc,
      ]),
      "utf8",
    )
    .digest();
}

function createAvailabilityCursorSignature(
  secret: string,
  pharmacyId: string,
  queryFingerprint: string,
  offset: number,
): Buffer {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([
        AVAILABILITY_CURSOR_CONTRACT,
        pharmacyId,
        queryFingerprint,
        offset,
      ]),
      "utf8",
    )
    .digest();
}

/**
 * Compares signatures in constant time.
 *
 * A plain === or Buffer.equals returns as soon as two bytes differ, so how long
 * the comparison takes reveals how many leading bytes were right. Repeated
 * often enough that leak lets a signature be reconstructed a byte at a time
 * without ever knowing the secret.
 *
 * The length check is deliberately kept OUTSIDE the constant-time comparison —
 * timingSafeEqual throws on mismatched lengths, and length is not the secret
 * here: the format is fixed and public, so a wrong-length reference is already
 * known-invalid to anyone who can read this file.
 */
export function task04ConstantTimeSignatureMatches(
  candidate: Uint8Array,
  expected: Uint8Array,
): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.byteLength === expectedBuffer.byteLength &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

function parseSlotReference(reference: string): ParsedSlotReference {
  const parsedReference = opaqueReferenceSchema.safeParse(reference);
  if (!parsedReference.success) return slotReferenceDenied();
  let bytes: Buffer;
  try {
    bytes = Buffer.from(parsedReference.data, "base64url");
  } catch {
    return slotReferenceDenied();
  }
  if (
    bytes.byteLength !== SLOT_REFERENCE_BYTES ||
    bytes.toString("base64url") !== parsedReference.data ||
    bytes.readUInt8(0) !== SLOT_REFERENCE_VERSION
  ) {
    return slotReferenceDenied();
  }
  const expiryBigInt = bytes.readBigUInt64BE(1);
  if (expiryBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    return slotReferenceDenied();
  }
  const expiryMilliseconds = Number(expiryBigInt);
  const nonceStart = 1 + SLOT_REFERENCE_EXPIRY_BYTES;
  const signatureStart = nonceStart + SLOT_REFERENCE_NONCE_BYTES;
  return Object.freeze({
    expiryMilliseconds,
    nonce: bytes.subarray(nonceStart, signatureStart),
    signature: bytes.subarray(signatureStart),
  });
}

export function createTask04PublicSlotReferenceService(input: {
  pharmacyId: string;
  secret: string;
  ttlSeconds: number;
  sandboxInstanceId: string;
  approvalDecisionVersion: string;
  lifecycleExpiresAtUtc: string;
}) {
  const pharmacy = sandboxPharmacyIdSchema.safeParse(input.pharmacyId);
  const secret = task04PublicSlotReferenceSecretSchema.safeParse(
    input.secret,
  );
  const lifecycle = publicReferenceLifecycleSchema.safeParse({
    sandboxInstanceId: input.sandboxInstanceId,
    approvalDecisionVersion: input.approvalDecisionVersion,
    lifecycleExpiresAtUtc: input.lifecycleExpiresAtUtc,
  });
  if (
    !pharmacy.success ||
    !secret.success ||
    !lifecycle.success ||
    input.ttlSeconds !==
      TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS
  ) {
    return slotReferenceDenied();
  }
  const verifiedPharmacyId = pharmacy.data;
  const verifiedSecret = secret.data;
  const verifiedLifecycle = lifecycle.data;

  function issueServiceCategoryReference(
    serviceCategoryIdInput: unknown,
    trustedNowUtc: string,
  ): string {
    const serviceCategoryId = opaqueReferenceSchema.safeParse(
      serviceCategoryIdInput,
    );
    const trustedNow = parseTrustedInstant(trustedNowUtc);
    if (
      !serviceCategoryId.success ||
      trustedNow >=
        Date.parse(verifiedLifecycle.lifecycleExpiresAtUtc)
    ) {
      return slotReferenceDenied();
    }
    return createServiceCategoryReferenceSignature(
      verifiedSecret,
      verifiedPharmacyId,
      serviceCategoryId.data,
      verifiedLifecycle,
    ).toString("base64url");
  }

  function resolveServiceCategoryReference(
    referenceInput: unknown,
    candidateIds: readonly unknown[],
    trustedNowUtc: string,
  ): string {
    const reference = opaqueReferenceSchema.safeParse(referenceInput);
    const trustedNow = parseTrustedInstant(trustedNowUtc);
    if (
      !reference.success ||
      trustedNow >=
        Date.parse(verifiedLifecycle.lifecycleExpiresAtUtc)
    ) {
      return slotReferenceDenied();
    }
    let signature: Buffer;
    try {
      signature = Buffer.from(reference.data, "base64url");
    } catch {
      return slotReferenceDenied();
    }
    if (
      signature.byteLength !== SLOT_REFERENCE_SIGNATURE_BYTES ||
      signature.toString("base64url") !== reference.data
    ) {
      return slotReferenceDenied();
    }
    const matches: string[] = [];
    for (const candidateInput of candidateIds) {
      const candidate =
        opaqueReferenceSchema.safeParse(candidateInput);
      if (!candidate.success) continue;
      const expected = createServiceCategoryReferenceSignature(
        verifiedSecret,
        verifiedPharmacyId,
        candidate.data,
        verifiedLifecycle,
      );
      if (task04ConstantTimeSignatureMatches(signature, expected)) {
        matches.push(candidate.data);
      }
    }
    if (matches.length !== 1 || !matches[0]) {
      return slotReferenceDenied();
    }
    return matches[0];
  }

  function issueAvailabilityCursor(
    queryFingerprint: string,
    offset: number,
  ): string {
    if (
      !/^[a-f0-9]{64}$/.test(queryFingerprint) ||
      !Number.isSafeInteger(offset) ||
      offset <= 0 ||
      offset > 0xffff_ffff
    ) {
      return slotReferenceDenied();
    }
    const bytes = Buffer.alloc(AVAILABILITY_CURSOR_BYTES);
    bytes.writeUInt8(SLOT_REFERENCE_VERSION, 0);
    bytes.writeUInt32BE(offset, 1);
    createAvailabilityCursorSignature(
      verifiedSecret,
      verifiedPharmacyId,
      queryFingerprint,
      offset,
    ).copy(bytes, 5);
    return bytes.toString("base64url");
  }

  function resolveAvailabilityCursor(
    referenceInput: unknown,
    queryFingerprint: string,
  ): number {
    const reference = opaqueReferenceSchema.safeParse(referenceInput);
    if (
      !reference.success ||
      !/^[a-f0-9]{64}$/.test(queryFingerprint)
    ) {
      return slotReferenceDenied();
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(reference.data, "base64url");
    } catch {
      return slotReferenceDenied();
    }
    if (
      bytes.byteLength !== AVAILABILITY_CURSOR_BYTES ||
      bytes.toString("base64url") !== reference.data ||
      bytes.readUInt8(0) !== SLOT_REFERENCE_VERSION
    ) {
      return slotReferenceDenied();
    }
    const offset = bytes.readUInt32BE(1);
    const expected = createAvailabilityCursorSignature(
      verifiedSecret,
      verifiedPharmacyId,
      queryFingerprint,
      offset,
    );
    if (
      offset <= 0 ||
      !task04ConstantTimeSignatureMatches(
        bytes.subarray(5),
        expected,
      )
    ) {
      return slotReferenceDenied();
    }
    return offset;
  }

  function issue(
    bindingInput: unknown,
    trustedNowUtc: string,
    deterministicNonce?: Uint8Array,
  ): Task04IssuedPublicSlotReference {
    const binding = slotBindingSchema.safeParse(bindingInput);
    const nowMilliseconds = parseTrustedInstant(trustedNowUtc);
    const nonce =
      deterministicNonce === undefined
        ? randomBytes(SLOT_REFERENCE_NONCE_BYTES)
        : Buffer.from(deterministicNonce);
    if (
      !binding.success ||
      nonce.byteLength !== SLOT_REFERENCE_NONCE_BYTES
    ) {
      return slotReferenceDenied();
    }
    const expiryMilliseconds =
      nowMilliseconds + input.ttlSeconds * 1_000;
    const signature = createSlotReferenceSignature(
      verifiedSecret,
      verifiedPharmacyId,
      binding.data,
      expiryMilliseconds,
      nonce,
    );
    const bytes = Buffer.alloc(SLOT_REFERENCE_BYTES);
    bytes.writeUInt8(SLOT_REFERENCE_VERSION, 0);
    bytes.writeBigUInt64BE(BigInt(expiryMilliseconds), 1);
    Buffer.from(nonce).copy(
      bytes,
      1 + SLOT_REFERENCE_EXPIRY_BYTES,
    );
    signature.copy(
      bytes,
      1 +
        SLOT_REFERENCE_EXPIRY_BYTES +
        SLOT_REFERENCE_NONCE_BYTES,
    );
    return Object.freeze({
      slotReference: bytes.toString("base64url"),
      expiresAtUtc: new Date(expiryMilliseconds).toISOString(),
    });
  }

  function resolve(
    requestInput: unknown,
    candidatesInput: readonly unknown[],
    trustedNowUtc: string,
  ): Task04ResolvedPublicSlot {
    const request =
      slotResolutionRequestSchema.safeParse(requestInput);
    const nowMilliseconds = parseTrustedInstant(trustedNowUtc);
    if (!request.success) return slotReferenceDenied();
    const reference = parseSlotReference(
      request.data.slotReference,
    );
    if (reference.expiryMilliseconds <= nowMilliseconds) {
      return slotReferenceDenied();
    }

    const matches: Task04PublicSlotBinding[] = [];
    for (const candidateInput of candidatesInput) {
      const candidate = slotBindingSchema.safeParse(candidateInput);
      if (!candidate.success) continue;
      const expectedSignature = createSlotReferenceSignature(
        verifiedSecret,
        verifiedPharmacyId,
        candidate.data,
        reference.expiryMilliseconds,
        reference.nonce,
      );
      if (
        task04ConstantTimeSignatureMatches(
          reference.signature,
          expectedSignature,
        )
      ) {
        matches.push(candidate.data);
      }
    }
    if (matches.length !== 1 || !matches[0]) {
      return slotReferenceDenied();
    }
    return Object.freeze({
      slotId: matches[0].slotId,
      serviceCategoryId: matches[0].serviceCategoryId,
      modality: matches[0].modality,
    });
  }

  return Object.freeze({
    issue,
    resolve,
    issueServiceCategoryReference,
    resolveServiceCategoryReference,
    issueAvailabilityCursor,
    resolveAvailabilityCursor,
  });
}
