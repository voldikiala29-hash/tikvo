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
  brandTag?: string;
};

export interface VideoGenerationRequest {
  niche: { id: string; name: string };
  script: string;
  hook: string;
  keywords: string[];
  voice: string;
  pexelsIds: number[];
}
