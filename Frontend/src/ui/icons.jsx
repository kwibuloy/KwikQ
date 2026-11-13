/* Small stroke icon set. Decorative by default (aria-hidden). */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const make = (paths) => {
  const Icon = (props) => <svg {...base} {...props}>{paths}</svg>;
  return Icon;
};

export const IconQueue = make(<><rect x="3" y="4" width="18" height="5" rx="1.5" /><rect x="3" y="11" width="18" height="5" rx="1.5" opacity=".6" /><path d="M7 20h10" /></>);
export const IconDoctor = make(<><circle cx="12" cy="7" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /><path d="M12 14.5v3M10.5 16h3" /></>);
export const IconLogs = make(<><path d="M8 4h11v16H8z" /><path d="M5 7v13h11" opacity=".6" /><path d="M11 9h5M11 12.5h5M11 16h3" /></>);
export const IconMail = make(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>);
export const IconSearch = make(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>);
export const IconTicket = make(<><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5z" /><path d="M14 5v14" strokeDasharray="2 2.5" /></>);
export const IconHistory = make(<><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M12 8v4.5l3 2" /></>);
export const IconLogout = make(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></>);
export const IconSun = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>);
export const IconMoon = make(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconRefresh = make(<><path d="M20 12a8 8 0 0 1-14.3 4.9" /><path d="M4 12A8 8 0 0 1 18.3 7.1" /><path d="M18.5 3v4.3h-4.3M5.5 21v-4.3h4.3" /></>);
export const IconBell = make(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconUsers = make(<><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3 3-4.7 6-4.7s5.4 1.7 6 4.7" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.6.6 2.7 2 3 4.4" /></>);
export const IconCheck = make(<path d="m5 12.5 4.2 4.2L19 7" />);
export const IconArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconTrash = make(<><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></>);
export const IconShield = make(<><path d="M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>);
