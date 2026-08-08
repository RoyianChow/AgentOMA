CREATE ROLE task04_synthetic_runtime
  LOGIN
  PASSWORD 'task04_synthetic_runtime_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

REVOKE ALL ON DATABASE task04_synthetic_db FROM PUBLIC;
GRANT CONNECT ON DATABASE task04_synthetic_db TO task04_synthetic_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA task04_synthetic AUTHORIZATION task04_synthetic_owner;
REVOKE ALL ON SCHEMA task04_synthetic FROM PUBLIC;
ALTER DATABASE task04_synthetic_db
  SET search_path TO task04_synthetic, public;
ALTER ROLE task04_synthetic_owner IN DATABASE task04_synthetic_db
  SET search_path TO task04_synthetic, public;
ALTER ROLE task04_synthetic_runtime IN DATABASE task04_synthetic_db
  SET search_path TO task04_synthetic, public;
SET search_path TO task04_synthetic, public;

CREATE DOMAIN opaque_reference AS text
  CHECK (VALUE ~ '^[A-Za-z0-9_-]{16,160}$');

CREATE DOMAIN sandbox_pharmacy_id AS text
  CHECK (
    length(VALUE) BETWEEN 16 AND 96
    AND VALUE = upper(VALUE)
    AND VALUE ~ '^SYNTH-PHARMACY-[A-Z0-9_-]+$'
  );

CREATE DOMAIN synthetic_contact_reference AS text
  CHECK (
    length(VALUE) BETWEEN 16 AND 96
    AND VALUE = upper(VALUE)
    AND VALUE ~ '^SYNTH-CONTACT-[A-Z0-9_-]+$'
  );

CREATE DOMAIN sha256_digest AS text
  CHECK (VALUE ~ '^[a-f0-9]{64}$');

CREATE DOMAIN safe_code AS text
  CHECK (VALUE ~ '^[A-Z0-9_:-]{1,64}$');

CREATE TYPE appointment_modality AS ENUM (
  'in_person',
  'telephone',
  'video'
);

CREATE TYPE service_state AS ENUM ('active', 'unavailable');
CREATE TYPE slot_state AS ENUM ('active', 'unavailable');

CREATE TYPE booking_state AS ENUM (
  'pending_confirmation',
  'confirmed',
  'cancelled',
  'rescheduled',
  'expired'
);

CREATE TYPE waitlist_state AS ENUM (
  'active',
  'offered',
  'promoted',
  'cancelled',
  'expired'
);

CREATE TYPE waitlist_offer_state AS ENUM (
  'pending',
  'accepted',
  'declined',
  'expired',
  'cancelled'
);

CREATE TYPE capacity_hold_state AS ENUM (
  'active',
  'consumed',
  'released',
  'expired'
);

CREATE TYPE capacity_hold_purpose AS ENUM (
  'pending_booking',
  'waitlist_offer'
);

CREATE TYPE management_credential_usage AS ENUM ('one_time', 'reusable');

CREATE TYPE management_credential_state AS ENUM (
  'active',
  'consumed',
  'expired',
  'revoked'
);

CREATE TYPE idempotency_state AS ENUM (
  'in_progress',
  'completed',
  'failed_retryable',
  'failed_terminal'
);

CREATE TYPE synthetic_actor_type AS ENUM (
  'synthetic_patient',
  'synthetic_delegate',
  'synthetic_staff',
  'synthetic_system_worker'
);

CREATE TYPE aggregate_type AS ENUM (
  'booking',
  'waitlist_entry',
  'waitlist_offer',
  'capacity_hold',
  'management_credential',
  'automation_control'
);

CREATE TYPE language_preference AS ENUM (
  'no_preference',
  'english',
  'french',
  'interpretation_coordination_requested'
);

