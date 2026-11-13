import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { EmptyState, Notice, Panel, Skeleton, StatusPill, TicketStub } from '../ui';
import { IconHistory, IconTicket } from '../ui/icons';
import { t } from '../ui/table';
import { useAuth } from '../hooks/useAuth';
import { clearAccessToken, getDoctors, getQueueHistory } from '../services/api';
import MyTicket from './patient/MyTicket';
import DoctorGrid from './patient/DoctorGrid';
import JoinQueueModal from './patient/JoinQueueModal';
import s from './patient/patient.module.css';

const VIEWS = {
  visit: { title: 'My visit', subtitle: 'Your live ticket and today’s doctors.' },
  history: { title: 'History', subtitle: 'Every visit you’ve queued for.' },
};

export default function PatientPage() {
  const navigate = useNavigate();
  const { name } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get('view')] ? params.get('view') : 'visit';
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [picked, setPicked] = useState(null);
  const [ticketKey, setTicketKey] = useState(0);

  const loadDoctors = useCallback(async () => {
    try {
      setDoctors(await getDoctors());
      setError('');
    } catch {
      setError('Could not load doctors. Please try again in a moment.');
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistory((await getQueueHistory()) || []);
    } catch {
      setError('Could not load your visit history.');
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
    loadHistory();
    const id = setInterval(loadDoctors, 12000);
    return () => clearInterval(id);
  }, [loadDoctors, loadHistory]);

  const refreshAll = () => {
    setTicketKey((k) => k + 1);
    loadDoctors();
    loadHistory();
  };

  const term = search.trim().toLowerCase();
  const historyRows = history.filter((h) =>
    !term || [h.doctor_name, h.doctor_specialization, h.status].some((v) => String(v || '').toLowerCase().includes(term)),
  );

  return (
    <DashboardLayout
      nav={[
        { key: 'visit', label: 'My visit', icon: <IconTicket /> },
        { key: 'history', label: 'History', icon: <IconHistory />, count: history.length || null },
      ]}
      active={view}
      onNavigate={(k) => { setSearch(''); setParams(k === 'visit' ? {} : { view: k }); }}
      title={view === 'visit' && name ? `Hi, ${name.split(' ')[0]}` : VIEWS[view].title}
      subtitle={VIEWS[view].subtitle}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: view === 'visit' ? 'Search doctor or specialty' : 'Search visits',
        label: view === 'visit' ? 'Search doctors' : 'Search visits',
      }}
      user={{ name, role: 'Patient' }}
      onSignOut={() => { clearAccessToken(); navigate('/login', { replace: true }); }}
    >
      <div className={s.stack}>
        {error && <Notice kind="error" onDismiss={() => setError('')}>{error}</Notice>}

        {view === 'visit' && (
          <>
            <MyTicket refreshKey={ticketKey} onChange={refreshAll} />
            <Panel title="Doctors today" subtitle="Available doctors with the shortest queue are shown first.">
              {doctorsLoading ? (
                <div className={s.doctorGrid}><Skeleton height={190} /><Skeleton height={190} /><Skeleton height={190} /></div>
              ) : (
                <DoctorGrid doctors={doctors} filter={search} onPick={setPicked} />
              )}
            </Panel>
          </>
        )}

        {view === 'history' && (
          <Panel title="Past and current visits">
            {!historyLoaded ? <Skeleton height={200} /> : history.length === 0 ? (
              <EmptyState icon={<IconHistory />} title="No visits yet">Your tickets will appear here after you join a queue.</EmptyState>
            ) : historyRows.length === 0 ? (
              <EmptyState title="No matches">No visit matches “{search}”.</EmptyState>
            ) : (
              <div className={t.wrap}>
                <table className={`${t.table} ${t.stack}`}>
                  <caption className="visually-hidden">Your queue history</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ticket</th>
                      <th scope="col">Doctor</th>
                      <th scope="col">Room</th>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((h) => (
                      <tr key={h.queue_id}>
                        <td className={t.lead}><TicketStub number={h.ticket_number} /></td>
                        <td className={t.full}>
                          <div className={t.main}>{h.doctor_name ? `Dr. ${h.doctor_name}` : 'Doctor'}</div>
                          <div className={t.sub}>{h.doctor_specialization || 'General'}</div>
                        </td>
                        <td className={t.full} data-label="Room">{h.doctor_room || '—'}</td>
                        <td className={`${t.full} tabular`} data-label="Date">
                          {h.created_at ? new Date(h.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className={t.full}><StatusPill status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>

      {picked && (
        <JoinQueueModal
          doctor={picked}
          onClose={() => setPicked(null)}
          onJoined={refreshAll}
        />
      )}
    </DashboardLayout>
  );
}
