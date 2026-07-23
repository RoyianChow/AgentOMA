-- The legacy enum and the new reference table intentionally share the public
-- name `odb_fee_tier`. Rename the enum first so PostgreSQL can create the
-- table's composite type without a namespace collision.
ALTER TYPE "public"."odb_fee_tier" RENAME TO "odb_fee_tier_legacy";--> statement-breakpoint
CREATE TABLE "odb_fee_tier" (
	"code" text PRIMARY KEY NOT NULL,
	"dispensing_fee_cents" integer NOT NULL,
	"remote_virtual_eligible" boolean NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date
);
--> statement-breakpoint
COMMENT ON COLUMN "odb_fee_tier"."dispensing_fee_cents" IS 'ODB dispensing fee in cents; this is not the minor-ailment service fee from pin.fee_cents';--> statement-breakpoint
COMMENT ON COLUMN "odb_fee_tier"."remote_virtual_eligible" IS 'Operative EO Notice fee-tier rule; do not infer eligibility from postal-code or rural heuristics';--> statement-breakpoint
-- Restrictive bootstrap row: required before the FK can be added to existing
-- pharmacies. The shared idempotent seed owns the full four-row data set and
-- upserts this row from the canonical TypeScript source.
INSERT INTO "odb_fee_tier" (
	"code",
	"dispensing_fee_cents",
	"remote_virtual_eligible",
	"effective_date"
) VALUES (
	'regular_8_83',
	883,
	false,
	'2026-07-01'
);--> statement-breakpoint
-- DEFAULT + NOT NULL backfills every existing pharmacy to the most restrictive
-- tier. A rural tier must be selected deliberately after migration.
ALTER TABLE "pharmacy" ADD COLUMN "odb_fee_tier_code" text DEFAULT 'regular_8_83' NOT NULL;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD CONSTRAINT "pharmacy_odb_fee_tier_code_odb_fee_tier_code_fk" FOREIGN KEY ("odb_fee_tier_code") REFERENCES "public"."odb_fee_tier"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy" DROP COLUMN "odb_fee_tier";--> statement-breakpoint
DROP TYPE "public"."odb_fee_tier_legacy";
