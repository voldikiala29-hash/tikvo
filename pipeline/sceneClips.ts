// Recherche d'un plan par phrase (Pixabay), en parallèle. Repli sur la niche pour les phrases sans plan.
import path from 'node:path';
import { collectClips, searchPixabay, toCandidate } from './stock.ts';
import type { ClipCandidate } from './stock.ts';
import { pickSceneHit } from './scenes.ts';
import type { SceneClip } from './scenes.ts';
import { probe, type WorkerApi } from './lib.ts';

export async function findSceneClips(options: {
  queries: (string | null)[];
  key: string;
  seed: number;
  fallbackQueries: string[];
}): Promise<(ClipCandidate | null)[]> {
  const page = 1 + (Math.abs(Math.floor(options.seed)) % 3);
  const hits = await Promise.all(
    options.queries.map(async (query) => {
      if (!query) return [];
      try {
        return await searchPixabay(query, options.key, page);
      } catch (err) {
        console.warn(`Recherche « ${query} » échouée : ${err instanceof Error ? err.message : err}`);
        return [];
      }
    }),
  );

  const used = new Set<number>();
  const picks: (ClipCandidate | null)[] = options.queries.map((query, i) => {
    if (!query) return null;
    const hit = pickSceneHit(hits[i], query, used);
    if (!hit) return null;
    used.add(hit.id);
    return toCandidate(hit);
  });

  const missing = picks.flatMap((p, i) => (p ? [] : [i]));
  if (missing.length > 0) {
    const extra = await collectClips({
      need: missing.length,
      ids: [],
      queries: options.fallbackQueries,
      key: options.key,
      seed: options.seed,
    }).catch(() => [] as ClipCandidate[]);
    const spare = extra.filter((c) => !used.has(c.id));
    missing.forEach((index, k) => {
      const clip = spare[k];
      if (clip) {
        picks[index] = clip;
        used.add(clip.id);
      }
    });
  }
  return picks;
}

/**
 * Photos et vidéos personnelles choisies pour certaines phrases (une seule utilisation par média).
 * Renvoie, pour chaque phrase, le plan personnel ou null (la phrase ira chercher sur Pixabay).
 */
export async function userSceneClips(
  api: WorkerApi,
  mediaIds: (string | null)[],
  media: { id: string; kind: 'image' | 'video'; ext: string }[],
  publicDir: string,
): Promise<(SceneClip | null)[]> {
  const used = new Set<string>();
  const out: (SceneClip | null)[] = [];
  for (let i = 0; i < mediaIds.length; i++) {
    const id = mediaIds[i];
    const item = id ? media.find((m) => m.id === id) : undefined;
    if (!id || !item || used.has(id)) {
      out.push(null);
      continue;
    }
    used.add(id);
    const rel = `clips/own-${i + 1}.${item.ext}`;
    const dest = path.join(publicDir, rel);
    try {
      await api.download(id, dest);
      if (item.kind === 'image') {
        out.push({ id: `own-${id}`, src: rel, durationSec: 1, kind: 'image' });
        continue;
      }
      const info = await probe(dest);
      if (info.duration < 1) throw new Error('vidéo trop courte');
      out.push({ id: `own-${id}`, src: rel, durationSec: info.duration, kind: 'video' });
    } catch (err) {
      console.warn(`Média personnel ${id} ignoré : ${err instanceof Error ? err.message : err}`);
      out.push(null);
    }
  }
  return out;
}
