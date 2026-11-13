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

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Non-JSON response from API for ${path}. Check API base URL and endpoint.`);
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearAccessToken();
    }
    throw new Error(data.error || data.message || 'Request failed');
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
