-- Manual rollback only after disabling the event dispatcher and reviewing the queue.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM business_events) THEN
    RAISE EXCEPTION 'business_events contains history or unfinished work; rollback refused';
  END IF;
END $$;
DROP TRIGGER IF EXISTS consultation_business_event ON consultation_runs;
DROP TRIGGER IF EXISTS quotation_business_event ON quotations;
DROP TRIGGER IF EXISTS reservation_business_event ON reservation_events;
DROP FUNCTION IF EXISTS travelmind_enqueue_business_event();
DROP TABLE business_events;
