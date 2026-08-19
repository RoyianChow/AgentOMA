import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

import {
  opaqueReferenceSchema,
  sandboxPharmacyIdSchema,
} from "../booking/contracts";
import { task04PublicSlotReferenceSecretSchema } from "../env/server";

const QUEUE_REFERENCE_VERSION = 2;
const QUEUE_CURSOR_NONCE_BYTES = 12;
const QUEUE_CURSOR_AUTH_TAG_BYTES = 16;
const QUEUE_CURSOR_INSTANT_BYTES = 27;
const QUEUE_CURSOR_BOOKING_LENGTH_BYTES = 1;
const QUEUE_CURSOR_MIN_BOOKING_BYTES = 16;
const QUEUE_ITEM_CONTRACT =
  "TASK04_PHARMACIST_QUEUE_ITEM_REFERENCE_V1";
const QUEUE_CURSOR_CONTRACT =
  "TASK04_PHARMACIST_QUEUE_CURSOR_V2";
const QUEUE_CURSOR_KEY_CONTRACT =
  "TASK04_PHARMACIST_QUEUE_CURSOR_KEY_V2";
const queueCursorInstantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export type Task04PharmacistQueueCursorBoundary = Readonly<{
  orderingInstantUtc: string;
  bookingId: string;
}>;

function queueReferenceDenied(): never {
  throw new Error("TASK04_QUEUE_REFERENCE_DENIED");
}

function queueCursorInstantIsValid(value: string): boolean {
  if (!queueCursorInstantPattern.test(value)) return false;
  const millisecondInstant = `${value.slice(0, 23)}Z`;
  const parsed = new Date(millisecondInstant);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString() === millisecondInstant
  );
}

function itemSignature(
  secret: string,
  pharmacyId: string,
  bookingId: string,
): Buffer {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([
        QUEUE_ITEM_CONTRACT,
        pharmacyId,
        bookingId,
      ]),
      "utf8",
    )
    .digest();
}

function cursorSignature(
  secret: string,
  pharmacyId: string,
  queryFingerprint: string,
): Buffer {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([
        QUEUE_CURSOR_CONTRACT,
        pharmacyId,
        queryFingerprint,
      ]),
      "utf8",
    )
    .digest();
}

function cursorEncryptionKey(secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(QUEUE_CURSOR_KEY_CONTRACT, "utf8")
    .digest();
}

function cursorAdditionalData(
  secret: string,
  pharmacyId: string,
  queryFingerprint: string,
): Buffer {
  return cursorSignature(secret, pharmacyId, queryFingerprint);
}

function encodeCursorBoundary(
  boundaryInput: Task04PharmacistQueueCursorBoundary,
): Buffer {
  const bookingId = opaqueReferenceSchema.safeParse(
    boundaryInput.bookingId,
  );
  if (
    !bookingId.success ||
    !queueCursorInstantIsValid(
      boundaryInput.orderingInstantUtc,
    )
  ) {
    return queueReferenceDenied();
  }
  const instantBytes = Buffer.from(
    boundaryInput.orderingInstantUtc,
    "utf8",
  );
  const bookingBytes = Buffer.from(bookingId.data, "utf8");
  if (
    instantBytes.byteLength !== QUEUE_CURSOR_INSTANT_BYTES ||
    bookingBytes.byteLength > 0xff
  ) {
    return queueReferenceDenied();
  }
  return Buffer.concat([
    instantBytes,
    Buffer.from([bookingBytes.byteLength]),
    bookingBytes,
  ]);
}

function decodeCursorBoundary(
  plaintext: Buffer,
): Task04PharmacistQueueCursorBoundary {
  const minimumBytes =
    QUEUE_CURSOR_INSTANT_BYTES +
    QUEUE_CURSOR_BOOKING_LENGTH_BYTES;
  if (plaintext.byteLength <= minimumBytes) {
    return queueReferenceDenied();
  }
  const bookingLength = plaintext.readUInt8(
    QUEUE_CURSOR_INSTANT_BYTES,
  );
  if (plaintext.byteLength !== minimumBytes + bookingLength) {
    return queueReferenceDenied();
  }
  const orderingInstantUtc = plaintext
    .subarray(0, QUEUE_CURSOR_INSTANT_BYTES)
    .toString("utf8");
  const bookingId = plaintext
    .subarray(minimumBytes)
    .toString("utf8");
  if (
    !queueCursorInstantIsValid(orderingInstantUtc) ||
    !opaqueReferenceSchema.safeParse(bookingId).success
  ) {
    return queueReferenceDenied();
  }
  return Object.freeze({ orderingInstantUtc, bookingId });
}

