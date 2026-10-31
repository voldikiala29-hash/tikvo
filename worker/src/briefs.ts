// Requêtes de recherche de plans, une par phrase du script (en anglais, émotion comprise).
// Aucun import : ce fichier est testé tel quel sous Node.

export const BRIEF_SYSTEM = 'Tu es directeur artistique de vidéos courtes. Tu réponds uniquement par un tableau JSON.';

export function buildBriefPrompt(lines: string[], niche: string): string {
  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  return [
    `Niche : ${niche}.`,
    'Pour chaque phrase d’une vidéo en français, écris une requête de recherche de vidéo stock EN ANGLAIS qui montre exactement ce que la phrase décrit.',
    'Règles :',
    '- Respecte l’émotion de la phrase : une femme qui pleure se cherche « crying woman sad », jamais « laughing ».',
    '- Respecte le sujet (femme, homme, enfant, objet), l’action et le lieu.',
    '- 2 à 6 mots concrets, par exemple « sad woman crying close up » ou « man running on beach ».',
    '- Pas de nom de marque, pas de texte à l’écran.',
    '- Si la phrase est abstraite, choisis une image concrète qui la symbolise.',
    `Réponds uniquement par un tableau JSON de ${lines.length} chaînes, dans l’ordre.`,
    '',
    numbered,
  ].join('\n');
}

export function sanitizeQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const q = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = q.split(' ').filter(Boolean);
  if (words.length < 2) return null;
  return words.slice(0, 6).join(' ');
}

/** Extrait le tableau JSON de la réponse du modèle. Une requête invalide devient null (repli sur la niche). */
export function parseBriefQueries(raw: string, count: number): (string | null)[] {
  const none = (): (string | null)[] => Array.from({ length: count }, () => null);
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end <= start) return none();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return none();
  }
  if (!Array.isArray(parsed)) return none();
  return Array.from({ length: count }, (_, i) => sanitizeQuery(parsed[i]));
}
