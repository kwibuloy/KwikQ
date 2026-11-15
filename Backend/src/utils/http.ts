import { Response } from 'express';

/** Log a failure (message only, no stack or driver detail) and answer with a generic 500. */
export function serverError(res: Response, label: string, err: unknown) {
    console.error(label, err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal Server Error' });
}

/** Postgres SQLSTATE of a driver error, e.g. '23505' (unique violation), '23503' (foreign key). */
export const pgCode = (err: unknown) => (err as { code?: string } | null)?.code;

export const normalizeEmail = (email: unknown) => String(email ?? '').trim().toLowerCase();
