/**
 * Unit-level security tests. The database and Supabase are mocked, so these run anywhere.
 * Behaviour that depends on real Postgres locking lives in db.integration.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createSupabaseMock, fakeUser } from './helpers.js';

const supabase = vi.hoisted(() => ({
    auth: { getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn() },
}));
const db = vi.hoisted(() => ({
    query: vi.fn(),
    clientQuery: vi.fn(),
}));

vi.mock('../src/config/supabase.js', () => ({ supabase }));
vi.mock('../src/config/database.js', () => ({
    query: db.query,
    default: db.query,
    pool: {},
    withTransaction: async (fn: (client: { query: typeof db.clientQuery }) => unknown) => {
        db.clientQuery('BEGIN');
        try {
            const out = await fn({ query: db.clientQuery });
            db.clientQuery('COMMIT');
            return out;
        } catch (err) {
            db.clientQuery('ROLLBACK');
            throw err;
        }
    },
}));

const { createApp } = await import('../src/app.js');
const app = createApp({ corsOrigins: ['https://app.kwikq.test'], authRateLimit: 1000 });

/** Make the users-table lookup in authenticateUser return this role (or no row). */
function dbRoleIs(role: string | null) {
    db.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT role FROM users')) {
            return { rows: role ? [{ role }] : [], rowCount: role ? 1 : 0 };
        }
        return { rows: [], rowCount: 0 };
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(supabase, createSupabaseMock());
});

describe('role escalation through user_metadata', () => {
    it('ignores user_metadata.role when the user has no row in users', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: fakeUser('u1', 'admin') }, error: null });
        dbRoleIs(null);

        const res = await request(app).get('/api/admin/invitations').set('Authorization', 'Bearer t');
        expect(res.status).toBe(403);
    });

    it('uses the users-table role even when metadata claims admin', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: fakeUser('u2', 'admin') }, error: null });
        dbRoleIs('patient');

        const res = await request(app).get('/api/admin/invitations').set('Authorization', 'Bearer t');
        expect(res.status).toBe(403);
    });

    it('rejects an invalid token', async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
        const res = await request(app).get('/api/admin/invitations').set('Authorization', 'Bearer nope');
        expect(res.status).toBe(401);
    });

    it('login reports the users-table role, not the metadata role', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: fakeUser('u3', 'admin'), session: { access_token: 'x' } },
            error: null,
        });
        db.query.mockResolvedValue({
            rows: [{ user_id: 'u3', role: 'patient', user_first_name: 'A', user_last_name: 'B' }],
            rowCount: 1,
        });
        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c', password: 'pw' });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('patient');
    });

    it('login refuses a Supabase user with no users row', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: fakeUser('u4', 'admin'), session: { access_token: 'x' } },
            error: null,
        });
        db.query.mockResolvedValue({ rows: [], rowCount: 0 });
        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c', password: 'pw' });
        expect(res.status).toBe(403);
    });
});

describe('login edge states', () => {
    it('tells the user to confirm their email instead of "invalid password"', async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
        });
        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c', password: 'pw' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('email_not_confirmed');
        expect(res.body.error).toMatch(/confirm your email/i);
    });

    it('rejects a login without credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400);
    });
});

describe('admin-only routes refuse patients', () => {
    const adminRoutes: Array<[method: 'get' | 'post' | 'patch' | 'delete', path: string]> = [
        ['post', '/api/admin/invite'],
        ['get', '/api/admin/invitations'],
        ['post', '/api/admin/invitations/resend'],
        ['post', '/api/admin/invitations/revoke'],
        ['post', '/api/admin/doctors'],
        ['delete', '/api/admin/doctors/1'],
        ['get', '/api/queue/admin/1'],
        ['get', '/api/queue/admin-history/1'],
        ['patch', '/api/admin/call-next/1'],
        ['patch', '/api/admin/start-session/q1'],
        ['patch', '/api/admin/complete-session/q1'],
        ['patch', '/api/admin/skip/1'],
        ['patch', '/api/admin/close/1'],
        ['patch', '/api/admin/doctor-availability/1'],
    ];

    it.each(adminRoutes)('%s %s → 403 for a patient', async (method, path) => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: fakeUser('p1', 'admin') }, error: null });
        dbRoleIs('patient');
        const res = await request(app)[method](path).set('Authorization', 'Bearer t').send({});
        expect(res.status).toBe(403);
    });

    it.each(adminRoutes)('%s %s → 401 without a token', async (method, path) => {
        const res = await request(app)[method](path).send({});
        expect(res.status).toBe(401);
    });
});

describe('register role whitelist', () => {
    const base = { email: 'new@example.test', password: 'Secret123!', firstName: 'New', lastName: 'Person' };

    beforeEach(() => {
        supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null });
        db.clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
            if (typeof sql === 'string' && sql.includes('INSERT INTO users')) {
                return { rows: [{ user_id: params?.[0], role: params?.[4] }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });
    });

    it.each(['doctor', 'superadmin', 'ADMIN', 'staff'])('rejects requested role %s', async (role) => {
        const res = await request(app).post('/api/auth/register').send({ ...base, role });
        expect(res.status).toBe(400);
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('defaults to patient and keeps the role out of user_metadata', async () => {
        const res = await request(app).post('/api/auth/register').send(base);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('patient');
        const metadata = supabase.auth.signUp.mock.calls[0][0].options.data;
        expect(metadata).not.toHaveProperty('role');
    });

    it('refuses admin without an invitation code', async () => {
        const res = await request(app).post('/api/auth/register').send({ ...base, role: 'admin' });
        expect(res.status).toBe(403);
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('refuses admin when the invitation cannot be claimed, before creating the account', async () => {
        // DELETE ... RETURNING finds nothing (wrong code, wrong email, expired or already used)
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...base, role: 'admin', invitationCode: 'ABC123' });
        expect(res.status).toBe(403);
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
        expect(db.clientQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('never overwrites an existing user row (no role change on conflict)', async () => {
        db.clientQuery.mockImplementation(async (sql: string) => {
            if (typeof sql === 'string' && sql.includes('INSERT INTO users')) {
                expect(sql).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
                return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 0 };
        });
        const res = await request(app).post('/api/auth/register').send(base);
        expect(res.status).toBe(409);
    });

    it('does not leak database error details', async () => {
        db.clientQuery.mockImplementation(async (sql: string) => {
            if (typeof sql === 'string' && sql.includes('INSERT INTO users')) {
                throw new Error('duplicate key value violates unique constraint "users_email_key"');
            }
            return { rows: [], rowCount: 0 };
        });
        const res = await request(app).post('/api/auth/register').send(base);
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal Server Error' });
    });
});

describe('http hardening', () => {
    it('sets helmet headers', async () => {
        const res = await request(app).get('/healthz');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('only allows configured CORS origins', async () => {
        const ok = await request(app).get('/healthz').set('Origin', 'https://app.kwikq.test');
        expect(ok.headers['access-control-allow-origin']).toBe('https://app.kwikq.test');

        const bad = await request(app).get('/healthz').set('Origin', 'https://evil.example');
        expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('rate limits the auth endpoints', async () => {
        const limited = createApp({ corsOrigins: [], authRateLimit: 3 });
        supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'x' } });
        const statuses: number[] = [];
        for (let i = 0; i < 5; i++) {
            statuses.push((await request(limited).post('/api/auth/login').send({ email: 'a@b.c', password: 'x' })).status);
        }
        expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
        expect(statuses.slice(3)).toEqual([429, 429]);
    });
});
