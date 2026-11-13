import { randomBytes } from 'crypto';
import { query } from '../config/database.js';

export interface AdminInvitationRow {
    invitation_id: string;
    email: string;
    invitation_code: string;
    created_at: Date;
    expires_at?: Date | null;
}

export function generateInvitationCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
}

export function normalizeInvitationCode(code: string): string {
    return code.trim().toUpperCase();
}

export function isInvitationExpired(expiresAt?: Date | string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
}

export async function findInvitationByCode(code: string): Promise<AdminInvitationRow | null> {
    const normalized = normalizeInvitationCode(code);
    const sql = `
        SELECT invitation_id, email, invitation_code, created_at, expires_at
        FROM admin_invitations
        WHERE UPPER(invitation_code) = $1
        LIMIT 1;
    `;
    const result = await query(sql, [normalized]);
    return result.rows[0] ?? null;
}

export async function createInvitation(email: string): Promise<AdminInvitationRow> {
    const invitationCode = generateInvitationCode();
    const sql = `
        INSERT INTO admin_invitations (email, invitation_code)
        VALUES ($1, $2)
        RETURNING invitation_id, email, invitation_code, created_at, expires_at;
    `;
    const result = await query(sql, [email, invitationCode]);
    return result.rows[0];
}
