// Storyboard : les plans voulus par l'utilisateur, un par ligne, avec une durée facultative.
// Format accepté : « Plan 1 | 4 s | femme qui pleure dans la cuisine » (le préfixe et la durée sont facultatifs).
// Fonctions pures : partagées par l'interface (aperçu, erreurs) et le pipeline (répartition des durées).

export interface Shot {
  text: string;
  /** Durée demandée en secondes, ou null (à répartir automatiquement). */
  seconds: number | null;
}

export const MAX_SHOTS = 8;
export const SHOT_MIN_SECONDS = 1;
export const SHOT_MAX_SECONDS = 15;
export const SHOT_MAX_CHARS = 160;
/** Durée d'un plan dont l'utilisateur n'a pas indiqué la durée. */
const DEFAULT_SHOT_SECONDS = 3;

// Préfixes ignorés : « Plan 1 », « Scène 2 », « 3. », « - », « • ».
const PREFIX = /^\s*(?:(?:plan|sc[èe]ne|shot|vid[ée]o)\s*\d+\s*[:.)|-]?|\d+\s*[.):|-]|[-•*])\s*/i;
// Durée : « 4 s », « 4s », « 2,5 sec », « 3 secondes ».
const DURATION = /(\d{1,2}(?:[.,]\d)?)\s*(?:s|sec|secondes?)\b/i;

export function parseStoryboard(raw: string): { shots: Shot[]; errors: string[] } {
  const shots: Shot[] = [];
  const errors: string[] = [];
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  lines.forEach((line, i) => {
    const label = `Plan ${i + 1}`;
    let rest = line.replace(PREFIX, '');
    let seconds: number | null = null;
    const match = DURATION.exec(rest);
    if (match) {
      seconds = Number(match[1].replace(',', '.'));
      rest = rest.slice(0, match.index) + rest.slice(match.index + match[0].length);
    }
    const text = rest
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
      .trim();

    if (text.length < 3) {
      errors.push(`${label} : décris ce qu'on doit voir.`);
      return;
    }
    if (text.length > SHOT_MAX_CHARS) errors.push(`${label} : description trop longue (${SHOT_MAX_CHARS} caractères au maximum).`);
    if (seconds !== null && (seconds < SHOT_MIN_SECONDS || seconds > SHOT_MAX_SECONDS)) {
      errors.push(`${label} : durée entre ${SHOT_MIN_SECONDS} et ${SHOT_MAX_SECONDS} s.`);
    }
    shots.push({ text, seconds });
  });

  if (shots.length > MAX_SHOTS) errors.push(`${MAX_SHOTS} plans au maximum.`);
  return { shots, errors };
}

/**
 * Durée de chaque plan, en secondes, pour que l'ensemble couvre exactement la voix off.
 * Les durées demandées gardent leurs proportions ; les plans sans durée valent DEFAULT_SHOT_SECONDS.
 */
export function planShotSeconds(shots: Pick<Shot, 'seconds'>[], totalSec: number): number[] {
  const raw = shots.map((s) => s.seconds ?? DEFAULT_SHOT_SECONDS);
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalSec <= 0) return raw.map(() => 0);
  return raw.map((s) => (s * totalSec) / sum);
}
