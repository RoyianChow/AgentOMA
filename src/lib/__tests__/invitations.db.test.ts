import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

/**
 * Invitation-only onboarding against REAL Postgres: token hashing, expiry,
 * the atomic single-use claim (including a two-caller race), and that the
 * created credential rows are the ones better-auth's sign-in verifies.
 */
vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
});

import { makeTestDb, resetOperationalTables, type TestDb } from "@/lib/db/test/harness";

const PHARMACY_ID = "00000000-0000-0000-0000-0000000000aa";
const OTHER_PHARMACY_ID = "00000000-0000-0000-0000-0000000000ab";
let db: TestDb;
let close: () => Promise<void>;
let adminId: string;

async function insertUser(
  role: string,
  email: string,
  pharmacyId: string = PHARMACY_ID,
): Promise<string> {
  const rows = await db.execute<{ id: string }>(sql`
    insert into "user" (name, email, role, pharmacy_id)
    values ('Seeded User', ${email}, ${role}::user_role, ${pharmacyId}::uuid)
    returning id
  `);
  return (rows as unknown as { id: string }[])[0].id;
}

beforeAll(() => {
  const t = makeTestDb();
  db = t.db;
  close = t.close;
});
afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await resetOperationalTables(db);
  await db.execute(sql`
    insert into pharmacy (id, store_name, odb_fee_tier_code)
    values
      (${PHARMACY_ID}::uuid, 'Invite Test Pharmacy', 'regular_8_83'),
      (${OTHER_PHARMACY_ID}::uuid, 'Other Pharmacy', 'regular_8_83')
    on conflict (id) do nothing
  `);
  adminId = await insertUser("pharmacy_admin", "admin@example.com");
});

