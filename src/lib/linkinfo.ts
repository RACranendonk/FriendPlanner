export interface LinkInfo {
  /** What the link points at — a friendly site name when recognized, else the hostname. */
  label: string;
  host: string;
  /** Always absolute (https:// prepended when the user pasted a bare domain). */
  href: string;
}

const KNOWN_SITES: Array<[RegExp, string]> = [
  [/(^|\.)komoot\.[a-z.]+$/, 'Komoot route'],
  [/(^|\.)alltrails\.com$/, 'AllTrails'],
  [/(^|\.)tripadvisor\.[a-z.]+$/, 'Tripadvisor'],
  [/(^|\.)getyourguide\.[a-z.]+$/, 'GetYourGuide'],
  [/(^|\.)airbnb\.[a-z.]+$/, 'Airbnb'],
  [/(^|\.)booking\.com$/, 'Booking.com'],
  [/(^|\.)wikipedia\.org$/, 'Wikipedia'],
  [/(^|\.)strava\.com$/, 'Strava'],
];

function isGoogleMaps(url: URL, host: string): boolean {
  return (
    /(^|\.)maps\.google\.[a-z.]+$/.test(host) ||
    host === 'maps.app.goo.gl' ||
    (/(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith('/maps'))
  );
}

/** Describes where a pasted link leads, so the UI can say so before anyone taps it. */
export function linkInfo(raw: string): LinkInfo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    try {
      url = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '');
  if (!host.includes('.')) return null;
  if (isGoogleMaps(url, host)) return { label: 'Google Maps', host, href: url.href };
  for (const [pattern, label] of KNOWN_SITES) {
    if (pattern.test(host)) return { label, host, href: url.href };
  }
  return { label: host, host, href: url.href };
}
