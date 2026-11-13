import { vi } from 'vitest';

/** A fake Supabase auth user. `metadataRole` simulates a user who edited their own user_metadata. */
export function fakeUser(id: string, metadataRole?: string) {
    return {
        id,
        email: `${id}@example.test`,
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: metadataRole ? { role: metadataRole } : {},
        created_at: new Date().toISOString(),
    };
}

/** Builds the mocked supabase client used by vi.mock('../src/config/supabase.js'). */
export function createSupabaseMock() {
    return {
        auth: {
            getUser: vi.fn(),
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
        },
    };
}
