ALTER TABLE "user" ADD COLUMN "ocp_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_as_of_right" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "orientation_completed_at" timestamp with time zone;