import { useEffect, useState } from 'react';
import { AUTH_EVENT, getAccessToken, getUserName, getUserRole } from '../services/api';

const read = () => ({ token: getAccessToken(), role: getUserRole(), name: getUserName() });

/**
 * Client-side view of the session, for navigation and UI only.
 * The API enforces roles on every request; this never grants access by itself.
 */
export function useAuth() {
  const [auth, setAuth] = useState(read);
  useEffect(() => {
    const sync = () => setAuth(read());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return auth;
}
