ALTER TABLE "case_actions" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "case_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_assignee_id_customers_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;