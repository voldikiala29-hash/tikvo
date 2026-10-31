// Règles de validation des liens sources (sans import : testable sous Node).
export type Platform = 'tiktok' | 'youtube' | 'facebook';

const HOSTS: Record<string, Platform> = {
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'web.facebook.com': 'facebook',
  'fb.watch': 'facebook',
};

/** Renvoie la plateforme et l'URL normalisée, ou null si le lien n'est pas une page TikTok, YouTube ou Facebook en https. */
export function classifySourceUrl(raw: unknown): { url: string; platform: Platform } | null {
  if (typeof raw !== 'string' || raw.trim().length === 0 || raw.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  const platform = HOSTS[parsed.hostname.toLowerCase()];
  if (parsed.protocol !== 'https:' || !platform) return null;
  return { url: parsed.toString(), platform };
}
