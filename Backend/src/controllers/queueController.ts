import {Request, Response} from 'express';
import { query, withTransaction } from '../config/database.js';

/** Clinic-local calendar day used for daily ticket numbering. */
const CLINIC_TZ = 'Asia/Singapore';

export const getDoctors = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT
                d.doctor_id,
                d.doctor_first_name,
                d.doctor_last_name,
                CONCAT(d.doctor_first_name, ' ', d.doctor_last_name) AS doctor_name,
                d.specialization,
                d.is_available,
                d.room_number,
                COALESCE(qs.current_queue_length, 0) AS current_queue_length,
                (COALESCE(qs.current_queue_length, 0) * 10)::int AS estimated_wait_minutes
            FROM doctors d
            LEFT JOIN (
                SELECT
                    doctor_id,
                    COUNT(*) FILTER (WHERE status IN ('waiting','called','in-consultation'))::int AS current_queue_length
                FROM queues
                WHERE (created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
                GROUP BY doctor_id
            ) qs ON qs.doctor_id = d.doctor_id;
        `);

        res.json(result.rows.map((r: Record<string, unknown>) => ({
            ...r,
            current_queue_length: Number(r.current_queue_length) || 0,
            estimated_wait_minutes: Number(r.estimated_wait_minutes) || 0,
        })));
    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const joinQueue = async (req: Request, res: Response) => {
    const { doctorId } = req.body ?? {};
    const patientId = req.user?.id;

    if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'Patient ID and doctor ID are required' });
    }

    try {
        const outcome = await withTransaction(async (client) => {
            // Serialise joins per patient so the "one active ticket" check can't race.
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`queue-join:${patientId}`]);

            const doctor = await client.query(
                'SELECT doctor_id, is_available FROM doctors WHERE doctor_id = $1 LIMIT 1',
                [doctorId],
            );
            if (doctor.rows.length === 0) return { status: 404, body: { error: 'Doctor not found' } };
            if (!doctor.rows[0].is_available) {
                return { status: 400, body: { error: 'This doctor is currently unavailable and not accepting queue requests' } };
            }

            const existing = await client.query(
                `SELECT doctor_id FROM queues
                 WHERE user_id = $1
                   AND status IN ('waiting', 'called', 'in-consultation')
                   AND ticket_day = (now() AT TIME ZONE $2)::date
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [patientId, CLINIC_TZ],
            );
            if (existing.rows.length > 0) {
                const same = String(existing.rows[0].doctor_id) === String(doctorId);
                return {
                    status: 400,
                    body: { error: same ? "You are already in this doctor's queue" : 'You already have an active queue with another doctor' },
                };
            }

            // Atomic per-doctor, per-day counter: the upsert row-locks the counter, so two
            // concurrent joins always receive different numbers. The unique index on
            // queues (doctor_id, ticket_day, ticket_number) is a second line of defence.
            const counter = await client.query(
                `INSERT INTO doctor_ticket_counters (doctor_id, ticket_day, last_ticket)
                 VALUES ($1, (now() AT TIME ZONE $2)::date, 1)
                 ON CONFLICT (doctor_id, ticket_day)
                 DO UPDATE SET last_ticket = doctor_ticket_counters.last_ticket + 1
                 RETURNING ticket_day, last_ticket`,
                [doctorId, CLINIC_TZ],
            );
            const { ticket_day, last_ticket } = counter.rows[0];

            const inserted = await client.query(
                `INSERT INTO queues (user_id, doctor_id, ticket_number, ticket_day, status)
                 VALUES ($1, $2, $3, $4, 'waiting')
                 RETURNING queue_id, ticket_number, status, created_at`,
                [patientId, doctorId, last_ticket, ticket_day],
            );
            return { status: 201, body: { message: 'Joined queue successfully', data: inserted.rows[0] } };
        });

        return res.status(outcome.status).json(outcome.body);
    } catch (err) {
        if ((err as { code?: string })?.code === '23505') {
            return res.status(409).json({ error: 'Ticket conflict, please try again' });
        }
        console.error('Error joining queue:', err instanceof Error ? err.message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getAdminQueue = async (req: Request, res: Response) => {
    const { doctorId } = req.params;

    try {
        const sql = `
            SELECT
                q.queue_id,
                q.ticket_number,
                CONCAT(u.user_first_name, ' ', u.user_last_name) AS patient_name,
                q.status,
                TO_CHAR(q.created_at AT TIME ZONE 'Asia/Singapore', 'HH12:MI AM') as arrival_time
            FROM queues q
            JOIN users u ON q.user_id = u.user_id
            WHERE q.doctor_id = $1
                AND q.status IN ('waiting', 'called', 'in-consultation')
                AND (q.created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            ORDER BY q.created_at ASC;
        `;

        const result = await query(sql, [doctorId]);
        // always return an array (possibly empty) with 200 status
        return res.status(200).json(result.rows || []);
    } catch (error) {
        console.error('Error fetching admin queue:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getAdminPatientLogs = async (req: Request, res: Response) => {
    const { doctorId } = req.params;

    try {
        const sql = `
            SELECT
                q.queue_id,
                q.ticket_number,
                q.status,
                q.created_at,
                CONCAT(u.user_first_name, ' ', u.user_last_name) AS patient_name,
                TO_CHAR(q.created_at AT TIME ZONE 'Asia/Singapore', 'HH12:MI AM') as served_time
            FROM queues q
            JOIN users u ON q.user_id = u.user_id
            WHERE q.doctor_id = $1
                AND q.status = 'served'
            ORDER BY q.created_at DESC;
        `;

        const result = await query(sql, [doctorId]);
        return res.status(200).json(result.rows || []);
    } catch (error) {
        console.error('Error fetching admin patient logs:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const callNextPatient = async (req: Request, res: Response) => {
    const { doctorId } = req.params;

    try {
        const sql = `
            UPDATE queues
            SET status = 'called'
            WHERE queue_id = (
                SELECT queue_id
                FROM queues
                WHERE doctor_id = $1
                    AND status = 'waiting'
                    AND (created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
                ORDER BY ticket_number ASC
                LIMIT 1
            )
            RETURNING queue_id, ticket_number, user_id;
        `;

        const result = await query(sql, [doctorId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No patients in queue' });
        }

        res.json({
            message: 'Next patient called successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error calling next patient:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getPatientStatus = async (req: Request, res: Response) => {
    const patientId = req.user?.id;

    if (!patientId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const sql = `
            SELECT
                q.queue_id,
                q.ticket_number,
                q.status,
                d.room_number,
                (
                    SELECT COUNT(*)::int + 1
                    FROM queues q2
                    WHERE q2.doctor_id = q.doctor_id
                      AND q2.status = 'waiting'
                      AND q2.ticket_number < q.ticket_number
                      AND (q2.created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
                ) AS position_in_queue
            FROM queues q
            LEFT JOIN doctors d ON q.doctor_id = d.doctor_id
            WHERE q.user_id = $1
              AND q.status IN ('waiting', 'called', 'in-consultation')
              AND (q.created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            ORDER BY q.created_at DESC
            LIMIT 1;
        `;

        const result = await query(sql, [patientId]);

        if (result.rows.length === 0) {
            return res.status(200).json({});
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error getting patient status:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const cancelQueue = async (req: Request, res: Response) => {
    const patientId = req.user?.id; 
    try {
        const sql = `
            UPDATE queues
            SET status = 'cancelled'
            WHERE queue_id = (
                SELECT queue_id FROM queues
                WHERE user_id = $1
                  AND status = 'waiting'
                  AND (created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
                ORDER BY created_at ASC
                LIMIT 1
            )
            RETURNING queue_id, ticket_number, status;
        `;
        const result = await query(sql, [patientId]);
        if (result.rowCount === 0) {
            return res.status(200).json({ message: 'No active queue entry found for this user today', data: null });
        }
        return res.status(200).json({ message: 'Queue cancelled successfully', data: result.rows[0] });
    } catch (err) {
        console.error('Error cancelling queue:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getQueueHistory = async (req: Request, res: Response) => {
    const patientId = req.user?.id; 
    try {
        const sql = `
            SELECT
                q.queue_id,
                q.ticket_number,
                q.status,
                q.created_at,
                q.doctor_id,
                CONCAT(d.doctor_first_name, ' ', d.doctor_last_name) AS doctor_name,
                d.specialization AS doctor_specialization,
                d.room_number AS doctor_room
            FROM queues q
            LEFT JOIN doctors d ON q.doctor_id = d.doctor_id
            WHERE q.user_id = $1
            ORDER BY q.created_at DESC;
        `;
        const result = await query(sql, [patientId]);
        return res.status(200).json(result.rows || []);
    } catch (err) {
        console.error('Error fetching queue history:', err && (err as Error).message ? (err as Error).message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const startSession = async (req: Request, res: Response) => {
    const { queueId } = req.params;
    try {
        const sql = `
            UPDATE queues
            SET status = 'in-consultation'
            WHERE queue_id = $1
                AND status = 'called'
            RETURNING queue_id, ticket_number, status;
        `;
        const result = await query(sql, [queueId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Queue entry not found or not in called status' });
        }
        return res.status(200).json({ message: 'Session started', data: result.rows[0] });
    } catch (err) {
        console.error('Error starting session:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const completeSession = async (req: Request, res: Response) => {
    const { queueId } = req.params;
    try {
        const sql = `
            UPDATE queues
            SET status = 'served'
            WHERE queue_id = $1
                AND status = 'in-consultation'
            RETURNING queue_id, ticket_number, status;
        `;
        const result = await query(sql, [queueId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Queue entry not found or not in in-consultation status' });
        }
        return res.status(200).json({ message: 'Session completed', data: result.rows[0] });
    } catch (err) {
        console.error('Error completing session:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const skipCurrentPatient = async (req: Request, res: Response) => {
    const { doctorId } = req.params;
    try {
        const selectSql = `
            SELECT queue_id, status
            FROM queues
            WHERE doctor_id = $1
              AND status IN ('called', 'in-consultation')
              AND (created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            ORDER BY ticket_number ASC
            LIMIT 1;
        `;

        const candidate = await query(selectSql, [doctorId]);

        if (candidate.rows.length === 0) {
            return res.status(404).json({ message: 'No called patient to skip' });
        }

        const { queue_id: queueId, status } = candidate.rows[0];

        if (status === 'in-consultation') {
            return res.status(400).json({ error: 'Cannot skip patient: consultation already started' });
        }

        const updateSql = `
            UPDATE queues
            SET status = 'skipped'
            WHERE queue_id = $1
              AND status = 'called'
            RETURNING queue_id, ticket_number, user_id, status;
        `;

        const result = await query(updateSql, [queueId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No called patient to skip' });
        }

        return res.status(200).json({ message: 'Patient skipped', data: result.rows[0] });
    } catch (err) {
        console.error('Error skipping patient:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const closeCurrentPatient = async (req: Request, res: Response) => {
    const { doctorId } = req.params;
    try {
        const sql = `
            UPDATE queues
            SET status = 'removed'
            WHERE doctor_id = $1
              AND status = 'waiting'
              AND (created_at AT TIME ZONE 'Asia/Singapore')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Singapore')::date
            RETURNING queue_id, ticket_number, user_id, status;
        `;
        const result = await query(sql, [doctorId]);
        if (result.rowCount === 0) {
            return res.status(200).json({ message: 'No waiting patients to remove', data: [], removedCount: 0 });
        }
        return res.status(200).json({ message: 'Queue closed: waiting patients removed', data: result.rows, removedCount: result.rowCount });
    } catch (err) {
        console.error('Error closing patient:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const updateDoctorAvailability = async (req: Request, res: Response) => {
    const { doctorId } = req.params;
    const { isAvailable } = req.body;

    try {
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ error: 'isAvailable (boolean) is required' });
        }

        const sql = `
            UPDATE doctors
            SET is_available = $2
            WHERE doctor_id = $1
            RETURNING doctor_id, is_available;
        `;

        const result = await query(sql, [doctorId, isAvailable]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        return res.status(200).json({
            message: `Doctor marked as ${isAvailable ? 'available' : 'unavailable'}`,
            doctor: result.rows[0],
        });
    } catch (err) {
        console.error('Error updating doctor availability:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}