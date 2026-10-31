// Plan par phrase : pour chaque phrase du script, un média de l'utilisateur si l'un montre exactement ça,
// sinon une requête de recherche de vidéo stock (en anglais, émotion comprise).
// Aucun import : ce fichier est testé tel quel sous Node.

export const BRIEF_SYSTEM = 'Tu es directeur artistique de vidéos courtes. Tu réponds uniquement par un tableau JSON.';

export interface BriefMedia {
  id: string;
  description: string;
}

export interface BriefPlan {
  queries: (string | null)[];
  mediaIds: (string | null)[];
}

export function buildBriefPrompt(lines: string[], niche: string, media: BriefMedia[] = []): string {
  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const mediaLines =
    media.length === 0
      ? ['Aucune photo ou vidéo personnelle : mets "media": null partout.']
      : [
          'Photos et vidéos personnelles de l’utilisateur (utilise-en une seule si elle montre exactement ce que dit la phrase, avec la même émotion et le même sujet ; sinon "media": null) :',
          ...media.map((m) => `- id ${m.id} : « ${m.description || 'sans description'} »`),
        ];
  return [
    `Niche : ${niche}.`,
    'Pour chaque phrase d’une vidéo en français, donne :',
    '- "query" : une requête de recherche de vidéo stock EN ANGLAIS qui montre exactement ce que la phrase décrit ;',
    '- "media" : l’id d’une photo ou vidéo personnelle qui convient, ou null.',
    'Règles :',
    '- Respecte l’émotion de la phrase : une femme qui pleure se cherche « crying woman sad », jamais « laughing ».',
    '- Respecte le sujet (femme, homme, enfant, objet), l’action et le lieu.',
    '- 2 à 6 mots concrets dans "query", par exemple « sad woman crying close up ».',
    '- Pas de nom de marque, pas de texte à l’écran.',
    '- Si la phrase est abstraite, choisis une image concrète qui la symbolise.',
    ...mediaLines,
    `Réponds uniquement par un tableau JSON de ${lines.length} objets {"query": "...", "media": "..."|null}, dans l’ordre.`,
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

/** Lit la réponse du modèle. Un id de média inconnu ou un élément invalide devient null. */
export function parseBriefPlan(raw: string, count: number, knownMediaIds: string[] = []): BriefPlan {
  const plan: BriefPlan = {
    queries: Array.from({ length: count }, () => null),
    mediaIds: Array.from({ length: count }, () => null),
  };
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end <= start) return plan;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return plan;
  }
  if (!Array.isArray(parsed)) return plan;
  const known = new Set(knownMediaIds);
  for (let i = 0; i < count; i++) {
    const item = parsed[i];
    if (typeof item === 'string') {
      plan.queries[i] = sanitizeQuery(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as { query?: unknown; media?: unknown };
      plan.queries[i] = sanitizeQuery(o.query);
      if (typeof o.media === 'string' && known.has(o.media)) plan.mediaIds[i] = o.media;
    }
  }
  return plan;
}
