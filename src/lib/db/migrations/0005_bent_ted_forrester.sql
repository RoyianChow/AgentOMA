CREATE TABLE "claim_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"ailment_group_code" text NOT NULL,
	"modality" text NOT NULL,
	"billing_modality" text NOT NULL,
	"rx_issued" boolean NOT NULL,
	"pin_code" text NOT NULL,
	"fee_cents" integer NOT NULL,
	"prescriber_id_reference" text NOT NULL,
	"prescriber_id" text NOT NULL,
	"intervention_codes" jsonb NOT NULL,
	"carrier_id" text,
	"quantity" integer NOT NULL,
	"ssc" integer,
	"superseded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_draft" ADD CONSTRAINT "claim_draft_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_draft" ADD CONSTRAINT "claim_draft_superseded_by_id_claim_draft_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."claim_draft"("id") ON DELETE no action ON UPDATE no action;