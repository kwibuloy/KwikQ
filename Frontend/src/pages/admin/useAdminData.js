import { useCallback, useEffect, useState } from 'react';
import {
  getAdminPatientLogs,
  getAdminQueue,
  getDoctors,
  getPendingInvitations,
} from '../../services/api';
import { supabase } from '../../services/supabaseClient';

export function useDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setDoctors(await getDoctors());
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { doctors, setDoctors, loading, error, reload };
}

/** Live queue + served log for one doctor. Refreshes on Supabase realtime events (throttled). */
export function useDoctorQueue(doctorId) {
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!doctorId) return;
    if (!silent) setLoading(true);
    try {
      const [q, l] = await Promise.all([getAdminQueue(doctorId), getAdminPatientLogs(doctorId)]);
      setQueue(q || []);
      setLogs(l || []);
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load the queue.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    setQueue([]);
    setLogs([]);
    setError('');
    setUpdatedAt(null);
    if (!doctorId) return undefined;
    reload();

    let timer = null;
    let last = 0;
    const MIN_INTERVAL = 2000;
    const schedule = () => {
      const wait = Math.max(0, MIN_INTERVAL - (Date.now() - last));
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        reload({ silent: true });
      }, wait);
    };

    const channel = supabase
      .channel(`public:queues:doctor:${doctorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues', filter: `doctor_id=eq.${doctorId}` }, schedule)
      .subscribe();

    // Fallback poll in case realtime is unavailable.
    const poll = setInterval(() => reload({ silent: true }), 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel).catch?.(() => {});
    };
  }, [doctorId, reload]);

  return { queue, logs, loading, error, updatedAt, reload };
}

export function useInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await getPendingInvitations();
      setInvitations(data.invitations || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load invitations.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { invitations, loaded, error, reload };
}
