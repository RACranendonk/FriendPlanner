export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Pulls coordinates out of a pasted Google Maps URL when they're present —
 * either the `@lat,lng,zoom` viewport form or the `!3d<lat>!4d<lng>` place
 * marker form. Free and instant, no network involved.
 */
export function parseCoordsFromUrl(url: string): LatLng | null {
  const match = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/) ?? url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  return isValidCoords(lat, lng) ? { lat, lng } : null;
}

/**
 * Best-effort geocoding via Nominatim, OpenStreetMap's free public geocoder
 * (no key; polite-use limits that a friend group never approaches — revisit
 * if the app grows a large public user base). The query goes to OSM's
 * servers; trip content never does.
 */
export async function geocode(query: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (results.length === 0) return null;
  const lat = parseFloat(results[0].lat);
  const lng = parseFloat(results[0].lon);
  return isValidCoords(lat, lng) ? { lat, lng } : null;
}
