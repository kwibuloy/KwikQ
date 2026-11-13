import { useEffect, useId, useState } from 'react';
import { Logo, IconButton } from '../ui';
import ThemeToggle from '../ui/ThemeToggle';
import { IconLogout, IconMenu, IconSearch, IconClose } from '../ui/icons';
import { initials } from '../ui/status';
import s from './DashboardLayout.module.css';

/**
 * App shell for signed-in pages: sidebar navigation (a drawer on small screens),
 * a header with page title + search, and the page body.
 *
 * nav: [{ key, label, icon, count? }]
 */
export default function DashboardLayout({
  nav,
  active,
  onNavigate,
  title,
  subtitle = '',
  search = null,
  user = null,
  onSignOut,
  headerExtra = null,
  children = null,
}) {
  const [open, setOpen] = useState(false);
  const searchId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (key) => {
    onNavigate(key);
    setOpen(false);
  };

  return (
    <div className={s.shell}>
      <a className="skip-link" href="#main">Skip to content</a>

      <aside className={`${s.sidebar} ${open ? s.open : ''}`} aria-label="Dashboard">
        <div className={s.sideTop}>
          <Logo />
          <IconButton label="Close menu" className={s.closeBtn} onClick={() => setOpen(false)}>
            <IconClose />
          </IconButton>
        </div>

        <nav className={s.nav}>
          <ul>
            {nav.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`${s.navItem} ${active === item.key ? s.navActive : ''}`}
                  aria-current={active === item.key ? 'page' : undefined}
                  onClick={() => go(item.key)}
                >
                  <span className={s.navIcon}>{item.icon}</span>
                  <span className={s.navLabel}>{item.label}</span>
                  {item.count != null && <span className={s.count}>{item.count}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.sideFoot}>
          {user && (
            <div className={s.user}>
              <span className={s.avatar} aria-hidden="true">{initials(user.name) || '•'}</span>
              <span className={s.userText}>
                <span className={s.userName}>{user.name || 'Signed in'}</span>
                <span className={s.userRole}>{user.role}</span>
              </span>
            </div>
          )}
          <button type="button" className={s.signOut} onClick={onSignOut}>
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className={s.scrim} onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className={s.content}>
        <header className={s.header}>
          <IconButton label="Open menu" className={s.menuBtn} onClick={() => setOpen(true)} aria-expanded={open}>
            <IconMenu />
          </IconButton>
          <div className={s.heading}>
            <h1 className={s.title}>{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
          <div className={s.tools}>
            {search && (
              <div className={s.search}>
                <label htmlFor={searchId} className="visually-hidden">{search.label || 'Search'}</label>
                <IconSearch className={s.searchIcon} />
                <input
                  id={searchId}
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || 'Search'}
                />
              </div>
            )}
            {headerExtra}
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className={s.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
