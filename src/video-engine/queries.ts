/** Requêtes en anglais par niche : Pexels renvoie de bien meilleurs résultats qu'en français. */
export const NICHE_QUERIES: Record<string, string[]> = {
  mode: ['fashion outfit', 'street style', 'clothing model'],
  beaute: ['skincare routine', 'makeup', 'beauty woman'],
  cuisine: ['cooking food', 'chef kitchen', 'delicious meal'],
  fitness: ['gym workout', 'fitness training', 'running outdoors'],
  business: ['entrepreneur', 'business office', 'working laptop'],
  education: ['student studying', 'learning books', 'classroom'],
  comedie: ['friends laughing', 'funny people', 'party fun'],
  musique: ['music studio', 'singer microphone', 'concert crowd'],
  gaming: ['video game', 'gamer', 'esports'],
  lifestyle: ['lifestyle', 'morning routine', 'city life'],
};

export function buildQueries(nicheId: string, keywords: string[]): string[] {
  // Les mots-clés de la vidéo passent en premier : ce sont eux qui distinguent deux vidéos d'une même niche.
  const queries = [...keywords.map((k) => k.trim()).filter(Boolean), ...(NICHE_QUERIES[nicheId] || []), 'aesthetic lifestyle'];
  return [...new Set(queries.map((q) => q.toLowerCase()))];
}

