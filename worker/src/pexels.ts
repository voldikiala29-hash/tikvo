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
  const url =
    `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}` +
    `&q=${encodeURIComponent(q)}&per_page=${count}&safesearch=true`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new HttpError(502, 'upstream', 'Pixabay est injoignable.');
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
  return clips;
}
