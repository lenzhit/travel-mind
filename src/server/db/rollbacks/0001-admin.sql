-- Solo base local desechable. No ejecutar sobre una base con historial que deba conservarse.
BEGIN;
DO $$ BEGIN
  IF (SELECT max(created_at) FROM drizzle.__drizzle_migrations) IS DISTINCT FROM 1791653074232 THEN
    RAISE EXCEPTION 'La migración administrativa no es la última. No se puede revertir aquí.';
  END IF;
END $$;
DROP TABLE audit_logs;
DROP TABLE catalog_documents;
DROP TABLE admin_sessions;
ALTER TABLE packages DROP CONSTRAINT packages_price_nonnegative;
ALTER TABLE packages DROP CONSTRAINT packages_duration_positive;
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791653074232;
COMMIT;
