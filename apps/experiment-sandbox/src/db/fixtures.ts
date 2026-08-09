import type { Task04SandboxEnv } from "../env/server";
import type { Task04SandboxSql } from "./client";

export const TASK04_FOUNDATION_FIXTURES = Object.freeze({
  createdAtUtc: "2026-08-01T12:00:00.000Z",
  serviceCategoryId: "SYNTH-SERVICE-TASK04-0001",
  slotId: "SYNTH-SLOT-TASK04-0001",
  capacityUnitIds: [
    "SYNTH-CAPACITY-TASK04-0001",
    "SYNTH-CAPACITY-TASK04-0002",
  ] as const,
});

export async function seedTask04Foundation(
  sql: Task04SandboxSql,
  env: Task04SandboxEnv,
): Promise<void> {
  const pharmacyId = env.pharmacyId;
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO task04_synthetic.sandbox_scope (
        pharmacy_id,
        max_slot_capacity,
        max_accessibility_selections,
        max_page_size
      )
      VALUES (
        ${pharmacyId},
        ${env.maxSlotCapacity},
        ${env.maxAccessibilitySelections},
        ${env.maxPageSize}
      )
    `;
    await transaction`
      INSERT INTO task04_synthetic.service_category (
        id,
        pharmacy_id,
        public_label,
        supported_modalities,
        requires_staff_confirmation,
        waitlist_enabled,
        state
      )
      VALUES (
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        ${pharmacyId},
        'Synthetic administrative service',
        ARRAY['in_person', 'telephone', 'video']
          ::task04_synthetic.appointment_modality[],
        true,
        true,
        'active'
      )
    `;
    await transaction`
      INSERT INTO task04_synthetic.booking_slot (
        id,
        pharmacy_id,
        service_category_id,
        modality,
        starts_at_utc,
        ends_at_utc,
        display_timezone,
        configured_capacity,
        state,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        ${pharmacyId},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        'in_person',
        '2026-08-04T14:00:00.000Z',
        '2026-08-04T14:30:00.000Z',
        'America/Toronto',
        ${env.maxSlotCapacity},
        'active',
        ${TASK04_FOUNDATION_FIXTURES.createdAtUtc},
        ${TASK04_FOUNDATION_FIXTURES.createdAtUtc}
      )
    `;
    await transaction`
      INSERT INTO task04_synthetic.capacity_unit (
        id,
        pharmacy_id,
        slot_id,
        unit_sequence,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES
        (
          ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]},
          ${pharmacyId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          1,
          ${TASK04_FOUNDATION_FIXTURES.createdAtUtc},
          ${TASK04_FOUNDATION_FIXTURES.createdAtUtc}
        ),
        (
          ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1]},
          ${pharmacyId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          2,
          ${TASK04_FOUNDATION_FIXTURES.createdAtUtc},
          ${TASK04_FOUNDATION_FIXTURES.createdAtUtc}
        )
    `;
  });

}
