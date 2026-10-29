// Logique de timing partagée entre l'aperçu navigateur et le rendu serveur.
// Fichier volontairement sans dépendance : il est aussi exécuté tel quel par Node (pipeline/).
import type { KaraokeWord } from './types.ts';

export const FPS = 30;

export interface BoundaryEvent {
  offsetSec: number;
  durationSec: number;
  text: string;
}

/** Découpe un texte en mots affichables (accents, apostrophes et tirets conservés). */
export function splitWords(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/** Répartit une durée entre des mots, proportionnellement à leur longueur. */
function distribute(words: string[], startSec: number, durationSec: number): { word: string; start: number; end: number }[] {
  if (words.length === 0) return [];
  const weights = words.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = startSec;
  return words.map((word, i) => {
    const share = (durationSec * weights[i]) / total;
    const item = { word, start: cursor, end: cursor + share };
    cursor += share;
    return item;
  });
}

/**
 * Construit les mots karaoké à partir des événements de la synthèse vocale.
 * Fonctionne avec des événements par mot (WordBoundary) comme par phrase
 * (SentenceBoundary) : chaque événement est redécoupé en mots.
 * Sans événement, répartit le script sur la durée audio.
 */
export function wordsFromBoundaries(
  events: BoundaryEvent[],
  script: string,
  audioSec: number,
  fps: number = FPS,
): KaraokeWord[] {
  let timed: { word: string; start: number; end: number }[] = [];

  const usable = events.filter((e) => e.text && e.text.trim() && Number.isFinite(e.offsetSec));
  if (usable.length > 0) {
    for (const ev of usable) {
      const duration = ev.durationSec > 0 ? ev.durationSec : 0.25;
      timed.push(...distribute(splitWords(ev.text), ev.offsetSec, duration));
    }
  } else {
    const lead = 0.15;
    timed = distribute(splitWords(script), lead, Math.max(0.5, audioSec - lead - 0.1));
  }

  const words: KaraokeWord[] = timed.map((t) => ({
    word: t.word,
    startFrame: Math.round(t.start * fps),
    endFrame: Math.round(t.end * fps),
  }));

  // Continuité : un mot reste actif jusqu'au début du suivant, sans chevauchement.
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].startFrame < words[i - 1].startFrame) words[i].startFrame = words[i - 1].startFrame;
    if (i < words.length - 1) {
      words[i].endFrame = Math.max(words[i].startFrame, words[i + 1].startFrame - 1);
    } else {
      words[i].endFrame = Math.max(words[i].startFrame + 3, words[i].endFrame);
    }
  }
  return words;
}

/** Estimation grossière (aperçu navigateur uniquement, avant la vraie voix). */
export function estimateWords(script: string, startFrame = 0, fps: number = FPS): KaraokeWord[] {
  const words = splitWords(script);
  const secondsPerWord = 0.3;
  return wordsFromBoundaries(
    words.map((word, i) => ({ offsetSec: startFrame / fps + i * secondsPerWord, durationSec: secondsPerWord, text: word })),
    script,
    words.length * secondsPerWord,
    fps,
  );
}

/** Durée d'affichage du gros hook : jusqu'à la fin du dernier mot du hook (entre 2 s et 5 s). */
export function hookFramesFor(hook: string, words: KaraokeWord[], fps: number = FPS): number {
  const count = splitWords(hook).length;
  const min = 2 * fps;
  const max = 5 * fps;
  if (count === 0 || words.length < count) return 3 * fps;
  return Math.max(min, Math.min(max, words[count - 1].endFrame + Math.round(0.2 * fps)));
}

/** Nombre de plans : un plan d'environ 4 s, entre 3 et 12. */
export function clipCountFor(totalSec: number): number {
  return Math.max(3, Math.min(12, Math.ceil(totalSec / 4)));
}

/** Découpe la durée totale en segments égaux (le dernier absorbe le reste). */
export function planSegments(totalFrames: number, count: number): { from: number; durationInFrames: number }[] {
  const n = Math.max(1, count);
  const base = Math.floor(totalFrames / n);
  return Array.from({ length: n }, (_, i) => ({
    from: i * base,
    durationInFrames: i === n - 1 ? totalFrames - base * (n - 1) : base,
  }));
}
