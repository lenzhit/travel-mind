-- Manual rollback after disabling the metrics reader. Preserve measured samples.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM consultation_runs WHERE response_duration_ms IS NOT NULL) THEN
    RAISE EXCEPTION 'response_duration_ms contains samples; rollback refused';
  END IF;
END $$;
ALTER TABLE consultation_runs DROP COLUMN response_duration_ms;
