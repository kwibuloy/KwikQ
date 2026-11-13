import { useEffect, useState } from 'react';
import { getAccessToken, getUserName, getUserRole } from '../services/api';

const read = () => ({ token: getAccessToken(), role: getUserRole(), name: getUserName() });

/**
 * Client-side view of the session, for navigation and UI only.
 * The API enforces roles on every request; this never grants access by itself.
 */
export function useAuth() {
  const [auth, setAuth] = useState(read);
  useEffect(() => {
    const sync = () => setAuth(read());
    window.addEventListener('auth-state-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('auth-state-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return auth;
}
