export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'fp.theme';

export function getThemePref(): ThemePref {
  const value = localStorage.getItem(KEY);
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/** auto → light → dark → auto. */
export function cycleTheme(pref: ThemePref): ThemePref {
  return pref === 'auto' ? 'light' : pref === 'light' ? 'dark' : 'auto';
}

export const THEME_META: Record<ThemePref, { icon: string; label: string }> = {
  auto: { icon: '🌗', label: 'Theme: follow device' },
  light: { icon: '☀️', label: 'Theme: light' },
  dark: { icon: '🌙', label: 'Theme: dark' },
};

export function applyTheme(pref: ThemePref): void {
  if (pref === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
}
