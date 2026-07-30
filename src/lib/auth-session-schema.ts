import { z } from "zod";

const externalSessionUserSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(500),
    email: z.email().max(320),
    role: z.string().nullable().optional(),
    pharmacyId: z.uuid().nullable().optional(),
    twoFactorEnabled: z.boolean().nullable().optional(),
    supervisingPharmacistId: z.uuid().nullable().optional(),
  })
  .passthrough();

/**
 * The minimum Better Auth response shape consumed by the authorization guard.
 * Unknown provider-owned fields are retained, but malformed trusted fields
 * fail closed before portal authorization decisions are made.
 */
export const externalSessionResponseSchema = z
  .object({
    user: externalSessionUserSchema,
  })
  .passthrough();
