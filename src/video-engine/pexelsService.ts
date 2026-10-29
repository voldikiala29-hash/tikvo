// Clips d'aperçu : vrais résultats Pexels via le Worker (clé API côté serveur).
// Sans connexion ou sans résultat, l'aperçu affiche simplement un fond uni : aucun clip factice.
import { backend, getSessionToken, isApiConfigured, PexelsVideoView } from '../services/backendApi';
import { buildQueries } from './queries';
import type { VideoClip } from './types';

const PREVIEW_FPS = 30;

/** Fichier mp4 vertical le plus proche de 1080 px de large (720 à 1440 px de préférence). */
export function pickPreviewFile(files: PexelsVideoView['files']): PexelsVideoView['files'][number] | null {
  if (files.length === 0) return null;
  const portrait = files.filter((f) => f.height >= f.width);
  const pool = portrait.length > 0 ? portrait : files;
  const sensible = pool.filter((f) => f.width >= 720 && f.width <= 1440);
  const candidates = sensible.length > 0 ? sensible : pool;
  return [...candidates].sort((a, b) => Math.abs(a.width - 1080) - Math.abs(b.width - 1080))[0];
}

export async function fetchPreviewClips(nicheId: string, keywords: string[] = []): Promise<VideoClip[]> {
  if (!isApiConfigured() || !getSessionToken()) return [];
  const query = buildQueries(nicheId, keywords)[0];
  try {
    const { videos } = await backend.pexelsSearch(query, 6);
    const clips: VideoClip[] = [];
    for (const video of videos) {
      const file = pickPreviewFile(video.files);
      if (!file) continue;
      clips.push({
        id: `pexels-${video.id}`,
        src: file.link,
        thumbnailUrl: video.image,
        durationInFrames: Math.max(60, Math.round((video.duration || 5) * PREVIEW_FPS)),
        credit: video.credit,
      });
      if (clips.length === 5) break;
    }
    return clips;
  } catch (err) {
    console.warn('[Aperçu] clips Pexels indisponibles :', err instanceof Error ? err.message : err);
    return [];
  }
}
