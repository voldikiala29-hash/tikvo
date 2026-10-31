// Vérification du jeton Firebase et recherche de clips vidéo (fournisseur : Pixabay).
// La clé API reste dans le Worker : le navigateur ne reçoit que les URL des clips.
import { Env, HttpError } from './types';

export interface AuthUser {
  uid: string;
}

/**
 * Vérifie un jeton Firebase ID via l'endpoint officiel Identity Toolkit (accounts:lookup).
 * Google valide la signature, l'expiration et l'émetteur.
 */
export async function requireFirebaseUser(request: Request, env: Env): Promise<AuthUser> {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token.length > 4096) throw new HttpError(401, 'unauthorized', 'Connexion requise.');
  if (!env.FIREBASE_API_KEY) throw new HttpError(503, 'not_configured', 'FIREBASE_API_KEY manquant côté serveur.');

  let res: Response;
  try {
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    );
  } catch {
    throw new HttpError(502, 'upstream', 'Vérification de la connexion impossible.');
  }
  if (!res.ok) throw new HttpError(401, 'unauthorized', 'Session expirée : reconnecte-toi.');

  const data = (await res.json().catch(() => ({}))) as { users?: { localId?: string }[] };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new HttpError(401, 'unauthorized', 'Session invalide.');
  return { uid };
}

interface PixabayVariant {
  url?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
  duration?: number;
}

interface PixabayHit {
  id: number;
  tags?: string;
  duration?: number;
  videos?: {
    large?: PixabayVariant;
    medium?: PixabayVariant;
    small?: PixabayVariant;
    tiny?: PixabayVariant;
  };
}

export interface StockClip {
  id: number;
  url: string;
  preview: string;
  duration: number;
  width: number | null;
  height: number | null;
  tags: string;
}

// ---------------------------------------------------------------- cache

const CACHE_TTL_S = 24 * 3600;
const CACHE_MAX_MEMORY_ENTRIES = 500;
// Cache de secours par isolat, utilisé tant que le namespace KV CACHE n'est pas lié.
const memoryCache = new Map<string, { at: number; value: StockClip[] }>();

function cacheKey(query: string, count: number): string {
  return `pixabay:v1:${query.trim().toLowerCase()}:${count}`;
}

async function readCache(env: Env, key: string): Promise<StockClip[] | null> {
  if (env.CACHE) {
    try {
      const raw = await env.CACHE.get(key);
      return raw ? (JSON.parse(raw) as StockClip[]) : null;
    } catch {
      return null;
    }
  }
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_S * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

async function writeCache(env: Env, key: string, value: StockClip[]): Promise<void> {
  if (value.length === 0) return; // on ne met jamais en cache un résultat vide
  if (env.CACHE) {
    try {
      await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_S });
    } catch {
      /* cache indisponible : la requête reste valide */
    }
    return;
  }
  if (memoryCache.size >= CACHE_MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { at: Date.now(), value });
}

// ---------------------------------------------------------------- Pixabay

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Une seule relance après 2 secondes si Pixabay répond 429. */
async function fetchPixabay(url: string): Promise<Response> {
  const first = await fetch(url);
  if (first.status !== 429) return first;
  await sleep(2000);
  return fetch(url);
}

/** Meilleure qualité disponible pour un clip Pixabay. */
function pickVariant(hit: PixabayHit): PixabayVariant | null {
  const v = hit.videos ?? {};
  return [v.large, v.medium, v.small, v.tiny].find((c) => Boolean(c?.url)) ?? null;
}

export async function searchStockVideos(env: Env, query: string, perPage: number): Promise<StockClip[]> {
  // Transition : PIXABAY_API_KEY si présente, sinon le secret historique PEXELS_API_KEY (qui contient la clé Pixabay).
  const apiKey = env.PIXABAY_API_KEY || env.PEXELS_API_KEY;
  if (!apiKey) throw new HttpError(503, 'not_configured', 'Clé API vidéo manquante côté serveur.');

  // Pixabay refuse une per_page inférieure à 3 et une requête de plus de 100 caractères.
  const q = query.slice(0, 100);
  const count = Math.max(3, Math.min(200, perPage));

  const key = cacheKey(q, count);
  const cached = await readCache(env, key);
  if (cached) return cached;

  const url =
    `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}` +
    `&q=${encodeURIComponent(q)}&per_page=${count}&safesearch=true`;

  let res: Response;
  try {
    res = await fetchPixabay(url);
  } catch {
    throw new HttpError(502, 'upstream', 'Pixabay est injoignable.');
  }

  if (res.status === 429) {
    throw new HttpError(429, 'PIXABAY_429', 'Pixabay limite atteinte, réessaie dans 1 min.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Le message d'erreur Pixabay ne contient jamais la clé : on peut le lire sans risque.
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /key/i.test(body))) {
      console.error('Pixabay a refusé la clé API (statut', res.status, ')');
      throw new HttpError(502, 'PIXABAY_401', 'Clé Pixabay invalide');
    }
    throw new HttpError(502, 'upstream', `Pixabay a répondu ${res.status}.`);
  }

  const data = (await res.json().catch(() => ({}))) as { hits?: PixabayHit[] };
  const clips: StockClip[] = [];
  for (const hit of data.hits ?? []) {
    const variant = pickVariant(hit);
    if (!variant?.url) continue;
    clips.push({
      id: hit.id,
      url: variant.url,
      preview: variant.thumbnail ?? '',
      duration: hit.duration ?? variant.duration ?? 0,
      width: variant.width ?? null,
      height: variant.height ?? null,
      tags: hit.tags ?? '',
    });
  }

  // Les clips verticaux d'abord : l'écran Aujourd'hui affiche des cartes en portrait.
  clips.sort((a, b) => Number((b.height ?? 0) >= (b.width ?? 0)) - Number((a.height ?? 0) >= (a.width ?? 0)));
  await writeCache(env, key, clips);
  return clips;
}
