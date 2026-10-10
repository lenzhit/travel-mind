-- Solo base desechable local. Respaldar y retirar el código de reservas antes de revertir.
BEGIN;
DO $$ BEGIN
  IF (SELECT max(created_at) FROM drizzle.__drizzle_migrations) IS DISTINCT FROM 1791657705856 THEN
    RAISE EXCEPTION 'La migración de reservas no es la última.';
  END IF;
END $$;
ALTER TABLE visitor_sessions DROP CONSTRAINT visitor_sessions_customer_id_customers_id_fk;
ALTER TABLE visitor_sessions DROP COLUMN customer_id;
DROP TABLE notification_deliveries, workflow_outbox, approval_decisions, payment_events;
DROP TABLE customer_sessions, approval_requests, payments, provider_booking_attempts, reservation_consents, reservation_events;
DROP TABLE reservations, mock_inventory, customers;
ALTER TABLE quotation_versions DROP CONSTRAINT quotation_version_status;
ALTER TABLE quotation_versions DROP COLUMN status;
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791657705856;
COMMIT;
