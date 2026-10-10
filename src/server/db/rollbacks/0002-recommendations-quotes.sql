-- Solo base local desechable. Respaldar datos y retirar el código de fase 2 antes de ejecutar.
BEGIN;
DO $$ BEGIN
  IF (SELECT max(created_at) FROM drizzle.__drizzle_migrations) IS DISTINCT FROM 1791654877177 THEN
    RAISE EXCEPTION 'La migración de recomendaciones/cotizaciones no es la última.';
  END IF;
END $$;
DROP TABLE quotation_versions;
DROP TABLE quotations;
DROP TABLE visitor_sessions;
DROP TABLE rag_chunks;
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1791654877177;
COMMIT;
