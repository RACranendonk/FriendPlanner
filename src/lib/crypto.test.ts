import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson } from './crypto';

describe('encryptJson/decryptJson', () => {
  it('round-trips a JSON value', async () => {
    const value = {
      name: 'Tuscany 2026',
      activities: [{ title: 'Hike to Monte Ceceri', votes: { Robert: { in: true, ts: 1 } } }],
    };
    const token = await encryptJson(value, 'correct horse battery');
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(decryptJson(token, 'correct horse battery')).resolves.toEqual(value);
  });

  it('rejects the wrong passphrase', async () => {
    const token = await encryptJson({ secret: 'plan' }, 'right');
    await expect(decryptJson(token, 'wrong')).rejects.toThrow();
  });

  it('never produces the same token twice for the same input (fresh salt/iv)', async () => {
    const a = await encryptJson({ x: 1 }, 'p');
    const b = await encryptJson({ x: 1 }, 'p');
    expect(a).not.toEqual(b);
  });
});
