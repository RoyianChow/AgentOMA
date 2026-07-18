CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"supervising_pharmacist_id" uuid,
	"token_hash" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "supervising_pharmacist_id" uuid;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_supervising_pharmacist_id_user_id_fk" FOREIGN KEY ("supervising_pharmacist_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_used_by_user_id_user_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_supervising_pharmacist_id_user_id_fk" FOREIGN KEY ("supervising_pharmacist_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;