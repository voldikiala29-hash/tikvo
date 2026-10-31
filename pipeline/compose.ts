import type { ViralTemplateProps } from '../src/video-engine/types.ts';
import { FPS, hookFramesFor, wordsFromBoundaries } from '../src/video-engine/timeline.ts';
import type { BoundaryEvent } from '../src/video-engine/timeline.ts';

export interface ComposeInput {
  /** Durée choisie par l'utilisateur (15, 30 ou 60 s) : la vidéo dure au moins cette durée. */
  targetSec?: number;
  hook: string;
  nicheName: string;
  script: string;
  events: BoundaryEvent[];
  audioSec: number;
  audioSrc: string;
  clips: { id: string; src: string; durationSec: number; credit?: string }[];
}

/** Durée de silence/respiration à la fin de la vidéo. */
export const TAIL_SECONDS = 0.8;
export const MAX_VIDEO_SECONDS = 180;

export function composeProps(input: ComposeInput): ViralTemplateProps {
  const totalSec = Math.max(input.targetSec ?? 0, input.audioSec + TAIL_SECONDS);
  if (totalSec > MAX_VIDEO_SECONDS) {
    throw new Error(`La vidéo durerait ${Math.round(totalSec)} s : raccourcis le script (maximum ${MAX_VIDEO_SECONDS} s).`);
  }
  const words = wordsFromBoundaries(input.events, input.script, input.audioSec);
  return {
    hookText: input.hook,
    nicheName: input.nicheName,
    clips: input.clips.map((c) => ({
      id: c.id,
      src: c.src,
      durationInFrames: Math.floor(c.durationSec * FPS),
      credit: c.credit,
    })),
    karaokeWords: words,
    audioSrc: input.audioSrc,
    totalDurationInFrames: Math.ceil(totalSec * FPS),
    hookFrames: hookFramesFor(input.hook, words),
    brandTag: 'tikvo',
  };
}
