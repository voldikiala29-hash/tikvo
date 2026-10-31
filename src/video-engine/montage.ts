// Réglages de montage partagés par le site, le Worker et le pipeline.
// Aucun import à l'exécution : ce fichier doit rester utilisable tel quel par les tests Node.
import type { MontageConfig } from './types';

export const ASPECTS = [
  { id: '9:16', label: 'Vertical 9:16', hint: 'TikTok, Reels, Shorts', width: 1080, height: 1920 },
  { id: '16:9', label: 'Horizontal 16:9', hint: 'YouTube, présentation', width: 1920, height: 1080 },
  { id: '1:1', label: 'Carré 1:1', hint: 'Feed Instagram', width: 1080, height: 1080 },
  { id: '4:5', label: 'Portrait 4:5', hint: 'Feed Instagram, Facebook', width: 1080, height: 1350 },
] as const;
export type AspectId = (typeof ASPECTS)[number]['id'];

export type MontageId = 'dynamique' | 'cinema' | 'pop' | 'minimal' | 'documentaire' | 'story';

export const MONTAGES: { id: MontageId; label: string; description: string; config: MontageConfig }[] = [
  {
    id: 'dynamique',
    label: 'Dynamique',
    description: 'Rythme vif, zoom appuyé, coupes sèches.',
    config: {
      transitionFrames: 0,
      zoom: 1.18,
      filter: 'brightness(0.92) contrast(1.12) saturate(1.15)',
      vignette: true,
      letterbox: false,
      subtitles: 'bottom',
      hookPosition: 'center',
      accent: '#00FFC6',
    },
  },
  {
    id: 'cinema',
    label: 'Cinéma',
    description: 'Fondus doux, bandes noires, teinte chaude.',
    config: {
      transitionFrames: 18,
      zoom: 1.06,
      filter: 'sepia(0.18) contrast(1.12) brightness(0.88) saturate(0.9)',
      vignette: true,
      letterbox: true,
      subtitles: 'bottom',
      hookPosition: 'center',
      accent: '#F5C76B',
    },
  },
  {
    id: 'pop',
    label: 'Pop',
    description: 'Couleurs vives, sous-titres au centre, accent rose.',
    config: {
      transitionFrames: 6,
      zoom: 1.25,
      filter: 'contrast(1.2) saturate(1.45) brightness(1.03)',
      vignette: false,
      letterbox: false,
      subtitles: 'center',
      hookPosition: 'top',
      accent: '#FF2E93',
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Sobre, fondus discrets, typographie épurée.',
    config: {
      transitionFrames: 12,
      zoom: 1.03,
      filter: 'contrast(1.02) saturate(0.85) brightness(0.98)',
      vignette: false,
      letterbox: false,
      subtitles: 'bottom',
      hookPosition: 'center',
      accent: '#FFFFFF',
    },
  },
  {
    id: 'documentaire',
    label: 'Documentaire',
    description: 'Noir et blanc, mouvement lent, bandes noires.',
    config: {
      transitionFrames: 24,
      zoom: 1.1,
      filter: 'grayscale(0.85) contrast(1.18) brightness(0.9)',
      vignette: true,
      letterbox: true,
      subtitles: 'bottom',
      hookPosition: 'top',
      accent: '#E5E7EB',
    },
  },
  {
    id: 'story',
    label: 'Story',
    description: 'Couleurs chaudes, accroche en haut, coupes rythmées.',
    config: {
      transitionFrames: 8,
      zoom: 1.15,
      filter: 'contrast(1.1) saturate(1.2) hue-rotate(-6deg) brightness(0.95)',
      vignette: true,
      letterbox: false,
      subtitles: 'bottom',
      hookPosition: 'top',
      accent: '#FFB020',
    },
  },
];

/** 0 = automatique (un plan toutes les ~5 s). Sinon nombre de plans distincts par script. */
export const CLIP_CHOICES = [0, 2, 3, 5, 8] as const;

export interface RenderSettings {
  aspect: AspectId;
  montage: MontageId;
  clipsPerScript: number;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = { aspect: '9:16', montage: 'dynamique', clipsPerScript: 0 };

export function resolveRenderSettings(raw: unknown): RenderSettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const aspect = ASPECTS.find((a) => a.id === o.aspect)?.id ?? DEFAULT_RENDER_SETTINGS.aspect;
  const montage = MONTAGES.find((m) => m.id === o.montage)?.id ?? DEFAULT_RENDER_SETTINGS.montage;
  const clips = (CLIP_CHOICES as readonly number[]).includes(Number(o.clipsPerScript))
    ? Number(o.clipsPerScript)
    : DEFAULT_RENDER_SETTINGS.clipsPerScript;
  return { aspect, montage, clipsPerScript: clips };
}

export function aspectSize(id: AspectId): { width: number; height: number } {
  const a = ASPECTS.find((x) => x.id === id) ?? ASPECTS[0];
  return { width: a.width, height: a.height };
}

export function montageConfig(id: MontageId): MontageConfig {
  return (MONTAGES.find((m) => m.id === id) ?? MONTAGES[0]).config;
}

/** Débit de parole moyen en français (mots par seconde), voix Edge TTS à +6 %. */
export const WORDS_PER_SECOND = 2.8;

/** Durée estimée de la voix pour un script (la vraie durée vient de l'audio généré). */
export function estimateSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return words / WORDS_PER_SECOND;
}

/** Nombre de plans distincts pour une vidéo de `totalSec` secondes. */
export function clipCountFor(totalSec: number, choice: number): number {
  if (choice > 0) return choice;
  return Math.min(12, Math.max(3, Math.ceil(totalSec / 5)));
}
