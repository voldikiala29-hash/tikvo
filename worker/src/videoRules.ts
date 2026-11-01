// Règles de la génération vidéo IA. Module pur (aucun import) pour pouvoir être testé sous Node.

/** Durée minimale et maximale acceptées par minimax/h3-lite (en secondes). */
export const VIDEO_MIN_SECONDS = 4;
export const VIDEO_MAX_SECONDS = 15;

/** Formats acceptés par h3-lite (sous-ensemble utile pour les vidéos verticales). */
export const VIDEO_RATIOS = ['9:16', '16:9', '1:1'] as const;

export const VIDEO_RESOLUTION = '480P';
export const VIDEO_MAX_PROMPT_CHARS = 1000;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;

/** Durée demandée ramenée dans les bornes du modèle. 3 s demandées → 4 s (minimum du modèle). */
export function clampVideoDuration(requested: unknown): number {
  const n = typeof requested === 'number' ? requested : Number(requested);
  if (!Number.isFinite(n)) return VIDEO_MIN_SECONDS;
  return Math.min(VIDEO_MAX_SECONDS, Math.max(VIDEO_MIN_SECONDS, Math.round(n)));
}

/** Format « 9:16 » si connu, sinon vertical 9:16 (format des vidéos TikTok). */
export function videoRatio(requested: unknown): (typeof VIDEO_RATIOS)[number] {
  return (VIDEO_RATIOS as readonly string[]).includes(String(requested)) ? (String(requested) as (typeof VIDEO_RATIOS)[number]) : '9:16';
}

/**
 * URL de la vidéo dans la réponse du modèle. Le format varie selon le modèle :
 * { task: { content: { url } } }, { result: { video } } ou { video }.
 */
export function extractVideoUrl(out: unknown): string | null {
  const candidates: unknown[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 5 || node === null || node === undefined) return;
    if (typeof node === 'string') {
      candidates.push(node);
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === 'url' || key === 'video') {
          if (typeof value === 'string') candidates.push(value);
        }
        visit(value, depth + 1);
      }
    }
  };
  visit(out, 0);
  return candidates.find((c): c is string => typeof c === 'string' && /^https:\/\/\S+/.test(c)) ?? null;
}

/** Jour UTC au format AAAA-MM-JJ (les quotas Cloudflare se réinitialisent à minuit UTC). */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
