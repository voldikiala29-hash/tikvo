// Recherche d'un plan par phrase (Pixabay), en parallèle. Repli sur la niche pour les phrases sans plan.
import { collectClips, searchPixabay, toCandidate } from './stock.ts';
import type { ClipCandidate } from './stock.ts';
import { pickSceneHit } from './scenes.ts';

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
