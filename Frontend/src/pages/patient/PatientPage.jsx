import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import { EmptyState, ErrorState, Notice, Panel, Skeleton } from '../../ui';
import { IconHistory, IconTicket } from '../../ui/icons';
import { matchesTerm, searchTerm } from '../../ui/format';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getDoctors, getQueueHistory } from '../../services/api';
import MyTicket from './MyTicket';
import DoctorGrid from './DoctorGrid';
import JoinQueueModal from './JoinQueueModal';
import HistoryTable from './HistoryTable';
import s from './patient.module.css';

const VIEWS = {
  visit: { title: 'My visit', subtitle: 'Your live ticket and today’s doctors.' },
  history: { title: 'History', subtitle: 'Every visit you’ve queued for.' },
};

export default function PatientPage() {
  const { name } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get('view')] ? params.get('view') : 'visit';
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [picked, setPicked] = useState(null);
  const [ticketKey, setTicketKey] = useState(0);
  const [activeTicket, setActiveTicket] = useState(null);
  useDocumentTitle(VIEWS[view].title);

  const loadDoctors = useCallback(async () => {
    try {
      setDoctors(await getDoctors());
      setDoctorsError('');
    } catch (err) {
      setDoctorsError(err.message);
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistory((await getQueueHistory()) || []);
      setHistoryError('');
    } catch (err) {
      setHistoryError(err.message);
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

  const refreshAll = useCallback(() => {
    setTicketKey((k) => k + 1);
    loadDoctors();
    loadHistory();
  }, [loadDoctors, loadHistory]);

  // Ticket ended by the clinic, or left by the patient: refresh lists, not the ticket itself.
  const refreshLists = useCallback(() => {
    loadDoctors();
    loadHistory();
  }, [loadDoctors, loadHistory]);

  const term = searchTerm(search);
  const historyRows = history.filter((h) => matchesTerm(term, h.doctor_name, h.doctor_specialization, h.status));

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
    >
      <div className={s.stack}>
        {view === 'visit' && (
          <>
            <MyTicket refreshKey={ticketKey} onTicket={setActiveTicket} onEnded={refreshLists} />
            <Panel title="Doctors today" subtitle="Available doctors with the shortest queue are shown first.">
              {doctorsLoading ? (
                <div className={s.doctorGrid}><Skeleton height={190} /><Skeleton height={190} /><Skeleton height={190} /></div>
              ) : doctorsError && !doctors.length ? (
                <ErrorState title="We couldn’t load today’s doctors" onRetry={loadDoctors}>{doctorsError}</ErrorState>
              ) : (
                <>
                  {doctorsError && (
                    <div className={s.gridNotice}><Notice kind="info">Couldn’t refresh just now. Showing the last update.</Notice></div>
                  )}
                  {activeTicket && (
                    <div className={s.gridNotice}>
                      <Notice kind="info">You’re holding ticket #{activeTicket.ticket_number}. You can only be in one queue at a time.</Notice>
                    </div>
                  )}
                  <DoctorGrid doctors={doctors} filter={search} onPick={setPicked} blocked={!!activeTicket} />
                </>
              )}
            </Panel>
          </>
        )}

        {view === 'history' && (
          <Panel title="Past and current visits">
            {!historyLoaded ? <Skeleton height={200} /> : historyError && !history.length ? (
              <ErrorState title="We couldn’t load your history" onRetry={loadHistory}>{historyError}</ErrorState>
            ) : history.length === 0 ? (
              <EmptyState icon={<IconHistory />} title="No visits yet">Your tickets will appear here after you join a queue.</EmptyState>
            ) : historyRows.length === 0 ? (
              <EmptyState title="No matches">No visit matches “{search}”.</EmptyState>
            ) : (
              <HistoryTable rows={historyRows} />
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
