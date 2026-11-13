import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../ui';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import s from './PublicLayout.module.css';

export default function PublicLayout() {
  const { token, role } = useAuth();
  const dashboard = token && role === 'admin' ? '/admin' : token && role === 'patient' ? '/patient' : null;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={s.bar}>
        <div className={s.inner}>
          <Logo />
          <nav className={s.nav} aria-label="Main">
            <NavLink to="/" end className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
              Home
            </NavLink>
            {dashboard ? (
              <NavLink to={dashboard} className={s.cta}>Open dashboard</NavLink>
            ) : (
              <NavLink to="/login" className={s.cta}>Sign in</NavLink>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main" className={s.main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={s.footer}>
        <div className={s.inner}>
          <span>© {new Date().getFullYear()} KwikQ · Queue less, care more.</span>
          <span className={s.footMeta}>Virtual clinic queues</span>
        </div>
      </footer>
    </>
  );
}
