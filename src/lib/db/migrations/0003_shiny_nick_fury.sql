CREATE TYPE "public"."odb_fee_tier" AS ENUM('regular_8_83', 'rural_9_93', 'rural_12_14', 'rural_13_25');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient" DROP CONSTRAINT "patient_health_number_unique";--> statement-breakpoint
ALTER TABLE "patient" ADD COLUMN "pharmacy_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "hns_account_id" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "odb_fee_tier" "odb_fee_tier" DEFAULT 'regular_8_83' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_health_number_per_pharmacy" ON "patient" USING btree ("pharmacy_id","health_number");