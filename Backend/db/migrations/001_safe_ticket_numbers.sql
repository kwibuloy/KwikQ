-- KwikQ migration 001: race-free ticket numbers.
-- Run once against the production database (psql "$DATABASE_URL" -f this-file).
-- Safe to re-run.
--
-- Before running, check for existing duplicate tickets (the unique index below
-- will refuse to build if any exist):
--   SELECT doctor_id, (created_at AT TIME ZONE 'Asia/Singapore')::date AS day, ticket_number, COUNT(*)
--   FROM queues GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;

BEGIN;

-- 1. Store the clinic-local day each ticket belongs to.
ALTER TABLE queues ADD COLUMN IF NOT EXISTS ticket_day date;

UPDATE queues
SET ticket_day = (created_at AT TIME ZONE 'Asia/Singapore')::date
WHERE ticket_day IS NULL;

ALTER TABLE queues
    ALTER COLUMN ticket_day SET DEFAULT (now() AT TIME ZONE 'Asia/Singapore')::date,
    ALTER COLUMN ticket_day SET NOT NULL;

-- 2. A ticket number can only exist once per doctor per day.
CREATE UNIQUE INDEX IF NOT EXISTS queues_doctor_day_ticket_uniq
    ON queues (doctor_id, ticket_day, ticket_number);

-- 3. Per-doctor daily counter, incremented with an atomic upsert in joinQueue.
--    doctor_id copies the type of doctors.doctor_id (integer or uuid).
DO $$
DECLARE doctor_id_type text;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO doctor_id_type
    FROM pg_attribute
    WHERE attrelid = 'doctors'::regclass AND attname = 'doctor_id';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS doctor_ticket_counters (
            doctor_id   %s      NOT NULL REFERENCES doctors (doctor_id) ON DELETE CASCADE,
            ticket_day  date    NOT NULL,
            last_ticket integer NOT NULL,
            PRIMARY KEY (doctor_id, ticket_day)
        )', doctor_id_type);
END $$;

-- 4. Seed counters from tickets already issued, so numbering continues where it is.
INSERT INTO doctor_ticket_counters (doctor_id, ticket_day, last_ticket)
SELECT doctor_id, ticket_day, MAX(ticket_number)
FROM queues
GROUP BY doctor_id, ticket_day
ON CONFLICT (doctor_id, ticket_day)
    DO UPDATE SET last_ticket = GREATEST(doctor_ticket_counters.last_ticket, EXCLUDED.last_ticket);

COMMIT;
