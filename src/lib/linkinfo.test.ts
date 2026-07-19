import { describe, expect, it } from 'vitest';
import { linkInfo } from './linkinfo';

describe('linkInfo', () => {
  it('recognizes known activity sites', () => {
    expect(linkInfo('https://www.komoot.com/tour/123456')!.label).toBe('Komoot route');
    expect(linkInfo('https://www.alltrails.com/trail/some-trail')!.label).toBe('AllTrails');
    expect(linkInfo('https://www.tripadvisor.nl/Attraction_Review')!.label).toBe('Tripadvisor');
  });

  it('recognizes Google Maps in its various URL shapes, but not plain Google', () => {
    expect(linkInfo('https://maps.google.com/?q=Florence')!.label).toBe('Google Maps');
    expect(linkInfo('https://www.google.com/maps/place/Uffizi')!.label).toBe('Google Maps');
    expect(linkInfo('https://maps.app.goo.gl/AbCdEf')!.label).toBe('Google Maps');
    expect(linkInfo('https://www.google.com/search?q=hike')!.label).toBe('google.com');
  });

  it('labels unknown sites with their hostname', () => {
    const info = linkInfo('https://www.some-vineyard.it/tastings')!;
    expect(info.label).toBe('some-vineyard.it');
    expect(info.host).toBe('some-vineyard.it');
  });

  it('prepends https:// to bare domains so the link is not treated as relative', () => {
    const info = linkInfo('komoot.com/tour/123')!;
    expect(info.label).toBe('Komoot route');
    expect(info.href).toBe('https://komoot.com/tour/123');
  });

  it('rejects garbage and non-web schemes', () => {
    expect(linkInfo('')).toBeNull();
    expect(linkInfo('not a url at all')).toBeNull();
    expect(linkInfo('javascript:alert(1)')).toBeNull();
  });
});
