CREATE TABLE "notification_retry_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" varchar(500) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_retry_actions" ADD CONSTRAINT "notification_retry_actions_delivery_id_notification_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_retry_actions" ADD CONSTRAINT "notification_retry_actions_actor_id_customers_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_retry_key_idx" ON "notification_retry_actions" USING btree ("delivery_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_retry_delivery_idx" ON "notification_retry_actions" USING btree ("delivery_id","created_at");