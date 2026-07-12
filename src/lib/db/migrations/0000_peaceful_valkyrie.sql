CREATE TYPE "public"."billing_modality" AS ENUM('in_person', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."claim_rule_type" AS ENUM('same_day_mutex', 'scope_exclusion');--> statement-breakpoint
CREATE TYPE "public"."red_flag_question_type" AS ENUM('boolean', 'choice', 'text');--> statement-breakpoint
CREATE TABLE "ailment_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"max_claims_per365_days" integer NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ailment_group_code_effective_uq" UNIQUE("code","effective_date")
);
--> statement-breakpoint
CREATE TABLE "ailment_red_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ailment_group_id" uuid NOT NULL,
	"key" text NOT NULL,
	"prompt" text NOT NULL,
	"question_type" "red_flag_question_type" NOT NULL,
	"choices" jsonb,
	"triggers_referral" boolean DEFAULT true NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"pharmacist_reviewed" boolean DEFAULT false NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"rule_type" "claim_rule_type" NOT NULL,
	"description" text NOT NULL,
	"ailment_codes" jsonb,
	"ailment_code" text,
	"params" jsonb,
	"effective_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_rule_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ailment_group_id" uuid NOT NULL,
	"modality" "billing_modality" NOT NULL,
	"rx_issued" boolean NOT NULL,
	"pin_code" text NOT NULL,
	"fee_cents" integer NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pin_group_modality_rx_effective_uq" UNIQUE("ailment_group_id","modality","rx_issued","effective_date")
);
--> statement-breakpoint
ALTER TABLE "ailment_red_flag" ADD CONSTRAINT "ailment_red_flag_ailment_group_id_ailment_group_id_fk" FOREIGN KEY ("ailment_group_id") REFERENCES "public"."ailment_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin" ADD CONSTRAINT "pin_ailment_group_id_ailment_group_id_fk" FOREIGN KEY ("ailment_group_id") REFERENCES "public"."ailment_group"("id") ON DELETE cascade ON UPDATE no action;