export type LayoutPref = 'auto' | 'compact' | 'wide';
export type Layout = 'compact' | 'wide';

const KEY = 'fp.layout';
const WIDE_QUERY = '(min-width: 1024px)';

export function getLayoutPref(): LayoutPref {
  const value = localStorage.getItem(KEY);
  return value === 'compact' || value === 'wide' ? value : 'auto';
}

/** auto → wide → compact → auto. */
export function cycleLayout(pref: LayoutPref): LayoutPref {
  return pref === 'auto' ? 'wide' : pref === 'wide' ? 'compact' : 'auto';
}

export function resolveLayout(pref: LayoutPref, screenIsWide: boolean): Layout {
  if (pref === 'auto') return screenIsWide ? 'wide' : 'compact';
  return pref;
}

export const LAYOUT_META: Record<LayoutPref, { icon: string; label: string }> = {
  auto: { icon: '🖥️', label: 'Layout: wide on big screens' },
  wide: { icon: '↔️', label: 'Layout: always wide' },
  compact: { icon: '📱', label: 'Layout: always compact' },
};

let current: LayoutPref = 'auto';
let media: MediaQueryList | null = null;

function render(): void {
  document.documentElement.dataset.layout = resolveLayout(current, media?.matches ?? false);
}

/** Sets `data-layout` on <html> to the resolved layout, re-resolving 'auto' as the window resizes. */
export function applyLayout(pref: LayoutPref): void {
  current = pref;
  if (!media) {
    media = window.matchMedia(WIDE_QUERY);
    media.addEventListener('change', render);
  }
  render();
}

export function setLayoutPref(pref: LayoutPref): void {
  localStorage.setItem(KEY, pref);
  applyLayout(pref);
}
