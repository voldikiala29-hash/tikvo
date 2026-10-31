// Sous-titres : phrases courtes, coupées aux fins de phrase, lisibles sans crier.
// Aucun import à l'exécution.

export interface CaptionChunk {
  /** Index du premier mot (inclus) dans la liste des mots. */
  first: number;
  /** Index du dernier mot (inclus). */
  last: number;
}

const SENTENCE_END = /[.!?…]["»”)]?$/;

/**
 * Découpe les mots en groupes lisibles : une fin de phrase, un nombre maximum de mots
 * ou de caractères ferme le groupe. Jamais de groupe vide.
 */
export function chunkCaptions(words: string[], maxWords = 6, maxChars = 30): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let first = 0;
  let chars = 0;
  for (let i = 0; i < words.length; i++) {
    const count = i - first + 1;
    chars += words[i].length + (count > 1 ? 1 : 0);
    const endsSentence = SENTENCE_END.test(words[i]);
    const full = count >= maxWords || chars >= maxChars;
    if (endsSentence || full || i === words.length - 1) {
      chunks.push({ first, last: i });
      first = i + 1;
      chars = 0;
    }
  }
  return chunks;
}

export function chunkAt(chunks: CaptionChunk[], index: number): CaptionChunk | undefined {
  return chunks.find((c) => index >= c.first && index <= c.last);
}
