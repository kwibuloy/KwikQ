import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { Role } from './index.js';

declare global {

    namespace Express {
        interface Request {
            /** Supabase auth user, set by authenticateUser. */
            user?: SupabaseAuthUser;
            /** Role from the `users` table (never from user_metadata). */
            userRole?: Role;
        }
    }
}

export {};
