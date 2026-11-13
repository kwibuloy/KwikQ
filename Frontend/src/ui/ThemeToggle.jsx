import { useEffect, useState } from 'react';
import { IconButton } from './index';
import { IconMoon, IconSun } from './icons';

const KEY = 'kwikq_theme';

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function readTheme() {
  try {
    return localStorage.getItem(KEY) || systemTheme();
  } catch {
    return systemTheme();
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  };

  return (
    <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </IconButton>
  );
}
