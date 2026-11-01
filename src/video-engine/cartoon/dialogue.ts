// Voix des héros et calage des répliques sur une ligne de temps unique (scène par scène).
// Fonctions pures : la synthèse (audio + timings mot par mot) est faite par le pipeline.
import { FPS, alignedWords } from '../timeline.ts';
import type { BoundaryEvent } from '../timeline.ts';
import type { KaraokeWord } from '../types.ts';

/** Voix Edge disponibles en français, réparties par genre. */
export const FEMALE_VOICES = ['fr-FR-DeniseNeural', 'fr-FR-EloiseNeural', 'fr-FR-VivienneMultilingualNeural', 'fr-FR-YvetteNeural'];
export const MALE_VOICES = ['fr-FR-HenriNeural', 'fr-FR-AlainNeural', 'fr-FR-JeanNeural', 'fr-FR-RemyMultilingualNeural'];

export interface HeroVoice {
  voice: string;
  rate: string;
  pitch: string;
}

/**
 * Voix d'un héros : le genre choisit le groupe de voix, l'index les départage (deux héros du même genre
 * n'ont pas la même voix tant qu'il en reste). L'âge règle le débit et la hauteur.
 */
export function heroVoice(hero: { voice: { gender: 'f' | 'm'; age: 'jeune' | 'adulte' | 'senior' } }, index: number): HeroVoice {
  const pool = hero.voice.gender === 'f' ? FEMALE_VOICES : MALE_VOICES;
  const rate = hero.voice.age === 'jeune' ? '+10%' : hero.voice.age === 'senior' ? '-8%' : '+4%';
  const pitch = hero.voice.gender === 'f' ? (hero.voice.age === 'senior' ? '-2Hz' : '+4Hz') : hero.voice.age === 'jeune' ? '+2Hz' : '-6Hz';
  return { voice: pool[index % pool.length], rate, pitch };
}

export interface SpokenItem {
  /** « narrator » ou l'identifiant d'un héros. */
  speaker: string;
  sceneIndex: number;
  text: string;
  expression: string;
  audioSec: number;
  events: BoundaryEvent[];
}

export interface PlacedItem {
  speaker: string;
  expression: string;
  /** Début et fin de la réplique dans la vidéo, en frames. */
  startFrame: number;
  endFrame: number;
  /** Mots de la réplique, en frames absolues (sous-titres). */
  words: KaraokeWord[];
}

export interface PlacedTimeline {
  items: PlacedItem[];
  /** Une fenêtre par scène, contiguë, sans trou. */
  sceneWindows: { from: number; durationInFrames: number }[];
  totalFrames: number;
}

/**
 * Place les répliques dans l'ordre des scènes. Une scène dure au moins `sceneSeconds[i]` et ne se termine
 * jamais avant ses répliques : une courte pause (`gapSec`) sépare deux répliques.
 */
export function placeSpoken(items: SpokenItem[], sceneSeconds: number[], gapSec = 0.3): PlacedTimeline {
  const placed: PlacedItem[] = [];
  const sceneWindows: { from: number; durationInFrames: number }[] = [];
  let cursor = 0;
  sceneSeconds.forEach((minSec, sceneIndex) => {
    const sceneStart = cursor;
    let at = sceneStart;
    for (const item of items.filter((i) => i.sceneIndex === sceneIndex)) {
      const startFrame = Math.round(at * FPS);
      const local = alignedWords(item.events, item.text, item.audioSec);
      const words = local.map((w) => ({ word: w.word, startFrame: w.startFrame + startFrame, endFrame: w.endFrame + startFrame }));
      const endFrame = startFrame + Math.max(1, Math.round(item.audioSec * FPS));
      placed.push({ speaker: item.speaker, expression: item.expression, startFrame, endFrame, words });
      at = endFrame / FPS + gapSec;
    }
    const spanSec = Math.max(minSec, at - sceneStart);
    const from = Math.round(sceneStart * FPS);
    const durationInFrames = Math.max(1, Math.round((sceneStart + spanSec) * FPS) - from);
    sceneWindows.push({ from, durationInFrames });
    cursor = from / FPS + durationInFrames / FPS;
  });
  const totalFrames = sceneWindows.length > 0 ? sceneWindows[sceneWindows.length - 1].from + sceneWindows[sceneWindows.length - 1].durationInFrames : 0;
  return { items: placed, sceneWindows, totalFrames };
}

/** Le locuteur actif à une frame donnée (ou null : silence). */
export function speakerAt(items: PlacedItem[], frame: number): string | null {
  const item = items.find((i) => frame >= i.startFrame && frame < i.endFrame);
  return item ? item.speaker : null;
}
