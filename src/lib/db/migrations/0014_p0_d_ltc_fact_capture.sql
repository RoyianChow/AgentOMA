ALTER TABLE "assessment" ADD COLUMN "ltc_resident" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "ltc_provider_role" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "ltc_is_emergency" boolean;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_virtual_documentation_complete" CHECK ((
      "assessment"."modality" NOT IN ('virtual_from_pharmacy', 'virtual_remote')
      OR NULLIF(BTRIM("assessment"."virtual_location"), '') IS NOT NULL
    ) AND (
      "assessment"."modality" <> 'virtual_remote'
      OR NULLIF(BTRIM("assessment"."remote_reason"), '') IS NOT NULL
    ));--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_ltc_provider_role_valid" CHECK ("assessment"."ltc_provider_role" IS NULL OR "assessment"."ltc_provider_role" IN ('primary', 'secondary'));--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_non_ltc_facts_null" CHECK ("assessment"."ltc_resident" OR (
      "assessment"."ltc_provider_role" IS NULL
      AND "assessment"."ltc_is_emergency" IS NULL
    ));