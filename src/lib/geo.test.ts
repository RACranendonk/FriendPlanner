import { describe, expect, it } from 'vitest';
import { isValidCoords, navUrl, parseCoordsFromUrl } from './geo';

describe('navUrl', () => {
  it('builds a geo: URI carrying the coordinates', () => {
    expect(navUrl(43.7677, 11.2553)).toBe('geo:43.7677,11.2553?q=43.7677,11.2553');
  });
});

describe('parseCoordsFromUrl', () => {
  it('parses the @lat,lng viewport form', () => {
    expect(parseCoordsFromUrl('https://www.google.com/maps/place/Uffizi/@43.7677,11.2553,15z')).toEqual({
      lat: 43.7677,
      lng: 11.2553,
    });
  });

  it('parses the !3d/!4d place marker form, including negatives', () => {
    expect(parseCoordsFromUrl('https://www.google.com/maps/place/x/data=!3d-33.8568!4d151.2153')).toEqual({
      lat: -33.8568,
      lng: 151.2153,
    });
  });

  it('returns null for URLs without coordinates or with out-of-range values', () => {
    expect(parseCoordsFromUrl('https://www.komoot.com/tour/123456')).toBeNull();
    expect(parseCoordsFromUrl('https://example.com/@999.0,11.2')).toBeNull();
  });
});

describe('isValidCoords', () => {
  it('accepts real coordinates and rejects out-of-range or non-finite ones', () => {
    expect(isValidCoords(43.77, 11.25)).toBe(true);
    expect(isValidCoords(-90, 180)).toBe(true);
    expect(isValidCoords(91, 0)).toBe(false);
    expect(isValidCoords(0, -181)).toBe(false);
    expect(isValidCoords(NaN, 0)).toBe(false);
  });
});
