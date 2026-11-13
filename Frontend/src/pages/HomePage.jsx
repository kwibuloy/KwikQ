import { Link } from 'react-router-dom';
import { StatusPill, TicketStub } from '../ui';
import { IconBell, IconClock, IconDoctor, IconQueue, IconShield, IconTicket, IconUsers } from '../ui/icons';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ui from '../ui/ui.module.css';
import s from './HomePage.module.css';

// Illustrative board for the hero. Not real data.
const BOARD = [
  { n: 41, who: 'Dr. Reyes · Room 2', status: 'in-consultation' },
  { n: 42, who: 'Dr. Reyes · Room 2', status: 'called' },
  { n: 43, who: 'Dr. Okafor · Room 5', status: 'waiting' },
  { n: 44, who: 'Dr. Okafor · Room 5', status: 'waiting' },
];

const STEPS = [
  { icon: <IconDoctor />, title: 'Pick a doctor', text: 'See who is in today, how many people are ahead and roughly how long it will take.' },
  { icon: <IconTicket />, title: 'Grab a ticket', text: 'One tap gives you a numbered ticket tied to your account. No paper, no clipboard.' },
  { icon: <IconBell />, title: 'Walk in when called', text: 'Your ticket card updates live and tells you which room to go to.' },
];

const FEATURES = [
  { icon: <IconClock />, title: 'Honest wait times', text: 'Estimates move with the line, so patients plan around real numbers.' },
  { icon: <IconUsers />, title: 'A calmer front desk', text: 'Fewer people hovering at reception, fewer “am I next?” questions.' },
  { icon: <IconQueue />, title: 'One screen per doctor', text: 'Call next, start, finish or skip, with every change reflected instantly.' },
  { icon: <IconShield />, title: 'Invite-only staff access', text: 'Admins join with single-use codes. Roles are checked on every request.' },
];

export default function HomePage() {
  const { token, role } = useAuth();
  useDocumentTitle('Virtual clinic queues');
  const patientHref = token && role === 'patient' ? '/patient' : '/patient/auth';
  const adminHref = token && role === 'admin' ? '/admin' : '/admin/auth';

  return (
    <>
      <section className={s.hero}>
        <div className={s.heroText}>
          <span className={s.eyebrow}><span className={s.dot} aria-hidden="true" /> Virtual queues for clinics</span>
          <h1 className={s.title}>Wait anywhere.<br /><span className={s.accent}>Get called</span> on time.</h1>
          <p className={s.lead}>
            KwikQ swaps the crowded waiting room for a live ticket on your phone. Patients see where they stand;
            clinics run every doctor’s line from one clean dashboard.
          </p>
          <div className={s.ctas}>
            <Link to={patientHref} className={`${ui.btn} ${ui.primary} ${ui.lg}`}>Get a ticket</Link>
            <Link to={adminHref} className={`${ui.btn} ${ui.secondary} ${ui.lg}`}>I run a clinic</Link>
          </div>
        </div>

        <div className={s.board} aria-hidden="true">
          <div className={s.boardHead}>
            <span>Now serving</span>
            <span className={s.boardTime}>Today</span>
          </div>
          <ul className={s.boardList}>
            {BOARD.map((b) => (
              <li key={b.n} className={b.status === 'called' ? s.boardCalled : undefined}>
                <TicketStub number={b.n} solid={b.status === 'called'} />
                <span className={s.boardWho}>{b.who}</span>
                <StatusPill status={b.status} />
              </li>
            ))}
          </ul>
          <div className={s.boardFoot}>
            <span>4 in line</span><span>~10 min each</span>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="how">
        <h2 id="how" className={s.h2}>Three steps, zero clipboards</h2>
        <ol className={s.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title} className={s.step}>
              <span className={s.stepIcon}>{step.icon}</span>
              <span className={s.stepNum}>0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.section} aria-labelledby="why">
        <h2 id="why" className={s.h2}>Built for the people on both sides of the desk</h2>
        <ul className={s.features}>
          {FEATURES.map((f) => (
            <li key={f.title} className={s.feature}>
              <span className={s.featureIcon}>{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.band}>
        <div>
          <h2 className={s.bandTitle}>Ready when your clinic is.</h2>
          <p>Patients sign up in under a minute. Staff join by invitation.</p>
        </div>
        <Link to={patientHref} className={`${ui.btn} ${s.bandBtn} ${ui.lg}`}>Get started</Link>
      </section>
    </>
  );
}
