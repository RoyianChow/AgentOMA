export const TASK04_SCHEMA = "task04_synthetic" as const;
export const TASK04_SYNTHETIC_MARKER = "SYNTHETIC_TASK_04_RECORD" as const;
export const TASK04_EVENT_MARKER = "SYNTHETIC_TASK_04_EVENT" as const;
export const TASK04_SOURCE_CAPABILITY =
  "TASK04_BOOKING_WAITLIST_SYNTHETIC" as const;

export const BOOKING_STATES = [
  "pending_confirmation",
  "confirmed",
  "cancelled",
  "rescheduled",
  "expired",
] as const;

export const WAITLIST_STATES = [
  "active",
  "offered",
  "promoted",
  "cancelled",
  "expired",
] as const;

export const WAITLIST_OFFER_STATES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;

export const CAPACITY_HOLD_STATES = [
  "active",
  "consumed",
  "released",
  "expired",
] as const;

export const TASK04_TABLES = [
  "sandbox_scope",
  "service_category",
  "booking_slot",
  "booking",
  "waitlist_entry",
  "waitlist_offer",
  "capacity_hold",
  "capacity_unit",
  "management_credential",
  "administrative_preference_snapshot",
  "administrative_acknowledgement_record",
  "idempotency_record",
  "synthetic_audit_record",
  "transactional_outbox_record",
] as const;
