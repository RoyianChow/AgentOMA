import { z } from "zod";

export const invitationRoleSchema = z.enum([
  "pharmacy_admin",
  "pharmacist",
  "intern",
  "student",
  "technician",
]);

export const issueInvitationActionSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(320)),
    role: invitationRoleSchema,
    supervisingPharmacistId: z.uuid().nullable().optional(),
  })
  .strict();

export const issueInvitationSchema = issueInvitationActionSchema.extend({
  invitedByUserId: z.uuid(),
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1).max(200),
    name: z.string().trim().min(1).max(200),
    password: z.string().min(12).max(512),
  })
  .strict();
