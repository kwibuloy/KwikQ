import { useOnline } from '../hooks/useOnline';
import s from './ui.module.css';

/** Fixed banner while the browser is offline. Live data on screen may be out of date. */
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className={s.offline} role="status">
      You’re offline. What you see may be out of date; it will refresh when you reconnect.
    </div>
  );
}
