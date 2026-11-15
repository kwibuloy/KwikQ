import { Link } from 'react-router-dom';
import AuthShell from './auth/AuthShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ui from '../ui/ui.module.css';
import auth from './auth/auth.module.css';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <AuthShell
      eyebrow="404"
      title="This ticket doesn’t exist"
      subtitle="The page you were looking for isn’t here. It may have moved, or the link may be mistyped."
    >
      <div className={auth.actions}>
        <Link to="/" className={`${ui.btn} ${ui.primary}`}>Go home</Link>
        <Link to="/login" className={`${ui.btn} ${ui.secondary}`}>Sign in</Link>
      </div>
    </AuthShell>
  );
}
