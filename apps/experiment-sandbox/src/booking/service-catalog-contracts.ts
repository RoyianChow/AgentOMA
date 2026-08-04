import { z } from "zod";

import {
  APPOINTMENT_MODALITIES,
  appointmentModalitySchema,
  opaqueReferenceSchema,
} from "./contracts";

export const TASK04_SERVICE_CATALOG_PROJECTION_VERSION =
  "TASK04_PUBLIC_SERVICE_CATALOG_V1" as const;

// Synthetic implementation guards only. These values are not production
// policy and must not be silently converted into pagination or truncation.
export const TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS = 12 as const;
export const TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_RESPONSE_BYTES =
  2_048 as const;

export const task04ServiceCatalogRequestSchema = z.object({}).strict();

const task04PublicServiceLabelSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => value === value.trim());

const task04SupportedModalitiesSchema = z
  .array(appointmentModalitySchema)
  .min(1)
  .max(APPOINTMENT_MODALITIES.length)
  .superRefine((values, context) => {
    if (
      new Set(values).size !== values.length ||
      values.some(
        (value, index) =>
          APPOINTMENT_MODALITIES.indexOf(value) <=
          APPOINTMENT_MODALITIES.indexOf(values[index - 1]!),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "TASK04_INVALID_SERVICE_CATALOG_MODALITIES",
      });
    }
  });

export const task04ServiceCatalogItemSchema = z
  .object({
    serviceCategoryRef: opaqueReferenceSchema,
    serviceCategoryLabel: task04PublicServiceLabelSchema,
    supportedModalities: task04SupportedModalitiesSchema,
  })
  .strict();

export const task04ServiceCatalogResponseDataSchema = z
  .object({
    items: z
      .array(task04ServiceCatalogItemSchema)
      .max(TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS),
  })
  .strict();

export const task04ServiceCatalogSuccessSchema = z
  .object({
    success: z.literal(true),
    data: task04ServiceCatalogResponseDataSchema,
  })
  .strict();

export type Task04ServiceCatalogRequest = z.infer<
  typeof task04ServiceCatalogRequestSchema
>;
export type Task04ServiceCatalogItem = z.infer<
  typeof task04ServiceCatalogItemSchema
>;
export type Task04ServiceCatalogResponseData = z.infer<
  typeof task04ServiceCatalogResponseDataSchema
>;
export type Task04ServiceCatalogSuccess = z.infer<
  typeof task04ServiceCatalogSuccessSchema
>;

export function serializeTask04ServiceCatalogSuccess(
  input: unknown,
): Readonly<{
  response: Task04ServiceCatalogSuccess;
  serialized: string;
}> {
  const parsed = task04ServiceCatalogSuccessSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_SERVICE_CATALOG_RESPONSE_DENIED");
  }
  const serialized = JSON.stringify(parsed.data);
  if (
    new TextEncoder().encode(serialized).byteLength >
    TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_RESPONSE_BYTES
  ) {
    throw new Error("TASK04_SERVICE_CATALOG_RESPONSE_DENIED");
  }
  return Object.freeze({
    response: parsed.data,
    serialized,
  });
}
