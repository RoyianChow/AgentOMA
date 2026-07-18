import { createHash, randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { db } from "@/lib/db";
import { account, invitation, user } from "@/lib/db/schema/auth";
import type { PortalRole } from "@/lib/auth-guard";

/**
 * Invitation-only onboarding. Public signup is disabled entirely
 * (emailAndPassword.disableSignUp in src/lib/auth.ts); the ONLY way a user
 * comes to exist is a pharmacy admin issuing an invitation and the invitee
 * accepting it here.
 *
 * Token handling: the raw token exists only in the issuance return value (the
 * admin hands it to the invitee); the database stores its SHA-256 hash. A
 * database leak therefore leaks no usable invitations.
 *
 * The authorization check (pharmacy_admin only) lives in the "use server"
 * wrapper that calls issueInvitation — these functions take the already
 * verified actor as input so the token/transaction semantics stay unit-testable
 * against real Postgres.
 */

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Matches better-auth's minPasswordLength in src/lib/auth.ts. */
const MIN_PASSWORD_LENGTH = 12;

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type IssueRefusal =
  | { ok: false; reason: "SUPERVISOR_REQUIRED"; message: string }
  | { ok: false; reason: "SUPERVISOR_INVALID"; message: string }
  | { ok: false; reason: "EMAIL_IN_USE"; message: string };

export type IssueResult =
  | { ok: true; invitationId: string; token: string; expiresAt: Date }
  | IssueRefusal;

export async function issueInvitation(params: {
  pharmacyId: string;
  invitedByUserId: string;
  email: string;
  role: PortalRole;
  supervisingPharmacistId?: string | null;
}): Promise<IssueResult> {
  const email = params.email.trim().toLowerCase();
  const needsSupervisor = params.role === "intern" || params.role === "student";
  const supervisorId = params.supervisingPharmacistId ?? null;

  if (needsSupervisor && !supervisorId) {
    return {
      ok: false,
      reason: "SUPERVISOR_REQUIRED",
      message:
        "Interns and students must be linked to a supervising pharmacist — the supervisor's OCP number is the one that goes on a claim.",
    };
  }

  if (supervisorId) {
    const [supervisor] = await db
      .select({ id: user.id, role: user.role, pharmacyId: user.pharmacyId })
      .from(user)
      .where(eq(user.id, supervisorId))
      .limit(1);
    const supervisorOk =
      supervisor &&
      supervisor.pharmacyId === params.pharmacyId &&
      (supervisor.role === "pharmacist" || supervisor.role === "pharmacy_admin");
    if (!supervisorOk) {
      return {
        ok: false,
        reason: "SUPERVISOR_INVALID",
        message:
          "The supervising pharmacist must be a pharmacist (or pharmacist admin) at this pharmacy.",
      };
    }
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      reason: "EMAIL_IN_USE",
      message: "A user with this email already exists.",
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const [row] = await db
    .insert(invitation)
    .values({
      pharmacyId: params.pharmacyId,
      email,
      role: params.role,
      supervisingPharmacistId: needsSupervisor ? supervisorId : null,
      tokenHash: hashInvitationToken(token),
      invitedByUserId: params.invitedByUserId,
      expiresAt,
    })
    .returning({ id: invitation.id });

  return { ok: true, invitationId: row.id, token, expiresAt };
}

export type AcceptRefusal =
  | "INVALID_TOKEN"
  | "EXPIRED"
  | "ALREADY_USED"
  | "EMAIL_IN_USE"
  | "PASSWORD_TOO_SHORT";

export type AcceptResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: AcceptRefusal; message: string };

export async function acceptInvitation(params: {
  token: string;
  name: string;
  password: string;
}): Promise<AcceptResult> {
  if (params.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: "PASSWORD_TOO_SHORT",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const name = params.name.trim();
  if (!name) {
    return { ok: false, reason: "INVALID_TOKEN", message: "Name is required." };
  }

  const tokenHash = hashInvitationToken(params.token);
  const [invite] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.tokenHash, tokenHash))
    .limit(1);

  if (!invite) {
    return {
      ok: false,
      reason: "INVALID_TOKEN",
      message: "This invitation link is not valid.",
    };
  }
  if (invite.usedAt) {
    return {
      ok: false,
      reason: "ALREADY_USED",
      message: "This invitation has already been used.",
    };
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      reason: "EXPIRED",
      message: "This invitation has expired — ask your pharmacy admin for a new one.",
    };
  }

  // Same scrypt hash better-auth verifies at /sign-in/email.
  const passwordHash = await hashPassword(params.password);

  try {
    return await db.transaction(async (tx) => {
      // Atomic single-use claim: whichever concurrent accept updates the row
      // first wins; everyone else matches zero rows and refuses.
      const claimed = await tx
        .update(invitation)
        .set({ usedAt: new Date() })
        .where(and(eq(invitation.id, invite.id), isNull(invitation.usedAt)))
        .returning({ id: invitation.id });
      if (claimed.length === 0) {
        return {
          ok: false as const,
          reason: "ALREADY_USED" as const,
          message: "This invitation has already been used.",
        };
      }

      const created = await createCredentialUser(tx, {
        name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        pharmacyId: invite.pharmacyId,
        supervisingPharmacistId: invite.supervisingPharmacistId,
      });

      await tx
        .update(invitation)
        .set({ usedByUserId: created.id })
        .where(eq(invitation.id, invite.id));

      return { ok: true as const, userId: created.id, email: invite.email };
    });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return {
        ok: false,
        reason: "EMAIL_IN_USE",
        message: "A user with this email already exists.",
      };
    }
    throw err;
  }
}

type Dbish = Pick<typeof db, "insert">;

/**
 * User + credential-account rows in better-auth's own shape (providerId
 * "credential", accountId = user id, scrypt password hash) so the normal
 * /sign-in/email flow verifies them. Shared by acceptInvitation and the
 * one-off first-admin bootstrap (src/lib/db/bootstrap-admin.ts).
 */
export async function createCredentialUser(
  tx: Dbish,
  params: {
    name: string;
    email: string;
    passwordHash: string;
    role: PortalRole;
    pharmacyId: string;
    supervisingPharmacistId?: string | null;
  }
): Promise<{ id: string }> {
  const [created] = await tx
    .insert(user)
    .values({
      name: params.name,
      email: params.email,
      emailVerified: false,
      role: params.role,
      pharmacyId: params.pharmacyId,
      supervisingPharmacistId: params.supervisingPharmacistId ?? null,
    })
    .returning({ id: user.id });

  await tx.insert(account).values({
    accountId: created.id,
    providerId: "credential",
    userId: created.id,
    password: params.passwordHash,
  });

  return created;
}

/** Drizzle wraps driver errors; the SQLSTATE lives on `.cause`. */
function pgErrorCode(err: unknown): string | undefined {
  let cursor: unknown = err;
  while (cursor && typeof cursor === "object") {
    const code = (cursor as { code?: unknown }).code;
    if (typeof code === "string") return code;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return undefined;
}
