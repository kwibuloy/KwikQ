-- Minimal schema used by the integration tests (tests/*.db.test.ts).
-- It mirrors the columns the backend queries; it is not a full production schema.
DROP TABLE IF EXISTS doctor_ticket_counters, queues, admin_invitations, users, doctors CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    user_id         uuid PRIMARY KEY,
    email           text NOT NULL UNIQUE,
    user_first_name text NOT NULL,
    user_last_name  text NOT NULL,
    role            text NOT NULL CHECK (role IN ('patient', 'admin')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doctors (
    doctor_id         serial PRIMARY KEY,
    doctor_first_name text NOT NULL,
    doctor_last_name  text NOT NULL,
    specialization    text NOT NULL,
    room_number       text,
    is_available      boolean NOT NULL DEFAULT true
);

CREATE TABLE queues (
    queue_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users (user_id),
    doctor_id     integer NOT NULL REFERENCES doctors (doctor_id),
    ticket_number integer NOT NULL,
    status        text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_invitations (
    invitation_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    invitation_code text NOT NULL UNIQUE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz
);
