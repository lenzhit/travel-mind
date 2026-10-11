-- Solo base local y tras exportar decisiones. Deniega pérdida de auditoría.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM case_actions) THEN RAISE EXCEPTION 'Exportar y conservar las decisiones antes de revertir'; END IF;
END $$;
DROP TABLE case_actions;
ALTER TABLE reservations DROP COLUMN case_assignee_id;
-- El historial Drizzle se gestiona al restaurar una copia local previa; no modificarlo a ciegas.
ALTER TABLE reservations DROP COLUMN case_updated_at;
