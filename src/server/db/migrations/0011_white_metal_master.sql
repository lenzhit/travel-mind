CREATE TABLE "business_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(20) NOT NULL,
	"source_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"error_code" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "business_event_kind_check" CHECK ("business_events"."kind" IN ('consultation','quotation','reservation','notifications','exception')),
	CONSTRAINT "business_event_status_check" CHECK ("business_events"."status" IN ('pending','processing','completed','dead')),
	CONSTRAINT "business_event_attempts_check" CHECK ("business_events"."attempts" >= 0 AND "business_events"."delivery_attempts" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_event_source_idx" ON "business_events" USING btree ("kind","source_id");--> statement-breakpoint
CREATE INDEX "business_event_due_idx" ON "business_events" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE FUNCTION travelmind_enqueue_business_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'consultation_runs' THEN
    INSERT INTO business_events (kind, source_id, correlation_id) VALUES ('consultation', NEW.id, NEW.correlation_id)
      ON CONFLICT (kind, source_id) DO NOTHING;
  ELSIF TG_TABLE_NAME = 'quotations' THEN
    INSERT INTO business_events (kind, source_id, correlation_id) VALUES ('quotation', NEW.id, NEW.correlation_id)
      ON CONFLICT (kind, source_id) DO NOTHING;
  ELSIF TG_TABLE_NAME = 'reservation_events' THEN
    INSERT INTO business_events (kind, source_id, correlation_id)
      VALUES ('reservation', NEW.id, NEW.correlation_id), ('notifications', NEW.id, NEW.correlation_id)
      ON CONFLICT (kind, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER consultation_business_event AFTER INSERT ON consultation_runs FOR EACH ROW EXECUTE FUNCTION travelmind_enqueue_business_event();
--> statement-breakpoint
CREATE TRIGGER quotation_business_event AFTER INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION travelmind_enqueue_business_event();
--> statement-breakpoint
CREATE TRIGGER reservation_business_event AFTER INSERT ON reservation_events FOR EACH ROW EXECUTE FUNCTION travelmind_enqueue_business_event();
--> statement-breakpoint
INSERT INTO business_events (kind, source_id, correlation_id)
  SELECT 'consultation', id, correlation_id FROM consultation_runs WHERE processed_at IS NULL
  ON CONFLICT (kind, source_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO business_events (kind, source_id, correlation_id)
  SELECT 'notifications', e.id, e.correlation_id FROM reservation_events e
  INNER JOIN workflow_outbox o ON o.event_id = e.id WHERE o.status = 'pending'
  ON CONFLICT (kind, source_id) DO NOTHING;
