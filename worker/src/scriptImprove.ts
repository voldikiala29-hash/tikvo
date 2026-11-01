// Amélioration du script avant la recherche d'images. Module pur (aucun import) : testé sous Node.

export const IMPROVE_SYSTEM = 'Tu es scénariste de vidéos TikTok. Tu réponds uniquement avec le texte du script, sans titre ni commentaire.';

export function improvePrompt(script: string, niche: string): string {
  return [
    `Niche : ${niche}.`,
    'Réécris ce script de vidéo courte en français, pour qu’il retienne le spectateur. Règles strictes :',
    '- Garde exactement les mêmes faits, chiffres et sujet. N’invente rien.',
    '- La première ligne est une accroche forte (un fait précis ou une question qui ouvre une curiosité).',
    '- Une idée par ligne, phrases courtes, 8 lignes maximum.',
    '- Chaque ligne doit décrire quelque chose qu’on peut filmer (une personne, un geste, un lieu, un objet). Pas de notion abstraite seule.',
    '- Longueur proche de l’original (à 20 % près).',
    '- Pas d’emoji, pas de hashtag, pas de guillemets, pas de titre.',
    '',
    'Script original :',
    script.trim(),
  ].join('\n');
}

/** Nettoie la réponse du modèle (balises, préfixe « script : »). */
export function cleanImproved(raw: string): string {
  return raw
    .replace(/```[a-z]*|```/gi, '')
    .replace(/^\s*(nouveau\s+)?script\s*:\s*/i, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/**
 * Accepte la version améliorée seulement si elle respecte les règles : longueur proche, 2 à 8 lignes,
 * pas d'emoji ni de hashtag. Renvoie null sinon : on garde alors le script de l'utilisateur.
 */
export function acceptImproved(original: string, candidate: string): string | null {
  const text = cleanImproved(candidate);
  if (text.length < 10 || text.length > 1500) return null;
  const lines = text.split('\n');
  if (lines.length < 2 || lines.length > 8) return null;
  if (/#|[\p{Extended_Pictographic}]/u.test(text)) return null;
  const before = countWords(original);
  const after = countWords(text);
  if (after < before * 0.8 || after > before * 1.2) return null;
  return text;
}
