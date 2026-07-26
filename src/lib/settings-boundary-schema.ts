import { z } from "zod";

export const prescriberIdentitySettingsSchema = z
  .object({
    ocpNumber: z.string().trim().max(20),
    isAsOfRight: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.isAsOfRight && !/^\d{4,7}$/.test(value.ocpNumber)) {
      context.addIssue({
        code: "custom",
        path: ["ocpNumber"],
        message: "Invalid prescriber identifier.",
      });
    }
  });

const trimmed = (maximum: number) => z.string().trim().max(maximum);
const required = (maximum: number) => trimmed(maximum).min(1);

export const pharmacySettingsBoundarySchema = z
  .object({
    storeName: required(200),
    hnsAccountId: trimmed(200),
    odbFeeTier: required(100),
    addressLine1: required(300),
    addressLine2: trimmed(300),
    city: required(200),
    province: required(100),
    postalCode: required(32),
    phone: required(64),
  })
  .strict();
