// Mots-clés visuels pour chercher une vidéo stock à partir d'un script. Module pur (aucun import) : testé sous Node.

export const KEYWORDS_SYSTEM = 'Tu es directeur artistique de vidéos courtes. Tu réponds uniquement par un objet JSON.';

export const MAX_KEYWORDS = 3;

export function keywordsPrompt(script: string): string {
  return [
    `Extrait ${MAX_KEYWORDS} mots-clés visuels en ANGLAIS pour chercher une vidéo stock (Pixabay) à partir de ce script TikTok :`,
    `« ${script} »`,
    'Réponds uniquement par un objet JSON de la forme {"keywords": ["morning routine mistake", "tired woman bed", "alarm clock"]}.',
    'Mots-clés très visuels et concrets (sujet, action, lieu, émotion montrable), jamais abstraits.',
  ].join('\n');
}

/** Nettoie un mot-clé : minuscules ASCII, 2 à 6 mots. Renvoie null s'il est inutilisable. */
export function cleanKeyword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const words = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length >= 2 ? words.slice(0, 6).join(' ') : null;
}

/** Lit la réponse du modèle : {"keywords": [...]} ou un simple tableau. Au plus MAX_KEYWORDS, sans doublon. */
export function parseKeywords(raw: string): string[] {
  const start = raw.search(/[\[{]/);
  if (start < 0) return [];
  const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
  if (end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : (data as { keywords?: unknown })?.keywords;
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    const kw = cleanKeyword(item);
    if (kw && !out.includes(kw)) out.push(kw);
    if (out.length === MAX_KEYWORDS) break;
  }
  return out;
}
