import type { MontageConfig, ViralTemplateProps } from '../src/video-engine/types.ts';
import { FPS, hookFramesFor, wordsFromBoundaries } from '../src/video-engine/timeline.ts';
import type { BoundaryEvent } from '../src/video-engine/timeline.ts';
import {
  aspectSize,
  DEFAULT_RENDER_SETTINGS,
  montageConfig,
  resolveRenderSettings,
  type RenderSettings,
} from '../src/video-engine/montage.ts';

/** Durée de silence/respiration à la fin de la vidéo. */
export const TAIL_SECONDS = 0.8;
export const MAX_VIDEO_SECONDS = 180;

export interface Branding {
  showBrand: boolean;
  brandName: string;
  showNiche: boolean;
  showProgress: boolean;
}

/** Par défaut : pas de logo ni de nom, badge de niche et barre de progression conservés. */
export const DEFAULT_BRANDING: Branding = { showBrand: false, brandName: 'tikvo', showNiche: true, showProgress: true };

export function resolveBranding(raw: unknown): Branding {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const name = typeof o.brandName === 'string' && o.brandName.trim() ? o.brandName.trim().slice(0, 40) : DEFAULT_BRANDING.brandName;
  return {
    showBrand: typeof o.showBrand === 'boolean' ? o.showBrand : DEFAULT_BRANDING.showBrand,
    brandName: name,
    showNiche: typeof o.showNiche === 'boolean' ? o.showNiche : DEFAULT_BRANDING.showNiche,
    showProgress: typeof o.showProgress === 'boolean' ? o.showProgress : DEFAULT_BRANDING.showProgress,
  };
}

export interface ComposeInput {
  hook: string;
  nicheName: string;
  script: string;
  events: BoundaryEvent[];
  audioSec: number;
  audioSrc: string;
  clips: { id: string; src: string; durationSec: number; credit?: string }[];
  /** Une fenêtre par plan (une par phrase) : le plan suit la phrase prononcée. Absent = plans répartis. */
  scenes?: { from: number; durationInFrames: number }[];
  branding?: Branding;
  settings?: RenderSettings;
}

/**
 * La durée de la vidéo est celle de la voix : elle dépend du script, pas d'un réglage fixe.
 * Les plans se répartissent sur cette durée.
 */
export function composeProps(input: ComposeInput): ViralTemplateProps {
  const totalSec = input.audioSec + TAIL_SECONDS;
  if (totalSec > MAX_VIDEO_SECONDS) {
    throw new Error(`La vidéo durerait ${Math.round(totalSec)} s : raccourcis le script (maximum ${MAX_VIDEO_SECONDS} s).`);
  }
  const words = wordsFromBoundaries(input.events, input.script, input.audioSec);
  const branding = input.branding ?? DEFAULT_BRANDING;
  const settings = input.settings ?? DEFAULT_RENDER_SETTINGS;
  const size = aspectSize(settings.aspect);
  const montage: MontageConfig = montageConfig(settings.montage);
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
    scenes: input.scenes,
    brandTag: branding.showBrand ? branding.brandName : undefined,
    showNiche: branding.showNiche,
    showProgress: branding.showProgress,
    width: size.width,
    height: size.height,
    montage,
  };
}

export { resolveRenderSettings };
