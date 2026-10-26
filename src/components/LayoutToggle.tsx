import { useState } from 'react';
import { LAYOUT_META, cycleLayout, getLayoutPref, setLayoutPref } from '../lib/layout';

export function LayoutToggle() {
  const [pref, setPref] = useState(getLayoutPref());
  const meta = LAYOUT_META[pref];
  return (
    <button
      className="ghost theme-toggle layout-toggle"
      title={`${meta.label} — click to switch`}
      onClick={() => {
        const next = cycleLayout(pref);
        setPref(next);
        setLayoutPref(next);
      }}
    >
      {meta.icon}
    </button>
  );
}
