import { z } from "zod";

export type Task04BookingExpiryWorkerLimits = Readonly<{
  maxBatchSize: number;
}>;

export function createTask04BookingExpiryWorkerSchemas(
  limits: Task04BookingExpiryWorkerLimits,
) {
  if (
    !Number.isSafeInteger(limits.maxBatchSize) ||
    limits.maxBatchSize <= 0
  ) {
    throw new Error("TASK04_BOOKING_EXPIRY_CONFIG_DENIED");
  }

  const workerControlSchema = z
    .object({
      maxBatchSize: z
        .number()
        .int()
        .positive()
        .max(limits.maxBatchSize),
    })
    .strict();

  const workerResultDataSchema = z
    .object({
      examined: z.number().int().nonnegative().max(limits.maxBatchSize),
      expired: z.number().int().nonnegative().max(limits.maxBatchSize),
      skipped: z.number().int().nonnegative().max(limits.maxBatchSize),
    })
    .strict()
    .refine(
      (value) => value.expired + value.skipped === value.examined,
    );

  const workerSuccessSchema = z
    .object({
      success: z.literal(true),
      data: workerResultDataSchema,
    })
    .strict();

  return {
    workerControlSchema,
    workerResultDataSchema,
    workerSuccessSchema,
  };
}

export type Task04BookingExpiryWorkerSchemas = ReturnType<
  typeof createTask04BookingExpiryWorkerSchemas
>;
export type Task04BookingExpiryWorkerControl = z.infer<
  Task04BookingExpiryWorkerSchemas["workerControlSchema"]
>;
export type Task04BookingExpiryWorkerResultData = z.infer<
  Task04BookingExpiryWorkerSchemas["workerResultDataSchema"]
>;
