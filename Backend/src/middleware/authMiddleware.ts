import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { query } from '../config/database.js';
import { ROLES, Role } from '../types/index.js';

const isRole = (value: unknown): value is Role =>
    typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/**
 * Verifies the Supabase access token, then loads the role from our own `users`
 * table. user_metadata is editable by the user, so it is never trusted for roles.
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    try {
        const { data, error } = await supabase.auth.getUser(token);
        const user = data?.user;
        if (error || !user) return res.status(401).json({ error: 'Invalid token.' });

        const roleResult = await query<{ role: string }>(
            'SELECT role FROM users WHERE user_id = $1 LIMIT 1',
            [user.id],
        );
        const role = roleResult.rows[0]?.role;
        if (!isRole(role)) {
            return res.status(403).json({ error: 'No KwikQ account is linked to this sign-in.' });
        }

        req.user = user;
        req.userRole = role;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err instanceof Error ? err.message : err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const requireRoles = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.userRole) return res.status(401).json({ error: 'Authentication required.' });
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role.' });
        }
        next();
    };
};

export const requireRole = (requiredRole: Role) => requireRoles([requiredRole]);
