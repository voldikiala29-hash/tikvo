// Vérification du jeton Firebase et proxy Pexels (clé API jamais exposée au navigateur).
import { Env, HttpError } from './types';

export interface AuthUser {
  uid: string;
}

/**
 * Vérifie un jeton Firebase ID via l'endpoint officiel Identity Toolkit (accounts:lookup).
 * Google valide la signature, l'expiration et l'émetteur : pas de crypto maison à maintenir.
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

interface PexelsFile {
  file_type?: string;
  width?: number | null;
  height?: number | null;
  link: string;
}

interface PexelsVideo {
  id: number;
  image: string;
  duration: number;
  video_files?: PexelsFile[];
}

/** Fichier MP4 vertical, de largeur proche de 720 px : assez net pour un aperçu, léger à charger. */
function pickPortraitMp4(files: PexelsFile[] = []): PexelsFile | null {
  const mp4 = files.filter((f) => f.file_type === 'video/mp4' && Boolean(f.link));
  const portrait = mp4.filter((f) => (f.height ?? 0) >= (f.width ?? 0));
  const pool = portrait.length > 0 ? portrait : mp4;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => Math.abs((a.width ?? 0) - 720) - Math.abs((b.width ?? 0) - 720))[0];
}

export interface PexelsClip {
  id: number;
  url: string;
  preview: string;
  duration: number;
  width: number | null;
  height: number | null;
}

export async function searchPexelsVideos(env: Env, query: string, perPage: number): Promise<PexelsClip[]> {
  if (!env.PEXELS_API_KEY) throw new HttpError(503, 'not_configured', 'PEXELS_API_KEY manquant côté serveur.');

  const url =
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}` +
    `&per_page=${perPage}&orientation=portrait`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: env.PEXELS_API_KEY } });
  } catch {
    throw new HttpError(502, 'upstream', 'Pexels est injoignable.');
  }
  if (!res.ok) throw new HttpError(502, 'upstream', `Pexels a répondu ${res.status}.`);

  const data = (await res.json().catch(() => ({}))) as { videos?: PexelsVideo[] };
  const clips: PexelsClip[] = [];
  for (const video of data.videos ?? []) {
    const file = pickPortraitMp4(video.video_files);
    if (!file) continue;
    clips.push({
      id: video.id,
      url: file.link,
      preview: video.image,
      duration: video.duration,
      width: file.width ?? null,
      height: file.height ?? null,
    });
  }
  return clips;
}
