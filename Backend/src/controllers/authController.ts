import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { query, withTransaction } from '../config/database.js';
import { findInvitationByCode, isInvitationExpired, normalizeInvitationCode } from '../utils/invitation.js';
import type { Role } from '../types/index.js';

/** Thrown inside the register transaction to roll back and answer with a status. */
class HttpError extends Error {
    constructor(public status: number, message: string, public code?: string) {
        super(message);
    }
}

export const validateInvitationCode = async (req: Request, res: Response) => {
    const { code } = req.body ?? {};

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Invitation code is required' });
    }

    try {
        const invitation = await findInvitationByCode(code);
        if (!invitation || isInvitationExpired(invitation.expires_at)) {
            return res.status(403).json({ error: 'Invalid or expired invitation code' });
        }
        return res.status(200).json({ valid: true, email: invitation.email });
    } catch (err) {
        console.error('Error validating invitation code:', err instanceof Error ? err.message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const {
        email,
        password,
        firstName,
        lastName,
        fullName,
        role: requestedRole,
        invitationCode,
    } = req.body ?? {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'email and password are required' });
    }

    // Only two roles can be requested; admin additionally needs a valid invitation.
    let role: Role;
    if (requestedRole === undefined || requestedRole === null || requestedRole === '' || requestedRole === 'patient') {
        role = 'patient';
    } else if (requestedRole === 'admin') {
        if (!invitationCode || typeof invitationCode !== 'string') {
            return res.status(403).json({ error: 'A valid invitation code is required for admin registration' });
        }
        role = 'admin';
    } else {
        return res.status(400).json({ error: 'Invalid role requested' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user_first_name = String(firstName || '').trim();
    let user_last_name = String(lastName || '').trim();

    if ((!user_first_name || !user_last_name) && fullName) {
        const nameParts = String(fullName).trim().split(/\s+/);
        user_first_name = user_first_name || nameParts.shift() || '';
        user_last_name = user_last_name || nameParts.join(' ') || '';
    }

    if (!user_first_name || !user_last_name) {
        return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    try {
        const created = await withTransaction(async (client) => {
            if (role === 'admin') {
                // Claim the invitation atomically: the row lock taken by DELETE makes a
                // concurrent claim wait, then find nothing. Rolled back if anything below fails.
                const claim = await client.query(
                    `DELETE FROM admin_invitations
                     WHERE UPPER(invitation_code) = $1
                       AND LOWER(email) = $2
                       AND (expires_at IS NULL OR expires_at > now())
                     RETURNING invitation_id`,
                    [normalizeInvitationCode(invitationCode), normalizedEmail],
                );
                if (claim.rowCount === 0) {
                    throw new HttpError(403, 'Invalid or expired invitation code for this email address');
                }
            }

            // Names only; the role lives in our users table, never in user_metadata.
            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: { data: { user_first_name, user_last_name } },
            });

            if (error) {
                const status = (error as { status?: number }).status;
                throw new HttpError(
                    status && status >= 400 && status < 500 ? status : 502,
                    error.message || 'Sign-up failed',
                    (error as { code?: string }).code,
                );
            }
            if (!data.user) throw new HttpError(502, 'Sign-up failed');

            // Never overwrite an existing row (and its role).
            const insert = await client.query(
                `INSERT INTO users (user_id, email, user_first_name, user_last_name, role)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO NOTHING
                 RETURNING user_id, email, user_first_name, user_last_name, role`,
                [data.user.id, normalizedEmail, user_first_name, user_last_name, role],
            );
            if (insert.rowCount === 0) {
                throw new HttpError(409, 'An account with this email already exists');
            }
            return insert.rows[0];
        });

        return res.status(200).json({
            message: 'User registered successfully! Check your email for a confirmation link.',
            user: created,
            role: created.role,
        });
    } catch (err) {
        if (err instanceof HttpError) {
            return res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
        }
        console.error('Registration error:', err instanceof Error ? err.message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if ((error as { code?: string } | null)?.code === 'email_not_confirmed') {
            return res.status(403).json({
                error: 'Please confirm your email first. Check your inbox for the link we sent.',
                code: 'email_not_confirmed',
            });
        }
        if (error || !data.session || !data.user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const dbUserResult = await query(
            'SELECT user_id, email, user_first_name, user_last_name, role FROM users WHERE user_id = $1 LIMIT 1',
            [data.user.id],
        );
        const dbUser = dbUserResult.rows[0];
        if (!dbUser) {
            return res.status(403).json({ error: 'No KwikQ account is linked to this sign-in.' });
        }

        return res.status(200).json({
            message: 'Login successful!',
            session: data.session,
            user: {
                id: data.user.id,
                email: data.user.email,
                role: dbUser.role,
                user_first_name: dbUser.user_first_name,
                user_last_name: dbUser.user_last_name,
            },
        });
    } catch (err) {
        console.error('Login error:', err instanceof Error ? err.message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
