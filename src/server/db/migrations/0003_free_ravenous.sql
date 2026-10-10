CREATE TABLE "approval_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"actor" varchar(100) NOT NULL,
	"decision" varchar(20) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_decisions_approval_id_unique" UNIQUE("approval_id")
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"quote_version" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_status" CHECK ("approval_requests"."status" IN ('pending','approved','rejected','expired'))
);
--> statement-breakpoint
CREATE TABLE "customer_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(32) NOT NULL,
	"password_hash" varchar(161) NOT NULL,
	"role" varchar(20) DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_username_unique" UNIQUE("username"),
	CONSTRAINT "customer_role" CHECK ("customers"."role" = 'customer')
);
--> statement-breakpoint
CREATE TABLE "mock_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"departure_date" varchar(10) NOT NULL,
	"capacity" integer NOT NULL,
	"remaining" integer NOT NULL,
	"source" varchar(80) DEFAULT 'mock-catalog-capacity-v1' NOT NULL,
	CONSTRAINT "mock_inventory_bounds" CHECK ("mock_inventory"."remaining" >= 0 AND "mock_inventory"."remaining" <= "mock_inventory"."capacity" AND "mock_inventory"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"body" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_reference" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"simulated" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"quote_version" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"refund_status" varchar(20) DEFAULT 'not_required' NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_status" CHECK ("payments"."status" IN ('created','pending','succeeded','failed','cancelled')),
	CONSTRAINT "payment_money" CHECK ("payments"."total_minor" >= 0 AND "payments"."currency" = 'USD')
);
--> statement-breakpoint
CREATE TABLE "provider_booking_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"provider_reference" varchar(80),
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_booking_attempts_reservation_id_unique" UNIQUE("reservation_id")
);
--> statement-breakpoint
CREATE TABLE "reservation_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"quote_version" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"policy_version" varchar(50) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"event" varchar(50) NOT NULL,
	"actor" varchar(100) NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quote_version" integer NOT NULL,
	"status" varchar(30) NOT NULL,
	"reason" varchar(80),
	"traveler_name" varchar(80),
	"idempotency_key" uuid NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"provider_reference" varchar(80),
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_quotation_id_unique" UNIQUE("quotation_id"),
	CONSTRAINT "reservations_provider_reference_unique" UNIQUE("provider_reference"),
	CONSTRAINT "reservation_status" CHECK ("reservations"."status" IN ('pending_approval','pending_payment','payment_processing','pending_provider','confirmed_demo','rejected','expired','failed','manual_review','refund_pending','refunded','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "workflow_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_outbox_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "quotation_versions" ADD COLUMN "status" varchar(30) DEFAULT 'current' NOT NULL;--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approval_id_approval_requests_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approval_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_visitor_id_visitor_sessions_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_inventory" ADD CONSTRAINT "mock_inventory_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_reservation_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reservation_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_booking_attempts" ADD CONSTRAINT "provider_booking_attempts_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_consents" ADD CONSTRAINT "reservation_consents_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_consents" ADD CONSTRAINT "reservation_consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_outbox" ADD CONSTRAINT "workflow_outbox_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_outbox" ADD CONSTRAINT "workflow_outbox_event_id_reservation_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reservation_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_reservation_version_idx" ON "approval_requests" USING btree ("reservation_id","quote_version");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_inventory_departure_idx" ON "mock_inventory" USING btree ("package_id","departure_date");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_channel_idx" ON "notification_deliveries" USING btree ("event_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reservation_key_idx" ON "payments" USING btree ("reservation_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_consent_version_idx" ON "reservation_consents" USING btree ("reservation_id","quote_version");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_customer_key_idx" ON "reservations" USING btree ("customer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "reservations_owner_idx" ON "reservations" USING btree ("customer_id","created_at");--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_version_status" CHECK ("quotation_versions"."status" IN ('current', 'superseded'));