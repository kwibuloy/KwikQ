import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// DATABASE_URL is the documented name; the older names are kept as fallbacks.
const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URI ||
    process.env.Database_URI;

/**
 * TLS settings, verified by default.
 *  DB_SSL=disable                     no TLS (local Postgres, CI)
 *  DB_SSL_CA=<PEM text or file path>  trust this CA (e.g. the Supabase root certificate)
 *  DB_SSL_REJECT_UNAUTHORIZED=false   explicit, insecure opt-out of certificate checks
 */
function buildSslConfig(): PoolConfig['ssl'] {
    if (!connectionString) return undefined;
    if ((process.env.DB_SSL || '').toLowerCase() === 'disable') return false;

    const ssl: { rejectUnauthorized: boolean; ca?: string } = {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };

    const ca = process.env.DB_SSL_CA;
    if (ca) {
        ssl.ca = ca.includes('BEGIN CERTIFICATE') ? ca : existsSync(ca) ? readFileSync(ca, 'utf8') : undefined;
    }

    if (!ssl.rejectUnauthorized) {
        console.warn('[db] DB_SSL_REJECT_UNAUTHORIZED=false: TLS certificate checks are disabled.');
    }
    return ssl;
}

export const pool = new Pool({ connectionString, ssl: buildSslConfig() });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const query = <R extends QueryResultRow = any>(text: string, params?: unknown[]) =>
    pool.query<R>(text, params);

/** Run `fn` inside BEGIN/COMMIT on one pooled client; rolls back on throw. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    } finally {
        client.release();
    }
}

export default query;