export function createTask04PharmacistQueueReferenceService(
  input: Readonly<{
    pharmacyId: string;
    secret: string;
  }>,
) {
  const pharmacy = sandboxPharmacyIdSchema.safeParse(
    input.pharmacyId,
  );
  const secret = task04PublicSlotReferenceSecretSchema.safeParse(
    input.secret,
  );
  if (!pharmacy.success || !secret.success) {
    return queueReferenceDenied();
  }
  const pharmacyId = pharmacy.data;
  const verifiedSecret = secret.data;
  const encryptionKey = cursorEncryptionKey(verifiedSecret);

  function issueQueueItemReference(
    bookingIdInput: unknown,
  ): string {
    const bookingId =
      opaqueReferenceSchema.safeParse(bookingIdInput);
    if (!bookingId.success) return queueReferenceDenied();
    return itemSignature(
      verifiedSecret,
      pharmacyId,
      bookingId.data,
    ).toString("base64url");
  }

  function issueCursor(
    queryFingerprint: string,
    boundary: Task04PharmacistQueueCursorBoundary,
  ): string {
    if (!/^[a-f0-9]{64}$/.test(queryFingerprint)) {
      return queueReferenceDenied();
    }
    const plaintext = encodeCursorBoundary(boundary);
    const nonce = randomBytes(QUEUE_CURSOR_NONCE_BYTES);
    const cipher = createCipheriv(
      "aes-256-gcm",
      encryptionKey,
      nonce,
      { authTagLength: QUEUE_CURSOR_AUTH_TAG_BYTES },
    );
    cipher.setAAD(
      cursorAdditionalData(
        verifiedSecret,
        pharmacyId,
        queryFingerprint,
      ),
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    return Buffer.concat([
      Buffer.from([QUEUE_REFERENCE_VERSION]),
      nonce,
      ciphertext,
      cipher.getAuthTag(),
    ]).toString("base64url");
  }

  function resolveCursor(
    cursorInput: unknown,
    queryFingerprint: string,
  ): Task04PharmacistQueueCursorBoundary {
    if (
      typeof cursorInput !== "string" ||
      cursorInput.length < 16 ||
      cursorInput.length > 320 ||
      !/^[A-Za-z0-9_-]+$/.test(cursorInput) ||
      !/^[a-f0-9]{64}$/.test(queryFingerprint)
    ) {
      return queueReferenceDenied();
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(cursorInput, "base64url");
    } catch {
      return queueReferenceDenied();
    }
    const minimumBytes =
      1 +
      QUEUE_CURSOR_NONCE_BYTES +
      QUEUE_CURSOR_AUTH_TAG_BYTES +
      QUEUE_CURSOR_INSTANT_BYTES +
      QUEUE_CURSOR_BOOKING_LENGTH_BYTES +
      QUEUE_CURSOR_MIN_BOOKING_BYTES;
    if (
      bytes.byteLength < minimumBytes ||
      bytes.toString("base64url") !== cursorInput ||
      bytes.readUInt8(0) !== QUEUE_REFERENCE_VERSION
    ) {
      return queueReferenceDenied();
    }
    const nonceStart = 1;
    const ciphertextStart =
      nonceStart + QUEUE_CURSOR_NONCE_BYTES;
    const authTagStart =
      bytes.byteLength - QUEUE_CURSOR_AUTH_TAG_BYTES;
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        bytes.subarray(nonceStart, ciphertextStart),
        { authTagLength: QUEUE_CURSOR_AUTH_TAG_BYTES },
      );
      decipher.setAAD(
        cursorAdditionalData(
          verifiedSecret,
          pharmacyId,
          queryFingerprint,
        ),
      );
      decipher.setAuthTag(bytes.subarray(authTagStart));
      return decodeCursorBoundary(
        Buffer.concat([
          decipher.update(
            bytes.subarray(ciphertextStart, authTagStart),
          ),
          decipher.final(),
        ]),
      );
    } catch {
      return queueReferenceDenied();
    }
  }

  return Object.freeze({
    issueQueueItemReference,
    issueCursor,
    resolveCursor,
  });
}
