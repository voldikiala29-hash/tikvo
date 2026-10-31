import { HttpError } from './types';
import { classifySourceUrl, Platform } from './inspirationRules';

export type { Platform };

/** Vérifie qu'un lien est une page publique TikTok, YouTube ou Facebook. Aucun autre site n'est jamais appelé. */
export function parseSourceUrl(raw: unknown): { url: string; platform: Platform } {
  const ok = classifySourceUrl(raw);
  if (!ok) throw new HttpError(400, 'unsupported_url', 'Lien non pris en charge : TikTok, YouTube ou Facebook uniquement (https).');
  return ok;
}

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, max) : null;

/**
 * Titre et auteur publics via oEmbed (service officiel de TikTok et YouTube, sans clé).
 * Facebook exige une clé d'application : pas d'appel, l'utilisateur colle le texte.
 * Renvoie null sans bloquer si le service ne répond pas.
 */
export async function fetchPublicMetadata(platform: Platform, url: string): Promise<{ title: string | null; author: string | null }> {
  if (platform === 'facebook') return { title: null, author: null };
  const endpoint =
    platform === 'tiktok'
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { title: null, author: null };
    const data = (await res.json()) as { title?: unknown; author_name?: unknown };
    return { title: clip(data.title, 200), author: clip(data.author_name, 100) };
  } catch {
    return { title: null, author: null };
  } finally {
    clearTimeout(timer);
  }
}
