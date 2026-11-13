import { Link } from 'react-router-dom';
import AuthShell from './auth/AuthShell';
import ui from '../ui/ui.module.css';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotAuthorizedPage() {
  useDocumentTitle('Not authorized');
  return (
    <AuthShell
      eyebrow="Access restricted"
      title="This page isn’t for your account"
      subtitle="You’re signed in, but your role can’t open that area. Try the sign-in that matches your account."
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/" className={`${ui.btn} ${ui.primary}`}>Go home</Link>
        <Link to="/login" className={`${ui.btn} ${ui.secondary}`}>Sign-in options</Link>
      </div>
    </AuthShell>
  );
}
