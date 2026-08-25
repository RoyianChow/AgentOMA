import { z } from "zod";

const intakeSessionIdSchema = z.uuid();

/**
 * One deliberately generic response covers malformed, unknown, expired,
 * consumed, and out-of-scope intake identifiers. A caller must not be able to
 * use wording differences to discover whether a particular intake exists.
 */
export const INTAKE_UNAVAILABLE_MESSAGE =
  "This intake is not available. Choose a waiting intake or ask the patient to start again.";

export function parseIntakeSessionId(value: string): string | null {
  const result = intakeSessionIdSchema.safeParse(value);
  return result.success ? result.data : null;
}
