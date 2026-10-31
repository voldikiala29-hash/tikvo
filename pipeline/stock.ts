import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Clips Pixabay (API vidéo). La clé ne quitte jamais le pipeline : elle est passée en paramètre de requête
// et n'apparaît dans aucun message d'erreur.

export interface PixabayVariant {
  url: string;
  width: number;
  height: number;
  size?: number;
}

export interface PixabayHit {
  id: number;
  duration?: number;
  user?: string;
  videos?: Partial<Record<'large' | 'medium' | 'small' | 'tiny', PixabayVariant>>;
}

export interface ClipCandidate {
  id: number;
  link: string;
  width: number;
  height: number;
  duration: number;
  credit: string;
}

export { buildQueries } from '../src/video-engine/queries.ts';

const VARIANT_ORDER = ['large', 'medium', 'small', 'tiny'] as const;
const MIN_CLIP_SECONDS = 3;

/** Choisit la meilleure variante disponible : la plus grande, en portrait de préférence. */
export function pickVariant(hit: PixabayHit): PixabayVariant | null {
  const variants = VARIANT_ORDER.map((k) => hit.videos?.[k]).filter((v): v is PixabayVariant => !!v?.url);
  if (variants.length === 0) return null;
  const portrait = variants.filter((v) => v.height >= v.width);
  const pool = portrait.length > 0 ? portrait : variants;
  return pool[0];
}

export function toCandidate(hit: PixabayHit): ClipCandidate | null {
  const variant = pickVariant(hit);
  if (!variant) return null;
  const duration = hit.duration || 0;
  if (duration < MIN_CLIP_SECONDS) return null;
  return {
    id: hit.id,
    link: variant.url,
    width: variant.width,
    height: variant.height,
    duration,
    credit: hit.user || '',
  };
}

async function pixabayGet<T>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt === 1) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    if (!res.ok) throw new Error(`Pixabay a répondu HTTP ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error('Pixabay a répondu HTTP 429 (quota dépassé)');
}

/**
 * Cherche `need` clips distincts. Les identifiants déjà choisis dans l'aperçu passent d'abord.
 * Chaque requête contribue à parts égales pour que les plans viennent de plusieurs thèmes.
 */
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
  const endpoint = (params: Record<string, string>) =>
    `https://pixabay.com/api/videos/?${new URLSearchParams({ key: options.key, safesearch: 'true', ...params })}`;

  // 1. Plans choisis dans l'aperçu (identifiants Pixabay uniquement).
  for (const id of options.ids) {
    try {
      const data = await pixabayGet<{ hits?: PixabayHit[] }>(endpoint({ id: String(id), per_page: '3' }));
      for (const hit of data.hits || []) add(toCandidate(hit));
    } catch (err) {
      console.warn(`Clip Pixabay ${id} ignoré : ${err instanceof Error ? err.message : err}`);
    }
  }

  // 2. Complément par requêtes, avec une pause entre elles pour rester sous le quota gratuit.
  const perQuery = Math.max(2, Math.ceil(options.need / Math.max(1, options.queries.length)) + 1);
  for (const query of options.queries) {
    if (found.length >= options.need) break;
    try {
      const data = await pixabayGet<{ hits?: PixabayHit[] }>(
        endpoint({ q: query, video_type: 'film', orientation: 'vertical', per_page: '20', order: 'popular' }),
      );
      let taken = 0;
      for (const hit of data.hits || []) {
        if (taken >= perQuery || found.length >= options.need) break;
        const before = found.length;
        add(toCandidate(hit));
        if (found.length > before) taken++;
      }
    } catch (err) {
      console.warn(`Recherche Pixabay « ${query} » échouée : ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, 400));
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
