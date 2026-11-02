// Bouche par syllabes : chaque mot ouvre la bouche selon ses voyelles (a, o : grande ; i, u : petite).
// Fonction pure, sans dépendance : utilisable dans le moteur comme dans les tests.

const WIDE = new Set(['a', 'à', 'â', 'o', 'ô']);
const MID = new Set(['e', 'é', 'è', 'ê', 'ë']);
const NARROW = new Set(['i', 'î', 'ï', 'u', 'û', 'ù', 'y']);

/** Ouverture de la bouche pour un mot, entre 0.15 (fermée) et 1 (grande ouverte). */
export function visemeOpen(word: string): number {
  const letters = word.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿç]/g, '');
  let total = 0;
  let count = 0;
  for (const ch of letters) {
    if (WIDE.has(ch)) {
      total += 1;
      count++;
    } else if (MID.has(ch)) {
      total += 0.6;
      count++;
    } else if (NARROW.has(ch)) {
      total += 0.4;
      count++;
    }
  }
  if (count === 0) return 0.2;
  return Math.min(1, Math.max(0.15, total / count));
}
