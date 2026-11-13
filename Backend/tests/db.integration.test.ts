/**
 * Integration tests against a real, disposable PostgreSQL database.
 * Set TEST_DATABASE_URL to run them (CI starts a postgres service for this).
 * The schema is DROPPED and recreated, so never point this at a real database.
 * Supabase is still mocked.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { fakeUser } from './helpers.js';

const TEST_DB = process.env.TEST_DATABASE_URL;

const supabase = vi.hoisted(() => ({
    auth: { getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn() },
}));
vi.mock('../src/config/supabase.js', () => ({ supabase }));

describe.skipIf(!TEST_DB)('with a real database', () => {
    // Loaded lazily so the module reads TEST_DATABASE_URL, never the .env database.
    let app: import('express').Express;
    let db: typeof import('../src/config/database.js');

    beforeAll(async () => {
        process.env.DATABASE_URL = TEST_DB;
        process.env.DB_SSL = 'disable';
        db = await import('../src/config/database.js');
        const { createApp } = await import('../src/app.js');
        app = createApp({ corsOrigins: [], authRateLimit: 10_000 });

        const dir = join(import.meta.dirname, '..', 'db');
        await db.query(readFileSync(join(dir, 'test-schema.sql'), 'utf8'));
        await db.query(readFileSync(join(dir, 'migrations', '001_safe_ticket_numbers.sql'), 'utf8'));
    });

    afterAll(async () => {
        await db?.pool.end();
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        await db.query('TRUNCATE doctor_ticket_counters, queues, admin_invitations, users, doctors RESTART IDENTITY CASCADE');
    });

    async function makePatients(n: number) {
        const ids = Array.from({ length: n }, () => randomUUID());
        for (const id of ids) {
            await db.query(
                `INSERT INTO users (user_id, email, user_first_name, user_last_name, role) VALUES ($1, $2, 'P', 'Q', 'patient')`,
                [id, `${id}@example.test`],
            );
        }
        // Each bearer token is the user's id.
        supabase.auth.getUser.mockImplementation(async (token: string) => ({ data: { user: fakeUser(token) }, error: null }));
        return ids;
    }

    it('concurrent joins get distinct, gap-free tickets', async () => {
        const { rows } = await db.query(
            `INSERT INTO doctors (doctor_first_name, doctor_last_name, specialization) VALUES ('D', 'R', 'GP') RETURNING doctor_id`,
        );
        const doctorId = rows[0].doctor_id;
        const patients = await makePatients(25);

        const responses = await Promise.all(
            patients.map((id) => request(app).post('/api/queue/join').set('Authorization', `Bearer ${id}`).send({ doctorId })),
        );

        expect(responses.map((r) => r.status)).toEqual(patients.map(() => 201));
        const tickets = responses.map((r) => r.body.data.ticket_number).sort((a, b) => a - b);
        expect(tickets).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    });

    it('one patient firing joins in parallel gets exactly one ticket', async () => {
        const { rows } = await db.query(
            `INSERT INTO doctors (doctor_first_name, doctor_last_name, specialization) VALUES ('D', 'R', 'GP') RETURNING doctor_id`,
        );
        const [patient] = await makePatients(1);
        const responses = await Promise.all(
            Array.from({ length: 8 }, () =>
                request(app).post('/api/queue/join').set('Authorization', `Bearer ${patient}`).send({ doctorId: rows[0].doctor_id }),
            ),
        );
        expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    });

    it('the unique index rejects a duplicate ticket number', async () => {
        const { rows } = await db.query(
            `INSERT INTO doctors (doctor_first_name, doctor_last_name, specialization) VALUES ('D', 'R', 'GP') RETURNING doctor_id`,
        );
        const [a, b] = await makePatients(2);
        const insert = `INSERT INTO queues (user_id, doctor_id, ticket_number, status) VALUES ($1, $2, 7, 'waiting')`;
        await db.query(insert, [a, rows[0].doctor_id]);
        await expect(db.query(insert, [b, rows[0].doctor_id])).rejects.toMatchObject({ code: '23505' });
    });

    it('an invitation code can only be used once, even concurrently', async () => {
        await db.query(`INSERT INTO admin_invitations (email, invitation_code) VALUES ('boss@example.test', 'C0DE42')`);
        supabase.auth.signUp.mockImplementation(async () => ({ data: { user: { id: randomUUID() } }, error: null }));

        const body = {
            email: 'boss@example.test',
            password: 'Secret123!',
            firstName: 'Boss',
            lastName: 'Person',
            role: 'admin',
            invitationCode: 'c0de42',
        };
        const responses = await Promise.all(
            Array.from({ length: 5 }, () => request(app).post('/api/auth/register').send(body)),
        );

        expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
        expect(responses.filter((r) => r.status === 403)).toHaveLength(4);
        const admins = await db.query(`SELECT role FROM users WHERE role = 'admin'`);
        expect(admins.rowCount).toBe(1);
        const left = await db.query('SELECT 1 FROM admin_invitations');
        expect(left.rowCount).toBe(0);
    });

    it('an expired invitation is refused and not consumed', async () => {
        await db.query(
            `INSERT INTO admin_invitations (email, invitation_code, expires_at) VALUES ('old@example.test', 'EXP111', now() - interval '1 day')`,
        );
        const res = await request(app).post('/api/auth/register').send({
            email: 'old@example.test', password: 'x', firstName: 'O', lastName: 'L', role: 'admin', invitationCode: 'EXP111',
        });
        expect(res.status).toBe(403);
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('a failed sign-up rolls back the invitation claim', async () => {
        await db.query(`INSERT INTO admin_invitations (email, invitation_code) VALUES ('retry@example.test', 'RETRY1')`);
        supabase.auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { status: 422, message: 'Password too weak' } });

        const res = await request(app).post('/api/auth/register').send({
            email: 'retry@example.test', password: 'x', firstName: 'R', lastName: 'T', role: 'admin', invitationCode: 'RETRY1',
        });
        expect(res.status).toBe(422);
        const left = await db.query('SELECT 1 FROM admin_invitations');
        expect(left.rowCount).toBe(1);
    });
});
