export interface KaraokeWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface VideoClip {
  id: string;
  /** URL https (aperçu navigateur) ou chemin relatif au dossier public (rendu serveur). */
  src: string;
  thumbnailUrl?: string;
  /** Durée de la vidéo source en frames (0 si inconnue). */
  durationInFrames: number;
  /** Photo (affichée fixe, avec un léger zoom) ou vidéo (par défaut). */
  kind?: 'video' | 'image';
  credit?: string;
}

// `type` (et non `interface`) : Remotion exige un type compatible Record<string, unknown>.
export type ViralTemplateProps = {
  hookText: string;
  nicheName: string;
  clips: VideoClip[];
  karaokeWords: KaraokeWord[];
  /** Voix off (URL https ou chemin relatif au dossier public). Absente dans l'aperçu. */
  audioSrc?: string;
  totalDurationInFrames: number;
  /** Durée d'affichage du gros hook, en frames (90 par défaut). */
  hookFrames?: number;
  /** Nom affiché en haut à droite. Absent = rien d'affiché. */
  brandTag?: string;
  /** Dimensions de la vidéo (9:16 par défaut). */
  width?: number;
  height?: number;
  /** Style de montage ; absent = style dynamique. */
  montage?: MontageConfig;
  /** Badge de niche en haut à gauche (vrai par défaut). */
  showNiche?: boolean;
  /** Barre de progression en bas (vraie par défaut). */
  showProgress?: boolean;
  /** Une fenêtre par plan (une par phrase). Absent = plans répartis sur la durée. */
  scenes?: { from: number; durationInFrames: number }[];
};

export interface VideoGenerationRequest {
  niche: { id: string; name: string };
  script: string;
  hook: string;
  keywords: string[];
  voice: string;
  pexelsIds: number[];
}

/** Réglages visuels d'un montage, résolus à partir d'un style de la liste (montage.ts). */
export type MontageConfig = {
  /** Frames de fondu entre deux plans ; 0 = coupe franche. */
  transitionFrames: number;
  /** Zoom Ken Burns maximal (1 = aucun zoom). */
  zoom: number;
  /** Étalonnage : filtre CSS appliqué aux plans. */
  filter: string;
  vignette: boolean;
  /** Bandes noires haut et bas (format cinéma). */
  letterbox: boolean;
  subtitles: 'bottom' | 'center';
  hookPosition: 'center' | 'top';
  /** Couleur d'accent (sous-titres actifs, barre, badge). */
  accent: string;
};
