// Fonctions pures (aucun import) : validation des scripts produits par le modèle et de la requête.
// Pas d'import ici pour que les tests tournent aussi sous Node sans transpilation.

export interface ScriptItem {
  hook: string;
  phrase1: string;
  phrase2: string;
  cta: string;
  pexelsQuery: string;
}

export const ALLOWED_DURATIONS = [21, 42, 90] as const;

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

/** Valide un script produit par le modèle. Renvoie null si un champ indispensable manque ou est trop long. */
export function validateScript(value: unknown): ScriptItem | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  const hook = clean(o.hook);
  const phrase1 = clean(o.phrase1);
  const phrase2 = clean(o.phrase2);
  const cta = clean(o.cta);
  if (!hook || hook.split(' ').length > 14 || hook.length > 120) return null;
  if (!phrase1 || !phrase2 || !cta) return null;
  if (phrase1.length > 220 || phrase2.length > 220 || cta.length > 120) return null;
  const query = clean(o.pexelsQuery).toLowerCase();
  // Requête de clip en anglais, lettres simples : sinon on laisse le programme choisir la sienne.
  const pexelsQuery = /^[a-z][a-z ]{2,50}$/.test(query) ? query : '';
  return { hook, phrase1, phrase2, cta, pexelsQuery };
}

/** Extrait le tableau JSON d'une réponse de modèle (même entourée de texte) et valide chaque script. */
export function parseScriptsJson(raw: string): ScriptItem[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.map(validateScript).filter((item): item is ScriptItem => item !== null);
}

export function parseScriptRequest(body: Record<string, unknown>): { niches: string[]; duration: number } {
  const raw = Array.isArray(body.niches) ? body.niches : [];
  const niches = Array.from(new Set(raw.filter((n): n is string => typeof n === 'string')));
  if (niches.length < 1 || niches.length > 3 || niches.some((n) => !/^[a-z]{2,20}$/.test(n))) {
    throw new Error('Niches invalides (1 à 3 identifiants).');
  }
  const duration = Number(body.duration);
  if (!(ALLOWED_DURATIONS as readonly number[]).includes(duration)) {
    throw new Error('Durée invalide (21, 42 ou 90 vidéos).');
  }
  return { niches, duration };
}