describe("issueInvitation", () => {
  it("stores only the token hash, never the raw token", async () => {
    const { issueInvitation, hashInvitationToken } = await import("../invitations");
    const res = await issueInvitation({
      pharmacyId: PHARMACY_ID,
      invitedByUserId: adminId,
      email: "New.Pharmacist@Example.com",
      role: "pharmacist",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const rows = (await db.execute<{ token_hash: string; email: string }>(
      sql`select token_hash, email from invitation`,
    )) as unknown as { token_hash: string; email: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(hashInvitationToken(res.token));
    expect(rows[0].token_hash).not.toContain(res.token);
    expect(rows[0].email).toBe("new.pharmacist@example.com"); // normalized
  });

  it("refuses an intern invitation without a supervising pharmacist", async () => {
    const { issueInvitation } = await import("../invitations");
    const res = await issueInvitation({
      pharmacyId: PHARMACY_ID,
      invitedByUserId: adminId,
      email: "intern@example.com",
      role: "intern",
    });
    expect(res).toMatchObject({ ok: false, reason: "SUPERVISOR_REQUIRED" });
  });

  it("refuses a supervisor from another pharmacy or a non-pharmacist supervisor", async () => {
    const { issueInvitation } = await import("../invitations");
    const outsidePharmacist = await insertUser(
      "pharmacist",
      "outside@example.com",
      OTHER_PHARMACY_ID,
    );
    const technician = await insertUser("technician", "tech@example.com");

    for (const supervisingPharmacistId of [outsidePharmacist, technician]) {
      const res = await issueInvitation({
        pharmacyId: PHARMACY_ID,
        invitedByUserId: adminId,
        email: "student@example.com",
        role: "student",
        supervisingPharmacistId,
      });
      expect(res).toMatchObject({ ok: false, reason: "SUPERVISOR_INVALID" });
    }
  });
});

describe("acceptInvitation", () => {
  async function issue(role: "pharmacist" | "intern" = "pharmacist") {
    const { issueInvitation } = await import("../invitations");
    const supervisor =
      role === "intern"
        ? await insertUser("pharmacist", `supervisor-${Date.now()}@example.com`)
        : null;
    const res = await issueInvitation({
      pharmacyId: PHARMACY_ID,
      invitedByUserId: adminId,
      email: "invitee@example.com",
      role,
      supervisingPharmacistId: supervisor,
    });
    if (!res.ok) throw new Error(`issue failed: ${res.reason}`);
    return { ...res, supervisor };
  }

  it("creates the user with the invitation's role/pharmacy/supervisor and a credential account better-auth can verify", async () => {
    const { acceptInvitation } = await import("../invitations");
    const { verifyPassword } = await import("better-auth/crypto");
    const { token, supervisor } = await issue("intern");

    const res = await acceptInvitation({
      token,
      name: "Ivy Intern",
      password: "correct-horse-battery",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const users = (await db.execute<{
      role: string;
      pharmacy_id: string;
      supervising_pharmacist_id: string;
      email: string;
    }>(
      sql`select role, pharmacy_id, supervising_pharmacist_id, email from "user" where id = ${res.userId}::uuid`,
    )) as unknown as {
      role: string;
      pharmacy_id: string;
      supervising_pharmacist_id: string;
      email: string;
    }[];
    expect(users[0]).toMatchObject({
      role: "intern",
      pharmacy_id: PHARMACY_ID,
      supervising_pharmacist_id: supervisor,
      email: "invitee@example.com",
    });

    const accounts = (await db.execute<{ provider_id: string; password: string }>(
      sql`select provider_id, password from account where user_id = ${res.userId}::uuid`,
    )) as unknown as { provider_id: string; password: string }[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0].provider_id).toBe("credential");
    // The stored hash is exactly what better-auth's sign-in verifies.
    await expect(
      verifyPassword({ hash: accounts[0].password, password: "correct-horse-battery" }),
    ).resolves.toBe(true);

    const invites = (await db.execute<{ used_at: string; used_by_user_id: string }>(
      sql`select used_at, used_by_user_id from invitation`,
    )) as unknown as { used_at: string; used_by_user_id: string }[];
    expect(invites[0].used_at).not.toBeNull();
    expect(invites[0].used_by_user_id).toBe(res.userId);
  });

  it("refuses a token that matches nothing", async () => {
    const { acceptInvitation } = await import("../invitations");
    const res = await acceptInvitation({
      token: "not-a-real-token",
      name: "X",
      password: "long-enough-password",
    });
    expect(res).toMatchObject({ ok: false, reason: "INVALID_TOKEN" });
  });

  it("refuses an expired invitation and creates no user", async () => {
    const { acceptInvitation } = await import("../invitations");
    const { token } = await issue();
    await db.execute(sql`update invitation set expires_at = now() - interval '1 minute'`);

    const res = await acceptInvitation({
      token,
      name: "Late Larry",
      password: "long-enough-password",
    });
    expect(res).toMatchObject({ ok: false, reason: "EXPIRED" });

    const users = (await db.execute<{ n: number }>(
      sql`select count(*)::int as n from "user" where email = 'invitee@example.com'`,
    )) as unknown as { n: number }[];
    expect(users[0].n).toBe(0);
  });

  it("single-use: two concurrent accepts — exactly one wins, exactly one user exists", async () => {
    const { acceptInvitation } = await import("../invitations");
    const { token } = await issue();

    const [a, b] = await Promise.all([
      acceptInvitation({ token, name: "First", password: "long-enough-password" }),
      acceptInvitation({ token, name: "Second", password: "long-enough-password" }),
    ]);

    const outcomes = [a.ok, b.ok].sort();
    expect(outcomes).toEqual([false, true]);
    const loser = a.ok ? b : a;
    expect(loser).toMatchObject({ ok: false, reason: "ALREADY_USED" });

    const users = (await db.execute<{ n: number }>(
      sql`select count(*)::int as n from "user" where email = 'invitee@example.com'`,
    )) as unknown as { n: number }[];
    expect(users[0].n).toBe(1);
  });

  it("refuses a password below the better-auth minimum", async () => {
    const { acceptInvitation } = await import("../invitations");
    const { token } = await issue();
    const res = await acceptInvitation({ token, name: "Shorty", password: "short" });
    expect(res).toMatchObject({ ok: false, reason: "PASSWORD_TOO_SHORT" });
  });
});
