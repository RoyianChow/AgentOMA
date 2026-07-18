-- claim_draft: exactly one ACTIVE draft per assessment, and immutability with
-- supersession. Neither is expressible in the Drizzle schema, so both live here.

-- ── One active draft per assessment ──────────────────────────────────────────
--
-- A partial UNIQUE INDEX would enforce this, but it is checked per-statement.
-- A supersede inserts the replacement and then marks the original, so there are
-- briefly two active drafts inside the transaction — a non-deferred index
-- rejects that at INSERT and forces callers into a fragile
-- pre-generate-the-uuid-and-update-first dance (which also needs a deferred FK).
--
-- A partial EXCLUDE constraint can be DEFERRABLE. Deferred to COMMIT, the
-- invariant still holds at every boundary another transaction can observe, and
-- the obvious ordering just works. Violations raise 23P01.
ALTER TABLE claim_draft
  ADD CONSTRAINT claim_draft_one_active_per_assessment
  EXCLUDE USING btree (assessment_id WITH =)
  WHERE (superseded_by_id IS NULL)
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
-- ── Immutability, with supersession ──────────────────────────────────────────
--
-- "Immutable" collides with "the pharmacist made a typo" on day one of a pilot,
-- and the pressure is then to weaken the trigger. Supersession is the way out:
-- corrections INSERT a new row and point the old row's superseded_by_id at it,
-- so the mistake AND the correction both survive for post-payment review.
--
--   * DELETE  — always blocked.
--   * UPDATE  — blocked for every column EXCEPT superseded_by_id.
--   * superseded_by_id — set once (NULL -> value). Never changed, never cleared:
--     un-superseding rewrites history just as effectively as an UPDATE.
CREATE OR REPLACE FUNCTION claim_draft_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'claim_draft is append-only; DELETE is not permitted (supersede instead)'
      USING ERRCODE = '0A000';
  END IF;

  IF (
    NEW.id, NEW.assessment_id, NEW.ailment_group_code, NEW.modality,
    NEW.billing_modality, NEW.rx_issued, NEW.pin_code, NEW.fee_cents,
    NEW.prescriber_id_reference, NEW.prescriber_id, NEW.intervention_codes,
    NEW.carrier_id, NEW.quantity, NEW.ssc, NEW.created_at
  ) IS DISTINCT FROM (
    OLD.id, OLD.assessment_id, OLD.ailment_group_code, OLD.modality,
    OLD.billing_modality, OLD.rx_issued, OLD.pin_code, OLD.fee_cents,
    OLD.prescriber_id_reference, OLD.prescriber_id, OLD.intervention_codes,
    OLD.carrier_id, OLD.quantity, OLD.ssc, OLD.created_at
  ) THEN
    RAISE EXCEPTION 'claim_draft is immutable; only superseded_by_id may be set (insert a superseding draft instead)'
      USING ERRCODE = '0A000';
  END IF;

  IF OLD.superseded_by_id IS NOT NULL
     AND NEW.superseded_by_id IS DISTINCT FROM OLD.superseded_by_id THEN
    RAISE EXCEPTION 'claim_draft supersession is final; it cannot be changed or cleared'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.superseded_by_id IS NOT NULL AND NEW.superseded_by_id = NEW.id THEN
    RAISE EXCEPTION 'claim_draft cannot supersede itself'
      USING ERRCODE = '0A000';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS claim_draft_no_mutate ON claim_draft;
--> statement-breakpoint
CREATE TRIGGER claim_draft_no_mutate
  BEFORE UPDATE OR DELETE ON claim_draft
  FOR EACH ROW EXECUTE FUNCTION claim_draft_immutable();
--> statement-breakpoint
REVOKE DELETE ON claim_draft FROM PUBLIC;
