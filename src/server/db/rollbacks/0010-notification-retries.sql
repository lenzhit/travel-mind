-- Desarrollo local únicamente. Retirar antes el código que consulta notification_retry_actions.
-- No borrar decisiones auditadas; conservar respaldo y resolverlas antes de revertir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM notification_retry_actions LIMIT 1) THEN
    RAISE EXCEPTION 'notification_retry_actions contiene decisiones: conservar el historial antes de revertir';
  END IF;
END $$;

DROP TABLE notification_retry_actions;
