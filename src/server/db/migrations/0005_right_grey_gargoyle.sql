CREATE TABLE "case_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"result_status" varchar(30) NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_action_type" CHECK ("case_actions"."action" IN ('assign', 'note', 'close_unpaid'))
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "case_assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_actor_id_customers_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_action_key_idx" ON "case_actions" USING btree ("reservation_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "case_actions_reservation_idx" ON "case_actions" USING btree ("reservation_id","created_at");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_case_assignee_id_customers_id_fk" FOREIGN KEY ("case_assignee_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;