CREATE FUNCTION task04_synthetic.has_unique_text_values(values_to_check text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog, task04_synthetic
AS $$
  SELECT count(*) = count(DISTINCT value)
  FROM pg_catalog.unnest(values_to_check) AS value
$$;

CREATE TABLE sandbox_scope (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  pharmacy_id sandbox_pharmacy_id NOT NULL UNIQUE,
  environment text NOT NULL DEFAULT 'synthetic'
    CHECK (environment = 'synthetic'),
  max_slot_capacity integer NOT NULL CHECK (max_slot_capacity > 0),
  max_accessibility_selections integer NOT NULL
    CHECK (max_accessibility_selections > 0),
  max_page_size integer NOT NULL CHECK (max_page_size > 0),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD')
);

CREATE TABLE service_category (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  public_label text NOT NULL CHECK (length(public_label) BETWEEN 1 AND 80),
  supported_modalities appointment_modality[] NOT NULL
    CHECK (
      cardinality(supported_modalities) BETWEEN 1 AND 3
      AND task04_synthetic.has_unique_text_values(supported_modalities::text[])
    ),
  requires_staff_confirmation boolean NOT NULL,
  waitlist_enabled boolean NOT NULL,
  state service_state NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE booking_slot (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  service_category_id opaque_reference NOT NULL,
  modality appointment_modality NOT NULL,
  starts_at_utc timestamptz NOT NULL,
  ends_at_utc timestamptz NOT NULL,
  display_timezone text NOT NULL CHECK (display_timezone = 'America/Toronto'),
  configured_capacity integer NOT NULL CHECK (configured_capacity > 0),
  state slot_state NOT NULL,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (ends_at_utc > starts_at_utc),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (service_category_id, pharmacy_id)
    REFERENCES service_category (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE booking (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  service_category_id opaque_reference NOT NULL,
  slot_id opaque_reference NOT NULL,
  modality appointment_modality NOT NULL,
  actor_reference opaque_reference NOT NULL,
  subject_reference opaque_reference NOT NULL,
  delegation_grant_reference opaque_reference,
  state booking_state NOT NULL,
  confirmation_deadline_utc timestamptz,
  predecessor_booking_id opaque_reference,
  successor_booking_id opaque_reference,
  safe_reason_code safe_code NOT NULL,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (
    (state = 'pending_confirmation' AND confirmation_deadline_utc IS NOT NULL)
    OR
    (state <> 'pending_confirmation' AND confirmation_deadline_utc IS NULL)
  ),
  CHECK (predecessor_booking_id IS NULL OR predecessor_booking_id <> id),
  CHECK (successor_booking_id IS NULL OR successor_booking_id <> id),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (service_category_id, pharmacy_id)
    REFERENCES service_category (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (slot_id, pharmacy_id)
    REFERENCES booking_slot (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE booking
  ADD CONSTRAINT booking_predecessor_scope_fk
  FOREIGN KEY (predecessor_booking_id, pharmacy_id)
  REFERENCES booking (id, pharmacy_id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE booking
  ADD CONSTRAINT booking_successor_scope_fk
  FOREIGN KEY (successor_booking_id, pharmacy_id)
  REFERENCES booking (id, pharmacy_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE waitlist_entry (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  service_category_id opaque_reference NOT NULL,
  modality_preference appointment_modality NOT NULL,
  actor_reference opaque_reference NOT NULL,
  subject_reference opaque_reference NOT NULL,
  delegation_grant_reference opaque_reference,
  state waitlist_state NOT NULL,
  ordering_policy text NOT NULL
    DEFAULT 'PROPOSED_SYNTHETIC_ORDERING_PENDING_PRODUCT_CONFIRMATION'
    CHECK (
      ordering_policy =
      'PROPOSED_SYNTHETIC_ORDERING_PENDING_PRODUCT_CONFIRMATION'
    ),
  expires_at_utc timestamptz NOT NULL,
  safe_reason_code safe_code NOT NULL,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (expires_at_utc > created_at_utc),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (service_category_id, pharmacy_id)
    REFERENCES service_category (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX waitlist_entry_one_live_scope
  ON waitlist_entry (
    pharmacy_id,
    subject_reference,
    service_category_id,
    modality_preference
  )
  WHERE state IN ('active', 'offered');

CREATE TABLE waitlist_offer (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  waitlist_entry_id opaque_reference NOT NULL,
  slot_id opaque_reference NOT NULL,
  state waitlist_offer_state NOT NULL,
  expires_at_utc timestamptz NOT NULL,
  accepted_at_utc timestamptz,
  declined_at_utc timestamptz,
  expired_at_utc timestamptz,
  cancelled_at_utc timestamptz,
  safe_reason_code safe_code NOT NULL,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (expires_at_utc > created_at_utc),
  CHECK (
    (state = 'pending' AND num_nonnulls(
      accepted_at_utc,
      declined_at_utc,
      expired_at_utc,
      cancelled_at_utc
    ) = 0)
    OR
    (state = 'accepted' AND accepted_at_utc IS NOT NULL AND num_nonnulls(
      declined_at_utc,
      expired_at_utc,
      cancelled_at_utc
    ) = 0)
    OR
    (state = 'declined' AND declined_at_utc IS NOT NULL AND num_nonnulls(
      accepted_at_utc,
      expired_at_utc,
      cancelled_at_utc
    ) = 0)
    OR
    (state = 'expired' AND expired_at_utc IS NOT NULL AND num_nonnulls(
      accepted_at_utc,
      declined_at_utc,
      cancelled_at_utc
    ) = 0)
    OR
    (state = 'cancelled' AND cancelled_at_utc IS NOT NULL AND num_nonnulls(
      accepted_at_utc,
      declined_at_utc,
      expired_at_utc
    ) = 0)
  ),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (waitlist_entry_id, pharmacy_id)
    REFERENCES waitlist_entry (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (slot_id, pharmacy_id)
    REFERENCES booking_slot (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX waitlist_offer_one_live_entry
  ON waitlist_offer (pharmacy_id, waitlist_entry_id)
  WHERE state = 'pending';

CREATE TABLE capacity_hold (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  slot_id opaque_reference NOT NULL,
  capacity_unit_id opaque_reference NOT NULL,
  purpose capacity_hold_purpose NOT NULL,
  pending_booking_id opaque_reference,
  waitlist_offer_id opaque_reference,
  state capacity_hold_state NOT NULL,
  expires_at_utc timestamptz NOT NULL,
  consumed_at_utc timestamptz,
  released_at_utc timestamptz,
  expired_at_utc timestamptz,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (expires_at_utc > created_at_utc),
  CHECK (
    (purpose = 'pending_booking'
      AND pending_booking_id IS NOT NULL
      AND waitlist_offer_id IS NULL)
    OR
    (purpose = 'waitlist_offer'
      AND pending_booking_id IS NULL
      AND waitlist_offer_id IS NOT NULL)
  ),
  CHECK (
    (state = 'active'
      AND num_nonnulls(consumed_at_utc, released_at_utc, expired_at_utc) = 0)
    OR
    (state = 'consumed'
      AND consumed_at_utc IS NOT NULL
      AND num_nonnulls(released_at_utc, expired_at_utc) = 0)
    OR
    (state = 'released'
      AND released_at_utc IS NOT NULL
      AND num_nonnulls(consumed_at_utc, expired_at_utc) = 0)
    OR
    (state = 'expired'
      AND expired_at_utc IS NOT NULL
      AND num_nonnulls(consumed_at_utc, released_at_utc) = 0)
  ),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (slot_id, pharmacy_id)
    REFERENCES booking_slot (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (pending_booking_id, pharmacy_id)
    REFERENCES booking (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (waitlist_offer_id, pharmacy_id)
    REFERENCES waitlist_offer (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX capacity_hold_one_active_booking
  ON capacity_hold (pharmacy_id, pending_booking_id)
  WHERE state = 'active' AND pending_booking_id IS NOT NULL;

CREATE UNIQUE INDEX capacity_hold_one_active_offer
  ON capacity_hold (pharmacy_id, waitlist_offer_id)
  WHERE state = 'active' AND waitlist_offer_id IS NOT NULL;

CREATE TABLE capacity_unit (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  slot_id opaque_reference NOT NULL,
  unit_sequence integer NOT NULL CHECK (unit_sequence > 0),
  booking_id opaque_reference,
  capacity_hold_id opaque_reference,
  aggregate_version integer NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (num_nonnulls(booking_id, capacity_hold_id) <= 1),
  UNIQUE (id, pharmacy_id),
  UNIQUE (pharmacy_id, slot_id, unit_sequence),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (slot_id, pharmacy_id)
    REFERENCES booking_slot (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (booking_id, pharmacy_id)
    REFERENCES booking (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (capacity_hold_id, pharmacy_id)
    REFERENCES capacity_hold (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX capacity_unit_one_per_booking
  ON capacity_unit (pharmacy_id, booking_id)
  WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX capacity_unit_one_per_hold
  ON capacity_unit (pharmacy_id, capacity_hold_id)
  WHERE capacity_hold_id IS NOT NULL;

ALTER TABLE capacity_hold
  ADD CONSTRAINT capacity_hold_unit_scope_fk
  FOREIGN KEY (capacity_unit_id, pharmacy_id)
  REFERENCES capacity_unit (id, pharmacy_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE management_credential (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  usage_mode management_credential_usage NOT NULL,
  credential_digest sha256_digest,
  capability_reference opaque_reference NOT NULL,
  source_credential_id opaque_reference,
  booking_id opaque_reference,
  waitlist_entry_id opaque_reference,
  permitted_actions text[] NOT NULL,
  actor_reference opaque_reference NOT NULL,
  subject_reference opaque_reference NOT NULL,
  server_session_binding opaque_reference,
  state management_credential_state NOT NULL,
  expires_at_utc timestamptz NOT NULL,
  consumed_at_utc timestamptz,
  revoked_at_utc timestamptz,
  expired_at_utc timestamptz,
  issued_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (num_nonnulls(booking_id, waitlist_entry_id) = 1),
  CONSTRAINT management_credential_action_scope_check CHECK (
    cardinality(permitted_actions) BETWEEN 1 AND 8
    AND task04_synthetic.has_unique_text_values(permitted_actions)
    AND permitted_actions <@ ARRAY[
      'booking:view',
      'booking:cancel',
      'booking:reschedule',
      'waitlist:view',
      'waitlist:leave',
      'waitlist:offer:accept',
      'waitlist:offer:decline',
      'management:recover'
    ]::text[]
  ),
  CONSTRAINT management_credential_usage_contract CHECK (
    (usage_mode = 'one_time'
      AND credential_digest IS NOT NULL
      AND server_session_binding IS NULL
      AND source_credential_id IS NOT NULL
      AND cardinality(permitted_actions) = 1
      AND permitted_actions[1] = ANY(ARRAY[
        'booking:cancel',
        'booking:reschedule',
        'waitlist:leave',
        'waitlist:offer:accept',
        'waitlist:offer:decline'
      ]))
    OR
    (usage_mode = 'reusable'
      AND credential_digest IS NULL
      AND server_session_binding IS NOT NULL
      AND source_credential_id IS NULL)
  ),
  CONSTRAINT management_credential_expiry_check CHECK (
    expires_at_utc > issued_at_utc
  ),
  CONSTRAINT management_credential_state_contract CHECK (
    (state = 'active'
      AND num_nonnulls(consumed_at_utc, revoked_at_utc, expired_at_utc) = 0)
    OR
    (state = 'consumed'
      AND usage_mode = 'one_time'
      AND consumed_at_utc IS NOT NULL
      AND num_nonnulls(revoked_at_utc, expired_at_utc) = 0)
    OR
    (state = 'revoked'
      AND revoked_at_utc IS NOT NULL
      AND num_nonnulls(consumed_at_utc, expired_at_utc) = 0)
    OR
    (state = 'expired'
      AND expired_at_utc IS NOT NULL
      AND num_nonnulls(consumed_at_utc, revoked_at_utc) = 0)
  ),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (booking_id, pharmacy_id)
    REFERENCES booking (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (waitlist_entry_id, pharmacy_id)
    REFERENCES waitlist_entry (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (source_credential_id, pharmacy_id)
    REFERENCES management_credential (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX management_credential_one_active_reusable
  ON management_credential (pharmacy_id, capability_reference)
  WHERE usage_mode = 'reusable' AND state = 'active';

CREATE UNIQUE INDEX management_credential_one_active_one_time_action
  ON management_credential (
    pharmacy_id,
    capability_reference,
    (permitted_actions[1])
  )
  WHERE usage_mode = 'one_time' AND state = 'active';

CREATE TABLE administrative_preference_snapshot (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  booking_id opaque_reference,
  waitlist_entry_id opaque_reference,
  language language_preference NOT NULL,
  accessibility_preferences text[] NOT NULL,
  synthetic_contact_reference synthetic_contact_reference NOT NULL,
  source_snapshot_id opaque_reference,
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (num_nonnulls(booking_id, waitlist_entry_id) = 1),
  CONSTRAINT administrative_preference_selection_contract CHECK (
    cardinality(accessibility_preferences) >= 1
    AND task04_synthetic.has_unique_text_values(accessibility_preferences)
    AND accessibility_preferences <@ ARRAY[
      'none',
      'mobility_preparation',
      'hearing_preparation',
      'vision_preparation',
      'communication_preparation',
      'contact_about_accommodation'
    ]::text[]
    AND (
      NOT ('none' = ANY(accessibility_preferences))
      OR cardinality(accessibility_preferences) = 1
    )
  ),
  CHECK (source_snapshot_id IS NULL OR source_snapshot_id <> id),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (booking_id, pharmacy_id)
    REFERENCES booking (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (waitlist_entry_id, pharmacy_id)
    REFERENCES waitlist_entry (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (source_snapshot_id, pharmacy_id)
    REFERENCES administrative_preference_snapshot (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX preference_snapshot_one_per_booking
  ON administrative_preference_snapshot (pharmacy_id, booking_id)
  WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX preference_snapshot_one_per_waitlist_entry
  ON administrative_preference_snapshot (pharmacy_id, waitlist_entry_id)
  WHERE waitlist_entry_id IS NOT NULL;

CREATE TABLE idempotency_record (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  actor_reference opaque_reference NOT NULL,
  operation text NOT NULL CHECK (
    operation = ANY(ARRAY[
      'booking:create',
      'booking:confirm',
      'booking:cancel',
      'booking:reschedule',
      'booking:expire',
      'waitlist:join',
      'waitlist:leave',
      'waitlist:promote',
      'waitlist:expire',
      'waitlist:offer:create',
      'waitlist:offer:accept',
      'waitlist:offer:decline',
      'waitlist:offer:withdraw',
      'management-credential:consume',
      'management-credential:revoke',
      'management:recover',
      'automation:reconcile',
      'automation:disable',
      'automation:enable'
    ])
  ),
  resource_scope_digest sha256_digest NOT NULL,
  idempotency_key_digest sha256_digest NOT NULL,
  canonical_request_digest sha256_digest NOT NULL,
  state idempotency_state NOT NULL,
  safe_response_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(safe_response_snapshot) = 'object'),
  created_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  completed_at_utc timestamptz,
  cleanup_eligible_at_utc timestamptz,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (
    (state = 'completed' AND completed_at_utc IS NOT NULL)
    OR
    (state <> 'completed')
  ),
  UNIQUE (id, pharmacy_id),
  CONSTRAINT idempotency_record_scope_key UNIQUE (
    pharmacy_id,
    actor_reference,
    operation,
    resource_scope_digest,
    idempotency_key_digest
  ),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE administrative_acknowledgement_record (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  booking_id opaque_reference,
  waitlist_entry_id opaque_reference,
  acknowledgement_version opaque_reference NOT NULL,
  administrative_only boolean NOT NULL CHECK (administrative_only),
  not_monitored boolean NOT NULL CHECK (not_monitored),
  no_medical_details boolean NOT NULL CHECK (no_medical_details),
  not_clinical_assessment boolean NOT NULL CHECK (not_clinical_assessment),
  status_controls_confirmation boolean NOT NULL CHECK (status_controls_confirmation),
  accepted_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  actor_type synthetic_actor_type NOT NULL,
  delegation_grant_reference opaque_reference,
  command_receipt_id opaque_reference NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  CHECK (num_nonnulls(booking_id, waitlist_entry_id) = 1),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (booking_id, pharmacy_id)
    REFERENCES booking (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (waitlist_entry_id, pharmacy_id)
    REFERENCES waitlist_entry (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (command_receipt_id, pharmacy_id)
    REFERENCES idempotency_record (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE FUNCTION task04_synthetic.jsonb_has_exact_keys(
  candidate jsonb,
  required_keys text[]
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog, task04_synthetic
AS $$
  SELECT
    pg_catalog.jsonb_typeof(candidate) = 'object'
    AND candidate ?& required_keys
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_object_keys(candidate) AS candidate_key
      WHERE NOT (candidate_key = ANY(required_keys))
    )
$$;

CREATE FUNCTION task04_synthetic.jsonb_string_matches(
  candidate jsonb,
  candidate_key text,
  required_pattern text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog, task04_synthetic
AS $$
  SELECT
    pg_catalog.jsonb_typeof(candidate -> candidate_key) = 'string'
    AND candidate ->> candidate_key ~ required_pattern
$$;

CREATE FUNCTION task04_synthetic.is_valid_management_action_array(
  candidate jsonb,
  usage_mode text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, task04_synthetic
AS $$
DECLARE
  action_count integer;
  distinct_action_count integer;
BEGIN
  IF pg_catalog.jsonb_typeof(candidate) <> 'array' THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(candidate) AS action_value
    WHERE pg_catalog.jsonb_typeof(action_value) <> 'string'
  ) THEN
    RETURN false;
  END IF;

  SELECT
    count(*),
    count(DISTINCT action_value #>> '{}')
  INTO action_count, distinct_action_count
  FROM pg_catalog.jsonb_array_elements(candidate) AS action_value;

  IF usage_mode = 'one_time' THEN
    RETURN
      action_count = 1
      AND distinct_action_count = 1
      AND (candidate ->> 0) = ANY(ARRAY[
        'booking:cancel',
        'booking:reschedule',
        'waitlist:leave',
        'waitlist:offer:accept',
        'waitlist:offer:decline'
      ]);
  END IF;

  IF usage_mode = 'reusable' THEN
    RETURN
      action_count BETWEEN 1 AND 8
      AND distinct_action_count = action_count
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_array_elements_text(candidate) AS action_value
        WHERE NOT (action_value = ANY(ARRAY[
          'booking:view',
          'booking:cancel',
          'booking:reschedule',
          'waitlist:view',
          'waitlist:leave',
          'waitlist:offer:accept',
          'waitlist:offer:decline',
          'management:recover'
        ]))
      );
  END IF;

  RETURN false;
END
$$;

CREATE FUNCTION task04_synthetic.is_valid_outbox_event(
  candidate_event_type text,
  candidate_aggregate_type task04_synthetic.aggregate_type,
  candidate_reason task04_synthetic.safe_code,
  candidate_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, task04_synthetic
AS $$
DECLARE
  opaque_pattern constant text := '^[A-Za-z0-9_-]{16,160}$';
  utc_pattern constant text :=
    '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{3})?Z$';
BEGIN
  IF pg_catalog.jsonb_typeof(candidate_payload) <> 'object' THEN
    RETURN false;
  END IF;

  CASE candidate_event_type
    WHEN 'booking.created' THEN
      RETURN
        candidate_aggregate_type = 'booking'
        AND candidate_reason = 'BOOKING_REQUESTED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['resultingState', 'modality', 'startTimeUtc', 'endTimeUtc']
        )
        AND candidate_payload ->> 'resultingState'
          = ANY(ARRAY['pending_confirmation', 'confirmed'])
        AND candidate_payload ->> 'modality'
          = ANY(ARRAY['in_person', 'telephone', 'video'])
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'startTimeUtc', utc_pattern
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'endTimeUtc', utc_pattern
        );
    WHEN 'booking.confirmed' THEN
      RETURN
        candidate_aggregate_type = 'booking'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState', 'capacityOwner']
        )
        AND candidate_payload ->> 'previousState'
          = ANY(ARRAY['pending_confirmation', 'none'])
        AND candidate_payload ->> 'resultingState' = 'confirmed'
        AND candidate_payload ->> 'capacityOwner' = 'booking'
        AND (
          (candidate_payload ->> 'previousState' = 'none'
            AND candidate_reason = 'IMMEDIATE_CONFIRMATION')
          OR
          (candidate_payload ->> 'previousState' = 'pending_confirmation'
            AND candidate_reason = 'STAFF_CONFIRMED')
        );
    WHEN 'booking.cancelled' THEN
      RETURN
        candidate_aggregate_type = 'booking'
        AND candidate_reason = 'ACTOR_CANCELLED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState']
        )
        AND candidate_payload ->> 'previousState'
          = ANY(ARRAY['pending_confirmation', 'confirmed'])
        AND candidate_payload ->> 'resultingState' = 'cancelled';
    WHEN 'booking.rescheduled' THEN
      RETURN
        candidate_aggregate_type = 'booking'
        AND candidate_reason = 'REPLACEMENT_COMMITTED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'predecessorBookingReference',
            'successorBookingReference',
            'successorState'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'predecessorBookingReference', opaque_pattern
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'successorBookingReference', opaque_pattern
        )
        AND candidate_payload ->> 'successorState'
          = ANY(ARRAY['pending_confirmation', 'confirmed']);
    WHEN 'booking.expired' THEN
      RETURN
        candidate_aggregate_type = 'booking'
        AND candidate_reason = 'CONFIRMATION_WINDOW_EXPIRED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState']
        )
        AND candidate_payload ->> 'previousState' = 'pending_confirmation'
        AND candidate_payload ->> 'resultingState' = 'expired';
    WHEN 'waitlist.joined' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_entry'
        AND candidate_reason = 'WAITLIST_REQUESTED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['resultingState', 'modalityPreference']
        )
        AND candidate_payload ->> 'resultingState' = 'active'
        AND candidate_payload ->> 'modalityPreference'
          = ANY(ARRAY['in_person', 'telephone', 'video']);
    WHEN 'waitlist.cancelled' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_entry'
        AND candidate_reason = ANY(ARRAY[
          'ACTOR_LEFT_WAITLIST',
          'ACTOR_DECLINED_OFFER',
          'AUTHORITY_REVOKED'
        ])
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState']
        )
        AND candidate_payload ->> 'previousState'
          = ANY(ARRAY['active', 'offered'])
        AND candidate_payload ->> 'resultingState' = 'cancelled';
    WHEN 'waitlist.reactivated' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_entry'
        AND candidate_reason = ANY(ARRAY[
          'OFFER_WINDOW_EXPIRED_ENTRY_ELIGIBLE',
          'OFFER_WITHDRAWN_ENTRY_ELIGIBLE'
        ])
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState']
        )
        AND candidate_payload ->> 'previousState' = 'offered'
        AND candidate_payload ->> 'resultingState' = 'active';
    WHEN 'waitlist.expired' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_entry'
        AND candidate_reason = 'ENTRY_WINDOW_EXPIRED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState']
        )
        AND candidate_payload ->> 'previousState'
          = ANY(ARRAY['active', 'offered'])
        AND candidate_payload ->> 'resultingState' = 'expired';
    WHEN 'waitlist.offer_created' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_offer'
        AND candidate_reason = 'CAPACITY_BECAME_AVAILABLE'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'waitlistReference',
            'capacityHoldReference',
            'resultingState',
            'expiresAtUtc'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'waitlistReference', opaque_pattern
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'capacityHoldReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState' = 'pending'
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'expiresAtUtc', utc_pattern
        );
    WHEN 'waitlist.offer_accepted' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_offer'
        AND candidate_reason = 'ACTOR_ACCEPTED_OFFER'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'waitlistReference',
            'bookingReference',
            'resultingOfferState',
            'resultingEntryState'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'waitlistReference', opaque_pattern
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'bookingReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingOfferState' = 'accepted'
        AND candidate_payload ->> 'resultingEntryState' = 'promoted';
    WHEN 'waitlist.offer_declined' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_offer'
        AND candidate_reason = 'ACTOR_DECLINED_OFFER'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'waitlistReference',
            'resultingOfferState',
            'resultingEntryState'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'waitlistReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingOfferState' = 'declined'
        AND candidate_payload ->> 'resultingEntryState' = 'cancelled';
    WHEN 'waitlist.offer_withdrawn' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_offer'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'waitlistReference',
            'resultingOfferState',
            'resultingEntryState'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'waitlistReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingOfferState' = 'cancelled'
        AND (
          (candidate_reason = 'SLOT_INVALIDATED'
            AND candidate_payload ->> 'resultingEntryState' = 'active')
          OR
          (candidate_reason = ANY(ARRAY['ENTRY_LEFT', 'AUTHORITY_REVOKED'])
            AND candidate_payload ->> 'resultingEntryState' = 'cancelled')
          OR
          (candidate_reason = 'ENTRY_WINDOW_EXPIRED'
            AND candidate_payload ->> 'resultingEntryState' = 'expired')
        );
    WHEN 'waitlist.offer_expired' THEN
      RETURN
        candidate_aggregate_type = 'waitlist_offer'
        AND candidate_reason = 'OFFER_WINDOW_EXPIRED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'waitlistReference',
            'resultingOfferState',
            'resultingEntryState'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'waitlistReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingOfferState' = 'expired'
        AND candidate_payload ->> 'resultingEntryState'
          = ANY(ARRAY['active', 'expired']);
    WHEN 'capacity_hold.created' THEN
      RETURN
        candidate_aggregate_type = 'capacity_hold'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['ownerType', 'ownerReference', 'resultingState', 'expiresAtUtc']
        )
        AND candidate_payload ->> 'ownerType'
          = ANY(ARRAY['pending_booking', 'waitlist_offer'])
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'ownerReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState' = 'active'
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'expiresAtUtc', utc_pattern
        )
        AND (
          (candidate_payload ->> 'ownerType' = 'pending_booking'
            AND candidate_reason = 'PENDING_CONFIRMATION_RESERVED')
          OR
          (candidate_payload ->> 'ownerType' = 'waitlist_offer'
            AND candidate_reason = 'WAITLIST_OFFER_RESERVED')
        );
    WHEN 'capacity_hold.consumed' THEN
      RETURN
        candidate_aggregate_type = 'capacity_hold'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['ownerType', 'bookingReference', 'resultingState']
        )
        AND candidate_payload ->> 'ownerType'
          = ANY(ARRAY['pending_booking', 'waitlist_offer'])
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'bookingReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState' = 'consumed'
        AND (
          (candidate_payload ->> 'ownerType' = 'pending_booking'
            AND candidate_reason = 'CONFIRMATION_COMMITTED')
          OR
          (candidate_payload ->> 'ownerType' = 'waitlist_offer'
            AND candidate_reason = 'OFFER_ACCEPTANCE_COMMITTED')
        );
    WHEN 'capacity_hold.released' THEN
      RETURN
        candidate_aggregate_type = 'capacity_hold'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['ownerType', 'releaseCause', 'resultingState']
        )
        AND candidate_payload ->> 'ownerType'
          = ANY(ARRAY['pending_booking', 'waitlist_offer'])
        AND candidate_payload ->> 'resultingState' = 'released'
        AND (
          (candidate_payload ->> 'releaseCause' = 'early_booking_cancellation'
            AND candidate_reason = 'EARLY_CANCELLATION')
          OR
          (candidate_payload ->> 'releaseCause' = 'reschedule_replacement'
            AND candidate_reason = 'RESCHEDULE_REPLACEMENT')
          OR
          (candidate_payload ->> 'releaseCause' = 'offer_decline'
            AND candidate_reason = 'OFFER_DECLINED')
          OR
          (candidate_payload ->> 'releaseCause' = 'offer_withdrawal'
            AND candidate_reason = 'OFFER_WITHDRAWN')
          OR
          (candidate_payload ->> 'releaseCause' = 'waitlist_leave'
            AND candidate_reason = 'WAITLIST_LEFT')
        );
    WHEN 'capacity_hold.expired' THEN
      RETURN
        candidate_aggregate_type = 'capacity_hold'
        AND candidate_reason = 'HOLD_WINDOW_EXPIRED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['ownerType', 'resultingState']
        )
        AND candidate_payload ->> 'ownerType'
          = ANY(ARRAY['pending_booking', 'waitlist_offer'])
        AND candidate_payload ->> 'resultingState' = 'expired';
    WHEN 'management_credential.issued' THEN
      RETURN
        candidate_aggregate_type = 'management_credential'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY[
            'credentialReference',
            'usageMode',
            'permittedActions',
            'channel',
            'expiresAtUtc'
          ]
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'credentialReference', opaque_pattern
        )
        AND candidate_payload ->> 'usageMode'
          = ANY(ARRAY['one_time', 'reusable'])
        AND task04_synthetic.is_valid_management_action_array(
          candidate_payload -> 'permittedActions',
          candidate_payload ->> 'usageMode'
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'expiresAtUtc', utc_pattern
        )
        AND (
          (candidate_payload ->> 'usageMode' = 'one_time'
            AND candidate_payload ->> 'channel' = 'one_time_response'
            AND candidate_reason = 'ONE_TIME_ACCESS_ISSUED')
          OR
          (candidate_payload ->> 'usageMode' = 'reusable'
            AND candidate_payload ->> 'channel' = 'server_session_bound'
            AND candidate_reason = 'SERVER_SESSION_CAPABILITY_CREATED')
        );
    WHEN 'management_credential.consumed' THEN
      RETURN
        candidate_aggregate_type = 'management_credential'
        AND candidate_reason = 'PROTECTED_ACTION_COMMITTED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['credentialReference', 'consumedByAction', 'resultingState']
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'credentialReference', opaque_pattern
        )
        AND candidate_payload ->> 'consumedByAction' = ANY(ARRAY[
          'booking:cancel',
          'booking:reschedule',
          'waitlist:leave',
          'waitlist:offer:accept',
          'waitlist:offer:decline'
        ])
        AND candidate_payload ->> 'resultingState' = 'consumed';
    WHEN 'management_credential.revoked' THEN
      RETURN
        candidate_aggregate_type = 'management_credential'
        AND candidate_reason = ANY(ARRAY[
          'AUTHORITY_REVOKED',
          'RESOURCE_TERMINAL',
          'SUCCESSOR_ROTATED'
        ])
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['credentialReference', 'resultingState']
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'credentialReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState' = 'revoked';
    WHEN 'management_credential.expired' THEN
      RETURN
        candidate_aggregate_type = 'management_credential'
        AND candidate_reason = 'CREDENTIAL_WINDOW_EXPIRED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['credentialReference', 'resultingState']
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'credentialReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState' = 'expired';
    WHEN 'automation.reconciled' THEN
      RETURN
        candidate_aggregate_type = 'automation_control'
        AND candidate_reason = 'RECONCILIATION_COMPLETED'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['reconciliationRunReference', 'resultingState', 'processedCount']
        )
        AND task04_synthetic.jsonb_string_matches(
          candidate_payload, 'reconciliationRunReference', opaque_pattern
        )
        AND candidate_payload ->> 'resultingState'
          = ANY(ARRAY['completed', 'no_changes'])
        AND pg_catalog.jsonb_typeof(candidate_payload -> 'processedCount') = 'number'
        AND candidate_payload ->> 'processedCount' ~ '^(0|[1-9][0-9]*)$';
    WHEN 'automation.disabled' THEN
      RETURN
        candidate_aggregate_type = 'automation_control'
        AND candidate_reason = 'AUTHORIZED_DISABLE'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState', 'controlVersion']
        )
        AND candidate_payload ->> 'previousState' = 'enabled'
        AND candidate_payload ->> 'resultingState' = 'disabled'
        AND pg_catalog.jsonb_typeof(candidate_payload -> 'controlVersion') = 'number'
        AND candidate_payload ->> 'controlVersion' ~ '^[1-9][0-9]*$';
    WHEN 'automation.enabled' THEN
      RETURN
        candidate_aggregate_type = 'automation_control'
        AND candidate_reason = 'AUTHORIZED_ENABLE'
        AND task04_synthetic.jsonb_has_exact_keys(
          candidate_payload,
          ARRAY['previousState', 'resultingState', 'controlVersion']
        )
        AND candidate_payload ->> 'previousState' = 'disabled'
        AND candidate_payload ->> 'resultingState' = 'enabled'
        AND pg_catalog.jsonb_typeof(candidate_payload -> 'controlVersion') = 'number'
        AND candidate_payload ->> 'controlVersion' ~ '^[1-9][0-9]*$';
    ELSE
      RETURN false;
  END CASE;
END
$$;

CREATE TABLE transactional_outbox_record (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  event_type text NOT NULL CHECK (
    length(event_type) BETWEEN 3 AND 80
    AND event_type ~ '^[a-z_]+([.][a-z_]+)+$'
  ),
  event_schema_version integer NOT NULL DEFAULT 1
    CHECK (event_schema_version = 1),
  aggregate_type aggregate_type NOT NULL,
  aggregate_id opaque_reference NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  occurred_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  protected_environment text NOT NULL DEFAULT 'synthetic'
    CHECK (protected_environment = 'synthetic'),
  actor_type synthetic_actor_type NOT NULL,
  safe_reason_code safe_code NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_EVENT'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_EVENT'),
  source_capability text NOT NULL DEFAULT 'TASK04_BOOKING_WAITLIST_SYNTHETIC'
    CHECK (source_capability = 'TASK04_BOOKING_WAITLIST_SYNTHETIC'),
  dispatch_status text NOT NULL DEFAULT 'not_dispatched'
    CONSTRAINT transactional_outbox_dispatch_status_check
      CHECK (dispatch_status = 'not_dispatched'),
  usefulness_expires_at_utc timestamptz,
  aggregate_version_superseded boolean NOT NULL DEFAULT false,
  cleanup_eligible_at_utc timestamptz,
  payload jsonb NOT NULL,
  UNIQUE (id, pharmacy_id),
  CONSTRAINT transactional_outbox_event_contract CHECK (
    task04_synthetic.is_valid_outbox_event(
      event_type,
      aggregate_type,
      safe_reason_code,
      payload
    )
  ),
  CHECK (
    usefulness_expires_at_utc IS NULL
    OR usefulness_expires_at_utc > occurred_at_utc
  ),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE synthetic_audit_record (
  id opaque_reference PRIMARY KEY,
  pharmacy_id sandbox_pharmacy_id NOT NULL,
  aggregate_type aggregate_type NOT NULL,
  aggregate_id opaque_reference NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  prior_state text,
  resulting_state text NOT NULL CHECK (length(resulting_state) BETWEEN 1 AND 40),
  actor_type synthetic_actor_type NOT NULL,
  transitioned_at_utc timestamptz NOT NULL DEFAULT statement_timestamp(),
  safe_action_code safe_code NOT NULL,
  safe_reason_code safe_code NOT NULL,
  idempotency_record_id opaque_reference,
  outbox_record_id opaque_reference NOT NULL,
  synthetic_marker text NOT NULL DEFAULT 'SYNTHETIC_TASK_04_RECORD'
    CHECK (synthetic_marker = 'SYNTHETIC_TASK_04_RECORD'),
  UNIQUE (id, pharmacy_id),
  FOREIGN KEY (pharmacy_id)
    REFERENCES sandbox_scope (pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (idempotency_record_id, pharmacy_id)
    REFERENCES idempotency_record (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (outbox_record_id, pharmacy_id)
    REFERENCES transactional_outbox_record (id, pharmacy_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE FUNCTION task04_synthetic.deny_terminal_hold_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  IF OLD.state <> 'active' AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_TERMINAL_HOLD_IMMUTABLE';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER capacity_hold_terminal_guard
BEFORE UPDATE ON task04_synthetic.capacity_hold
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.deny_terminal_hold_reactivation();

CREATE FUNCTION task04_synthetic.deny_terminal_credential_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  IF OLD.state <> 'active' AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_TERMINAL_CREDENTIAL_IMMUTABLE';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER management_credential_terminal_guard
BEFORE UPDATE ON task04_synthetic.management_credential
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.deny_terminal_credential_reactivation();

CREATE FUNCTION task04_synthetic.enforce_management_credential_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.management_credential AS derived
    LEFT JOIN task04_synthetic.management_credential AS source
      ON source.id = derived.source_credential_id
     AND source.pharmacy_id = derived.pharmacy_id
    WHERE derived.usage_mode = 'one_time'
      AND (
        source.id IS NULL
        OR source.usage_mode <> 'reusable'
        OR source.capability_reference <> derived.capability_reference
        OR source.booking_id IS DISTINCT FROM derived.booking_id
        OR source.waitlist_entry_id IS DISTINCT FROM derived.waitlist_entry_id
        OR source.actor_reference <> derived.actor_reference
        OR source.subject_reference <> derived.subject_reference
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_ONE_TIME_CREDENTIAL_SOURCE_MISMATCH';
  END IF;
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER management_credential_source_foundation
AFTER INSERT OR UPDATE OR DELETE
ON task04_synthetic.management_credential
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_management_credential_source();

CREATE FUNCTION task04_synthetic.lock_capacity_unit_slot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  PERFORM 1
  FROM task04_synthetic.booking_slot
  WHERE id = NEW.slot_id
    AND pharmacy_id = NEW.pharmacy_id
  FOR UPDATE;
  RETURN NEW;
END
$$;

CREATE TRIGGER capacity_unit_slot_lock
BEFORE INSERT OR UPDATE OF pharmacy_id, slot_id
ON task04_synthetic.capacity_unit
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.lock_capacity_unit_slot();

CREATE FUNCTION task04_synthetic.enforce_capacity_foundation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.booking_slot AS slot
    JOIN task04_synthetic.sandbox_scope AS scope
      ON scope.pharmacy_id = slot.pharmacy_id
    WHERE slot.configured_capacity > scope.max_slot_capacity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_SLOT_CAPACITY_CONFIG_LIMIT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.administrative_preference_snapshot AS preference
    JOIN task04_synthetic.sandbox_scope AS scope
      ON scope.pharmacy_id = preference.pharmacy_id
    WHERE pg_catalog.cardinality(preference.accessibility_preferences)
      > scope.max_accessibility_selections
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_ACCESSIBILITY_CONFIG_LIMIT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.transactional_outbox_record AS outbox
    JOIN task04_synthetic.sandbox_scope AS scope
      ON scope.pharmacy_id = outbox.pharmacy_id
    WHERE outbox.event_type = 'automation.reconciled'
      AND (outbox.payload ->> 'processedCount')::numeric
        > scope.max_page_size
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_OUTBOX_PAGE_SIZE_CONFIG_LIMIT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.booking_slot AS slot
    WHERE (
      SELECT count(*)
      FROM task04_synthetic.capacity_unit AS unit
      WHERE unit.pharmacy_id = slot.pharmacy_id
        AND unit.slot_id = slot.id
    ) > slot.configured_capacity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_CAPACITY_UNIT_CEILING';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.capacity_unit AS unit
    JOIN task04_synthetic.booking AS owned_booking
      ON owned_booking.id = unit.booking_id
     AND owned_booking.pharmacy_id = unit.pharmacy_id
    WHERE unit.booking_id IS NOT NULL
      AND (
        owned_booking.state <> 'confirmed'
        OR owned_booking.slot_id <> unit.slot_id
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_INVALID_BOOKING_CAPACITY_OWNER';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.booking AS candidate
    LEFT JOIN task04_synthetic.capacity_unit AS unit
      ON unit.booking_id = candidate.id
     AND unit.pharmacy_id = candidate.pharmacy_id
    GROUP BY candidate.id, candidate.pharmacy_id, candidate.state
    HAVING (
      candidate.state = 'confirmed' AND count(unit.id) <> 1
    ) OR (
      candidate.state <> 'confirmed' AND count(unit.id) <> 0
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_BOOKING_CAPACITY_ACCOUNTING';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.booking AS candidate
    LEFT JOIN task04_synthetic.capacity_hold AS hold
      ON hold.pending_booking_id = candidate.id
     AND hold.pharmacy_id = candidate.pharmacy_id
     AND hold.state = 'active'
    GROUP BY candidate.id, candidate.pharmacy_id, candidate.state
    HAVING (
      candidate.state = 'pending_confirmation' AND count(hold.id) <> 1
    ) OR (
      candidate.state <> 'pending_confirmation' AND count(hold.id) <> 0
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_PENDING_BOOKING_HOLD_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.booking AS candidate
    JOIN task04_synthetic.capacity_hold AS hold
      ON hold.pending_booking_id = candidate.id
     AND hold.pharmacy_id = candidate.pharmacy_id
     AND hold.state = 'active'
    WHERE candidate.state = 'pending_confirmation'
      AND hold.expires_at_utc
        IS DISTINCT FROM candidate.confirmation_deadline_utc
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_PENDING_BOOKING_HOLD_DEADLINE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.waitlist_offer AS candidate
    LEFT JOIN task04_synthetic.capacity_hold AS hold
      ON hold.waitlist_offer_id = candidate.id
     AND hold.pharmacy_id = candidate.pharmacy_id
     AND hold.state = 'active'
    GROUP BY candidate.id, candidate.pharmacy_id, candidate.state
    HAVING (
      candidate.state = 'pending' AND count(hold.id) <> 1
    ) OR (
      candidate.state <> 'pending' AND count(hold.id) <> 0
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_PENDING_OFFER_HOLD_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.waitlist_offer AS candidate
    JOIN task04_synthetic.capacity_hold AS hold
      ON hold.waitlist_offer_id = candidate.id
     AND hold.pharmacy_id = candidate.pharmacy_id
     AND hold.state = 'active'
    WHERE candidate.state = 'pending'
      AND hold.expires_at_utc IS DISTINCT FROM candidate.expires_at_utc
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_PENDING_OFFER_HOLD_DEADLINE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.waitlist_entry AS entry
    LEFT JOIN task04_synthetic.waitlist_offer AS offer
      ON offer.waitlist_entry_id = entry.id
     AND offer.pharmacy_id = entry.pharmacy_id
     AND offer.state = 'pending'
    GROUP BY entry.id, entry.pharmacy_id, entry.state
    HAVING (
      entry.state = 'offered' AND count(offer.id) <> 1
    ) OR (
      entry.state <> 'offered' AND count(offer.id) <> 0
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_WAITLIST_OFFER_STATE_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task04_synthetic.capacity_hold AS hold
    LEFT JOIN task04_synthetic.capacity_unit AS unit
      ON unit.capacity_hold_id = hold.id
     AND unit.pharmacy_id = hold.pharmacy_id
     AND unit.id = hold.capacity_unit_id
     AND unit.slot_id = hold.slot_id
    GROUP BY hold.id, hold.pharmacy_id, hold.state
    HAVING (
      hold.state = 'active' AND count(unit.id) <> 1
    ) OR (
      hold.state <> 'active' AND count(unit.id) <> 0
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'TASK04_HOLD_CAPACITY_ACCOUNTING';
  END IF;

  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER booking_slot_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.booking_slot
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER booking_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.booking
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER waitlist_entry_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.waitlist_entry
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER waitlist_offer_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.waitlist_offer
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER capacity_hold_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.capacity_hold
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER capacity_unit_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.capacity_unit
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER sandbox_scope_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE ON task04_synthetic.sandbox_scope
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER preference_capacity_foundation
AFTER INSERT OR UPDATE OR DELETE
ON task04_synthetic.administrative_preference_snapshot
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE CONSTRAINT TRIGGER outbox_configuration_foundation
AFTER INSERT OR UPDATE OR DELETE
ON task04_synthetic.transactional_outbox_record
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.enforce_capacity_foundation();

CREATE FUNCTION task04_synthetic.deny_synthetic_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, task04_synthetic
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'TASK04_SYNTHETIC_AUDIT_APPEND_ONLY';
END
$$;

CREATE TRIGGER synthetic_audit_append_only
BEFORE UPDATE OR DELETE ON task04_synthetic.synthetic_audit_record
FOR EACH ROW
EXECUTE FUNCTION task04_synthetic.deny_synthetic_audit_mutation();

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA task04_synthetic FROM PUBLIC;
GRANT USAGE ON SCHEMA task04_synthetic TO task04_synthetic_runtime;
REVOKE USAGE ON TYPE
  task04_synthetic.opaque_reference,
  task04_synthetic.sandbox_pharmacy_id,
  task04_synthetic.synthetic_contact_reference,
  task04_synthetic.sha256_digest,
  task04_synthetic.safe_code,
  task04_synthetic.appointment_modality,
  task04_synthetic.service_state,
  task04_synthetic.slot_state,
  task04_synthetic.booking_state,
  task04_synthetic.waitlist_state,
  task04_synthetic.waitlist_offer_state,
  task04_synthetic.capacity_hold_state,
  task04_synthetic.capacity_hold_purpose,
  task04_synthetic.management_credential_usage,
  task04_synthetic.management_credential_state,
  task04_synthetic.idempotency_state,
  task04_synthetic.synthetic_actor_type,
  task04_synthetic.aggregate_type,
  task04_synthetic.language_preference
  FROM PUBLIC;
GRANT USAGE ON TYPE
  task04_synthetic.opaque_reference,
  task04_synthetic.sandbox_pharmacy_id,
  task04_synthetic.synthetic_contact_reference,
  task04_synthetic.sha256_digest,
  task04_synthetic.safe_code,
  task04_synthetic.appointment_modality,
  task04_synthetic.service_state,
  task04_synthetic.slot_state,
  task04_synthetic.booking_state,
  task04_synthetic.waitlist_state,
  task04_synthetic.waitlist_offer_state,
  task04_synthetic.capacity_hold_state,
  task04_synthetic.capacity_hold_purpose,
  task04_synthetic.management_credential_usage,
  task04_synthetic.management_credential_state,
  task04_synthetic.idempotency_state,
  task04_synthetic.synthetic_actor_type,
  task04_synthetic.aggregate_type,
  task04_synthetic.language_preference
  TO task04_synthetic_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA task04_synthetic
  TO task04_synthetic_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON task04_synthetic.sandbox_scope
  FROM task04_synthetic_runtime;
REVOKE UPDATE, DELETE, TRUNCATE
  ON task04_synthetic.synthetic_audit_record
  FROM task04_synthetic_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA task04_synthetic
  TO task04_synthetic_runtime;
