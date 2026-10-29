const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const now = (): number => Date.now();

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant (via hachage) pour les secrets partagés. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('tikvo-tokens-v1'),
      info: encoder.encode('aes-gcm'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Chiffre un texte (AES-GCM) ; le résultat contient l'IV. */
export async function encryptText(secret: string, plain: string): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toBase64Url(out);
}

export async function decryptText(secret: string, packed: string): Promise<string> {
  const key = await aesKey(secret);
  const data = fromBase64Url(packed);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return decoder.decode(plain);
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function clampString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
