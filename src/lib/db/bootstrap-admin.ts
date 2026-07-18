// One-off, operator-run bootstrap for the FIRST pharmacy_admin. Everyone after
// the first admin arrives via invitation (src/lib/invitations.ts) — this exists
// only because an invitation needs an admin to issue it.
//
//   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... \
//   BOOTSTRAP_ADMIN_NAME="..." BOOTSTRAP_PHARMACY_ID=<uuid> \
//   npm run auth:bootstrap-admin
//
// Credentials come from the operator's environment for this single run — they
// are never hardcoded, never seeded, never logged. Refuses if the email exists.
// The new admin still has to enroll TOTP on first sign-in before any portal
// action will run (requirePortalUser).
import "dotenv/config";

import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { db } from "./index";
import { pharmacy } from "./schema";
import { user } from "./schema/auth";
import { createCredentialUser } from "../invitations";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const pharmacyId = process.env.BOOTSTRAP_PHARMACY_ID?.trim();

  if (!email || !password || !name || !pharmacyId) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_PHARMACY_ID."
    );
  }
  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const [ph] = await db
    .select({ id: pharmacy.id, storeName: pharmacy.storeName })
    .from(pharmacy)
    .where(eq(pharmacy.id, pharmacyId))
    .limit(1);
  if (!ph) throw new Error(`No pharmacy with id ${pharmacyId}.`);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) throw new Error(`A user with email ${email} already exists.`);

  const passwordHash = await hashPassword(password);
  const created = await db.transaction((tx) =>
    createCredentialUser(tx, {
      name,
      email,
      passwordHash,
      role: "pharmacy_admin",
      pharmacyId,
    })
  );

  console.log(
    `pharmacy_admin ${created.id} created for "${ph.storeName}". ` +
      "They must enroll TOTP on first sign-in."
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
