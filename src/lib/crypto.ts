const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipeThrough(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const blob = new Blob([new Uint8Array(data)]);
  const response = new Response(blob.stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** JSON → deflate → AES-GCM (key from passphrase via PBKDF2) → base64url of salt|iv|ciphertext. */
export async function encryptJson(value: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const compressed = await pipeThrough(
    textEncoder.encode(JSON.stringify(value)),
    new CompressionStream('deflate-raw'),
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(compressed)),
  );
  const packed = new Uint8Array(salt.length + iv.length + ciphertext.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(ciphertext, salt.length + iv.length);
  return toBase64Url(packed);
}

export async function decryptJson<T>(token: string, passphrase: string): Promise<T> {
  const packed = fromBase64Url(token);
  const key = await deriveKey(passphrase, packed.slice(0, 16));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.slice(16, 28) },
    key,
    packed.slice(28),
  );
  const json = await pipeThrough(new Uint8Array(plain), new DecompressionStream('deflate-raw'));
  return JSON.parse(textDecoder.decode(json)) as T;
}
