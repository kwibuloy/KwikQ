/** Queue/doctor status → pill tone + human label. */
const STATUS = {
  waiting: { tone: 'warn', label: 'Waiting' },
  called: { tone: 'info', label: 'Called' },
  'in-consultation': { tone: 'live', label: 'In consultation' },
  served: { tone: 'ok', label: 'Served' },
  cancelled: { tone: 'mute', label: 'Cancelled' },
  skipped: { tone: 'bad', label: 'Skipped' },
  removed: { tone: 'mute', label: 'Removed' },
  available: { tone: 'ok', label: 'Available' },
  unavailable: { tone: 'mute', label: 'Away' },
  pending: { tone: 'info', label: 'Pending' },
  expired: { tone: 'bad', label: 'Expired' },
};

export const statusInfo = (status) =>
  STATUS[status] || { tone: 'mute', label: status ? String(status) : 'Unknown' };

export const doctorName = (d) =>
  d?.doctor_name || `${d?.doctor_first_name || ''} ${d?.doctor_last_name || ''}`.trim() || d?.name || 'Doctor';

export const initials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Minutes per patient used for wait estimates (matches the API's estimate). */
export const MINUTES_PER_PATIENT = 10;

/** Lowercased, trimmed search term ('' matches everything). */
export const searchTerm = (filter) => String(filter ?? '').trim().toLowerCase();

/** True when the term is empty or any value contains it (case-insensitive). */
export const matchesTerm = (term, ...values) =>
  !term || values.some((v) => String(v ?? '').toLowerCase().includes(term));

export const formatDateTime = (v) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
