import { Link } from 'react-router-dom';
import { TicketStub } from '../../ui';
import s from './auth.module.css';

/** Two-column auth layout: a brand panel and the form card. */
export default function AuthShell({ eyebrow = '', title, subtitle = '', children = null, back = null }) {
  return (
    <div className={s.wrap}>
      <aside className={s.brand} aria-hidden="true">
        <div className={s.brandStack}>
          <TicketStub number={7} size="lg" solid />
          <TicketStub number={8} size="lg" />
          <TicketStub number={9} size="lg" />
        </div>
        <p className={s.brandQuote}>Your place in line, in your pocket.</p>
      </aside>
      <section className={s.card}>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        {children}
        {back && <Link className={s.back} to={back.to}>← {back.label}</Link>}
      </section>
    </div>
  );
}
