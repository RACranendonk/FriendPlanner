import { useState } from 'react';
import { THEME_META, cycleTheme, getThemePref, setThemePref } from '../lib/theme';

export function ThemeToggle() {
  const [pref, setPref] = useState(getThemePref());
  const meta = THEME_META[pref];
  return (
    <button
      className="ghost theme-toggle"
      title={`${meta.label} — tap to switch`}
      onClick={() => {
        const next = cycleTheme(pref);
        setPref(next);
        setThemePref(next);
      }}
    >
      {meta.icon}
    </button>
  );
}
