import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ACCESS_TOKEN_KEY = 'access_token';
const USER_ROLE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getUserRole = () => localStorage.getItem(USER_ROLE_KEY);
export const getUserName = () => localStorage.getItem(USER_NAME_KEY);
export const setAccessToken = (token) => {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
};
export const setUserRole = (role) => {
  if (role) localStorage.setItem(USER_ROLE_KEY, role);
};
export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-') && key.includes('auth-token')) {
      localStorage.removeItem(key);
    }
  });
  supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  window.dispatchEvent(new Event('auth-state-changed'));
};

/** Why the user was signed out, shown once on the next sign-in screen. */
const SIGNOUT_REASON_KEY = 'kwikq_signout_reason';
export const takeSignOutReason = () => {
  try {
    const reason = sessionStorage.getItem(SIGNOUT_REASON_KEY);
    sessionStorage.removeItem(SIGNOUT_REASON_KEY);
    return reason;
  } catch {
    return null;
  }
};

/** An API failure with the HTTP status (0 = network/offline). */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** @returns {Promise<any>} */
async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      navigator.onLine === false
        ? 'You’re offline. Reconnect and try again.'
        : 'Can’t reach KwikQ right now. Please try again in a moment.',
      0,
    );
  }

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new ApiError('KwikQ sent an unexpected response. Please try again.', res.status);
  }

  if (!res.ok) {
    // A signed-in request that is refused means the session is gone or the role changed.
    if (token && (res.status === 401 || res.status === 403)) {
      try {
        sessionStorage.setItem(SIGNOUT_REASON_KEY, res.status === 401
          ? 'Your session expired. Please sign in again.'
          : 'Your account no longer has access to that page. Please sign in again.');
      } catch { /* storage unavailable */ }
      clearAccessToken();
    }
    const fallback = res.status === 429
      ? 'Too many attempts. Please wait a few minutes and try again.'
      : res.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.';
    // Server-side failures get our own wording; 4xx messages are written for users.
    const message = res.status >= 500 ? fallback : data.error || data.message || fallback;
    throw new ApiError(message, res.status);
  }
  return data;
}

export const getDoctors = () => apiFetch('/doctors');

export const inviteAdmin = (email) =>
  apiFetch('/admin/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const getPendingInvitations = () => apiFetch('/admin/invitations');

export const createDoctor = ({ doctorFirstName, doctorLastName, specialization, roomNumber, isAvailable = true }) =>
  apiFetch('/admin/doctors', {
    method: 'POST',
    body: JSON.stringify({ doctorFirstName, doctorLastName, specialization, roomNumber, isAvailable }),
  });

export const removeDoctor = (doctorId) =>
  apiFetch(`/admin/doctors/${doctorId}`, {
    method: 'DELETE',
  });

export const login = async (email, password) => {
  clearAccessToken();
  await supabase.auth.signOut({ scope: 'local' });

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = data?.session?.access_token;
  const refreshToken = data?.session?.refresh_token;

  if (token) {
    setAccessToken(token);
  }

  if (token && refreshToken) {
    await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  // The role comes from the API (our users table), never from user_metadata.
  const role = data?.user?.role;
  const name = [data?.user?.user_first_name, data?.user?.user_last_name].filter(Boolean).join(' ');
  if (name) localStorage.setItem(USER_NAME_KEY, name);

  if (refreshError) {
    console.warn('Session refresh failed during login:', refreshError.message);
  }

  if (role) {
    setUserRole(role);
  } else {
    localStorage.removeItem(USER_ROLE_KEY);
  }

  window.dispatchEvent(new Event('auth-state-changed'));
  return { ...data, role };
};

export const validateInvitationCode = (code) =>
  apiFetch('/auth/validate-invitation-code', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

export const register = ({ firstName, lastName, email, password, role = 'patient', invitationCode }) =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      password,
      role,
      ...(invitationCode ? { invitationCode } : {}),
    }),
  });

export const revokeInvitation = (email) =>
  apiFetch('/admin/invitations/revoke', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const joinQueue = (doctorId) =>
  apiFetch('/queue/join', {
    method: 'POST',
    body: JSON.stringify({ doctorId }),
  });

export const getAdminQueue = (doctorId) =>
  apiFetch(`/queue/admin/${doctorId}`);

export const getAdminPatientLogs = (doctorId) =>
  apiFetch(`/queue/admin-history/${doctorId}`);

export const callNextPatient = (doctorId) =>
  apiFetch(`/admin/call-next/${doctorId}`, { method: 'PATCH' });

export const skipPatient = (doctorId) =>
  apiFetch(`/admin/skip/${doctorId}`, { method: 'PATCH' });

export const closeQueueForDoctor = (doctorId) =>
  apiFetch(`/admin/close/${doctorId}`, { method: 'PATCH' });

export const setDoctorAvailability = (doctorId, isAvailable) =>
  apiFetch(`/admin/doctor-availability/${doctorId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  });

export const getPatientStatus = () =>
  apiFetch('/queue/patient-status');

export const cancelQueue = () =>
  apiFetch('/queue/cancel', { method: 'PATCH' });

export const getQueueHistory = () =>
  apiFetch('/queue/history');

export const startSession = (queueId) =>
  apiFetch(`/admin/start-session/${queueId}`, { method: 'PATCH' });

export const completeSession = (queueId) =>
  apiFetch(`/admin/complete-session/${queueId}`, { method: 'PATCH' });
