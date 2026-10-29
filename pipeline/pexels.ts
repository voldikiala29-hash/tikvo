import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface PexelsFile {
  quality?: string;
  file_type?: string;
  width?: number;
  height?: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  image?: string;
  duration?: number;
  width?: number;
  height?: number;
  user?: { name?: string };
  video_files?: PexelsFile[];
}

export interface ClipCandidate {
  id: number;
  link: string;
  width: number;
  height: number;
  duration: number;
  credit: string;
}

export { buildQueries, NICHE_QUERIES } from '../src/video-engine/queries.ts';

/** Choisit le fichier mp4 le plus adapté à du 1080x1920 : ni trop lourd (4K), ni trop pauvre. */
export function pickFile(files: PexelsFile[] | undefined): PexelsFile | null {
  const mp4 = (files || []).filter((f) => (f.file_type || 'video/mp4') === 'video/mp4' && f.link);
  if (mp4.length === 0) return null;
  const portrait = mp4.filter((f) => (f.height || 0) >= (f.width || 0));
  const pool = portrait.length > 0 ? portrait : mp4;
  const sensible = pool.filter((f) => (f.width || 0) >= 720 && (f.width || 0) <= 1440);
  const candidates = sensible.length > 0 ? sensible : pool;
  return [...candidates].sort((a, b) => Math.abs((a.width || 0) - 1080) - Math.abs((b.width || 0) - 1080))[0];
}

function toCandidate(video: PexelsVideo): ClipCandidate | null {
  const file = pickFile(video.video_files);
  if (!file) return null;
  return {
    id: video.id,
    link: file.link,
    width: file.width || 0,
    height: file.height || 0,
    duration: video.duration || 0,
    credit: video.user?.name || '',
  };
}

async function pexelsGet<T>(url: string, key: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels a répondu HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function collectClips(options: {
  need: number;
  ids: number[];
  queries: string[];
  key: string;
}): Promise<ClipCandidate[]> {
  const found: ClipCandidate[] = [];
  const seen = new Set<number>();
  const add = (c: ClipCandidate | null) => {
    if (c && !seen.has(c.id) && found.length < options.need) {
      seen.add(c.id);
      found.push(c);
    }
  };

  // 1. Les plans choisis dans l'aperçu (identifiants Pexels uniquement : jamais d'URL libre).
  for (const id of options.ids) {
    try {
      add(toCandidate(await pexelsGet<PexelsVideo>(`https://api.pexels.com/videos/videos/${id}`, options.key)));
    } catch (err) {
      console.warn(`Clip Pexels ${id} ignoré : ${err instanceof Error ? err.message : err}`);
    }
  }

  // 2. Complément par recherche, en répartissant entre les requêtes pour varier les plans.
  const perQuery = Math.max(2, Math.ceil(options.need / Math.max(1, Math.min(3, options.queries.length))) + 1);
  for (const query of options.queries) {
    if (found.length >= options.need) break;
    try {
      const data = await pexelsGet<{ videos?: PexelsVideo[] }>(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=15`,
        options.key,
      );
      let taken = 0;
      for (const video of data.videos || []) {
        if (taken >= perQuery || found.length >= options.need) break;
        const before = found.length;
        add(toCandidate(video));
        if (found.length > before) taken++;
      }
    } catch (err) {
      console.warn(`Recherche Pexels « ${query} » échouée : ${err instanceof Error ? err.message : err}`);
    }
  }
  return found;
}

export async function downloadTo(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Téléchargement impossible (HTTP ${res.status})`);
  await mkdir(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
  return Number(res.headers.get('content-length') || 0);
}
