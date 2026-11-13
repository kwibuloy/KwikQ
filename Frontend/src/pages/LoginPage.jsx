import { Link } from 'react-router-dom';
import AuthShell from './auth/AuthShell';
import { IconArrowRight, IconShield, IconTicket } from '../ui/icons';
import s from './auth/auth.module.css';

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Welcome to KwikQ" title="How are you visiting?" subtitle="Pick the sign-in that matches your account.">
      <div className={s.choices}>
        <Link to="/patient/auth" className={s.choice}>
          <span className={s.choiceIcon}><IconTicket /></span>
          <span>
            <span className={s.choiceTitle}>I’m a patient</span>
            <span className={s.choiceText}>Join a doctor’s queue and track your ticket.</span>
          </span>
          <IconArrowRight className={s.choiceArrow} />
        </Link>
        <Link to="/admin/auth" className={s.choice}>
          <span className={s.choiceIcon}><IconShield /></span>
          <span>
            <span className={s.choiceTitle}>I’m clinic staff</span>
            <span className={s.choiceText}>Run queues, doctors and invitations.</span>
          </span>
          <IconArrowRight className={s.choiceArrow} />
        </Link>
      </div>
    </AuthShell>
  );
}
