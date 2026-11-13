import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import s from './ui.module.css';
import { statusInfo } from './status';
import { IconClose } from './icons';

const cx = (...c) => c.filter(Boolean).join(' ');

/* ── Brand ───────────────────────────────────────────── */
export function LogoMark({ size = 32 }) {
  // A "Q" whose tail is a ticket stub: the queue and the ticket in one shape.
  return (
    <svg className={s.logoMark} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="15" cy="15" r="7" fill="none" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="M18.5 18.5 24 24" stroke="var(--accent-ink)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = '/', size = 32 }) {
  return (
    <Link to={to} className={s.logo} aria-label="KwikQ home">
      <LogoMark size={size} />
      <span className={s.logoWord}>Kwik<b>Q</b></span>
    </Link>
  );
}

/* ── Buttons ─────────────────────────────────────────── */
export function Button({ variant = 'primary', size = undefined, block = false, loading = false, className = '', children = null, as = 'button', ...rest }) {
  /** @type {any} */
  const As = as;
  const props = As === 'button' ? { type: 'button', ...rest } : rest;
  return (
    <As
      className={cx(s.btn, s[variant], size && s[size], block && s.block, className)}
      aria-busy={loading || undefined}
      {...props}
      disabled={As === 'button' ? rest.disabled || loading : undefined}
    >
      {loading && <span className={s.spinner} aria-hidden="true" />}
      {children}
    </As>
  );
}

export function IconButton({ label, children = null, className = '', ...rest }) {
  return (
    <button type="button" className={cx(s.iconBtn, className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/* ── Status ──────────────────────────────────────────── */
export function StatusPill({ status, label = '' }) {
  const info = statusInfo(status);
  return <span className={cx(s.pill, s[`tone_${info.tone}`])}>{label || info.label}</span>;
}

export function TicketStub({ number, size = 'md', solid = false, label = 'Ticket' }) {
  return (
    <span className={cx(s.ticket, size === 'lg' && s.ticketLg, solid && s.ticketSolid)} aria-label={`${label} ${number}`}>
      <span aria-hidden="true"><small>#</small>{number}</span>
    </span>
  );
}

/* ── Layout blocks ───────────────────────────────────── */
export function Panel({ title = '', subtitle = '', actions = null, children = null, className = '', bodyClassName = '', headingLevel = 2, id = undefined }) {
  /** @type {any} */
  const H = `h${headingLevel}`;
  const headingId = useId();
  return (
    <section className={cx(s.panel, className)} aria-labelledby={title ? headingId : undefined} id={id}>
      {(title || actions) && (
        <header className={s.panelHead}>
          <div>
            {title && <H id={headingId} className={s.panelTitle}>{title}</H>}
            {subtitle && <p className={s.panelSub}>{subtitle}</p>}
          </div>
          {actions && <div className={s.panelActions}>{actions}</div>}
        </header>
      )}
      <div className={cx(s.panelBody, bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ icon, label, value, hint = '' }) {
  return (
    <div className={cx(s.panel, s.stat)}>
      <span className={s.statIcon}>{icon}</span>
      <div>
        <div className={s.statLabel}>{label}</div>
        <div className={s.statValue}>{value}</div>
        {hint && <div className={s.statHint}>{hint}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = null, title, children = null }) {
  return (
    <div className={s.empty}>
      {icon && <span className={s.emptyIcon}>{icon}</span>}
      <p className={s.emptyTitle}>{title}</p>
      {children && <p className={s.emptyText}>{children}</p>}
    </div>
  );
}

export function Notice({ kind = 'info', children = null, onDismiss = undefined }) {
  if (!children) return null;
  return (
    <div className={cx(s.notice, s[`notice_${kind}`])} role={kind === 'error' ? 'alert' : 'status'}>
      <span className={s.noticeText}>{children}</span>
      {onDismiss && (
        <button type="button" className={s.noticeClose} onClick={onDismiss} aria-label="Dismiss message">
          <IconClose width={16} height={16} />
        </button>
      )}
    </div>
  );
}

/* ── Forms ───────────────────────────────────────────── */
export function Field({ label, hint = '', className = '', as = 'input', children = null, ...inputProps }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  /** @type {any} */
  const Control = as;
  return (
    <div className={cx(s.field, className)}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <Control
        id={id}
        className={as === 'select' ? s.select : s.input}
        aria-describedby={hintId}
        {...inputProps}
      >
        {children}
      </Control>
      {hint && <span id={hintId} className={s.hint}>{hint}</span>}
    </div>
  );
}

export function Checkbox({ label, ...rest }) {
  return (
    <label className={s.checkbox}>
      <input type="checkbox" {...rest} />
      {label}
    </label>
  );
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className={s.segmented} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={s.segment}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Modal (focus is moved in and restored on close) ─── */
export function Modal({ title = '', onClose, children = null, labelledBy = undefined }) {
  const ref = useRef(null);
  const fallbackId = useId();
  useEffect(() => {
    const previous = /** @type {HTMLElement | null} */ (document.activeElement);
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const nodes = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = /** @type {HTMLElement} */ (nodes[0]);
        const last = /** @type {HTMLElement} */ (nodes[nodes.length - 1]);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={s.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || fallbackId}
        tabIndex={-1}
      >
        <IconButton label="Close" className={s.modalClose} onClick={onClose}>
          <IconClose />
        </IconButton>
        {title && <h2 id={fallbackId} style={{ fontSize: 22, marginBottom: 6, paddingRight: 40 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ height = 120 }) {
  return <div className={s.skeleton} style={{ minHeight: height }} aria-hidden="true" />;
}

